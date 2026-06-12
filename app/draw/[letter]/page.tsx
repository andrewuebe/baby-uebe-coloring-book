import { notFound } from 'next/navigation';
import { ALPHABET } from '@/lib/letters';
import { DrawFlow } from '@/components/DrawFlow';

export const dynamic = 'force-dynamic';

export default async function DrawPage({ params }: { params: Promise<{ letter: string }> }) {
  const { letter } = await params;
  const upper = letter.toUpperCase();
  if (!ALPHABET.includes(upper)) notFound();
  return <DrawFlow letter={upper} />;
}
