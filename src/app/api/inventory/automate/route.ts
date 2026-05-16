import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/inventory/automate — triggered when logistics confirms delivery
// body: { blockchainId }
// Finds the BatchRecord, marks isDelivered, adds quantity to Inventory.inWarehouse
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { blockchainId } = body;

    if (!blockchainId) {
      return NextResponse.json({ error: 'blockchainId is required' }, { status: 400 });
    }

    // Find the batch
    const batch = await prisma.batchRecord.findUnique({
      where: { blockchainId: String(blockchainId) },
      include: { template: { include: { inventory: true } } },
    });

    if (!batch) {
      return NextResponse.json({ error: 'No batch found for this blockchain ID' }, { status: 404 });
    }

    if (batch.isDelivered) {
      return NextResponse.json({
        message: 'This batch was already processed',
        quantity: batch.quantity,
        alreadyDelivered: true,
      });
    }

    // Mark batch as delivered
    await prisma.batchRecord.update({
      where: { blockchainId: String(blockchainId) },
      data: { isDelivered: true },
    });

    // Increment warehouse inventory
    const inventory = await prisma.inventory.upsert({
      where: { templateId: batch.templateId },
      update: {
        inWarehouse: { increment: batch.quantity },
      },
      create: {
        templateId: batch.templateId,
        inWarehouse: batch.quantity,
        onDisplay: 0,
        sold: 0,
      },
    });

    return NextResponse.json({
      success: true,
      quantity: batch.quantity,
      productName: batch.template.name,
      inventory,
    });
  } catch (error: any) {
    console.error('Error automating inventory:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
