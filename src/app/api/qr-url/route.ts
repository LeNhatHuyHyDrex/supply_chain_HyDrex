import { NextResponse } from 'next/server';
import { getAppBaseUrl } from '@/lib/getLocalIP';

/**
 * Returns the dynamic base URL for QR code generation.
 * Uses auto-discovered LAN IP or NEXT_PUBLIC_APP_URL env override.
 */
export async function GET() {
  const baseUrl = getAppBaseUrl();
  return NextResponse.json({ baseUrl });
}
