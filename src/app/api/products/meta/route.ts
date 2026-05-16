import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');

  try {
    if (productId) {
      const meta = await prisma.productMeta.findUnique({
        where: { productId }
      });
      return NextResponse.json(meta);
    } else {
      const metas = await prisma.productMeta.findMany();
      return NextResponse.json(metas);
    }
  } catch (error) {
    console.error('Error fetching product meta:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { productId, imageUrl } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const meta = await prisma.productMeta.upsert({
      where: { productId: productId.toString() },
      update: { imageUrl: imageUrl || null },
      create: { 
        productId: productId.toString(), 
        imageUrl: imageUrl || null 
      }
    });

    return NextResponse.json(meta);
  } catch (error) {
    console.error('Error upserting product meta:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
