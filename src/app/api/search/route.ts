import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/search?q=... — fuzzy search across ProductTemplate
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length === 0) {
      return NextResponse.json([]);
    }

    const templates = await prisma.productTemplate.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { origin: { contains: q } },
        ],
      },
      include: {
        inventory: true,
        batches: {
          where: {
            blockchainId: { notIn: ['103', '104'] }
          },
          select: { blockchainId: true }
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(templates);
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
