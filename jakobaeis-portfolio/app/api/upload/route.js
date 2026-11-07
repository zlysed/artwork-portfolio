import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { isAdmin } from '../../../lib/auth';

export async function POST(request) {
  const body = await request.json();
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await isAdmin())) throw new Error('Not logged in.');
        return {
          allowedContentTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'],
          maximumSizeInBytes: 60 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
