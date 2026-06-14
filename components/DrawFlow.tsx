'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { DrawCanvas } from './DrawCanvas';
import { NameModal } from './NameModal';
import { startHeartbeat } from '@/lib/heartbeat';
import { exportToBlob } from '@/lib/drawing/export';
import { createHistory, type History } from '@/lib/drawing/strokes';

type Phase = 'acquiring' | 'unavailable' | 'naming' | 'drawing' | 'submitting' | 'submitted' | 'lock_lost';

export function DrawFlow({ letter }: { letter: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('acquiring');
  const [lockToken, setLockToken] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [artist, setArtist] = useState('');
  const [subject, setSubject] = useState('');
  const [history, setHistory] = useState<History>(createHistory());
  const stopHbRef = useRef<(() => void) | null>(null);
  const acquiredFor = useRef<string | null>(null);

  const acquire = useCallback(async () => {
    setPhase('acquiring');
    const res = await fetch('/api/locks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ letter }),
    });
    if (res.status === 201) {
      const body = await res.json();
      setLockToken(body.lock_token);
      setPhase('naming');
      return;
    }
    const body = await res.json().catch(() => ({}));
    setErrorReason(body.reason ?? 'unknown');
    setPhase('unavailable');
  }, [letter]);

  useEffect(() => {
    if (acquiredFor.current === letter) return;
    acquiredFor.current = letter;
    void acquire();
  }, [letter, acquire]);

  useEffect(() => {
    if (phase !== 'drawing' || !lockToken) return;
    const handle = startHeartbeat(letter, lockToken, (e) => {
      if (e === 'lost') setPhase('lock_lost');
    });
    stopHbRef.current = handle.stop;
    return () => handle.stop();
  }, [phase, lockToken, letter]);

  async function handleNameSubmit(artistName: string, subj: string) {
    if (!lockToken) return;
    setArtist(artistName);
    setSubject(subj);
    await fetch('/api/locks', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ letter, lock_token: lockToken, artist_name: artistName, subject: subj }),
    });
    setPhase('drawing');
  }

  async function handleSubmit() {
    if (!lockToken) return;
    setPhase('submitting');
    try {
      const blob = await exportToBlob(history.strokes, { letter, subject });
      const uploaded = await upload(`${letter}-${Date.now()}.png`, blob, {
        access: 'public',
        handleUploadUrl: '/api/blob-upload',
      });
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          letter,
          lock_token: lockToken,
          artist_name: artist,
          subject,
          image_url: uploaded.url,
          stroke_data: history.strokes,
        }),
      });
      if (res.status === 201) {
        setPhase('submitted');
        stopHbRef.current?.();
        router.push('/');
        return;
      }
      const body = await res.json().catch(() => ({}));
      setErrorReason(body.reason ?? 'unknown');
      setPhase('lock_lost');
    } catch (err) {
      console.error(err);
      setErrorReason('network');
      setPhase('drawing');
    }
  }

  async function handleCancel() {
    if (lockToken) {
      await fetch('/api/locks', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ letter, lock_token: lockToken }),
      });
    }
    router.push('/');
  }

  if (phase === 'acquiring') {
    return (
      <CenterMessage>
        <div className="font-display text-[10px] uppercase tracking-eyebrow text-nibsoft">
          One moment
        </div>
        <div
          className="mt-2 font-display text-2xl text-nib"
          style={{ fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500' }}
        >
          Reserving {letter}…
        </div>
      </CenterMessage>
    );
  }
  if (phase === 'unavailable') {
    const msg = errorReason === 'done' ? `${letter} is already finished.` : `${letter} is being drawn right now.`;
    return (
      <CenterMessage>
        <div
          className="font-display text-2xl text-nib"
          style={{ fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500' }}
        >
          {msg}
        </div>
        <button
          onClick={() => router.push('/')}
          className="mt-5 rounded-[3px] bg-ink px-5 py-2.5 font-display text-[11px] uppercase tracking-eyebrow text-cream transition-opacity hover:bg-nib"
        >
          Back to the book
        </button>
      </CenterMessage>
    );
  }
  if (phase === 'naming') return <NameModal letter={letter} onSubmit={handleNameSubmit} onCancel={handleCancel} />;
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-paper-sheet">
      <div aria-hidden="true" className="grain pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-6 md:px-8 md:pt-10">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-6">
          <div className="min-w-0">
            <div className="font-display text-[10px] uppercase tracking-eyebrow text-nibsoft">
              Drawing for Baby Uebe
            </div>
            <h1
              className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-display leading-none text-nib"
              style={{ fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500' }}
            >
              <span
                className="text-coral"
                style={{
                  fontSize: 'clamp(2.4rem, 7vw, 3rem)',
                  fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1, "wght" 500',
                  lineHeight: 0.85,
                }}
              >
                {letter}
              </span>
              <span className="text-xl md:text-2xl">is for</span>
              <span className="crayon-underline text-xl md:text-2xl">{subject}</span>
            </h1>
            <div className="mt-1 font-hand text-base text-nibsoft">— by {artist}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
            <button
              onClick={handleCancel}
              className="rounded-[3px] px-4 py-2 font-display text-[11px] uppercase tracking-eyebrow text-nibsoft transition-colors hover:text-nib"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={history.strokes.length === 0 || phase === 'submitting'}
              className="rounded-[3px] bg-ink px-5 py-2.5 font-display text-[11px] uppercase tracking-eyebrow text-cream transition-opacity hover:bg-nib disabled:opacity-40"
            >
              {phase === 'submitting' ? 'Saving…' : 'Submit page'}
            </button>
          </div>
        </header>

        {phase === 'lock_lost' && (
          <div className="mb-4 rounded-[3px] border border-coral/40 bg-coral/10 px-4 py-3 font-body text-sm text-nib">
            This letter got freed up. Your drawing is still here — try submitting again to claim it.
            <button
              onClick={acquire}
              className="ml-2 font-display text-[11px] uppercase tracking-eyebrow text-coral underline"
            >
              Retry now
            </button>
          </div>
        )}

        <DrawCanvas onHistoryChange={setHistory} />
      </div>
    </main>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper-sheet p-6 text-center">
      <div aria-hidden="true" className="grain pointer-events-none absolute inset-0" />
      <div className="relative flex flex-col items-center">{children}</div>
    </main>
  );
}
