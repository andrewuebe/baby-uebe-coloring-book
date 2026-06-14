'use client';

import { useEffect, useRef } from 'react';
import { renderStrokes } from '@/lib/drawing/render';
import type { Stroke } from '@/lib/drawing/strokes';

const THUMB_W = 400;
const THUMB_H = 518; // 400 * (11/8.5) rounded
const CAPTION_BAND_FRACTION = 360 / 3300;

function PageThumbnail({
  strokes,
  caption,
  label,
}: {
  strokes: Stroke[];
  caption: { letter: string; subject: string };
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = THUMB_W * ratio;
    canvas.height = THUMB_H * ratio;
    canvas.style.width = `${THUMB_W}px`;
    canvas.style.height = `${THUMB_H}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawingH = canvas.height * (1 - CAPTION_BAND_FRACTION);
    renderStrokes(ctx, strokes, { width: canvas.width, height: drawingH });

    // Caption band background.
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, drawingH, canvas.width, canvas.height - drawingH);
    ctx.fillStyle = '#2a2a2a';
    ctx.font = `600 ${Math.round(28 * ratio)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const captionY = drawingH + (canvas.height - drawingH) / 2;
    ctx.fillText(`${caption.letter} is for ${caption.subject}`, canvas.width / 2, captionY);
    ctx.restore();
  }, [strokes, caption.letter, caption.subject]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-[6px] bg-white ink-shadow ring-1 ring-nib/10">
        <canvas ref={ref} className="block rounded-[6px]" />
      </div>
      <div className="font-display text-[10px] uppercase tracking-eyebrow text-nibsoft">
        {label}
      </div>
    </div>
  );
}

export function PreviewModal({
  originalStrokes,
  transformedStrokes,
  caption,
  busy,
  onBack,
  onUseOriginal,
  onUseCleaned,
}: {
  originalStrokes: Stroke[];
  transformedStrokes: Stroke[];
  caption: { letter: string; subject: string };
  busy?: boolean;
  onBack: () => void;
  onUseOriginal: () => void;
  onUseCleaned: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-nib/40 p-4 backdrop-blur-[2px]">
      <div className="relative w-full max-w-3xl animate-rise-in overflow-hidden rounded-[6px] bg-paper p-6 ink-shadow ring-1 ring-nib/10 md:p-8">
        <div aria-hidden="true" className="grain grain-soft pointer-events-none absolute inset-0" />
        <div className="relative">
          <h2
            className="font-display text-2xl leading-none text-nib md:text-3xl"
            style={{ fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500' }}
          >
            Want us to clean it up?
          </h2>
          <p className="mt-2 font-body text-sm text-nibsoft">
            We&rsquo;ll center your drawing and size it nicely for the printed book.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-6 md:flex-row md:items-start">
            <PageThumbnail strokes={originalStrokes} caption={caption} label="As you drew it" />
            <PageThumbnail strokes={transformedStrokes} caption={caption} label="Centered & resized" />
          </div>

          <div className="mt-7 flex flex-col items-stretch justify-end gap-2 md:flex-row md:items-center md:gap-1">
            <button
              onClick={onBack}
              disabled={busy}
              className="rounded-[3px] px-4 py-2 font-display text-[11px] uppercase tracking-eyebrow text-nibsoft transition-colors hover:text-nib disabled:opacity-40"
            >
              Back to drawing
            </button>
            <button
              onClick={onUseOriginal}
              disabled={busy}
              className="rounded-[3px] border border-nib/30 bg-cream px-5 py-2.5 font-display text-[11px] uppercase tracking-eyebrow text-nib transition-colors hover:border-nib/60 disabled:opacity-40"
            >
              Use my original
            </button>
            <button
              onClick={onUseCleaned}
              disabled={busy}
              className="rounded-[3px] bg-ink px-5 py-2.5 font-display text-[11px] uppercase tracking-eyebrow text-cream transition-opacity hover:bg-nib disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Use this'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
