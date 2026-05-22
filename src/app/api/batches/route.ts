import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/batches — create a new batch record linked to a template
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { blockchainId, templateId, quantity } = body;

    if (!blockchainId || !templateId || !quantity || quantity < 1) {
      return NextResponse.json({ error: 'blockchainId, templateId, and quantity (>=1) are required' }, { status: 400 });
    }

    // Check template exists
    const template = await prisma.productTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check blockchain ID is unique
    const existing = await prisma.batchRecord.findUnique({ where: { blockchainId: String(blockchainId) } });
    if (existing) {
      return NextResponse.json({ error: 'A batch with this blockchain ID already exists' }, { status: 409 });
    }

    const batch = await prisma.batchRecord.create({
      data: {
        blockchainId: String(blockchainId),
        templateId,
        quantity: Number(quantity),
      },
    });

    // Also save image meta for this blockchain product so Storefront/TrackProduct can find it
    if (template.imageUrl) {
      await prisma.productMeta.upsert({
        where: { productId: String(blockchainId) },
        update: { imageUrl: template.imageUrl },
        create: { productId: String(blockchainId), imageUrl: template.imageUrl },
      });
    }

    return NextResponse.json(batch);
  } catch (error: any) {
    console.error('Error creating batch:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// GET /api/batches?templateId=xxx — get batches for a template
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');

    const where: any = templateId
      ? { templateId, blockchainId: { notIn: ['103', '104'] } }
      : { blockchainId: { notIn: ['103', '104'] } };
    const batches = await prisma.batchRecord.findMany({
      where,
      include: { template: true },
      orderBy: { blockchainId: 'desc' },
    });

    return NextResponse.json(batches);
  } catch (error: any) {
    console.error('Error fetching batches:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
