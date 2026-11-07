import { NextResponse } from 'next/server';
import { isAdmin } from '../../../lib/auth';
import { hasBlob } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    admin: await isAdmin(),
    configured: !!process.env.ADMIN_PASSWORD,
    blob: hasBlob(),
  });
}
