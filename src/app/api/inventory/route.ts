import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/inventory?templateId=xxx — get inventory for a template
// GET /api/inventory?productId=xxx — legacy: find via batch -> template -> inventory
// GET /api/inventory — get all inventory records
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const productId = searchParams.get('productId');

    if (templateId) {
      const inv = await prisma.inventory.findUnique({
        where: { templateId },
        include: { template: true },
      });
      return NextResponse.json(inv || { templateId, inWarehouse: 0, onDisplay: 0, sold: 0 });
    }

    // Legacy: look up by blockchain product ID → batch → template → inventory
    if (productId) {
      const batch = await prisma.batchRecord.findUnique({
        where: { blockchainId: String(productId) },
        include: { template: { include: { inventory: true } } },
      });
      if (batch?.template?.inventory) {
        return NextResponse.json(batch.template.inventory);
      }
      return NextResponse.json({ inWarehouse: 0, onDisplay: 0, sold: 0 });
    }

    const all = await prisma.inventory.findMany({
      include: { template: true },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(all);
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/inventory — staff actions (shelf, sell only — receive is automated)
// body: { templateId, action, quantity }
// actions: "shelf" (warehouse -> display), "sell" (display -> sold)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, action, quantity } = body;

    if (!templateId || !action || !quantity || quantity < 1) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    const qty = Number(quantity);

    let inv = await prisma.inventory.findUnique({ where: { templateId } });
    if (!inv) {
      return NextResponse.json({ error: 'No inventory record for this template' }, { status: 404 });
    }

    switch (action) {
      case 'shelf':
        if (inv.inWarehouse < qty) {
          return NextResponse.json({ error: `Insufficient warehouse stock. Available: ${inv.inWarehouse}` }, { status: 400 });
        }
        inv = await prisma.inventory.update({
          where: { templateId },
          data: {
            inWarehouse: inv.inWarehouse - qty,
            onDisplay: inv.onDisplay + qty,
          },
        });
        break;

      case 'sell':
        if (inv.onDisplay < qty) {
          return NextResponse.json({ error: `Insufficient display stock. Available: ${inv.onDisplay}` }, { status: 400 });
        }
        inv = await prisma.inventory.update({
          where: { templateId },
          data: {
            onDisplay: inv.onDisplay - qty,
            sold: inv.sold + qty,
          },
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action. Use: shelf, sell' }, { status: 400 });
    }

    return NextResponse.json(inv);
  } catch (error: any) {
    console.error('Error updating inventory:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
