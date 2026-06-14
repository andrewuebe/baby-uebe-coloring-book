'use client';

import { useState } from 'react';

const ARTIST_PLACEHOLDERS = [
  'Uncle Daniel',
  'Grandma Laura',
  'Grandpa Kevin',
  'Uncle Nick',
  'Aunt Sara',
  'Uncle Chris',
  'Auntie Dani',
  'Uncle James',
  'Grandma Anne',
];

const SUBJECT_PLACEHOLDERS: Record<string, string[]> = {
  A: ['Apple', 'Ant', 'Acorn'],
  B: ['Bunny', 'Bear', 'Bubble', 'Balloon'],
  C: ['Cat', 'Cookie', 'Cloud', 'Crown'],
  D: ['Dog', 'Duck', 'Donut', 'Dragon'],
  E: ['Egg', 'Elephant', 'Elf'],
  F: ['Frog', 'Fish', 'Fox', 'Fairy'],
  G: ['Giraffe', 'Ghost', 'Grapes'],
  H: ['Hippo', 'Hat', 'Heart'],
  I: ['Ice cream', 'Igloo', 'Inchworm'],
  J: ['Jet', 'Jellybean', 'Jellyfish'],
  K: ['Kitten', 'Kite', 'Koala'],
  L: ['Lion', 'Ladybug', 'Lollipop'],
  M: ['Mouse', 'Moon', 'Muffin'],
  N: ['Nest', 'Noodle', 'Narwhal'],
  O: ['Owl', 'Octopus', 'Orange'],
  P: ['Puppy', 'Pancake', 'Penguin'],
  Q: ['Queen', 'Quilt', 'Quail'],
  R: ['Rainbow', 'Robot', 'Rabbit'],
  S: ['Sun', 'Snail', 'Star'],
  T: ['Turtle', 'Tiger', 'Teddy'],
  U: ['Umbrella', 'Unicorn', 'Ukulele'],
  V: ['Violin', 'Volcano', 'Van'],
  W: ['Whale', 'Wizard', 'Worm'],
  X: ['Xylophone', 'X-ray', 'X marks the spot'],
  Y: ['Yo-yo', 'Yak', 'Yarn'],
  Z: ['Zebra', 'Zigzag', 'Zipper'],
};

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

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
  const [artistExample] = useState(() => pickRandom(ARTIST_PLACEHOLDERS));
  const [subjectExample] = useState(() => {
    const options = SUBJECT_PLACEHOLDERS[letter.toUpperCase()] ?? ['something fun'];
    return pickRandom(options);
  });
  const canSubmit = artistName.trim().length > 0 && subject.trim().length > 0 && !busy;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-nib/30 p-4 backdrop-blur-[2px]">
      <form
        className="relative w-full max-w-md animate-rise-in overflow-hidden rounded-[6px] bg-paper p-7 ink-shadow ring-1 ring-nib/10 md:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit(artistName.trim(), subject.trim());
        }}
      >
        <div aria-hidden="true" className="grain grain-soft pointer-events-none absolute inset-0" />

        <div className="relative">
          <h2 className="flex items-baseline gap-2 font-display leading-none text-nib">
            <span
              className="text-2xl md:text-3xl"
              style={{ fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500' }}
            >
              You picked
            </span>
            <span
              className="text-coral"
              style={{
                fontSize: 'clamp(3rem, 12vw, 4rem)',
                fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1, "wght" 500',
                lineHeight: 0.85,
              }}
            >
              {letter}
            </span>
            <span
              className="text-2xl md:text-3xl"
              style={{ fontVariationSettings: '"opsz" 60, "SOFT" 100, "wght" 500' }}
            >
              !
            </span>
          </h2>

          <div className="mt-7 space-y-5">
            <Field
              label="Who's drawing?"
              value={artistName}
              onChange={setArtistName}
              example={artistExample}
              autoFocus
            />
            <Field
              label={`${letter} is for…`}
              value={subject}
              onChange={setSubject}
              example={subjectExample}
            />
          </div>

          <div className="mt-7 flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[3px] px-4 py-2 font-display text-[11px] uppercase tracking-eyebrow text-nibsoft transition-colors hover:text-nib"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-[3px] bg-ink px-5 py-2.5 font-display text-[11px] uppercase tracking-eyebrow text-cream transition-opacity hover:bg-nib disabled:opacity-40"
            >
              Start drawing
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  example,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  example: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span
        className="block font-display text-base text-nib"
        style={{ fontVariationSettings: '"opsz" 24, "SOFT" 100, "wght" 550' }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="mt-1.5 w-full rounded-[3px] border border-nib/20 bg-cream/60 px-3 py-2.5 font-body text-base text-nib outline-none transition-colors focus:border-coral focus:ring-2 focus:ring-coral/15"
      />
      <span className="mt-1.5 block font-hand text-sm text-nibsoft">
        for example, {example}
      </span>
    </label>
  );
}
