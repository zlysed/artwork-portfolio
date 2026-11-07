import { put, list, del } from '@vercel/blob';
import { SEED } from './seed';

const KEY = 'jakobaeis/manifest.json';
const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/;

export const hasBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export function isBlobUrl(src) {
  try {
    const u = new URL(src);
    return u.protocol === 'https:' && BLOB_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

function okSrc(src) {
  if (typeof src !== 'string') return false;
  if (src.startsWith('/artworks/') && !src.includes('..')) return true;
  return isBlobUrl(src);
}

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const dim = (v) => {
  const n = Math.round(Number(v));
  return n >= 1 && n <= 20000 ? n : 1000;
};

export function sanitize(items) {
  if (!Array.isArray(items)) throw new Error('Invalid data');
  return items
    .filter((it) => it && okSrc(it.src))
    .slice(0, 500)
    .map((it) => ({
      id: clip(it.id, 64) || crypto.randomUUID(),
      title: clip(it.title, 120) || 'Untitled',
      year: clip(it.year, 12),
      category: clip(it.category, 40),
      src: it.src,
      w: dim(it.w),
      h: dim(it.h),
    }));
}

// fresh: immer frisch lesen (Admin). strict: bei Fehlern werfen statt Fallback.
export async function getItems({ fresh = false, strict = false } = {}) {
  if (!hasBlob()) return SEED;
  try {
    const { blobs } = await list({ prefix: KEY, limit: 5 });
    const file = blobs.find((b) => b.pathname === KEY);
    if (!file) return SEED;
    const v = new Date(file.uploadedAt).getTime();
    const res = await fetch(
      `${file.url}?v=${v}`,
      fresh ? { cache: 'no-store' } : { next: { revalidate: 3600, tags: ['manifest'] } }
    );
    if (!res.ok) throw new Error(`Manifest request failed (${res.status})`);
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : SEED;
  } catch (e) {
    if (strict) throw e;
    console.error('getItems failed, using seed:', e);
    return SEED;
  }
}

export async function saveItems(items) {
  if (!hasBlob()) {
    throw new Error('No Blob store connected. Create one in Vercel under Storage and connect it to this project.');
  }
  await put(KEY, JSON.stringify({ items, updatedAt: new Date().toISOString() }), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

export async function deleteBlobs(urls) {
  const blobUrls = urls.filter(isBlobUrl);
  if (blobUrls.length) await del(blobUrls);
}
