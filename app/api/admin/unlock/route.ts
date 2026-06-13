import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { isLetter } from '@/lib/letters';
import { assertAdmin } from '@/lib/admin';

export async function POST(req: Request) {
  try { assertAdmin(req); } catch (r) { return r as Response; }
  const body = await req.json().catch(() => null);
  if (!isLetter(body?.letter)) return NextResponse.json({ reason: 'invalid' }, { status: 400 });
  await db().execute(sql`DELETE FROM ${schema.letterLocks} WHERE letter = ${body.letter}`);
  return NextResponse.json({ ok: true });
}
