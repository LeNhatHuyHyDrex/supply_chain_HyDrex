import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/templates — get all templates with inventory + batch counts
export async function GET() {
  try {
    const templates = await prisma.productTemplate.findMany({
      include: {
        inventory: true,
        batches: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(templates);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/templates — create a new template + initialize empty inventory
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, origin, imageUrl } = body;

    if (!name || !origin) {
      return NextResponse.json({ error: 'name and origin are required' }, { status: 400 });
    }

    const template = await prisma.productTemplate.create({
      data: {
        name,
        origin,
        imageUrl: imageUrl || '',
        inventory: {
          create: {
            inWarehouse: 0,
            onDisplay: 0,
            sold: 0,
          },
        },
      },
      include: { inventory: true },
    });

    return NextResponse.json(template);
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/templates — update a template's image
// body: { templateId, newImageUrl }
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { templateId, newImageUrl } = body;

    if (!templateId || !newImageUrl) {
      return NextResponse.json({ error: 'templateId and newImageUrl are required' }, { status: 400 });
    }

    // Update the template image
    const template = await prisma.productTemplate.update({
      where: { id: templateId },
      data: { imageUrl: newImageUrl },
      include: { batches: true },
    });

    // Also update all linked ProductMeta entries for each batch's blockchain ID
    for (const batch of template.batches) {
      await prisma.productMeta.upsert({
        where: { productId: batch.blockchainId },
        update: { imageUrl: newImageUrl },
        create: { productId: batch.blockchainId, imageUrl: newImageUrl },
      });
    }

    return NextResponse.json(template);
  } catch (error: any) {
    console.error('Error updating template image:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
