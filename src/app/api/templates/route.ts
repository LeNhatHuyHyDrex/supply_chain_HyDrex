import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/templates — get all templates with inventory + batch counts
export async function GET() {
  try {
    const templates = await prisma.productTemplate.findMany({
      include: {
        inventory: true,
        batches: {
          where: {
            blockchainId: { notIn: ['103', '104'] }
          }
        },
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

// PATCH /api/templates — update template image OR price
// body: { templateId, newImageUrl? } OR { templateId, price? }
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { templateId, newImageUrl, price } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    const updateData: any = {};

    // Handle image update
    if (newImageUrl !== undefined) {
      updateData.imageUrl = newImageUrl;
    }

    // Handle price update
    if (price !== undefined) {
      updateData.price = price === null || price === '' ? null : parseFloat(price);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update. Provide newImageUrl or price.' }, { status: 400 });
    }

    const template = await prisma.productTemplate.update({
      where: { id: templateId },
      data: updateData,
      include: {
        batches: {
          where: {
            blockchainId: { notIn: ['103', '104'] }
          }
        }
      },
    });

    // If image was updated, also update all linked ProductMeta entries
    if (newImageUrl) {
      for (const batch of template.batches) {
        await prisma.productMeta.upsert({
          where: { productId: batch.blockchainId },
          update: { imageUrl: newImageUrl },
          create: { productId: batch.blockchainId, imageUrl: newImageUrl },
        });
      }
    }

    return NextResponse.json(template);
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
