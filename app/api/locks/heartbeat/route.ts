import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { isLetter } from '@/lib/letters';

export const dynamic = 'force-dynamic';
const STALE_SECONDS = 180;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { letter, lock_token: lockToken } = body ?? {};
  if (!isLetter(letter) || typeof lockToken !== 'string') {
    return NextResponse.json({ reason: 'invalid' }, { status: 400 });
  }
  const conn = db();
  const result = await conn.execute(
    sql`UPDATE ${schema.letterLocks}
        SET last_heartbeat_at = now()
        WHERE letter = ${letter}
          AND lock_token = ${lockToken}
          AND last_heartbeat_at > now() - interval '${sql.raw(String(STALE_SECONDS))} seconds'
        RETURNING letter`,
  );
  const rows = (result as unknown as { rows: unknown[] }).rows;
  if (rows.length === 0) return NextResponse.json({ reason: 'lock_lost' }, { status: 410 });
  return NextResponse.json({ ok: true });
}
