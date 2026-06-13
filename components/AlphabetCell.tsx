'use client';

import Link from 'next/link';

export type LetterState =
  | { letter: string; status: 'available' }
  | { letter: string; status: 'locked'; artistName: string | null; subject: string | null }
  | { letter: string; status: 'done'; artistName: string; subject: string; thumbnailUrl: string };

export function AlphabetCell({ state, onView }: { state: LetterState; onView: (s: LetterState & { status: 'done' }) => void }) {
  if (state.status === 'done') {
    return (
      <button
        onClick={() => onView(state)}
        className="aspect-square rounded-xl border-2 border-ink bg-white p-2 font-serif text-3xl text-ink shadow-sm"
        aria-label={`${state.letter} drawn by ${state.artistName}, view`}
      >
        <div className="flex h-full flex-col items-center justify-between">
          <span>{state.letter}</span>
          <span className="text-[10px] uppercase tracking-wider text-inksoft">{state.artistName}</span>
        </div>
      </button>
    );
  }
  if (state.status === 'locked') {
    return (
      <div className="aspect-square rounded-xl border-2 border-amber-500 bg-amber-100 p-2 font-serif text-3xl text-amber-900">
        <div className="flex h-full flex-col items-center justify-between">
          <span>{state.letter}</span>
          <span className="text-[10px] uppercase tracking-wider">Drawing…</span>
        </div>
      </div>
    );
  }
  return (
    <Link
      href={`/draw/${state.letter}`}
      className="aspect-square rounded-xl border-2 border-dashed border-stone-300 bg-cream p-2 font-serif text-3xl text-ink hover:bg-stone-100"
      aria-label={`Draw ${state.letter}`}
    >
      <div className="flex h-full items-center justify-center">{state.letter}</div>
    </Link>
  );
}
