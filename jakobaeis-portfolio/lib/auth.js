import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'jb_admin';
export const MAX_AGE = 60 * 60 * 24 * 14; // 14 Tage

function secret() {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || null;
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export function makeToken() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token) {
  if (!token || !secret()) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  if (!Number(exp) || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function passwordOk(input) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || typeof input !== 'string') return false;
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(pw).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function isAdmin() {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}
