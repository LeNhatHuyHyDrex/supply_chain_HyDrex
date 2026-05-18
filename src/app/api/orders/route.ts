import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/orders — create a new e-commerce order
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { buyerWallet, customerName, address, items, totalAmount, paymentMethod, status: requestedStatus, txHash } = body;

    if (!customerName || !address || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: customerName, address, items' }, { status: 400 });
    }

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ error: 'totalAmount must be greater than 0' }, { status: 400 });
    }

    const validMethods = ['WALLET', 'QR', 'CASH'];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      return NextResponse.json({ error: 'paymentMethod must be one of: WALLET, QR, CASH' }, { status: 400 });
    }

    // WALLET payments can be created directly as PAID
    const validInitialStatuses = ['PENDING_APPROVAL', 'PAID'];
    const initialStatus = (requestedStatus && validInitialStatuses.includes(requestedStatus)) ? requestedStatus : 'PENDING_APPROVAL';

    const order = await prisma.order.create({
      data: {
        buyerWallet: buyerWallet?.toLowerCase() || null,
        customerName,
        address,
        items,
        totalAmount,
        paymentMethod,
        status: initialStatus,
      },
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// GET /api/orders — fetch orders (all, by wallet, by status)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const status = searchParams.get('status');

    const where: any = {};
    if (wallet) where.buyerWallet = wallet.toLowerCase();
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/orders — update order status (admin/staff)
// CRITICAL: When status transitions to DELIVERED, auto-deduct inventory
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderId, newStatus } = body;

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'orderId and newStatus are required' }, { status: 400 });
    }

    const validStatuses = ['PENDING_APPROVAL', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PAID'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: `Invalid status. Valid: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Prevent re-delivering already delivered orders
    if (order.status === 'DELIVERED') {
      return NextResponse.json({ error: 'Order is already delivered' }, { status: 400 });
    }

    // CRITICAL INVENTORY LOGIC: auto-deduct on DELIVERED
    if (newStatus === 'DELIVERED') {
      const orderItems = order.items as Array<{ templateId: string; quantity: number; price: number }>;

      for (const item of orderItems) {
        const inv = await prisma.inventory.findUnique({ where: { templateId: item.templateId } });
        if (!inv) continue;

        // Deduct from available stock (prefer onDisplay, then inWarehouse)
        let remaining = item.quantity;
        let deductDisplay = Math.min(remaining, inv.onDisplay);
        remaining -= deductDisplay;
        let deductWarehouse = Math.min(remaining, inv.inWarehouse);

        await prisma.inventory.update({
          where: { templateId: item.templateId },
          data: {
            onDisplay: inv.onDisplay - deductDisplay,
            inWarehouse: inv.inWarehouse - deductWarehouse,
            sold: inv.sold + item.quantity,
          },
        });
      }
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
