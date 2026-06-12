import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/png'],
        maximumSizeInBytes: 25 * 1024 * 1024,
      }),
      onUploadCompleted: async () => { /* no-op */ },
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
