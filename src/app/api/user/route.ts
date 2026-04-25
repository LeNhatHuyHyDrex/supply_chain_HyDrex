import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, displayName } = body;

    if (!walletAddress || !displayName) {
      return NextResponse.json({ error: 'walletAddress and displayName are required' }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      update: { displayName },
      create: {
        walletAddress: walletAddress.toLowerCase(),
        displayName,
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error upserting user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
