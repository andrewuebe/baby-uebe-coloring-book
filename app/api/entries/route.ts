import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { isLetter } from '@/lib/letters';

export const dynamic = 'force-dynamic';
const STALE_SECONDS = 180;

type Body = {
  letter: string;
  lock_token: string;
  artist_name: string;
  subject: string;
  image_url: string;
  stroke_data?: unknown;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (
    !body || !isLetter(body.letter) ||
    typeof body.lock_token !== 'string' ||
    typeof body.artist_name !== 'string' || body.artist_name.length === 0 ||
    typeof body.subject !== 'string' || body.subject.length === 0 ||
    typeof body.image_url !== 'string' || body.image_url.length === 0
  ) {
    return NextResponse.json({ reason: 'invalid' }, { status: 400 });
  }

  const conn = db();
  try {
    return await conn.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(schema.entries)
        .where(sql`letter = ${body.letter}`);
      if (existing.length > 0) {
        return NextResponse.json({ reason: 'done' }, { status: 409 });
      }
      const lockResult = await tx.execute(
        sql`SELECT 1 FROM ${schema.letterLocks}
            WHERE letter = ${body.letter}
              AND lock_token = ${body.lock_token}
              AND last_heartbeat_at > now() - interval '${sql.raw(String(STALE_SECONDS))} seconds'`,
      );
      const lockRows = (lockResult as unknown as { rows: unknown[] }).rows;
      if (lockRows.length === 0) {
        return NextResponse.json({ reason: 'lock_lost' }, { status: 410 });
      }
      try {
        await tx.insert(schema.entries).values({
          letter: body.letter,
          artistName: body.artist_name,
          subject: body.subject,
          imageUrl: body.image_url,
          strokeData: body.stroke_data ?? null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('duplicate key')) {
          return NextResponse.json({ reason: 'done' }, { status: 409 });
        }
        throw err;
      }
      await tx.execute(
        sql`DELETE FROM ${schema.letterLocks} WHERE letter = ${body.letter} AND lock_token = ${body.lock_token}`,
      );
      return NextResponse.json({ ok: true }, { status: 201 });
    });
  } catch (err) {
    console.error('submit error', err);
    return NextResponse.json({ reason: 'server_error' }, { status: 500 });
  }
}
