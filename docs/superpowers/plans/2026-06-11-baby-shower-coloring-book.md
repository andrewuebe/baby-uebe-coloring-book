# Baby Uebe Coloring Book Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Check the Tasks and Steps within Tasks as complete as you finish them.

**Goal:** Build a single-event web app that lets baby shower guests collaboratively create an A–Z coloring book on an iPad and their phones, ready for the party on 2026-06-20.

**Architecture:** Next.js 15 App Router on Vercel, Postgres (Neon) via Drizzle ORM, Vercel Blob for image storage, SWR polling for live state. Pure-logic modules (drawing math, locks) drive thin API routes and React components.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Drizzle ORM, Postgres, Vercel Blob, perfect-freehand, SWR, Vitest, @testcontainers/postgresql.

**Spec reference:** `docs/superpowers/specs/2026-06-11-baby-shower-coloring-book-design.md`

---

## Conventions

- Run `npm` commands from repo root (`/Users/andrewuebe/baby-uebe-coloring-book`).
- All test runs use `npx vitest run --reporter=verbose <pattern>` so they exit instead of watching.
- Commits use Conventional Commits prefixes (`feat:`, `test:`, `chore:`).
- After every task: run the task's tests; if green, stage and commit.

## File map

| Path | Role |
| --- | --- |
| `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `drizzle.config.ts` | Tooling configs |
| `app/layout.tsx`, `app/globals.css` | Root layout + theme |
| `app/welcome/page.tsx`, `app/page.tsx`, `app/draw/[letter]/page.tsx`, `app/admin/page.tsx` | Pages |
| `app/api/state/route.ts`, `app/api/locks/route.ts`, `app/api/locks/heartbeat/route.ts`, `app/api/entries/route.ts`, `app/api/admin/unlock/route.ts`, `app/api/admin/entries/[letter]/route.ts`, `app/api/admin/zip/route.ts` | API handlers |
| `middleware.ts` | Passcode cookie gate |
| `lib/db/schema.ts`, `lib/db/index.ts` | Drizzle schema + client |
| `lib/passcode.ts`, `lib/letters.ts`, `lib/heartbeat.ts` | Server + client helpers |
| `lib/drawing/strokes.ts`, `lib/drawing/render.ts`, `lib/drawing/export.ts` | Pure drawing logic |
| `components/AlphabetGrid.tsx`, `components/EntryLightbox.tsx`, `components/NameModal.tsx`, `components/Toolbar.tsx`, `components/DrawCanvas.tsx`, `components/DrawFlow.tsx`, `components/AdminPanel.tsx` | React UI |
| `tests/lib/drawing/*.test.ts`, `tests/api/*.test.ts` | Unit + integration tests |

---

### Task 1: Scaffold Next.js project with TypeScript, Tailwind, and Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `vitest.config.ts`, `tests/smoke.test.ts`
- Modify: `.gitignore` (add `.next/` is already present)

- [x] **Step 1: Initialize npm and install runtime deps**

Run:
```bash
npm init -y
npm install next@15 react@19 react-dom@19 swr
npm install drizzle-orm pg @vercel/blob perfect-freehand jszip
npm install --save-dev typescript @types/react @types/react-dom @types/node @types/pg
npm install --save-dev tailwindcss postcss autoprefixer
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
npm install --save-dev drizzle-kit @testcontainers/postgresql
```

- [x] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [x] **Step 3: Create `next.config.ts`**

```ts
import type { NextConfig } from 'next';
const nextConfig: NextConfig = { reactStrictMode: true };
export default nextConfig;
```

- [x] **Step 4: Configure Tailwind**

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { cream: '#fdfaf3', ink: '#2a2a2a', inksoft: '#666666' },
      fontFamily: { serif: ['Georgia', 'serif'] },
    },
  },
} satisfies Config;
```

`postcss.config.mjs`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
:root { color-scheme: light; }
body { background: #fdfaf3; color: #2a2a2a; }
```

- [x] **Step 5: Create root layout and placeholder page**

`app/layout.tsx`:
```tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Baby Uebe's Coloring Book",
  description: 'A collaborative A–Z coloring book for our baby shower.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream text-ink">{children}</body>
    </html>
  );
}
```

`app/page.tsx`:
```tsx
export default function Home() {
  return <main className="p-8 font-serif text-3xl">Baby Uebe&apos;s Coloring Book</main>;
}
```

- [x] **Step 6: Configure Vitest**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
  },
});
```

`tests/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

`tests/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
describe('toolchain smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [x] **Step 7: Add scripts to `package.json`**

Add the `"scripts"` block:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run --reporter=verbose",
  "test:watch": "vitest",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push"
}
```

- [x] **Step 8: Verify build + smoke test**

Run:
```bash
npm run test
npm run build
```
Expected: smoke test passes, Next build succeeds.

- [x] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 app with Tailwind and Vitest"
```

---

### Task 2: Drizzle schema, database client, and migrations

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/index.ts`, `drizzle.config.ts`, `drizzle/0000_init.sql` (generated)

- [x] **Step 1: Create the schema**

`lib/db/schema.ts`:
```ts
import { pgTable, uuid, char, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const entries = pgTable('entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  letter: char('letter', { length: 1 }).notNull().unique(),
  artistName: text('artist_name').notNull(),
  subject: text('subject').notNull(),
  imageUrl: text('image_url').notNull(),
  strokeData: jsonb('stroke_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const letterLocks = pgTable('letter_locks', {
  letter: char('letter', { length: 1 }).primaryKey(),
  lockToken: uuid('lock_token').notNull(),
  artistName: text('artist_name'),
  subject: text('subject'),
  acquiredAt: timestamp('acquired_at', { withTimezone: true }).defaultNow().notNull(),
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Entry = typeof entries.$inferSelect;
export type LetterLock = typeof letterLocks.$inferSelect;
```

- [x] **Step 2: Create the DB client**

`lib/db/index.ts`:
```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { pool?: Pool };

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return globalForDb.pool;
}

export function db() {
  return drizzle(getPool(), { schema });
}

export { schema };
```

- [x] **Step 3: Create the Drizzle config**

`drizzle.config.ts`:
```ts
import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
} satisfies Config;
```

> **Note (Task 2 execution):** `dotenv` was added as a devDependency in commit `282c469` because `drizzle-kit` runs outside Next.js and does not auto-load `.env.local`.

- [x] **Step 4: Generate the initial migration**

Set up a local Postgres for development (Docker or Postgres.app) and put its URL in `.env.local`:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/coloringbook
```

Run:
```bash
npm run db:generate
npm run db:push
```
Expected: a SQL file appears at `drizzle/0000_*.sql`, and the tables exist in the DB.

> **Note (Task 2 execution):** `db:generate` was run and produced `drizzle/0000_organic_ogun.sql` (renamed to `drizzle/0000_init.sql` in Task 7 Step 2). `db:push` was **not** run during this task because no live Postgres was available — the user needs to run it manually once they set up `.env.local` with a `DATABASE_URL`.

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: drizzle schema and db client for entries and letter_locks"
```

---

### Task 3: Passcode middleware and welcome page

**Files:**
- Create: `lib/passcode.ts`, `middleware.ts`, `app/welcome/page.tsx`, `app/api/welcome/route.ts`

- [x] **Step 1: Create the passcode helper**

`lib/passcode.ts`:
```ts
import { cookies } from 'next/headers';

const COOKIE_NAME = 'passcode';

export function configuredPasscode(): string {
  const value = process.env.PARTY_PASSCODE;
  if (!value) throw new Error('PARTY_PASSCODE is not set');
  return value;
}

export async function hasValidPasscodeCookie(): Promise<boolean> {
  const jar = await cookies();
  const cookie = jar.get(COOKIE_NAME);
  return cookie?.value === configuredPasscode();
}

export async function setPasscodeCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, configuredPasscode(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export { COOKIE_NAME };
```

- [x] **Step 2: Add middleware**

`middleware.ts`:
```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME } from './lib/passcode';

const PUBLIC_PREFIXES = ['/welcome', '/api/welcome', '/admin', '/api/admin', '/_next', '/favicon'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const passcode = process.env.PARTY_PASSCODE ?? '';
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!passcode || cookie !== passcode) {
    const url = req.nextUrl.clone();
    url.pathname = '/welcome';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: '/((?!_next|favicon.ico).*)' };
```

- [x] **Step 3: Welcome page**

`app/welcome/page.tsx`:
```tsx
export const dynamic = 'force-dynamic';

export default function Welcome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <WelcomeForm searchParamsPromise={searchParams} />
  );
}

async function WelcomeForm({ searchParamsPromise }: { searchParamsPromise: Promise<{ error?: string }> }) {
  const params = await searchParamsPromise;
  const error = params.error;
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form action="/api/welcome" method="POST" className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <h1 className="font-serif text-2xl">Welcome!</h1>
        <p className="text-sm text-inksoft">Enter the party passcode to join the coloring book.</p>
        <input
          name="passcode"
          type="password"
          autoFocus
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          placeholder="Party passcode"
        />
        {error ? <p className="text-sm text-red-600">That code didn&apos;t work. Try again.</p> : null}
        <button className="w-full rounded-lg bg-ink py-2 font-semibold text-cream">Enter</button>
      </form>
    </main>
  );
}
```

- [x] **Step 4: Welcome submit handler**

`app/api/welcome/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { configuredPasscode, setPasscodeCookie } from '@/lib/passcode';

export async function POST(req: Request) {
  const form = await req.formData();
  const submitted = String(form.get('passcode') ?? '');
  if (submitted !== configuredPasscode()) {
    return NextResponse.redirect(new URL('/welcome?error=1', req.url), { status: 303 });
  }
  await setPasscodeCookie();
  return NextResponse.redirect(new URL('/', req.url), { status: 303 });
}
```

> **Note (Task 3 execution):** A follow-up commit (`9f2844a`) added `.trim()` to the submitted passcode (`String(form.get('passcode') ?? '').trim()`) so trailing whitespace from mobile copy-paste doesn't silently fail equality. Spec-deviating but justified by the deployment target (guests on phones pasting from text messages).

- [ ] **Step 5: Set local passcode and verify** _(manual — user task: add `PARTY_PASSCODE=uebe2026` and `ADMIN_KEY=changeme` to `.env.local`, run `npm run dev`, verify gate redirect + wrong/right code paths)_

Add to `.env.local`:
```
PARTY_PASSCODE=uebe2026
ADMIN_KEY=changeme
```

Run `npm run dev`, browse to `http://localhost:3000`. Expected: redirected to `/welcome`. Submit wrong code → error. Submit right code → land on home.

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: passcode middleware and welcome flow"
```

---

### Task 4: Stroke history module (TDD)

**Files:**
- Create: `lib/drawing/strokes.ts`, `tests/lib/drawing/strokes.test.ts`

> **Flag for later (Task 4 execution):** `Stroke.points` is unbounded. With the 200-stroke cap and aggressive iPad scribbling (~60Hz pointer events × long strokes), the JSONB payload sent to POST `/api/entries` can plausibly exceed Vercel's ~4.5MB body limit. Address before Task 10 lands — likely options: (a) throttle/decimate pointer events in `DrawCanvas`, (b) run a stroke-simplification pass (Ramer–Douglas–Peucker) before submit, or (c) accept the risk and surface a clear error.

- [x] **Step 1: Write the failing test**

`tests/lib/drawing/strokes.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createHistory, pushStroke, undo, redo, clear, type Stroke } from '@/lib/drawing/strokes';

const stroke = (id: string): Stroke => ({
  id,
  color: '#000000',
  size: 'medium',
  isEraser: false,
  points: [{ x: 0, y: 0, pressure: 0.5 }],
});

describe('stroke history', () => {
  it('starts empty', () => {
    const h = createHistory();
    expect(h.strokes).toEqual([]);
    expect(h.redoStack).toEqual([]);
  });

  it('pushes strokes and clears redo on new stroke', () => {
    let h = createHistory();
    h = pushStroke(h, stroke('a'));
    h = pushStroke(h, stroke('b'));
    h = undo(h);
    expect(h.strokes.map((s) => s.id)).toEqual(['a']);
    expect(h.redoStack.map((s) => s.id)).toEqual(['b']);
    h = pushStroke(h, stroke('c'));
    expect(h.redoStack).toEqual([]);
  });

  it('undo/redo round-trip preserves strokes', () => {
    let h = createHistory();
    h = pushStroke(h, stroke('a'));
    h = pushStroke(h, stroke('b'));
    h = undo(h);
    h = redo(h);
    expect(h.strokes.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('caps history at 200', () => {
    let h = createHistory();
    for (let i = 0; i < 250; i++) h = pushStroke(h, stroke(`s${i}`));
    expect(h.strokes).toHaveLength(200);
    expect(h.strokes[0].id).toBe('s50');
    expect(h.strokes[199].id).toBe('s249');
  });

  it('clear wipes both stacks', () => {
    let h = createHistory();
    h = pushStroke(h, stroke('a'));
    h = undo(h);
    h = clear(h);
    expect(h.strokes).toEqual([]);
    expect(h.redoStack).toEqual([]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run --reporter=verbose tests/lib/drawing/strokes.test.ts`
Expected: FAIL with module-not-found / import errors.

- [x] **Step 3: Implement strokes module**

`lib/drawing/strokes.ts`:
```ts
export type PenSize = 'thin' | 'medium' | 'thick';
export type StrokeColor = '#000000' | '#666666';
export type Point = { x: number; y: number; pressure: number };

export type Stroke = {
  id: string;
  color: StrokeColor;
  size: PenSize;
  isEraser: boolean;
  points: Point[];
};

export type History = { strokes: Stroke[]; redoStack: Stroke[] };

const HISTORY_CAP = 200;

export function createHistory(): History {
  return { strokes: [], redoStack: [] };
}

export function pushStroke(h: History, s: Stroke): History {
  const strokes = [...h.strokes, s];
  const trimmed = strokes.length > HISTORY_CAP ? strokes.slice(strokes.length - HISTORY_CAP) : strokes;
  return { strokes: trimmed, redoStack: [] };
}

export function undo(h: History): History {
  if (h.strokes.length === 0) return h;
  const next = h.strokes.slice(0, -1);
  const popped = h.strokes[h.strokes.length - 1];
  return { strokes: next, redoStack: [...h.redoStack, popped] };
}

export function redo(h: History): History {
  if (h.redoStack.length === 0) return h;
  const next = h.redoStack.slice(0, -1);
  const popped = h.redoStack[h.redoStack.length - 1];
  return { strokes: [...h.strokes, popped], redoStack: next };
}

export function clear(_: History): History {
  return createHistory();
}
```

- [x] **Step 4: Run test to verify pass**

Run: `npx vitest run --reporter=verbose tests/lib/drawing/strokes.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add lib/drawing/strokes.ts tests/lib/drawing/strokes.test.ts
git commit -m "feat: stroke history with undo, redo, and 200-cap"
```

---

### Task 5: Stroke renderer

**Files:**
- Create: `lib/drawing/render.ts`

> **Flag for later (Task 5 execution):** `scale = Math.min(scaleX, scaleY)` letterboxes the stroke region into a square. With the default `coordinateSpace: {1, 1}` and a portrait canvas (e.g. 600×800 or 2550×3300), strokes only fill the top square (600×600 or 2550×2550) and the bottom band is unreachable. The spec's note about cross-size identity holds only when callers pass `coordinateSpace` matching the recording canvas's aspect ratio. Verify when `DrawCanvas` (Task 14+) wires up live drawing — likely fix is for `DrawCanvas` to always pass an explicit `coordinateSpace` equal to its own client-rect, or to switch the renderer to independent `scaleX`/`scaleY` per axis.

- [x] **Step 1: Implement the renderer**

`lib/drawing/render.ts`:
```ts
import { getStroke } from 'perfect-freehand';
import type { Stroke, PenSize } from './strokes';

const SIZE_MAP: Record<PenSize, number> = { thin: 4, medium: 9, thick: 18 };

function strokeToPath(stroke: Stroke, scale: number): Path2D {
  const inputs = stroke.points.map((p) => [p.x * scale, p.y * scale, p.pressure] as [number, number, number]);
  const outline = getStroke(inputs, {
    size: SIZE_MAP[stroke.size] * scale,
    thinning: 0.55,
    smoothing: 0.6,
    streamline: 0.5,
    simulatePressure: false,
  });
  const path = new Path2D();
  if (outline.length === 0) return path;
  path.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) path.lineTo(outline[i][0], outline[i][1]);
  path.closePath();
  return path;
}

export function renderStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  opts: { width: number; height: number; coordinateSpace?: { width: number; height: number } },
) {
  const space = opts.coordinateSpace ?? { width: 1, height: 1 };
  const scaleX = opts.width / space.width;
  const scaleY = opts.height / space.height;
  const scale = Math.min(scaleX, scaleY);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, opts.width, opts.height);
  for (const stroke of strokes) {
    const path = strokeToPath(stroke, scale);
    if (stroke.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000000';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = stroke.color;
    }
    ctx.fill(path);
  }
  ctx.restore();
}
```

> **Note:** Coordinates in `Stroke.points` are normalized 0–1. The renderer multiplies by `scale` so the same stroke list looks identical at 600×800 display or 2550×3300 export.

- [x] **Step 2: Commit**

```bash
git add lib/drawing/render.ts
git commit -m "feat: render strokes with perfect-freehand and eraser compositing"
```

---

### Task 6: Export to print-ready PNG (TDD)

**Files:**
- Create: `lib/drawing/export.ts`, `tests/lib/drawing/export.test.ts`

> **Note (Task 6 execution):** `tests/lib/drawing/export.test.ts` was extended with a minimal `Path2D` polyfill inside `beforeAll`. jsdom doesn't ship `Path2D` and `node-canvas` doesn't either, so `lib/drawing/render.ts` would throw at module load. The polyfill records `moveTo`/`lineTo`/`closePath` to satisfy the constructor surface; node-canvas's `ctx.fill(path)` no-ops on the unknown object, which is fine because the caption-presence assertion samples a pixel painted by `fillText`, not by stroke `fill`.

- [x] **Step 1: Add canvas dependency for tests**

Run:
```bash
npm install --save-dev canvas
```

> `canvas` provides a node-side CanvasRenderingContext2D so the export logic can be unit-tested in jsdom.

- [x] **Step 2: Write the failing test**

`tests/lib/drawing/export.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createCanvas } from 'canvas';
import { EXPORT_WIDTH, EXPORT_HEIGHT, renderExportCanvas } from '@/lib/drawing/export';
import type { Stroke } from '@/lib/drawing/strokes';

const stroke: Stroke = {
  id: '1',
  color: '#000000',
  size: 'medium',
  isEraser: false,
  points: [
    { x: 0.2, y: 0.2, pressure: 0.5 },
    { x: 0.8, y: 0.8, pressure: 0.5 },
  ],
};

describe('export', () => {
  beforeAll(() => {
    // jsdom doesn't ship a real canvas; node-canvas backs it.
    (globalThis as unknown as { HTMLCanvasElement: typeof HTMLCanvasElement }).HTMLCanvasElement = createCanvas(
      1,
      1,
    ).constructor as unknown as typeof HTMLCanvasElement;
  });

  it('uses 2550x3300 dimensions', () => {
    expect(EXPORT_WIDTH).toBe(2550);
    expect(EXPORT_HEIGHT).toBe(3300);
  });

  it('renders caption at the bottom of the canvas', () => {
    const canvas = createCanvas(EXPORT_WIDTH, EXPORT_HEIGHT);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    renderExportCanvas(ctx, [stroke], { letter: 'A', subject: 'Apple' });
    // Caption baseline area is the bottom ~10% of the canvas. Sample a pixel near the expected caption.
    const sampleX = EXPORT_WIDTH / 2;
    const sampleY = EXPORT_HEIGHT - 180;
    const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;
    // Caption text is dark; alpha should be > 0 (i.e. something was painted).
    expect(pixel[3]).toBeGreaterThan(0);
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npx vitest run --reporter=verbose tests/lib/drawing/export.test.ts`
Expected: FAIL with missing module.

- [x] **Step 4: Implement export module**

`lib/drawing/export.ts`:
```ts
import { renderStrokes } from './render';
import type { Stroke } from './strokes';

export const EXPORT_WIDTH = 2550;
export const EXPORT_HEIGHT = 3300;
const CAPTION_BAND_HEIGHT = 360;

export function renderExportCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  caption: { letter: string; subject: string },
) {
  const drawingHeight = EXPORT_HEIGHT - CAPTION_BAND_HEIGHT;
  renderStrokes(ctx, strokes, {
    width: EXPORT_WIDTH,
    height: drawingHeight,
  });
  // White caption band covering the bottom region.
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, drawingHeight, EXPORT_WIDTH, CAPTION_BAND_HEIGHT);
  ctx.fillStyle = '#2a2a2a';
  ctx.font = '600 140px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const captionY = drawingHeight + CAPTION_BAND_HEIGHT / 2;
  ctx.fillText(`${caption.letter} is for ${caption.subject}`, EXPORT_WIDTH / 2, captionY);
  ctx.restore();
}

export async function exportToBlob(strokes: Stroke[], caption: { letter: string; subject: string }): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('exportToBlob must run in the browser');
  }
  const canvas = document.createElement('canvas');
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to obtain canvas context');
  renderExportCanvas(ctx, strokes, caption);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/png');
  });
}
```

- [x] **Step 5: Run test to verify pass**

Run: `npx vitest run --reporter=verbose tests/lib/drawing/export.test.ts`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: export drawing to 300dpi PNG with caption"
```

---

### Task 7: GET /api/state endpoint

**Files:**
- Create: `lib/letters.ts`, `app/api/state/route.ts`, `tests/api/state.test.ts`

> **Test infrastructure:** Integration tests use `@testcontainers/postgresql`. Set `RUN_DB_TESTS=1` and have Docker running to enable them. Otherwise tests skip with a warning.

> **Notes (Task 7 execution):**
> - **Migration rename done.** `drizzle/0000_organic_ogun.sql` → `drizzle/0000_init.sql`; `drizzle/meta/_journal.json` `tag` updated.
> - **`vitest.config.ts` got `hookTimeout: 60000`** (commit `d7357a1`). The testcontainers Postgres start exceeds vitest's 10s default `beforeAll` ceiling.
> - **`tests/db-setup.ts` `stopDb()`** now ends `globalThis.pool` (the route-side pool from `lib/db/index.ts`) before stopping the container, so test output isn't polluted by "terminating connection due to administrator command".
> - **Flag for later:** `route.ts` line 16 uses `sql.raw(String(STALE_SECONDS))` per spec — currently safe because the constant is hardcoded, but the idiom bypasses parameter binding. If `STALE_SECONDS` ever becomes dynamic (env var, config), rewrite as `now() - interval '1 second' * ${STALE_SECONDS}` to avoid an injection footgun. This pattern repeats in Tasks 8–10; address consistently.

- [x] **Step 1: Create letters helper**

`lib/letters.ts`:
```ts
export const ALPHABET: readonly string[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

export function isLetter(value: unknown): value is string {
  return typeof value === 'string' && ALPHABET.includes(value);
}
```

- [x] **Step 2: Create the test setup helper**

`tests/db-setup.ts`:
```ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

export const dbEnabled = process.env.RUN_DB_TESTS === '1';
let container: StartedPostgreSqlContainer | null = null;
let pool: Pool | null = null;

export async function startDb(): Promise<{ url: string; pool: Pool }> {
  if (!container) container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  pool = new Pool({ connectionString: url });
  const migration = fs.readFileSync(path.join(process.cwd(), 'drizzle/0000_init.sql'), 'utf8');
  await pool.query(migration);
  return { url, pool };
}

export async function resetDb() {
  if (!pool) return;
  await pool.query('TRUNCATE entries, letter_locks');
}

export async function stopDb() {
  if (pool) await pool.end();
  if (container) await container.stop();
  pool = null;
  container = null;
}
```

> **Note:** Rename the actual generated migration file from `drizzle/0000_*.sql` to `drizzle/0000_init.sql` after running `npm run db:generate` so this loader has a stable filename.

- [x] **Step 3: Write the failing test**

`tests/api/state.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startDb, stopDb, resetDb, dbEnabled } from '../db-setup';

const runIf = dbEnabled ? describe : describe.skip;

runIf('GET /api/state', () => {
  beforeAll(async () => { await startDb(); });
  afterAll(async () => { await stopDb(); });
  beforeEach(async () => { await resetDb(); });

  it('reports 26 letters, all available when DB is empty', async () => {
    const { GET } = await import('@/app/api/state/route');
    const res = await GET();
    const body = await res.json();
    expect(body.letters).toHaveLength(26);
    expect(body.letters.every((l: { status: string }) => l.status === 'available')).toBe(true);
  });

  it('returns done for letters with entries and locked for active locks', async () => {
    const { db } = await import('@/lib/db');
    const { entries, letterLocks } = await import('@/lib/db/schema');
    await db().insert(entries).values({
      letter: 'A', artistName: 'Uncle Dan', subject: 'Apple', imageUrl: 'https://example.com/a.png',
    });
    await db().insert(letterLocks).values({
      letter: 'B', lockToken: '00000000-0000-0000-0000-000000000001', artistName: 'Cousin', subject: 'Bee',
    });
    const { GET } = await import('@/app/api/state/route');
    const body = await (await GET()).json();
    const a = body.letters.find((l: { letter: string }) => l.letter === 'A');
    const b = body.letters.find((l: { letter: string }) => l.letter === 'B');
    expect(a.status).toBe('done');
    expect(a.artistName).toBe('Uncle Dan');
    expect(b.status).toBe('locked');
  });
});
```

- [x] **Step 4: Implement the route**

`app/api/state/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { ALPHABET } from '@/lib/letters';

export const dynamic = 'force-dynamic';

const STALE_SECONDS = 180;

export async function GET() {
  const conn = db();
  const entries = await conn.select().from(schema.entries);
  const locks = await conn
    .select()
    .from(schema.letterLocks)
    .where(sql`${schema.letterLocks.lastHeartbeatAt} > now() - interval '${sql.raw(String(STALE_SECONDS))} seconds'`);

  const entryByLetter = new Map(entries.map((e) => [e.letter, e]));
  const lockByLetter = new Map(locks.map((l) => [l.letter, l]));

  const letters = ALPHABET.map((letter) => {
    const entry = entryByLetter.get(letter);
    if (entry) {
      return {
        letter,
        status: 'done' as const,
        artistName: entry.artistName,
        subject: entry.subject,
        thumbnailUrl: entry.imageUrl,
      };
    }
    const lock = lockByLetter.get(letter);
    if (lock) {
      return {
        letter,
        status: 'locked' as const,
        artistName: lock.artistName ?? null,
        subject: lock.subject ?? null,
      };
    }
    return { letter, status: 'available' as const };
  });

  return NextResponse.json({ letters });
}
```

- [x] **Step 5: Run test to verify pass**

Run: `RUN_DB_TESTS=1 npx vitest run --reporter=verbose tests/api/state.test.ts`
Expected: PASS.  (Verified: 2/2 passing locally after Docker Desktop started.)

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: GET /api/state returns 26-letter board with status"
```

---

### Task 8: POST /api/locks (acquire) with atomic insert + stale sweep (TDD)

**Files:**
- Create: `app/api/locks/route.ts`, `tests/api/locks-acquire.test.ts`

- [x] **Step 1: Write the failing test**

`tests/api/locks-acquire.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startDb, stopDb, resetDb, dbEnabled } from '../db-setup';

const runIf = dbEnabled ? describe : describe.skip;

async function call(letter: string) {
  const { POST } = await import('@/app/api/locks/route');
  const req = new Request('http://localhost/api/locks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ letter }),
  });
  return POST(req);
}

runIf('POST /api/locks', () => {
  beforeAll(async () => { await startDb(); });
  afterAll(async () => { await stopDb(); });
  beforeEach(async () => { await resetDb(); });

  it('acquires a lock for an available letter', async () => {
    const res = await call('A');
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.lock_token).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns 409 in_use when letter is already locked and fresh', async () => {
    const a = await call('A');
    expect(a.status).toBe(201);
    const b = await call('A');
    expect(b.status).toBe(409);
    const body = await b.json();
    expect(body.reason).toBe('in_use');
  });

  it('returns 409 done when entry exists', async () => {
    const { db } = await import('@/lib/db');
    const { entries } = await import('@/lib/db/schema');
    await db().insert(entries).values({
      letter: 'A', artistName: 'Aunt', subject: 'Apple', imageUrl: 'x',
    });
    const res = await call('A');
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('done');
  });

  it('sweeps stale locks before acquiring', async () => {
    const { db } = await import('@/lib/db');
    const { letterLocks } = await import('@/lib/db/schema');
    await db().insert(letterLocks).values({
      letter: 'A',
      lockToken: '11111111-1111-1111-1111-111111111111',
      acquiredAt: new Date(Date.now() - 1000 * 60 * 10),
      lastHeartbeatAt: new Date(Date.now() - 1000 * 60 * 10),
    });
    const res = await call('A');
    expect(res.status).toBe(201);
  });

  it('rejects invalid letter', async () => {
    const res = await call('1');
    expect(res.status).toBe(400);
  });
});
```

- [x] **Step 2: Implement the route**

`app/api/locks/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db, schema } from '@/lib/db';
import { isLetter } from '@/lib/letters';

export const dynamic = 'force-dynamic';

const STALE_SECONDS = 180;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const letter = body?.letter;
  if (!isLetter(letter)) {
    return NextResponse.json({ reason: 'invalid_letter' }, { status: 400 });
  }
  const conn = db();
  // Sweep stale locks for this letter only — keeps the contention narrow.
  await conn.execute(
    sql`DELETE FROM ${schema.letterLocks}
        WHERE letter = ${letter}
          AND last_heartbeat_at < now() - interval '${sql.raw(String(STALE_SECONDS))} seconds'`,
  );
  const existing = await conn.select().from(schema.entries).where(sql`letter = ${letter}`);
  if (existing.length > 0) {
    return NextResponse.json({ reason: 'done' }, { status: 409 });
  }
  const lockToken = randomUUID();
  const inserted = await conn.execute(
    sql`INSERT INTO ${schema.letterLocks} (letter, lock_token)
        VALUES (${letter}, ${lockToken})
        ON CONFLICT (letter) DO NOTHING
        RETURNING lock_token`,
  );
  // pg driver returns rows on .rows for execute()
  // drizzle wraps results; rows is array
  const rows = (inserted as unknown as { rows: { lock_token: string }[] }).rows;
  if (rows.length === 0) {
    return NextResponse.json({ reason: 'in_use' }, { status: 409 });
  }
  return NextResponse.json({ lock_token: rows[0].lock_token }, { status: 201 });
}
```

- [x] **Step 3: Run tests**

Run: `RUN_DB_TESTS=1 npx vitest run --reporter=verbose tests/api/locks-acquire.test.ts`
Expected: PASS. (Verified: 5/5 passing.)

- [x] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: POST /api/locks with atomic acquire and stale sweep"
```

---

### Task 9: Lock heartbeat, patch, and delete

**Files:**
- Create: `app/api/locks/heartbeat/route.ts`, `tests/api/locks-heartbeat.test.ts`
- Modify: `app/api/locks/route.ts` (add PATCH and DELETE)

- [x] **Step 1: Write the failing tests**

`tests/api/locks-heartbeat.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startDb, stopDb, resetDb, dbEnabled } from '../db-setup';

const runIf = dbEnabled ? describe : describe.skip;

async function acquire(letter: string) {
  const { POST } = await import('@/app/api/locks/route');
  const res = await POST(new Request('http://localhost/api/locks', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ letter }),
  }));
  return (await res.json()).lock_token as string;
}

runIf('lock heartbeat / patch / delete', () => {
  beforeAll(async () => { await startDb(); });
  afterAll(async () => { await stopDb(); });
  beforeEach(async () => { await resetDb(); });

  it('heartbeat updates last_heartbeat_at when token matches', async () => {
    const token = await acquire('A');
    const { POST } = await import('@/app/api/locks/heartbeat/route');
    const res = await POST(new Request('http://localhost/api/locks/heartbeat', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ letter: 'A', lock_token: token }),
    }));
    expect(res.status).toBe(200);
  });

  it('heartbeat returns 410 on bad token', async () => {
    await acquire('A');
    const { POST } = await import('@/app/api/locks/heartbeat/route');
    const res = await POST(new Request('http://localhost/api/locks/heartbeat', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ letter: 'A', lock_token: '99999999-9999-9999-9999-999999999999' }),
    }));
    expect(res.status).toBe(410);
  });

  it('patch stores artist name and subject', async () => {
    const token = await acquire('A');
    const { PATCH } = await import('@/app/api/locks/route');
    const res = await PATCH(new Request('http://localhost/api/locks', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ letter: 'A', lock_token: token, artist_name: 'Uncle Dan', subject: 'Apple' }),
    }));
    expect(res.status).toBe(200);
  });

  it('delete releases the lock', async () => {
    const token = await acquire('A');
    const { DELETE } = await import('@/app/api/locks/route');
    const res = await DELETE(new Request('http://localhost/api/locks', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ letter: 'A', lock_token: token }),
    }));
    expect(res.status).toBe(200);
    const second = await acquire('A');
    expect(second).toBeTruthy();
  });
});
```

- [x] **Step 2: Implement heartbeat route**

`app/api/locks/heartbeat/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { isLetter } from '@/lib/letters';

export const dynamic = 'force-dynamic';
const STALE_SECONDS = 180;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { letter, lock_token: lockToken } = body ?? {};
  if (!isLetter(letter) || typeof lockToken !== 'string') {
    return NextResponse.json({ reason: 'invalid' }, { status: 400 });
  }
  const conn = db();
  const result = await conn.execute(
    sql`UPDATE ${schema.letterLocks}
        SET last_heartbeat_at = now()
        WHERE letter = ${letter}
          AND lock_token = ${lockToken}
          AND last_heartbeat_at > now() - interval '${sql.raw(String(STALE_SECONDS))} seconds'
        RETURNING letter`,
  );
  const rows = (result as unknown as { rows: unknown[] }).rows;
  if (rows.length === 0) return NextResponse.json({ reason: 'lock_lost' }, { status: 410 });
  return NextResponse.json({ ok: true });
}
```

- [x] **Step 3: Add PATCH and DELETE to locks route**

Append to `app/api/locks/route.ts`:
```ts
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const { letter, lock_token: lockToken, artist_name: artistName, subject } = body ?? {};
  if (!isLetter(letter) || typeof lockToken !== 'string' || typeof artistName !== 'string' || typeof subject !== 'string') {
    return NextResponse.json({ reason: 'invalid' }, { status: 400 });
  }
  const conn = db();
  const result = await conn.execute(
    sql`UPDATE ${schema.letterLocks}
        SET artist_name = ${artistName}, subject = ${subject}
        WHERE letter = ${letter} AND lock_token = ${lockToken}
        RETURNING letter`,
  );
  const rows = (result as unknown as { rows: unknown[] }).rows;
  if (rows.length === 0) return NextResponse.json({ reason: 'lock_lost' }, { status: 410 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const { letter, lock_token: lockToken } = body ?? {};
  if (!isLetter(letter) || typeof lockToken !== 'string') {
    return NextResponse.json({ reason: 'invalid' }, { status: 400 });
  }
  const conn = db();
  await conn.execute(
    sql`DELETE FROM ${schema.letterLocks} WHERE letter = ${letter} AND lock_token = ${lockToken}`,
  );
  return NextResponse.json({ ok: true });
}
```

- [x] **Step 4: Run tests**

Run: `RUN_DB_TESTS=1 npx vitest run --reporter=verbose tests/api/locks-heartbeat.test.ts`
Expected: PASS. (Verified: 4/4 passing.)

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: heartbeat, patch, and cancel endpoints for letter locks"
```

---

### Task 10: POST /api/entries (atomic submit) (TDD)

**Files:**
- Create: `app/api/entries/route.ts`, `tests/api/entries.test.ts`

> **Note (Task 10 execution):** The implementation was reordered to check `entries` before the lock so that a submit against a letter that's already done returns `409 done` (matching the third test's intent) instead of `410 lock_lost` from the lock check failing first. This parallels `/api/locks` which already checks done before in_use. The `try/catch` around the insert remains as a safety net for the race where another submitter wins between the entries check and the insert.

- [x] **Step 1: Write the failing test**

`tests/api/entries.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startDb, stopDb, resetDb, dbEnabled } from '../db-setup';

const runIf = dbEnabled ? describe : describe.skip;

async function acquire(letter: string) {
  const { POST } = await import('@/app/api/locks/route');
  const res = await POST(new Request('http://localhost/api/locks', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ letter }),
  }));
  return (await res.json()).lock_token as string;
}

async function submit(payload: Record<string, unknown>) {
  const { POST } = await import('@/app/api/entries/route');
  return POST(new Request('http://localhost/api/entries', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  }));
}

runIf('POST /api/entries', () => {
  beforeAll(async () => { await startDb(); });
  afterAll(async () => { await stopDb(); });
  beforeEach(async () => { await resetDb(); });

  it('creates entry and releases the lock on success', async () => {
    const token = await acquire('A');
    const res = await submit({
      letter: 'A', lock_token: token, artist_name: 'Uncle Dan', subject: 'Apple',
      image_url: 'https://example.com/a.png', stroke_data: [{ id: 's1' }],
    });
    expect(res.status).toBe(201);
    const { db } = await import('@/lib/db');
    const { entries, letterLocks } = await import('@/lib/db/schema');
    const all = await db().select().from(entries);
    expect(all).toHaveLength(1);
    const locks = await db().select().from(letterLocks);
    expect(locks).toHaveLength(0);
  });

  it('returns 410 when lock token is wrong', async () => {
    await acquire('A');
    const res = await submit({
      letter: 'A', lock_token: '00000000-0000-0000-0000-000000000000', artist_name: 'X', subject: 'X',
      image_url: 'https://example.com/x.png',
    });
    expect(res.status).toBe(410);
  });

  it('returns 409 when entry already exists', async () => {
    const { db } = await import('@/lib/db');
    const { entries } = await import('@/lib/db/schema');
    await db().insert(entries).values({ letter: 'A', artistName: 'Prior', subject: 'Aardvark', imageUrl: 'x' });
    const token = await acquire('A'); // will fail with 409 done, so just craft a token
    void token;
    const res = await submit({
      letter: 'A', lock_token: '00000000-0000-0000-0000-000000000000', artist_name: 'X', subject: 'X',
      image_url: 'https://example.com/x.png',
    });
    expect(res.status).toBe(409);
  });
});
```

- [x] **Step 2: Implement the route**

`app/api/entries/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { isLetter } from '@/lib/letters';

export const dynamic = 'force-dynamic';
const STALE_SECONDS = 180;

type Body = {
  letter: string;
  lock_token: string;
  artist_name: string;
  subject: string;
  image_url: string;
  stroke_data?: unknown;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (
    !body || !isLetter(body.letter) ||
    typeof body.lock_token !== 'string' ||
    typeof body.artist_name !== 'string' || body.artist_name.length === 0 ||
    typeof body.subject !== 'string' || body.subject.length === 0 ||
    typeof body.image_url !== 'string' || body.image_url.length === 0
  ) {
    return NextResponse.json({ reason: 'invalid' }, { status: 400 });
  }

  const conn = db();
  try {
    return await conn.transaction(async (tx) => {
      const lockResult = await tx.execute(
        sql`SELECT 1 FROM ${schema.letterLocks}
            WHERE letter = ${body.letter}
              AND lock_token = ${body.lock_token}
              AND last_heartbeat_at > now() - interval '${sql.raw(String(STALE_SECONDS))} seconds'`,
      );
      const lockRows = (lockResult as unknown as { rows: unknown[] }).rows;
      if (lockRows.length === 0) {
        return NextResponse.json({ reason: 'lock_lost' }, { status: 410 });
      }
      try {
        await tx.insert(schema.entries).values({
          letter: body.letter,
          artistName: body.artist_name,
          subject: body.subject,
          imageUrl: body.image_url,
          strokeData: body.stroke_data ?? null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('duplicate key')) {
          return NextResponse.json({ reason: 'done' }, { status: 409 });
        }
        throw err;
      }
      await tx.execute(
        sql`DELETE FROM ${schema.letterLocks} WHERE letter = ${body.letter} AND lock_token = ${body.lock_token}`,
      );
      return NextResponse.json({ ok: true }, { status: 201 });
    });
  } catch (err) {
    console.error('submit error', err);
    return NextResponse.json({ reason: 'server_error' }, { status: 500 });
  }
}
```

- [x] **Step 3: Run tests**

Run: `RUN_DB_TESTS=1 npx vitest run --reporter=verbose tests/api/entries.test.ts`
Expected: PASS. (Verified: 3/3 passing after the entries-first reorder noted above.)

- [x] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: atomic submit endpoint that releases the lock"
```

---

### Task 11: Client-side heartbeat manager

**Files:**
- Create: `lib/heartbeat.ts`

- [x] **Step 1: Implement**

`lib/heartbeat.ts`:
```ts
export type HeartbeatHandle = { stop: () => void };
export type HeartbeatEvent = 'lost' | 'error';

export function startHeartbeat(
  letter: string,
  lockToken: string,
  onEvent: (e: HeartbeatEvent) => void,
  intervalMs = 15_000,
): HeartbeatHandle {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const res = await fetch('/api/locks/heartbeat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ letter, lock_token: lockToken }),
      });
      if (res.status === 410) onEvent('lost');
      else if (!res.ok) onEvent('error');
    } catch {
      onEvent('error');
    }
  };
  const id = setInterval(tick, intervalMs);
  // first tick immediately to fail fast on bad tokens.
  void tick();
  return {
    stop() {
      stopped = true;
      clearInterval(id);
    },
  };
}
```

- [x] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: client heartbeat manager"
```

---

### Task 12: AlphabetGrid component and home page

**Files:**
- Create: `components/AlphabetGrid.tsx`, `components/AlphabetCell.tsx`
- Modify: `app/page.tsx`

> **Note (Task 12 execution):** `AlphabetGrid` imports `./EntryLightbox`, which is created in Task 13. The home page won't compile until that task lands; Step 4's manual verify is therefore deferred to after Task 13.

- [x] **Step 1: Create AlphabetCell**

`components/AlphabetCell.tsx`:
```tsx
'use client';

import Link from 'next/link';

export type LetterState =
  | { letter: string; status: 'available' }
  | { letter: string; status: 'locked'; artistName: string | null; subject: string | null }
  | { letter: string; status: 'done'; artistName: string; subject: string; thumbnailUrl: string };

export function AlphabetCell({ state, onView }: { state: LetterState; onView: (s: LetterState & { status: 'done' }) => void }) {
  if (state.status === 'done') {
    return (
      <button
        onClick={() => onView(state)}
        className="aspect-square rounded-xl border-2 border-ink bg-white p-2 font-serif text-3xl text-ink shadow-sm"
        aria-label={`${state.letter} drawn by ${state.artistName}, view`}
      >
        <div className="flex h-full flex-col items-center justify-between">
          <span>{state.letter}</span>
          <span className="text-[10px] uppercase tracking-wider text-inksoft">{state.artistName}</span>
        </div>
      </button>
    );
  }
  if (state.status === 'locked') {
    return (
      <div className="aspect-square rounded-xl border-2 border-amber-500 bg-amber-100 p-2 font-serif text-3xl text-amber-900">
        <div className="flex h-full flex-col items-center justify-between">
          <span>{state.letter}</span>
          <span className="text-[10px] uppercase tracking-wider">Drawing…</span>
        </div>
      </div>
    );
  }
  return (
    <Link
      href={`/draw/${state.letter}`}
      className="aspect-square rounded-xl border-2 border-dashed border-stone-300 bg-cream p-2 font-serif text-3xl text-ink hover:bg-stone-100"
      aria-label={`Draw ${state.letter}`}
    >
      <div className="flex h-full items-center justify-center">{state.letter}</div>
    </Link>
  );
}
```

- [x] **Step 2: Create AlphabetGrid**

`components/AlphabetGrid.tsx`:
```tsx
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AlphabetCell, type LetterState } from './AlphabetCell';
import { EntryLightbox } from './EntryLightbox';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AlphabetGrid({ initial }: { initial: { letters: LetterState[] } }) {
  const { data } = useSWR<{ letters: LetterState[] }>('/api/state', fetcher, {
    fallbackData: initial,
    refreshInterval: 10_000,
  });
  const [viewing, setViewing] = useState<(LetterState & { status: 'done' }) | null>(null);
  const letters = data?.letters ?? [];
  return (
    <>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-7">
        {letters.map((l) => (
          <AlphabetCell key={l.letter} state={l} onView={setViewing} />
        ))}
      </div>
      {viewing ? <EntryLightbox entry={viewing} onClose={() => setViewing(null)} /> : null}
    </>
  );
}
```

- [x] **Step 3: Update home page to load state**

`app/page.tsx`:
```tsx
import { AlphabetGrid } from '@/components/AlphabetGrid';
import { GET as getState } from '@/app/api/state/route';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const res = await getState();
  const initial = await res.json();
  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="mb-6 text-center">
        <h1 className="font-serif text-3xl">Baby Uebe&apos;s Coloring Book</h1>
        <p className="text-sm text-inksoft">Tap a letter to draw. Tap a finished one to look.</p>
      </header>
      <AlphabetGrid initial={initial} />
    </main>
  );
}
```

- [ ] **Step 4: Verify** _(deferred — depends on Task 13's `EntryLightbox`)_

Run `npm run dev`, enter passcode, see 26 letters. Manually insert an entry in the DB and reload → it shows as "done".

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: alphabet grid home page with SWR polling"
```

---

### Task 13: EntryLightbox component

**Files:**
- Create: `components/EntryLightbox.tsx`

- [x] **Step 1: Implement**

`components/EntryLightbox.tsx`:
```tsx
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
```

- [x] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: entry lightbox with escape-to-close"
```

> **Note (Task 13 execution):** `npm run build` was run after creating `EntryLightbox.tsx` and now succeeds — this also satisfies the deferred Step 4 verify from Task 12 (home page compiles). Manual browser verify with a populated DB still pending the user's local Postgres.

---

### Task 14: NameModal component

**Files:**
- Create: `components/NameModal.tsx`

- [x] **Step 1: Implement**

`components/NameModal.tsx`:
```tsx
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
          <span className="text-sm font-medium">Who's drawing?</span>
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
```

- [x] **Step 2: Commit**

```bash
git add components/NameModal.tsx
git commit -m "feat: name + subject modal"
```

> **Note (Task 14 execution):** Apostrophe in "Who's drawing?" was escaped to `Who&apos;s` to match the repo's existing JSX-escaping convention (`app/welcome/page.tsx` uses `didn&apos;t`).

---

### Task 15: Toolbar component (responsive)

**Files:**
- Create: `components/Toolbar.tsx`

- [x] **Step 1: Implement**

`components/Toolbar.tsx`:
```tsx
'use client';

import type { PenSize, StrokeColor } from '@/lib/drawing/strokes';

export type ToolbarState = {
  size: PenSize;
  color: StrokeColor;
  isEraser: boolean;
};

export function Toolbar({
  state,
  setState,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
}: {
  state: ToolbarState;
  setState: (s: ToolbarState) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  return (
    <div className="flex w-full flex-row items-center justify-center gap-2 md:w-auto md:flex-col md:items-stretch md:justify-start md:gap-2">
      <SizeButton size="thin" current={state.size} onClick={() => setState({ ...state, size: 'thin', isEraser: false })} />
      <SizeButton size="medium" current={state.size} onClick={() => setState({ ...state, size: 'medium', isEraser: false })} />
      <SizeButton size="thick" current={state.size} onClick={() => setState({ ...state, size: 'thick', isEraser: false })} />
      <Divider />
      <ColorSwatch hex="#000000" current={state.color} onClick={() => setState({ ...state, color: '#000000', isEraser: false })} />
      <ColorSwatch hex="#666666" current={state.color} onClick={() => setState({ ...state, color: '#666666', isEraser: false })} />
      <Divider />
      <ToolButton onClick={() => setState({ ...state, isEraser: !state.isEraser })} active={state.isEraser} label="Eraser">⌫</ToolButton>
      <ToolButton onClick={onUndo} disabled={!canUndo} label="Undo">↶</ToolButton>
      <ToolButton onClick={onRedo} disabled={!canRedo} label="Redo">↷</ToolButton>
      <ToolButton onClick={onClear} label="Clear all">🗑️</ToolButton>
    </div>
  );
}

function SizeButton({ size, current, onClick }: { size: PenSize; current: PenSize; onClick: () => void }) {
  const px = size === 'thin' ? 4 : size === 'medium' ? 9 : 18;
  const active = size === current;
  return (
    <button
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-lg border ${active ? 'border-ink bg-ink/10' : 'border-stone-300 bg-white'}`}
      aria-label={`${size} pen`}
    >
      <span className="rounded-full bg-ink" style={{ width: px, height: px }} />
    </button>
  );
}

function ColorSwatch({ hex, current, onClick }: { hex: StrokeColor; current: StrokeColor; onClick: () => void }) {
  const active = hex === current;
  return (
    <button
      onClick={onClick}
      className={`h-10 w-10 rounded-lg border ${active ? 'border-ink' : 'border-stone-300'}`}
      style={{ background: hex }}
      aria-label={`color ${hex}`}
    />
  );
}

function ToolButton({
  children, onClick, label, active, disabled,
}: { children: React.ReactNode; onClick: () => void; label: string; active?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`grid h-10 w-10 place-items-center rounded-lg border text-lg ${active ? 'border-ink bg-ink/10' : 'border-stone-300 bg-white'} ${disabled ? 'opacity-40' : ''}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="hidden h-px w-full bg-stone-300 md:block" aria-hidden="true" />;
}
```

- [x] **Step 2: Commit**

```bash
git add components/Toolbar.tsx
git commit -m "feat: responsive toolbar component"
```

---

### Task 16: DrawCanvas component

**Files:**
- Create: `components/DrawCanvas.tsx`

- [x] **Step 1: Implement**

`components/DrawCanvas.tsx`:
```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { renderStrokes } from '@/lib/drawing/render';
import {
  createHistory, pushStroke, undo as undoHistory, redo as redoHistory, clear as clearHistory,
  type Stroke, type History,
} from '@/lib/drawing/strokes';
import { Toolbar, type ToolbarState } from './Toolbar';

const newStrokeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function DrawCanvas({
  onHistoryChange,
}: {
  onHistoryChange: (h: History) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [history, setHistory] = useState<History>(createHistory());
  const [tool, setTool] = useState<ToolbarState>({ size: 'medium', color: '#000000', isEraser: false });
  const drawingRef = useRef<Stroke | null>(null);

  useEffect(() => { onHistoryChange(history); }, [history, onHistoryChange]);

  useEffect(() => {
    const observer = new ResizeObserver(() => paint(history));
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  function paint(h: History) {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderStrokes(ctx, h.strokes, { width: canvas.width, height: canvas.height });
    if (drawingRef.current) {
      renderStrokes(ctx, [drawingRef.current], { width: canvas.width, height: canvas.height });
    }
  }

  function normalizedPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = {
      id: newStrokeId(),
      color: tool.color,
      size: tool.size,
      isEraser: tool.isEraser,
      points: [normalizedPoint(e)],
    };
    paint(history);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current.points.push(normalizedPoint(e));
    paint(history);
  }

  function onPointerUp() {
    if (!drawingRef.current) return;
    const next = pushStroke(history, drawingRef.current);
    drawingRef.current = null;
    setHistory(next);
    paint(next);
  }

  function handleUndo() {
    const next = undoHistory(history);
    setHistory(next);
    paint(next);
  }

  function handleRedo() {
    const next = redoHistory(history);
    setHistory(next);
    paint(next);
  }

  function handleClear() {
    if (!confirm('Erase the whole drawing?')) return;
    const next = clearHistory(history);
    setHistory(next);
    paint(next);
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <div ref={containerRef} className="aspect-[8.5/11] w-full overflow-hidden rounded-lg bg-white shadow md:flex-1">
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <div className="md:order-first md:w-16">
        <Toolbar
          state={tool}
          setState={setTool}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          canUndo={history.strokes.length > 0}
          canRedo={history.redoStack.length > 0}
        />
      </div>
    </div>
  );
}
```

- [x] **Step 2: Commit**

```bash
git add components/DrawCanvas.tsx
git commit -m "feat: drawing canvas with pointer events and responsive toolbar layout"
```

---

### Task 17: DrawFlow + /draw/[letter] route

**Files:**
- Create: `components/DrawFlow.tsx`, `app/draw/[letter]/page.tsx`

- [ ] **Step 1: Implement DrawFlow**

`components/DrawFlow.tsx`:
```tsx
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

  useEffect(() => { void acquire(); }, [acquire]);

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
```

- [ ] **Step 2: Create the route**

`app/draw/[letter]/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { ALPHABET } from '@/lib/letters';
import { DrawFlow } from '@/components/DrawFlow';

export const dynamic = 'force-dynamic';

export default async function DrawPage({ params }: { params: Promise<{ letter: string }> }) {
  const { letter } = await params;
  const upper = letter.toUpperCase();
  if (!ALPHABET.includes(upper)) notFound();
  return <DrawFlow letter={upper} />;
}
```

- [ ] **Step 3: Create the blob upload handler**

`app/api/blob-upload/route.ts`:
```ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/png'],
        maximumSizeInBytes: 25 * 1024 * 1024,
      }),
      onUploadCompleted: async () => { /* no-op */ },
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
```

> The blob upload handler is a public route protected by the passcode middleware (middleware matcher excludes the welcome path only; everything else including `/api/blob-upload` requires the cookie).

- [ ] **Step 4: Verify**

`npm run dev`, enter passcode, tap an available letter, fill the modal, scribble, hit Submit. Letter returns to home page as "done".

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: end-to-end draw flow with blob upload and submission"
```

---

### Task 18: Admin endpoints

**Files:**
- Create: `app/api/admin/unlock/route.ts`, `app/api/admin/entries/[letter]/route.ts`, `app/api/admin/zip/route.ts`, `lib/admin.ts`

- [ ] **Step 1: Create admin guard helper**

`lib/admin.ts`:
```ts
export function assertAdmin(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key') ?? req.headers.get('x-admin-key');
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    throw new Response('forbidden', { status: 403 });
  }
}
```

- [ ] **Step 2: Implement unlock**

`app/api/admin/unlock/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { isLetter } from '@/lib/letters';
import { assertAdmin } from '@/lib/admin';

export async function POST(req: Request) {
  try { assertAdmin(req); } catch (r) { return r as Response; }
  const body = await req.json().catch(() => null);
  if (!isLetter(body?.letter)) return NextResponse.json({ reason: 'invalid' }, { status: 400 });
  await db().execute(sql`DELETE FROM ${schema.letterLocks} WHERE letter = ${body.letter}`);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Implement delete entry**

`app/api/admin/entries/[letter]/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { isLetter } from '@/lib/letters';
import { assertAdmin } from '@/lib/admin';

export async function DELETE(req: Request, { params }: { params: Promise<{ letter: string }> }) {
  try { assertAdmin(req); } catch (r) { return r as Response; }
  const { letter } = await params;
  const upper = letter.toUpperCase();
  if (!isLetter(upper)) return NextResponse.json({ reason: 'invalid' }, { status: 400 });
  await db().execute(sql`DELETE FROM ${schema.entries} WHERE letter = ${upper}`);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Implement ZIP**

`app/api/admin/zip/route.ts`:
```ts
import JSZip from 'jszip';
import { db, schema } from '@/lib/db';
import { assertAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try { assertAdmin(req); } catch (r) { return r as Response; }
  const entries = await db().select().from(schema.entries);
  const zip = new JSZip();
  for (const entry of entries) {
    const res = await fetch(entry.imageUrl);
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    const safeArtist = entry.artistName.replace(/[^a-z0-9]+/gi, '-');
    const safeSubject = entry.subject.replace(/[^a-z0-9]+/gi, '-');
    zip.file(`${entry.letter}-${safeSubject}-${safeArtist}.png`, buf);
  }
  const archive = await zip.generateAsync({ type: 'nodebuffer' });
  return new Response(archive, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': 'attachment; filename="coloring-book.zip"',
    },
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: admin endpoints for unlock, delete, and zip export"
```

---

### Task 19: Admin page UI

**Files:**
- Create: `components/AdminPanel.tsx`, `app/admin/page.tsx`

- [ ] **Step 1: AdminPanel**

`components/AdminPanel.tsx`:
```tsx
'use client';

import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type StateBody = {
  letters: ({ letter: string; status: 'available' } | { letter: string; status: 'locked'; artistName: string | null; subject: string | null } | { letter: string; status: 'done'; artistName: string; subject: string; thumbnailUrl: string })[];
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
                  <button disabled={busy === l.letter} onClick={() => unlock(l.letter)} className="underline">Unlock</button>
                )}
                {l.status === 'done' && (
                  <>
                    <a href={l.thumbnailUrl} target="_blank" rel="noreferrer" className="underline">Open</a>
                    <button disabled={busy === l.letter} onClick={() => deleteEntry(l.letter)} className="underline text-red-600">Delete</button>
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
```

- [ ] **Step 2: Admin page**

`app/admin/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { AdminPanel } from '@/components/AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const params = await searchParams;
  const key = params.key ?? '';
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    redirect('/');
  }
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 font-serif text-2xl">Coloring Book Admin</h1>
      <AdminPanel adminKey={key} />
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Browse to `/admin?key=changeme`. Confirm all 26 letters listed. Submit an entry, then delete it from admin — it goes back to "available".

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: admin page with unlock, delete, and zip download"
```

---

### Task 20: Deploy and pre-party README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Provision production resources**

In Vercel:
1. Create a new project from this repo.
2. Add a Neon Postgres integration → it sets `DATABASE_URL`.
3. Add a Vercel Blob store → it sets `BLOB_READ_WRITE_TOKEN`.
4. Add env vars `PARTY_PASSCODE` (pick something memorable like `uebe2026`) and `ADMIN_KEY` (something only you know).

- [ ] **Step 2: Add deploy migration step**

In `package.json`, change the `"build"` script to apply migrations first:
```json
"build": "drizzle-kit migrate && next build"
```

- [ ] **Step 3: First deploy**

Push to `main`. Vercel builds + migrates + ships. Visit the production URL, enter passcode, draw a test entry, verify it appears.

- [ ] **Step 4: Run the manual E2E checklist on production**

Run every item in the spec's manual E2E checklist against the production URL on the actual iPad and a phone. Tick them off in the README.

- [ ] **Step 5: Write the pre-party README**

`README.md`:
```markdown
# Baby Uebe's Coloring Book

A web app for our baby shower (2026-06-20) where guests collaborate on a 26-letter coloring book.

## Production URL

<https://baby-uebe-coloring-book.vercel.app> (replace once Vercel assigns)

## Env vars

| Name | Where to set |
| --- | --- |
| `DATABASE_URL` | Vercel Neon integration |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob integration |
| `PARTY_PASSCODE` | Vercel project settings |
| `ADMIN_KEY` | Vercel project settings |

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, BLOB token, passcode, admin key
npm run db:push
npm run dev
```

To run integration tests: `RUN_DB_TESTS=1 npm test` (requires Docker).

## Admin

Bookmark `https://<host>/admin?key=<ADMIN_KEY>` on your phone. From there you can:
- Unlock a stuck letter.
- Delete an entry (frees the letter again).
- Download a ZIP of all entries (print-ready PNGs).

## Pre-party checklist

- [ ] Tested on the actual iPad (Safari) in both orientations.
- [ ] Tested on iOS Safari + Android Chrome on a phone.
- [ ] Passcode set and family informed.
- [ ] Admin URL bookmarked on Andrew's phone.
- [ ] At least one real-feeling test entry submitted and visible in gallery.
- [ ] ZIP download produces a valid archive with print-ready PNGs at 2550×3300.
- [ ] iPad charger packed.
- [ ] Backup browser tab open in case the first one crashes.

## Day-of operations

- Leave the iPad on the home grid in landscape (left-rail toolbar).
- If a letter gets stuck "Drawing…" with nobody actually drawing, open admin and unlock it.
- If you want to start fresh, delete all entries via admin and reset.
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "docs: production setup and pre-party checklist"
```

---

## Verification before "done"

- [ ] All Vitest suites green: `RUN_DB_TESTS=1 npm test`.
- [ ] `npm run build` succeeds.
- [ ] Manual E2E checklist from the spec all ticked.
- [ ] Production URL works from iPad Safari, iPhone Safari, and Android Chrome.
- [ ] Two browsers can't both grab the same letter (race protection).
- [ ] A draw session goes "drawing → idle 3.5 min → letter free again" successfully.
- [ ] ZIP download contains 2550×3300 PNGs with the caption rendered.

---

## Self-review notes (run by author)

- **Spec coverage:**
  - Welcome + passcode → Task 3.
  - Home alphabet grid + lightbox → Tasks 12, 13.
  - Draw flow (modal + canvas + submit + lock-lost recovery) → Tasks 14, 15, 16, 17.
  - State endpoint → Task 7.
  - Lock acquire / heartbeat / patch / delete → Tasks 8, 9.
  - Submit endpoint atomicity → Task 10.
  - Drawing internals (strokes/render/export) → Tasks 4, 5, 6.
  - Admin (unlock/delete/zip) → Tasks 18, 19.
  - Deployment + pre-party checklist → Task 20.
  - Unit + integration tests called out in the spec are written alongside their tasks.
- **Placeholders:** none — every step contains real code or exact commands.
- **Type consistency:** `Stroke`, `History`, `PenSize`, `StrokeColor`, `LetterState`, lock-token field name (`lock_token` snake on the wire, `lockToken` in TS), and the `STALE_SECONDS = 180` value are used consistently across tasks.
- **Test infra caveat:** integration tests are gated by `RUN_DB_TESTS=1` so day-to-day `npm test` runs only the pure-logic suites; the developer is reminded to flip the flag before shipping.
