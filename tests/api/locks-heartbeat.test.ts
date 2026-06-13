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

runIf('lock heartbeat / patch / delete', () => {
  beforeAll(async () => { await startDb(); });
  afterAll(async () => { await stopDb(); });
  beforeEach(async () => { await resetDb(); });

  it('heartbeat updates last_heartbeat_at when token matches', async () => {
    const token = await acquire('A');
    const { POST } = await import('@/app/api/locks/heartbeat/route');
    const res = await POST(new Request('http://localhost/api/locks/heartbeat', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ letter: 'A', lock_token: token }),
    }));
    expect(res.status).toBe(200);
  });

  it('heartbeat returns 410 on bad token', async () => {
    await acquire('A');
    const { POST } = await import('@/app/api/locks/heartbeat/route');
    const res = await POST(new Request('http://localhost/api/locks/heartbeat', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ letter: 'A', lock_token: '99999999-9999-9999-9999-999999999999' }),
    }));
    expect(res.status).toBe(410);
  });

  it('patch stores artist name and subject', async () => {
    const token = await acquire('A');
    const { PATCH } = await import('@/app/api/locks/route');
    const res = await PATCH(new Request('http://localhost/api/locks', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ letter: 'A', lock_token: token, artist_name: 'Uncle Dan', subject: 'Apple' }),
    }));
    expect(res.status).toBe(200);
  });

  it('delete releases the lock', async () => {
    const token = await acquire('A');
    const { DELETE } = await import('@/app/api/locks/route');
    const res = await DELETE(new Request('http://localhost/api/locks', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ letter: 'A', lock_token: token }),
    }));
    expect(res.status).toBe(200);
    const second = await acquire('A');
    expect(second).toBeTruthy();
  });
});
