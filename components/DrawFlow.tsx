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

  if (phase === 'acquiring') return <CenterMessage>Reserving {letter}…</CenterMessage>;
  if (phase === 'unavailable') {
    const msg = errorReason === 'done' ? `${letter} is already finished.` : `${letter} is being drawn right now.`;
    return (
      <CenterMessage>
        {msg}
        <button onClick={() => router.push('/')} className="mt-4 rounded-lg bg-ink px-4 py-2 text-cream">Back</button>
      </CenterMessage>
    );
  }
  if (phase === 'naming') return <NameModal letter={letter} onSubmit={handleNameSubmit} onCancel={handleCancel} />;
  return (
    <main className="mx-auto max-w-4xl p-4">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-inksoft">Drawing for Baby Uebe</div>
          <div className="font-serif text-lg">{letter} is for {subject} · by {artist}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCancel} className="rounded-lg px-3 py-2 text-inksoft">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={history.strokes.length === 0 || phase === 'submitting'}
            className="rounded-lg bg-ink px-4 py-2 font-semibold text-cream disabled:opacity-50"
          >
            {phase === 'submitting' ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </header>
      {phase === 'lock_lost' && (
        <div className="mb-3 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
          This letter was freed up. Your drawing is still here — try submitting again to claim it.
          <button onClick={acquire} className="ml-2 underline">Retry now</button>
        </div>
      )}
      <DrawCanvas onHistoryChange={setHistory} />
    </main>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center p-6 text-center">{children}</main>;
}
