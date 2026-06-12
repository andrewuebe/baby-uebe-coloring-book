import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startDb, stopDb, resetDb, dbEnabled } from '../db-setup';

const runIf = dbEnabled ? describe : describe.skip;

async function acquire(letter: string) {
  const { POST } = await import('@/app/api/locks/route');
  const res = await POST(new Request('http://localhost/api/locks', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ letter }),
  }));
  return (await res.json()).lock_token as string;
}

async function submit(payload: Record<string, unknown>) {
  const { POST } = await import('@/app/api/entries/route');
  return POST(new Request('http://localhost/api/entries', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  }));
}

runIf('POST /api/entries', () => {
  beforeAll(async () => { await startDb(); });
  afterAll(async () => { await stopDb(); });
  beforeEach(async () => { await resetDb(); });

  it('creates entry and releases the lock on success', async () => {
    const token = await acquire('A');
    const res = await submit({
      letter: 'A', lock_token: token, artist_name: 'Uncle Dan', subject: 'Apple',
      image_url: 'https://example.com/a.png', stroke_data: [{ id: 's1' }],
    });
    expect(res.status).toBe(201);
    const { db } = await import('@/lib/db');
    const { entries, letterLocks } = await import('@/lib/db/schema');
    const all = await db().select().from(entries);
    expect(all).toHaveLength(1);
    const locks = await db().select().from(letterLocks);
    expect(locks).toHaveLength(0);
  });

  it('returns 410 when lock token is wrong', async () => {
    await acquire('A');
    const res = await submit({
      letter: 'A', lock_token: '00000000-0000-0000-0000-000000000000', artist_name: 'X', subject: 'X',
      image_url: 'https://example.com/x.png',
    });
    expect(res.status).toBe(410);
  });

  it('returns 409 when entry already exists', async () => {
    const { db } = await import('@/lib/db');
    const { entries } = await import('@/lib/db/schema');
    await db().insert(entries).values({ letter: 'A', artistName: 'Prior', subject: 'Aardvark', imageUrl: 'x' });
    const token = await acquire('A'); // will fail with 409 done, so just craft a token
    void token;
    const res = await submit({
      letter: 'A', lock_token: '00000000-0000-0000-0000-000000000000', artist_name: 'X', subject: 'X',
      image_url: 'https://example.com/x.png',
    });
    expect(res.status).toBe(409);
  });
});
