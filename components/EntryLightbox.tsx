'use client';

import { useEffect } from 'react';

export function EntryLightbox({
  entry,
  onClose,
}: {
  entry: { letter: string; subject: string; artistName: string; thumbnailUrl: string };
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-3xl flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={entry.thumbnailUrl}
          alt={`${entry.letter} is for ${entry.subject}, by ${entry.artistName}`}
          className="max-h-[80vh] rounded-md bg-white object-contain shadow-2xl"
        />
        <div className="mt-3 text-center font-serif text-lg text-cream">
          {entry.letter} is for {entry.subject} · by {entry.artistName}
        </div>
        <button
          onClick={onClose}
          className="mt-4 rounded-full bg-cream px-6 py-2 font-semibold text-ink"
        >
          Close
        </button>
      </div>
    </div>
  );
}
