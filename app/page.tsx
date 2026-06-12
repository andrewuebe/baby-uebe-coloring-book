import { AlphabetGrid } from '@/components/AlphabetGrid';
import { GET as getState } from '@/app/api/state/route';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const res = await getState();
  const initial = await res.json();
  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="mb-6 text-center">
        <h1 className="font-serif text-3xl">Baby Uebe&apos;s Coloring Book</h1>
        <p className="text-sm text-inksoft">Tap a letter to draw. Tap a finished one to look.</p>
      </header>
      <AlphabetGrid initial={initial} />
    </main>
  );
}
