'use client';

import Link from 'next/link';

export type LetterState =
  | { letter: string; status: 'available' }
  | { letter: string; status: 'locked'; artistName: string | null; subject: string | null }
  | { letter: string; status: 'done'; artistName: string; subject: string; thumbnailUrl: string };

const CRAYON_ACCENTS = ['#E66B4A', '#3A7D7B', '#E8A93C', '#E89AA8', '#8FA479', '#7B4B6B'] as const;

function deterministic(letter: string) {
  const i = letter.charCodeAt(0) - 65;
  const tilt = ((i * 37) % 7) - 3; // -3..+3 degrees
  const accent = CRAYON_ACCENTS[i % CRAYON_ACCENTS.length];
  const delayMs = 60 + i * 28;
  return { tilt, accent, delayMs, index: i };
}

export function AlphabetCell({
  state,
  onView,
}: {
  state: LetterState;
  onView: (s: LetterState & { status: 'done' }) => void;
}) {
  const { tilt, accent, delayMs } = deterministic(state.letter);
  const style = {
    ['--tilt' as string]: `${tilt}deg`,
    ['--tilt-from' as string]: `${tilt * 1.6}deg`,
    animationDelay: `${delayMs}ms`,
  } as React.CSSProperties;

  if (state.status === 'done') {
    return (
      <button
        onClick={() => onView(state)}
        style={style}
        className="group relative aspect-[3/4] animate-page-in overflow-hidden rounded-[6px] bg-paper-deep text-left ink-shadow transition-transform duration-300 will-change-transform hover:-translate-y-1 hover:[transform:rotate(calc(var(--tilt)*0.4))_translateY(-4px)]"
        aria-label={`${state.letter} is for ${state.subject}, drawn by ${state.artistName}. View.`}
      >
        <img
          src={state.thumbnailUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-multiply"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(251,244,228,0.0) 35%, rgba(251,244,228,0.62) 70%, rgba(251,244,228,0.92) 100%)',
          }}
        />
        <span
          aria-hidden="true"
          className="absolute left-2 top-1 font-display text-[2.6rem] leading-none text-nib"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 600' }}
        >
          {state.letter}
        </span>
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 h-2 w-2 rounded-full"
          style={{ background: accent, boxShadow: `0 0 0 3px ${accent}22` }}
        />
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-1.5">
          <div className="font-hand text-[15px] leading-tight text-nib">{state.subject}</div>
          <div className="mt-0.5 font-hand text-[12px] leading-tight text-nibsoft">— {state.artistName}</div>
        </div>
      </button>
    );
  }

  if (state.status === 'locked') {
    return (
      <div
        style={style}
        className="relative aspect-[3/4] animate-page-in overflow-hidden rounded-[6px] bg-paper-deep ink-shadow"
        aria-label={`${state.letter} is being drawn`}
      >
        <div className="absolute inset-0 grain grain-soft" aria-hidden="true" />
        <span
          aria-hidden="true"
          className="absolute left-2 top-1 font-display text-[2.6rem] leading-none text-nib/40"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 600' }}
        >
          {state.letter}
        </span>
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="animate-pulse-stamp rounded-sm border-2 border-coral/80 px-2 py-1 font-display text-[10px] uppercase tracking-eyebrow text-coral"
            style={{ fontVariationSettings: '"wght" 700' }}
          >
            In progress
          </div>
        </div>
        {state.artistName ? (
          <div className="absolute bottom-2 left-0 right-0 text-center font-hand text-[12px] text-nibsoft">
            {state.artistName} is drawing…
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={`/draw/${state.letter}`}
      style={style}
      className="group relative aspect-[3/4] animate-page-in overflow-hidden rounded-[6px] bg-paper ink-shadow transition-transform duration-300 will-change-transform hover:-translate-y-1 hover:[transform:rotate(calc(var(--tilt)*0.2))_translateY(-4px)]"
      aria-label={`Draw the letter ${state.letter}`}
    >
      <div className="absolute inset-0 grain grain-soft" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-2 rounded-[3px] opacity-50 transition-opacity duration-300 group-hover:opacity-90"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, transparent 0 6px, rgba(42,31,23,0.18) 6px 7px)',
          maskImage: 'radial-gradient(closest-side, black 60%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(closest-side, black 60%, transparent 100%)',
        }}
      />
      <span
        className="absolute inset-0 grid place-items-center font-display text-[3.6rem] leading-none text-nib transition-transform duration-300 group-hover:scale-105"
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1, "wght" 500' }}
      >
        {state.letter}
      </span>
      <span
        aria-hidden="true"
        className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full opacity-60 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: accent }}
      />
      <div className="absolute bottom-2 left-0 right-0 text-center font-hand text-[12px] text-nibsoft opacity-80 transition-opacity duration-300 group-hover:opacity-100">
        your page →
      </div>
    </Link>
  );
}
