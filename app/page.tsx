import Link from 'next/link';
import { AlphabetGrid } from '@/components/AlphabetGrid';
import type { LetterState } from '@/components/AlphabetCell';
import { GET as getState } from '@/app/api/state/route';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const res = await getState();
  const initial = (await res.json()) as { letters: LetterState[] };
  const letters = initial.letters ?? [];
  const done = letters.filter((l) => l.status === 'done').length;
  const inProgress = letters.filter((l) => l.status === 'locked').length;
  const waiting = letters.filter((l) => l.status === 'available').length;
  const recentArtists = letters
    .filter((l): l is LetterState & { status: 'done' } => l.status === 'done')
    .map((l) => l.artistName)
    .filter((n, i, a) => a.indexOf(n) === i)
    .slice(0, 4);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-paper-sheet">
      <div aria-hidden="true" className="grain pointer-events-none absolute inset-0" />

      {/* Corner decorations */}
      <CornerMark className="absolute left-6 top-8 hidden text-coral/70 md:block" />
      <StarMark className="absolute right-10 top-12 hidden text-sun/80 md:block" />
      <ScribbleMark className="absolute left-8 bottom-24 hidden text-marine/60 lg:block" />
      <HeartMark className="absolute right-8 bottom-32 hidden text-rose/80 lg:block" />

      <div className="relative mx-auto max-w-5xl px-5 pb-24 pt-12 md:px-10 md:pt-20">
        {/* Top meta row */}
        <div className="mb-12 flex items-start justify-between gap-4 md:mb-16">
          <VolumeStamp />
          <div className="text-right">
            <div className="font-display text-[10px] uppercase tracking-eyebrow text-nibsoft">
              San Diego · June 2026
            </div>
            <div className="mt-1 font-hand text-base text-nib/80">at Uncle James & Auntie Dani’s house!</div>
          </div>
        </div>

        {/* Hero */}
        <header className="relative mb-14 text-center md:mb-20">
          <div className="mb-3 font-display text-[11px] uppercase tracking-eyebrow text-nibsoft">
            Twenty-six letters · One little book
          </div>

          <h1 className="animate-rise-in">
            <span className="flex items-baseline justify-center gap-3 leading-none md:gap-6">
              <span className="font-body italic text-nibsoft text-xl md:text-3xl">from</span>
              <span
                className="font-display text-coral"
                style={{
                  fontSize: 'clamp(7rem, 18vw, 14rem)',
                  fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1, "wght" 500',
                  lineHeight: 0.85,
                }}
              >
                A
              </span>
              <span className="font-body italic text-nibsoft text-xl md:text-3xl">to</span>
              <span
                className="font-display text-marine"
                style={{
                  fontSize: 'clamp(7rem, 18vw, 14rem)',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1, "wght" 500',
                  lineHeight: 0.85,
                }}
              >
                Z
              </span>
            </span>
          </h1>

          <div
            className="mt-4 animate-rise-in font-display text-2xl text-nib md:text-4xl"
            style={{ animationDelay: '120ms', fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 400' }}
          >
            <span className="crayon-underline">Baby Uebe&rsquo;s</span> Coloring Book
          </div>

          <p
            className="mx-auto mt-6 max-w-xl animate-rise-in font-hand text-xl text-nib/80 md:text-2xl"
            style={{ animationDelay: '240ms', transform: 'rotate(-1deg)' }}
          >
            Pick a letter. Draw something silly or sweet.
            <br />
            We&rsquo;ll bind it all into a book she can color in someday.
          </p>

          <div
            className="mx-auto mt-10 flex max-w-2xl animate-rise-in flex-wrap items-stretch justify-center gap-y-3 text-nib"
            style={{ animationDelay: '360ms' }}
          >
            <StatCell value={letters.length} label="letters" />
            <StatDivider />
            <StatCell value={done} label="drawn" accent="text-coral" />
            <StatDivider />
            <StatCell value={inProgress} label="in progress" accent="text-sun" />
            <StatDivider />
            <StatCell value={waiting} label="waiting" accent="text-marine" />
          </div>

          {recentArtists.length > 0 ? (
            <div
              className="mt-6 animate-rise-in font-hand text-base text-nibsoft md:text-lg"
              style={{ animationDelay: '480ms' }}
            >
              signed so far by{' '}
              <span className="text-nib">
                {recentArtists.slice(0, -1).join(', ')}
                {recentArtists.length > 1 ? ' & ' : ''}
                {recentArtists[recentArtists.length - 1]}
              </span>
              {done > recentArtists.length ? (
                <span className="text-nibsoft"> and {done - recentArtists.length} more</span>
              ) : null}
            </div>
          ) : null}
        </header>

        {/* Section break */}
        <section className="mb-8 flex items-end justify-between gap-6 md:mb-10">
          <div>
            <div className="font-display text-[10px] uppercase tracking-eyebrow text-nibsoft">
              Table of contents
            </div>
            <h2
              className="mt-1 font-display text-2xl text-nib md:text-3xl"
              style={{ fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500' }}
            >
              The book so far
            </h2>
          </div>
          <div className="hidden items-end gap-3 font-hand text-nibsoft sm:flex">
            <span className="pb-1">tap an empty page →</span>
            <ArrowDownMark className="text-marine" />
          </div>
        </section>

        <AlphabetGrid initial={initial} />

        <footer className="mt-20 flex flex-col items-center gap-3 text-center">
          <DividerMark className="text-nibfaint" />
          <p className="font-hand text-lg text-nibsoft">
            made with crayons & love by the people who love her already
          </p>
        </footer>
      </div>
    </main>
  );
}

function StatCell({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center px-4 md:px-6">
      <span
        className={`font-display text-4xl leading-none md:text-5xl ${accent ?? 'text-nib'}`}
        style={{ fontVariationSettings: '"opsz" 96, "SOFT" 100, "wght" 500' }}
      >
        {value.toString().padStart(2, '0')}
      </span>
      <span className="mt-2 font-display text-[10px] uppercase tracking-eyebrow text-nibsoft">
        {label}
      </span>
    </div>
  );
}

function StatDivider() {
  return <div aria-hidden="true" className="self-stretch w-px bg-nib/15" />;
}

function VolumeStamp() {
  return (
    <div
      className="relative inline-flex select-none flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-coral/70 bg-paper/60 px-3 py-1.5 text-coral"
      style={{ transform: 'rotate(-6deg)' }}
      aria-hidden="true"
    >
      <span
        className="font-display text-[9px] uppercase tracking-eyebrow"
        style={{ fontVariationSettings: '"wght" 700' }}
      >
        One of a kind
      </span>
      <span
        className="font-display text-[8px] uppercase tracking-eyebrow opacity-80"
        style={{ fontVariationSettings: '"wght" 500' }}
      >
        For Baby Uebe
      </span>
    </div>
  );
}

function CornerMark({ className }: { className?: string }) {
  return (
    <svg className={className} width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path
        d="M10 110 C 40 60, 60 30, 110 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="3 7"
      />
      <circle cx="110" cy="10" r="3.5" fill="currentColor" />
    </svg>
  );
}

function StarMark({ className }: { className?: string }) {
  return (
    <svg className={`animate-sway ${className ?? ''}`} width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <path
        d="M28 6 L33 23 L51 24 L36.5 35 L42 51 L28 41 L14 51 L19.5 35 L5 24 L23 23 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function ScribbleMark({ className }: { className?: string }) {
  return (
    <svg className={className} width="160" height="60" viewBox="0 0 160 60" fill="none" aria-hidden="true">
      <path
        d="M5 30 C 20 5, 30 55, 45 30 S 70 5, 85 30 S 110 55, 125 30 S 150 5, 155 30"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function HeartMark({ className }: { className?: string }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M24 41 C 8 28, 4 18, 12 12 C 18 8, 22 12, 24 16 C 26 12, 30 8, 36 12 C 44 18, 40 28, 24 41 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function ArrowDownMark({ className }: { className?: string }) {
  return (
    <svg className={className} width="38" height="38" viewBox="0 0 38 38" fill="none" aria-hidden="true">
      <path
        d="M19 4 C 22 14, 12 18, 19 28"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M13 22 L19 30 L25 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function DividerMark({ className }: { className?: string }) {
  return (
    <svg className={className} width="180" height="20" viewBox="0 0 180 20" fill="none" aria-hidden="true">
      <path
        d="M5 10 C 25 2, 35 18, 55 10 S 95 2, 115 10 S 155 18, 175 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
