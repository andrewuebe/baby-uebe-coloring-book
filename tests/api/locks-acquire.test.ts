import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startDb, stopDb, resetDb, dbEnabled } from '../db-setup';

const runIf = dbEnabled ? describe : describe.skip;

async function call(letter: string) {
  const { POST } = await import('@/app/api/locks/route');
  const req = new Request('http://localhost/api/locks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ letter }),
  });
  return POST(req);
}

runIf('POST /api/locks', () => {
  beforeAll(async () => { await startDb(); });
  afterAll(async () => { await stopDb(); });
  beforeEach(async () => { await resetDb(); });

  it('acquires a lock for an available letter', async () => {
    const res = await call('A');
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.lock_token).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns 409 in_use when letter is already locked and fresh', async () => {
    const a = await call('A');
    expect(a.status).toBe(201);
    const b = await call('A');
    expect(b.status).toBe(409);
    const body = await b.json();
    expect(body.reason).toBe('in_use');
  });

  it('returns 409 done when entry exists', async () => {
    const { db } = await import('@/lib/db');
    const { entries } = await import('@/lib/db/schema');
    await db().insert(entries).values({
      letter: 'A', artistName: 'Aunt', subject: 'Apple', imageUrl: 'x',
    });
    const res = await call('A');
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('done');
  });

  it('sweeps stale locks before acquiring', async () => {
    const { db } = await import('@/lib/db');
    const { letterLocks } = await import('@/lib/db/schema');
    await db().insert(letterLocks).values({
      letter: 'A',
      lockToken: '11111111-1111-1111-1111-111111111111',
      acquiredAt: new Date(Date.now() - 1000 * 60 * 10),
      lastHeartbeatAt: new Date(Date.now() - 1000 * 60 * 10),
    });
    const res = await call('A');
    expect(res.status).toBe(201);
  });

  it('rejects invalid letter', async () => {
    const res = await call('1');
    expect(res.status).toBe(400);
  });
});
