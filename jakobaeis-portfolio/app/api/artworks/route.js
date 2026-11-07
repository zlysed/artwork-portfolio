import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { isAdmin } from '../../../lib/auth';
import { getItems, saveItems, sanitize, deleteBlobs } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  try {
    return NextResponse.json({ items: await getItems({ fresh: true, strict: true }) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  try {
    const { items } = await request.json();
    const next = sanitize(items);
    const old = await getItems({ fresh: true, strict: true });
    const keep = new Set(next.map((i) => i.src));
    const removed = old.map((i) => i.src).filter((src) => !keep.has(src));

    await saveItems(next);
    await deleteBlobs(removed).catch((e) => console.error('Blob cleanup failed', e));

    revalidateTag('manifest');
    revalidatePath('/');
    return NextResponse.json({ items: next });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
