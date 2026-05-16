import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { buyerWallet, productIds, shippingAddress, buyerLat, buyerLng } = body;

    if (!buyerWallet || !productIds || !shippingAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        buyerWallet: buyerWallet.toLowerCase(),
        productIds: JSON.stringify(productIds),
        shippingAddress,
        buyerLat: buyerLat ?? null,
        buyerLng: buyerLng ?? null,
      },
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (productId) {
      const orders = await prisma.order.findMany();
      const order = orders.find(o => {
        try {
          const ids = JSON.parse(o.productIds);
          return ids.includes(Number(productId)) || ids.includes(String(productId));
        } catch (e) { return false; }
      });

      if (order) {
        const user = await prisma.user.findUnique({ where: { walletAddress: order.buyerWallet } });
        return NextResponse.json({ order, user });
      }
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const wallet = searchParams.get('wallet');
    if (wallet) {
      const orders = await prisma.order.findMany({
        where: { buyerWallet: wallet.toLowerCase() },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(orders);
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
