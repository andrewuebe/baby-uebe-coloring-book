import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { ALPHABET } from '@/lib/letters';

export const dynamic = 'force-dynamic';

const STALE_SECONDS = 180;

export async function GET() {
  const conn = db();
  const entries = await conn.select().from(schema.entries);
  const locks = await conn
    .select()
    .from(schema.letterLocks)
    .where(sql`${schema.letterLocks.lastHeartbeatAt} > now() - interval '${sql.raw(String(STALE_SECONDS))} seconds'`);

  const entryByLetter = new Map(entries.map((e) => [e.letter, e]));
  const lockByLetter = new Map(locks.map((l) => [l.letter, l]));

  const letters = ALPHABET.map((letter) => {
    const entry = entryByLetter.get(letter);
    if (entry) {
      return {
        letter,
        status: 'done' as const,
        artistName: entry.artistName,
        subject: entry.subject,
        thumbnailUrl: entry.imageUrl,
      };
    }
    const lock = lockByLetter.get(letter);
    if (lock) {
      return {
        letter,
        status: 'locked' as const,
        artistName: lock.artistName ?? null,
        subject: lock.subject ?? null,
      };
    }
    return { letter, status: 'available' as const };
  });

  return NextResponse.json({ letters });
}
