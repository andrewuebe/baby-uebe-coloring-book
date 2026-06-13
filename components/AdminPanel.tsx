'use client';

import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type StateBody = {
  letters: (
    | { letter: string; status: 'available' }
    | { letter: string; status: 'locked'; artistName: string | null; subject: string | null }
    | { letter: string; status: 'done'; artistName: string; subject: string; thumbnailUrl: string }
  )[];
};

export function AdminPanel({ adminKey }: { adminKey: string }) {
  const { data, mutate } = useSWR<StateBody>('/api/state', fetcher, { refreshInterval: 5000 });
  const [busy, setBusy] = useState<string | null>(null);

  async function unlock(letter: string) {
    setBusy(letter);
    await fetch(`/api/admin/unlock?key=${encodeURIComponent(adminKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ letter }),
    });
    await mutate();
    setBusy(null);
  }

  async function deleteEntry(letter: string) {
    if (!confirm(`Delete entry for ${letter}?`)) return;
    setBusy(letter);
    await fetch(`/api/admin/entries/${letter}?key=${encodeURIComponent(adminKey)}`, { method: 'DELETE' });
    await mutate();
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      <a
        href={`/api/admin/zip?key=${encodeURIComponent(adminKey)}`}
        className="inline-block rounded-lg bg-ink px-4 py-2 font-semibold text-cream"
      >
        Download all as ZIP
      </a>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Letter</th>
            <th className="p-2">Status</th>
            <th className="p-2">Artist</th>
            <th className="p-2">Subject</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.letters.map((l) => (
            <tr key={l.letter} className="border-b">
              <td className="p-2 font-serif text-xl">{l.letter}</td>
              <td className="p-2">{l.status}</td>
              <td className="p-2">{l.status === 'available' ? '' : l.artistName ?? '(unnamed)'}</td>
              <td className="p-2">{l.status === 'available' ? '' : l.subject ?? ''}</td>
              <td className="p-2 space-x-2">
                {l.status === 'locked' && (
                  <button disabled={busy === l.letter} onClick={() => unlock(l.letter)} className="underline">
                    Unlock
                  </button>
                )}
                {l.status === 'done' && (
                  <>
                    <a href={l.thumbnailUrl} target="_blank" rel="noreferrer" className="underline">
                      Open
                    </a>
                    <button
                      disabled={busy === l.letter}
                      onClick={() => deleteEntry(l.letter)}
                      className="underline text-red-600"
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
