'use client';

import { useEffect, useState } from 'react';
import { LuX } from 'react-icons/lu';
import type { Photo } from '@/lib/reference';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'ready'; photos: Photo[]; cursor: number };

export function ReferenceModal({
  subject,
  cachedPhotos,
  onCache,
  onClose,
}: {
  subject: string;
  cachedPhotos: Photo[] | null;
  onCache: (photos: Photo[]) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<LoadState>(() => {
    if (cachedPhotos === null) return { kind: 'loading' };
    if (cachedPhotos.length === 0) return { kind: 'empty' };
    return { kind: 'ready', photos: cachedPhotos, cursor: 0 };
  });

  async function load() {
    setState({ kind: 'loading' });
    try {
      const res = await fetch(`/api/reference?q=${encodeURIComponent(`cartoon ${subject}`)}`);
      if (!res.ok) {
        setState({ kind: 'error', message: "Couldn't reach the image library. Try again?" });
        return;
      }
      const body = (await res.json()) as { photos: Photo[] };
      onCache(body.photos);
      if (body.photos.length === 0) {
        setState({ kind: 'empty' });
      } else {
        setState({ kind: 'ready', photos: body.photos, cursor: 0 });
      }
    } catch {
      setState({ kind: 'error', message: "Couldn't reach the image library. Try again?" });
    }
  }

  useEffect(() => {
    if (cachedPhotos === null) void load();
    // We intentionally only load on first mount; cache persists across opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function next() {
    setState((s) => {
      if (s.kind !== 'ready') return s;
      return { ...s, cursor: (s.cursor + 1) % s.photos.length };
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-nib/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md animate-rise-in overflow-hidden rounded-[6px] bg-paper p-5 ink-shadow ring-1 ring-nib/10 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close reference"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-[3px] text-nibsoft transition-colors hover:text-nib"
        >
          <LuX />
        </button>
        <h2
          className="pr-10 font-display text-xl leading-none text-nib"
          style={{ fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500' }}
        >
          Reference for &ldquo;{subject}&rdquo;
        </h2>

        <div className="mt-4 grid aspect-square w-full place-items-center overflow-hidden rounded-[4px] bg-paper-deep ring-1 ring-nib/10">
          {state.kind === 'loading' && (
            <div className="font-display text-[10px] uppercase tracking-eyebrow text-nibsoft">
              Looking…
            </div>
          )}
          {state.kind === 'empty' && (
            <div className="px-4 text-center font-body text-sm text-nibsoft">
              We couldn&rsquo;t find a reference for &ldquo;{subject}&rdquo;.
              <br />You&rsquo;ve got this.
            </div>
          )}
          {state.kind === 'error' && (
            <div className="flex flex-col items-center gap-3 px-4 text-center">
              <div className="font-body text-sm text-nibsoft">{state.message}</div>
              <button
                onClick={load}
                className="rounded-[3px] border border-nib/30 bg-cream px-4 py-1.5 font-display text-[10px] uppercase tracking-eyebrow text-nib transition-colors hover:border-nib/60"
              >
                Retry
              </button>
            </div>
          )}
          {state.kind === 'ready' && (
            <img
              src={state.photos[state.cursor].srcMedium}
              alt={state.photos[state.cursor].alt}
              className="h-full w-full object-contain"
            />
          )}
        </div>

        {state.kind === 'ready' && (
          <>
            <div className="mt-2 text-center font-hand text-xs text-nibsoft">
              Photo by {state.photos[state.cursor].photographer} on Pexels
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={next}
                disabled={state.photos.length <= 1}
                className="rounded-[3px] border border-nib/30 bg-cream px-4 py-2 font-display text-[11px] uppercase tracking-eyebrow text-nib transition-colors hover:border-nib/60 disabled:opacity-40"
              >
                Show me another
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
