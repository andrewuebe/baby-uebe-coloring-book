import { NextResponse } from 'next/server';
import { mapPexelsPhotos } from '@/lib/reference';

export const dynamic = 'force-dynamic';

const PEXELS_ENDPOINT = 'https://api.pexels.com/v1/search';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'missing_query' }, { status: 400 });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'upstream_failed' }, { status: 502 });
  }

  const upstream = new URL(PEXELS_ENDPOINT);
  upstream.searchParams.set('query', q);
  upstream.searchParams.set('per_page', '10');
  upstream.searchParams.set('orientation', 'square');

  let res: Response;
  try {
    res = await fetch(upstream.toString(), {
      headers: { Authorization: apiKey },
    });
  } catch {
    return NextResponse.json({ error: 'upstream_failed' }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'upstream_failed' }, { status: 502 });
  }

  const raw = await res.json().catch(() => null);
  const photos = mapPexelsPhotos(raw);
  return NextResponse.json(
    { photos },
    { headers: { 'cache-control': 'public, max-age=3600' } },
  );
}
