'use client';

import { useState } from 'react';

export function NameModal({
  letter,
  onSubmit,
  onCancel,
  busy,
}: {
  letter: string;
  onSubmit: (artistName: string, subject: string) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [artistName, setArtistName] = useState('');
  const [subject, setSubject] = useState('');
  const canSubmit = artistName.trim().length > 0 && subject.trim().length > 0 && !busy;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <form
        className="w-full max-w-md space-y-4 rounded-2xl bg-cream p-6 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit(artistName.trim(), subject.trim());
        }}
      >
        <h2 className="font-serif text-2xl">You picked {letter}!</h2>
        <label className="block">
          <span className="text-sm font-medium">Who&apos;s drawing?</span>
          <input
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Uncle Daniel"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{letter} is for…</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Apple"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-inksoft">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-ink px-4 py-2 font-semibold text-cream disabled:opacity-50"
          >
            Start drawing
          </button>
        </div>
      </form>
    </div>
  );
}
