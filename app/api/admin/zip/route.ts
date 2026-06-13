import JSZip from 'jszip';
import { db, schema } from '@/lib/db';
import { assertAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try { assertAdmin(req); } catch (r) { return r as Response; }
  const entries = await db().select().from(schema.entries);
  const zip = new JSZip();
  for (const entry of entries) {
    const res = await fetch(entry.imageUrl);
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    const safeArtist = entry.artistName.replace(/[^a-z0-9]+/gi, '-');
    const safeSubject = entry.subject.replace(/[^a-z0-9]+/gi, '-');
    zip.file(`${entry.letter}-${safeSubject}-${safeArtist}.png`, buf);
  }
  const archive = await zip.generateAsync({ type: 'nodebuffer' });
  return new Response(new Uint8Array(archive), {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': 'attachment; filename="coloring-book.zip"',
    },
  });
}
