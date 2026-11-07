import { NextResponse } from 'next/server';
import { COOKIE, MAX_AGE, makeToken, passwordOk } from '../../../lib/auth';

export async function POST(request) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD is not set in the project settings.' }, { status: 500 });
  }
  const body = await request.json().catch(() => ({}));
  if (!passwordOk(body.password)) {
    await new Promise((r) => setTimeout(r, 900));
    return NextResponse.json({ error: 'Wrong password.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
  return res;
}
