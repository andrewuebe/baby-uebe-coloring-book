import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { isLetter } from '@/lib/letters';
import { assertAdmin } from '@/lib/admin';

export async function DELETE(req: Request, { params }: { params: Promise<{ letter: string }> }) {
  try { assertAdmin(req); } catch (r) { return r as Response; }
  const { letter } = await params;
  const upper = letter.toUpperCase();
  if (!isLetter(upper)) return NextResponse.json({ reason: 'invalid' }, { status: 400 });
  await db().execute(sql`DELETE FROM ${schema.entries} WHERE letter = ${upper}`);
  return NextResponse.json({ ok: true });
}
