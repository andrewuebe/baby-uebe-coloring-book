import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_KEY = process.env.PEXELS_API_KEY;

function mockFetch(impl: typeof fetch) {
  return vi.spyOn(global, 'fetch').mockImplementation(impl as typeof fetch);
}

function pexelsResponse(photos: unknown[]) {
  return new Response(JSON.stringify({ photos }), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('GET /api/reference', () => {
  beforeEach(() => {
    process.env.PEXELS_API_KEY = 'test-key';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.PEXELS_API_KEY;
    else process.env.PEXELS_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  it('returns 400 when q is missing', async () => {
    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('missing_query');
  });

  it('returns 400 when q is empty', async () => {
    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference?q='));
    expect(res.status).toBe(400);
  });

  it('maps Pexels response to slim shape', async () => {
    mockFetch(async () =>
      pexelsResponse([
        {
          id: 12345,
          src: { medium: 'https://m.example/m.jpg', large: 'https://m.example/l.jpg', original: 'https://m.example/o.jpg' },
          alt: 'A red apple',
          photographer: 'Jane Doe',
          width: 1000,
          height: 1000,
        },
      ]),
    );

    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference?q=apple'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.photos).toEqual([
      {
        id: '12345',
        srcMedium: 'https://m.example/m.jpg',
        srcLarge: 'https://m.example/l.jpg',
        alt: 'A red apple',
        photographer: 'Jane Doe',
      },
    ]);
  });

  it('returns empty photos array when Pexels returns none', async () => {
    mockFetch(async () => pexelsResponse([]));
    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference?q=zzzzzzz'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.photos).toEqual([]);
  });

  it('returns 502 upstream_failed when Pexels returns non-2xx', async () => {
    mockFetch(async () => new Response('boom', { status: 500 }));
    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference?q=apple'));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('upstream_failed');
  });

  it('sets Cache-Control: public, max-age=3600 on success', async () => {
    mockFetch(async () => pexelsResponse([]));
    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference?q=apple'));
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
  });

  it('calls Pexels with Authorization header and correct query params', async () => {
    const spy = mockFetch(async () => pexelsResponse([]));
    const { GET } = await import('@/app/api/reference/route');
    await GET(new Request('http://test/api/reference?q=red%20apple'));
    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toBe('https://api.pexels.com/v1/search?query=red+apple&per_page=10&orientation=square');
    const headers = new Headers((init as RequestInit | undefined)?.headers);
    expect(headers.get('Authorization')).toBe('test-key');
  });

  it('returns 502 when PEXELS_API_KEY is unset', async () => {
    delete process.env.PEXELS_API_KEY;
    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference?q=apple'));
    expect(res.status).toBe(502);
  });
});
