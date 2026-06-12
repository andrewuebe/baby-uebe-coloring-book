import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db, schema } from '@/lib/db';
import { isLetter } from '@/lib/letters';

export const dynamic = 'force-dynamic';

const STALE_SECONDS = 180;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const letter = body?.letter;
  if (!isLetter(letter)) {
    return NextResponse.json({ reason: 'invalid_letter' }, { status: 400 });
  }
  const conn = db();
  await conn.execute(
    sql`DELETE FROM ${schema.letterLocks}
        WHERE letter = ${letter}
          AND last_heartbeat_at < now() - interval '${sql.raw(String(STALE_SECONDS))} seconds'`,
  );
  const existing = await conn.select().from(schema.entries).where(sql`letter = ${letter}`);
  if (existing.length > 0) {
    return NextResponse.json({ reason: 'done' }, { status: 409 });
  }
  const lockToken = randomUUID();
  const inserted = await conn.execute(
    sql`INSERT INTO ${schema.letterLocks} (letter, lock_token)
        VALUES (${letter}, ${lockToken})
        ON CONFLICT (letter) DO NOTHING
        RETURNING lock_token`,
  );
  const rows = (inserted as unknown as { rows: { lock_token: string }[] }).rows;
  if (rows.length === 0) {
    return NextResponse.json({ reason: 'in_use' }, { status: 409 });
  }
  return NextResponse.json({ lock_token: rows[0].lock_token }, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const { letter, lock_token: lockToken, artist_name: artistName, subject } = body ?? {};
  if (!isLetter(letter) || typeof lockToken !== 'string' || typeof artistName !== 'string' || typeof subject !== 'string') {
    return NextResponse.json({ reason: 'invalid' }, { status: 400 });
  }
  const conn = db();
  const result = await conn.execute(
    sql`UPDATE ${schema.letterLocks}
        SET artist_name = ${artistName}, subject = ${subject}
        WHERE letter = ${letter} AND lock_token = ${lockToken}
        RETURNING letter`,
  );
  const rows = (result as unknown as { rows: unknown[] }).rows;
  if (rows.length === 0) return NextResponse.json({ reason: 'lock_lost' }, { status: 410 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const { letter, lock_token: lockToken } = body ?? {};
  if (!isLetter(letter) || typeof lockToken !== 'string') {
    return NextResponse.json({ reason: 'invalid' }, { status: 400 });
  }
  const conn = db();
  await conn.execute(
    sql`DELETE FROM ${schema.letterLocks} WHERE letter = ${letter} AND lock_token = ${lockToken}`,
  );
  return NextResponse.json({ ok: true });
}
