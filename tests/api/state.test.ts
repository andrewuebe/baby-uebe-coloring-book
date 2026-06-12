import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startDb, stopDb, resetDb, dbEnabled } from '../db-setup';

const runIf = dbEnabled ? describe : describe.skip;

runIf('GET /api/state', () => {
  beforeAll(async () => { await startDb(); });
  afterAll(async () => { await stopDb(); });
  beforeEach(async () => { await resetDb(); });

  it('reports 26 letters, all available when DB is empty', async () => {
    const { GET } = await import('@/app/api/state/route');
    const res = await GET();
    const body = await res.json();
    expect(body.letters).toHaveLength(26);
    expect(body.letters.every((l: { status: string }) => l.status === 'available')).toBe(true);
  });

  it('returns done for letters with entries and locked for active locks', async () => {
    const { db } = await import('@/lib/db');
    const { entries, letterLocks } = await import('@/lib/db/schema');
    await db().insert(entries).values({
      letter: 'A', artistName: 'Uncle Dan', subject: 'Apple', imageUrl: 'https://example.com/a.png',
    });
    await db().insert(letterLocks).values({
      letter: 'B', lockToken: '00000000-0000-0000-0000-000000000001', artistName: 'Cousin', subject: 'Bee',
    });
    const { GET } = await import('@/app/api/state/route');
    const body = await (await GET()).json();
    const a = body.letters.find((l: { letter: string }) => l.letter === 'A');
    const b = body.letters.find((l: { letter: string }) => l.letter === 'B');
    expect(a.status).toBe('done');
    expect(a.artistName).toBe('Uncle Dan');
    expect(b.status).toBe('locked');
  });
});
