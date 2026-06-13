'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AlphabetCell, type LetterState } from './AlphabetCell';
import { EntryLightbox } from './EntryLightbox';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AlphabetGrid({ initial }: { initial: { letters: LetterState[] } }) {
  const { data } = useSWR<{ letters: LetterState[] }>('/api/state', fetcher, {
    fallbackData: initial,
    refreshInterval: 10_000,
  });
  const [viewing, setViewing] = useState<(LetterState & { status: 'done' }) | null>(null);
  const letters = data?.letters ?? [];
  return (
    <>
      <div className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-5 sm:gap-x-4 md:grid-cols-7 md:gap-x-5 md:gap-y-7">
        {letters.map((l) => (
          <AlphabetCell key={l.letter} state={l} onView={setViewing} />
        ))}
      </div>
      {viewing ? <EntryLightbox entry={viewing} onClose={() => setViewing(null)} /> : null}
    </>
  );
}
