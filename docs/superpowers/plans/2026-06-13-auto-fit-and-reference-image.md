# Auto-fit & Reference Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Mark the Tasks, and Steps within Tasks as complete as you finish them.

**Goal:** Add two helpers to the existing drawing flow: (1) an auto-fit preview that centers and scales the artist's drawing on submit, and (2) a "Reference image" button that opens a Pexels-powered photo modal so casual artists can glance at what they're trying to draw.

**Architecture:** Pure-function autofit module in `lib/drawing/autofit.ts` consumed by a new `PreviewModal` component, both wired into `DrawFlow`'s phase state machine (new `'previewing'` phase between `'drawing'` and `'submitting'`). For reference images: a thin `/api/reference` server route that proxies Pexels (hiding the API key, mapping a slim response shape, cacheable via HTTP) + a `ReferenceModal` component triggered from a new header button in `DrawFlow`.

**Tech Stack:** Next.js 15 App Router, TypeScript, React 19, Vitest (with jsdom + node-canvas for canvas tests), Tailwind, perfect-freehand (already wired). New external dependency: the Pexels REST API (no SDK; plain `fetch`). New env var: `PEXELS_API_KEY`.

**Source spec:** `docs/superpowers/specs/2026-06-13-auto-fit-and-reference-image-design.md`

---

## File map

**New files**
- `lib/drawing/autofit.ts` — pure functions: `computeAutoFit`, `applyTransform`, `isIdentityTransform`. Types: `AutoFitTransform`.
- `tests/lib/drawing/autofit.test.ts` — unit tests for all autofit behaviors.
- `components/PreviewModal.tsx` — the "Want us to clean it up?" side-by-side modal.
- `app/api/reference/route.ts` — `GET /api/reference?q=<subject>` Pexels proxy.
- `tests/api/reference.test.ts` — unit tests for the route handler.
- `lib/reference.ts` — `Photo` type + slim Pexels mapper helper.
- `components/ReferenceModal.tsx` — the reference image lookup modal.

**Modified files**
- `components/DrawFlow.tsx` — add `'previewing'` to the `Phase` union; rework `handleSubmit` into a two-stage flow; add Reference button + state for cached photo list.
- `.env.local` (local only — not committed) — add `PEXELS_API_KEY`.

**Patterns to follow (already established in the repo)**
- Auth on API routes is handled by `middleware.ts` (redirects to `/welcome` for any non-public path). Do **not** add explicit passcode checks inside the route handler; the spec's "401 if missing cookie" is implemented by the middleware redirect for `/api/reference`.
- Tests live under `tests/` mirroring source paths (e.g. source `lib/drawing/foo.ts` → test `tests/lib/drawing/foo.test.ts`).
- Drawing tests rely on `node-canvas` (`createCanvas`) and a minimal `Path2D` polyfill — see `tests/lib/drawing/export.test.ts` for the pattern.
- Path alias `@/` is configured in `vitest.config.ts` and `tsconfig.json`; use `@/lib/...` etc. in imports.
- Existing commit style is short, lowercase, no scope prefix (e.g. `fix: eraser paints opaque white`, `more updates to alphabet cell styling`). Follow that for new commits.

---

### Task 1: Create `computeAutoFit` and its tests

**Files:**
- Create: `lib/drawing/autofit.ts`
- Test: `tests/lib/drawing/autofit.test.ts`

- [x] **Step 1: Write the failing test file**

Create `tests/lib/drawing/autofit.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeAutoFit } from '@/lib/drawing/autofit';
import type { Stroke } from '@/lib/drawing/strokes';

const mkStroke = (
  id: string,
  points: Array<[number, number]>,
  opts: { isEraser?: boolean; size?: 'thin' | 'medium' | 'thick' } = {},
): Stroke => ({
  id,
  color: '#000000',
  size: opts.size ?? 'medium',
  isEraser: opts.isEraser ?? false,
  points: points.map(([x, y]) => ({ x, y, pressure: 0.5 })),
});

// Drawing region: y in [0, 0.8909], target center (0.5, 0.4455), 85% fill.
const REGION_BOTTOM = (3300 - 360) / 3300; // 0.890909...
const CENTER_Y = REGION_BOTTOM / 2;        // 0.445454...

describe('computeAutoFit', () => {
  it('returns identity for empty stroke list', () => {
    const t = computeAutoFit([]);
    expect(t).toEqual({ scale: 1, dx: 0, dy: 0 });
  });

  it('returns identity when all strokes are erasers', () => {
    const t = computeAutoFit([
      mkStroke('e', [[0.1, 0.1], [0.5, 0.5], [0.9, 0.9]], { isEraser: true }),
    ]);
    expect(t).toEqual({ scale: 1, dx: 0, dy: 0 });
  });

  it('returns identity when all real strokes are filtered (specks)', () => {
    // 5 strokes each with 1 point — all under the 3-point minimum.
    const strokes = [
      mkStroke('a', [[0.1, 0.1]]),
      mkStroke('b', [[0.2, 0.2]]),
      mkStroke('c', [[0.8, 0.8]]),
      mkStroke('d', [[0.9, 0.1]]),
      mkStroke('e', [[0.1, 0.9]]),
    ];
    expect(computeAutoFit(strokes)).toEqual({ scale: 1, dx: 0, dy: 0 });
  });

  it('uses uniform scale (single scale, never scaleX != scaleY)', () => {
    // A wide, short drawing: raw bbox (0.1..0.9, 0.4..0.5).
    // Medium stroke pads by radius 0.0075 on each side → padded width 0.815, height 0.115.
    // scaleX = 0.85 / 0.815 ≈ 1.0429; scaleY = (0.85 * 0.8909) / 0.115 ≈ 6.585.
    // Uniform = min => ~1.0429.
    const t = computeAutoFit([
      mkStroke('s', [[0.1, 0.4], [0.5, 0.45], [0.9, 0.5]]),
    ]);
    expect(t.scale).toBeCloseTo(1.043, 2);
  });

  it('centers the bbox at (0.5, 0.4455) after transform', () => {
    // Small drawing offset in the top-left corner.
    const t = computeAutoFit([
      mkStroke('s', [[0.05, 0.05], [0.15, 0.05], [0.05, 0.15]]),
    ]);
    // bbox center before: (0.10, 0.10). After transform, center = (0.10 * scale + dx, 0.10 * scale + dy).
    const centerX = 0.10 * t.scale + t.dx;
    const centerY = 0.10 * t.scale + t.dy;
    expect(centerX).toBeCloseTo(0.5, 3);
    expect(centerY).toBeCloseTo(CENTER_Y, 3);
  });

  it('shrinks oversized input (scale < 1)', () => {
    // Bbox larger than the drawing region.
    const t = computeAutoFit([
      mkStroke('s', [[0, 0], [1, 0], [1, 1], [0, 1]]),
    ]);
    expect(t.scale).toBeLessThan(1);
  });

  it('caps scale at 8 for tiny boxes', () => {
    // Three points within a 0.001 x 0.001 box. Without the cap, scale would be ~850.
    const t = computeAutoFit([
      mkStroke('s', [[0.5, 0.5], [0.5005, 0.5005], [0.501, 0.501]]),
    ]);
    expect(t.scale).toBeLessThanOrEqual(8);
    expect(t.scale).toBeGreaterThan(0); // sanity
  });

  it('excludes strokes with fewer than 3 points from the bbox', () => {
    // A "real" small stroke + a stray 2-point dot in the corner.
    // Bbox without the stray: (0.4..0.6, 0.4..0.6).
    const t = computeAutoFit([
      mkStroke('main', [[0.4, 0.4], [0.5, 0.5], [0.6, 0.6]]),
      mkStroke('stray', [[0.95, 0.05], [0.96, 0.05]]),
    ]);
    // Center of (0.4..0.6, 0.4..0.6) is (0.5, 0.5). After transform that should land at (0.5, CENTER_Y).
    const cx = 0.5 * t.scale + t.dx;
    const cy = 0.5 * t.scale + t.dy;
    expect(cx).toBeCloseTo(0.5, 3);
    expect(cy).toBeCloseTo(CENTER_Y, 3);
  });

  it('excludes speck strokes (bbox extent < 0.005 in both axes) from the bbox', () => {
    const t = computeAutoFit([
      mkStroke('main', [[0.4, 0.4], [0.5, 0.5], [0.6, 0.6]]),
      // 4-point tight speck near the corner.
      mkStroke('speck', [
        [0.99, 0.01],
        [0.991, 0.011],
        [0.992, 0.012],
        [0.993, 0.013],
      ]),
    ]);
    const cx = 0.5 * t.scale + t.dx;
    const cy = 0.5 * t.scale + t.dy;
    expect(cx).toBeCloseTo(0.5, 3);
    expect(cy).toBeCloseTo(CENTER_Y, 3);
  });

  it('pads the bbox by half the largest stroke radius', () => {
    // Thick stroke (SIZE_MAP.thick = 0.030, radius 0.015) at the edge.
    // Without padding: bbox width = 0.2, scaleX = 0.85 / 0.2 = 4.25.
    // With padding: bbox width = 0.2 + 2*0.015 = 0.23, scaleX = 0.85 / 0.23 ≈ 3.6957.
    const t = computeAutoFit([
      mkStroke('thick', [[0.4, 0.4], [0.5, 0.5], [0.6, 0.4]], { size: 'thick' }),
    ]);
    expect(t.scale).toBeLessThan(4.25);
    expect(t.scale).toBeGreaterThan(3.0);
  });
});
```

- [x] **Step 2: Run the test file to confirm it fails**

Run: `npx vitest run tests/lib/drawing/autofit.test.ts`

Expected output: the suite errors with something like `Failed to resolve import "@/lib/drawing/autofit"` because the source file doesn't exist yet.

- [x] **Step 3: Create the autofit source file**

Create `lib/drawing/autofit.ts`:

```typescript
import type { Stroke, PenSize } from './strokes';

export type AutoFitTransform = { scale: number; dx: number; dy: number };

// Match SIZE_MAP in lib/drawing/render.ts (kept in sync by hand).
const SIZE_RADIUS: Record<PenSize, number> = {
  thin: 0.007 / 2,
  medium: 0.015 / 2,
  thick: 0.030 / 2,
};

// Drawing region (export canvas reserves 360px caption band at the bottom of 3300px).
const REGION_BOTTOM = (3300 - 360) / 3300; // ≈ 0.8909
const TARGET_FILL = 0.85;
const CENTER_X = 0.5;
const CENTER_Y = REGION_BOTTOM / 2;
const TINY_BOX_THRESHOLD = 0.02;
const TINY_BOX_SCALE_CAP = 8;
const SPECK_EXTENT = 0.005;
const MIN_POINTS = 3;

const IDENTITY: AutoFitTransform = { scale: 1, dx: 0, dy: 0 };

function strokeBboxExtent(s: Stroke): { w: number; h: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of s.points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { w: maxX - minX, h: maxY - minY };
}

function passesFilter(s: Stroke): boolean {
  if (s.isEraser) return false;
  if (s.points.length < MIN_POINTS) return false;
  const { w, h } = strokeBboxExtent(s);
  if (w < SPECK_EXTENT && h < SPECK_EXTENT) return false;
  return true;
}

export function computeAutoFit(strokes: Stroke[]): AutoFitTransform {
  const eligible = strokes.filter(passesFilter);
  if (eligible.length === 0) return IDENTITY;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let maxRadius = 0;
  for (const s of eligible) {
    const r = SIZE_RADIUS[s.size];
    if (r > maxRadius) maxRadius = r;
    for (const p of s.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }

  const paddedMinX = minX - maxRadius;
  const paddedMaxX = maxX + maxRadius;
  const paddedMinY = minY - maxRadius;
  const paddedMaxY = maxY + maxRadius;
  const boxW = paddedMaxX - paddedMinX;
  const boxH = paddedMaxY - paddedMinY;

  const scaleX = (TARGET_FILL * 1.0) / boxW;
  const scaleY = (TARGET_FILL * REGION_BOTTOM) / boxH;
  let scale = Math.min(scaleX, scaleY);
  if (boxW < TINY_BOX_THRESHOLD || boxH < TINY_BOX_THRESHOLD) {
    scale = Math.min(scale, TINY_BOX_SCALE_CAP);
  }

  const boxCenterX = (paddedMinX + paddedMaxX) / 2;
  const boxCenterY = (paddedMinY + paddedMaxY) / 2;
  const dx = CENTER_X - boxCenterX * scale;
  const dy = CENTER_Y - boxCenterY * scale;

  return { scale, dx, dy };
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/drawing/autofit.test.ts`

Expected: all 9 tests pass.

- [x] **Step 5: Commit**

```bash
git add lib/drawing/autofit.ts tests/lib/drawing/autofit.test.ts
git commit -m "feat: add computeAutoFit transform calculation"
```

---

### Task 2: Add `applyTransform`

**Files:**
- Modify: `lib/drawing/autofit.ts`
- Modify: `tests/lib/drawing/autofit.test.ts`

- [x] **Step 1: Add the failing test**

Append inside the existing `describe('computeAutoFit', …)` block's closing brace area, then add a second describe block at the end of the file:

```typescript
import { applyTransform } from '@/lib/drawing/autofit';

describe('applyTransform', () => {
  it('applies scale and translation to every point', () => {
    const s = mkStroke('s', [[0.0, 0.0], [0.5, 0.5], [1.0, 1.0]]);
    const out = applyTransform([s], { scale: 2, dx: 0.1, dy: -0.2 });
    expect(out).toHaveLength(1);
    expect(out[0].points).toEqual([
      { x: 0.1, y: -0.2, pressure: 0.5 },
      { x: 1.1, y: 0.8, pressure: 0.5 },
      { x: 2.1, y: 1.8, pressure: 0.5 },
    ]);
  });

  it('preserves stroke metadata (id, color, size, isEraser)', () => {
    const s = mkStroke('keep', [[0, 0], [1, 1]], { size: 'thick' });
    const out = applyTransform([s], { scale: 1, dx: 0, dy: 0 });
    expect(out[0].id).toBe('keep');
    expect(out[0].size).toBe('thick');
    expect(out[0].isEraser).toBe(false);
    expect(out[0].color).toBe('#000000');
  });

  it('preserves pressure values', () => {
    const stroke: Stroke = {
      id: 'p',
      color: '#000000',
      size: 'medium',
      isEraser: false,
      points: [{ x: 0.2, y: 0.3, pressure: 0.7 }],
    };
    const out = applyTransform([stroke], { scale: 1.5, dx: 0, dy: 0 });
    expect(out[0].points[0].pressure).toBe(0.7);
  });

  it('returns a new array (does not mutate input)', () => {
    const s = mkStroke('s', [[0, 0]]);
    const input = [s];
    const out = applyTransform(input, { scale: 2, dx: 0, dy: 0 });
    expect(out).not.toBe(input);
    expect(out[0]).not.toBe(s);
    expect(s.points[0]).toEqual({ x: 0, y: 0, pressure: 0.5 });
  });
});
```

(Combine the `import { computeAutoFit } from '@/lib/drawing/autofit';` and the new `import { applyTransform } from …` into one import at the top of the file.)

- [x] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run tests/lib/drawing/autofit.test.ts -t applyTransform`

Expected: the `applyTransform` tests fail — `applyTransform is not a function` or import error.

- [x] **Step 3: Implement `applyTransform`**

Append to `lib/drawing/autofit.ts`:

```typescript
export function applyTransform(strokes: Stroke[], t: AutoFitTransform): Stroke[] {
  return strokes.map((s) => ({
    ...s,
    points: s.points.map((p) => ({
      x: p.x * t.scale + t.dx,
      y: p.y * t.scale + t.dy,
      pressure: p.pressure,
    })),
  }));
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/drawing/autofit.test.ts`

Expected: all tests pass (computeAutoFit + applyTransform).

- [x] **Step 5: Commit**

```bash
git add lib/drawing/autofit.ts tests/lib/drawing/autofit.test.ts
git commit -m "feat: add applyTransform for autofit"
```

---

### Task 3: Add `isIdentityTransform`

**Files:**
- Modify: `lib/drawing/autofit.ts`
- Modify: `tests/lib/drawing/autofit.test.ts`

- [x] **Step 1: Add the failing test**

Append to `tests/lib/drawing/autofit.test.ts`:

```typescript
import { isIdentityTransform } from '@/lib/drawing/autofit';

describe('isIdentityTransform', () => {
  it('returns true for exact identity', () => {
    expect(isIdentityTransform({ scale: 1, dx: 0, dy: 0 })).toBe(true);
  });

  it('returns true within tolerance (|scale-1|<0.05, |dx|<0.02, |dy|<0.02)', () => {
    expect(isIdentityTransform({ scale: 1.04, dx: 0.019, dy: -0.019 })).toBe(true);
    expect(isIdentityTransform({ scale: 0.96, dx: 0.0, dy: 0.01 })).toBe(true);
  });

  it('returns false when scale is far from 1', () => {
    expect(isIdentityTransform({ scale: 1.06, dx: 0, dy: 0 })).toBe(false);
    expect(isIdentityTransform({ scale: 0.94, dx: 0, dy: 0 })).toBe(false);
  });

  it('returns false when translation is large', () => {
    expect(isIdentityTransform({ scale: 1, dx: 0.03, dy: 0 })).toBe(false);
    expect(isIdentityTransform({ scale: 1, dx: 0, dy: -0.03 })).toBe(false);
  });
});
```

(Merge into the existing autofit import line at the top.)

- [x] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/drawing/autofit.test.ts -t isIdentityTransform`

Expected: fails with `isIdentityTransform is not a function`.

- [x] **Step 3: Implement `isIdentityTransform`**

Append to `lib/drawing/autofit.ts`:

```typescript
const IDENTITY_SCALE_TOLERANCE = 0.05;
const IDENTITY_TRANSLATE_TOLERANCE = 0.02;

export function isIdentityTransform(t: AutoFitTransform): boolean {
  return (
    Math.abs(t.scale - 1) < IDENTITY_SCALE_TOLERANCE &&
    Math.abs(t.dx) < IDENTITY_TRANSLATE_TOLERANCE &&
    Math.abs(t.dy) < IDENTITY_TRANSLATE_TOLERANCE
  );
}
```

- [x] **Step 4: Run all autofit tests to verify they pass**

Run: `npx vitest run tests/lib/drawing/autofit.test.ts`

Expected: every test in the file passes.

- [x] **Step 5: Commit**

```bash
git add lib/drawing/autofit.ts tests/lib/drawing/autofit.test.ts
git commit -m "feat: add isIdentityTransform helper"
```

---

### Task 4: Create `PreviewModal` component

**Files:**
- Create: `components/PreviewModal.tsx`

This is a presentation component. We're not unit-testing it directly (consistent with the existing pattern in `components/`); the manual E2E checklist covers its behavior.

- [x] **Step 1: Create the component file**

Create `components/PreviewModal.tsx`:

```tsx
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
```

- [x] **Step 2: Type-check to confirm the file compiles**

Run: `npx tsc --noEmit`

Expected: no errors (or only pre-existing errors unrelated to the new file).

- [x] **Step 3: Commit**

```bash
git add components/PreviewModal.tsx
git commit -m "feat: add PreviewModal for autofit confirmation"
```

---

### Task 5: Wire `PreviewModal` into `DrawFlow`

**Files:**
- Modify: `components/DrawFlow.tsx`

- [x] **Step 1: Add the `'previewing'` phase and submit-stage state**

Open `components/DrawFlow.tsx`. Change the `Phase` type (currently line 12):

```typescript
type Phase = 'acquiring' | 'unavailable' | 'naming' | 'drawing' | 'previewing' | 'submitting' | 'submitted' | 'lock_lost';
```

Add new imports at the top of the file (alongside the existing imports):

```typescript
import { computeAutoFit, applyTransform, isIdentityTransform } from '@/lib/drawing/autofit';
import { PreviewModal } from './PreviewModal';
```

Inside the `DrawFlow` component body, add new state right after the existing `useState<History>` declaration:

```typescript
const [transformedStrokes, setTransformedStrokes] = useState<Stroke[] | null>(null);
```

Add the missing `Stroke` import to the strokes import line at the top of the file (the current line imports `createHistory, type History` — add `type Stroke`):

```typescript
import { createHistory, type History, type Stroke } from '@/lib/drawing/strokes';
```

- [x] **Step 2: Replace `handleSubmit` with a two-stage flow**

Find the existing `async function handleSubmit()` (lines ~70–105) and replace it with:

```typescript
async function doSubmit(strokesToSubmit: Stroke[]) {
  if (!lockToken) return;
  setPhase('submitting');
  try {
    const blob = await exportToBlob(strokesToSubmit, { letter, subject });
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
        stroke_data: strokesToSubmit,
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

function handleSubmit() {
  if (!lockToken) return;
  const transform = computeAutoFit(history.strokes);
  if (isIdentityTransform(transform)) {
    void doSubmit(history.strokes);
    return;
  }
  setTransformedStrokes(applyTransform(history.strokes, transform));
  setPhase('previewing');
}
```

- [x] **Step 3: Render `PreviewModal` when in the previewing phase**

Find the JSX `return` for the drawing phase (the `<main>` block starting around line 153). Just inside that `<main>` (after the existing `<div aria-hidden …grain… />`), add:

```tsx
{phase === 'previewing' && transformedStrokes && (
  <PreviewModal
    originalStrokes={history.strokes}
    transformedStrokes={transformedStrokes}
    caption={{ letter, subject }}
    busy={false}
    onBack={() => {
      setTransformedStrokes(null);
      setPhase('drawing');
    }}
    onUseOriginal={() => {
      const s = history.strokes;
      setTransformedStrokes(null);
      void doSubmit(s);
    }}
    onUseCleaned={() => {
      const s = transformedStrokes;
      void doSubmit(s);
    }}
  />
)}
```

- [x] **Step 4: Make the Submit button reflect the new phase**

The existing Submit button text reads `phase === 'submitting' ? 'Saving…' : 'Submit page'`. Update its `disabled` clause so the button doesn't stay clickable while the preview modal is open:

```tsx
disabled={history.strokes.length === 0 || phase === 'submitting' || phase === 'previewing'}
```

- [x] **Step 5: Type-check + run autofit tests**

Run: `npx tsc --noEmit && npx vitest run tests/lib/drawing/autofit.test.ts`

Expected: no TypeScript errors; all autofit tests still pass.

- [x] **Step 6: Smoke-test manually** *(deferred — manual browser smoke test skipped; cannot drive a browser in this session)*

Run: `npm run dev`

In a browser, log in with the passcode, pick any available letter, fill in the name modal, draw a small doodle in one corner, click **Submit page**. The PreviewModal should appear with two side-by-side thumbnails. Try **Use my original** (drawing saves as-drawn), then redo with another letter and try **Use this** (drawing saves centered/scaled). Try drawing something already well-centered at a reasonable size — preview should be skipped.

- [x] **Step 7: Commit**

```bash
git add components/DrawFlow.tsx
git commit -m "feat: wire autofit preview into draw flow"
```

---

### Task 6: Create `/api/reference` route and types

**Files:**
- Create: `lib/reference.ts`
- Create: `app/api/reference/route.ts`
- Test: `tests/api/reference.test.ts`

- [x] **Step 1: Write the failing test**

Create `tests/api/reference.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_KEY = process.env.PEXELS_API_KEY;

function mockFetch(impl: typeof fetch) {
  return vi.spyOn(global, 'fetch').mockImplementation(impl as typeof fetch);
}

function pexelsResponse(photos: unknown[]) {
  return new Response(JSON.stringify({ photos }), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('GET /api/reference', () => {
  beforeEach(() => {
    process.env.PEXELS_API_KEY = 'test-key';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.PEXELS_API_KEY;
    else process.env.PEXELS_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  it('returns 400 when q is missing', async () => {
    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('missing_query');
  });

  it('returns 400 when q is empty', async () => {
    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference?q='));
    expect(res.status).toBe(400);
  });

  it('maps Pexels response to slim shape', async () => {
    mockFetch(async () =>
      pexelsResponse([
        {
          id: 12345,
          src: { medium: 'https://m.example/m.jpg', large: 'https://m.example/l.jpg', original: 'https://m.example/o.jpg' },
          alt: 'A red apple',
          photographer: 'Jane Doe',
          width: 1000,
          height: 1000,
        },
      ]),
    );

    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference?q=apple'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.photos).toEqual([
      {
        id: '12345',
        srcMedium: 'https://m.example/m.jpg',
        srcLarge: 'https://m.example/l.jpg',
        alt: 'A red apple',
        photographer: 'Jane Doe',
      },
    ]);
  });

  it('returns empty photos array when Pexels returns none', async () => {
    mockFetch(async () => pexelsResponse([]));
    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference?q=zzzzzzz'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.photos).toEqual([]);
  });

  it('returns 502 upstream_failed when Pexels returns non-2xx', async () => {
    mockFetch(async () => new Response('boom', { status: 500 }));
    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference?q=apple'));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('upstream_failed');
  });

  it('sets Cache-Control: public, max-age=3600 on success', async () => {
    mockFetch(async () => pexelsResponse([]));
    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference?q=apple'));
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
  });

  it('calls Pexels with Authorization header and correct query params', async () => {
    const spy = mockFetch(async () => pexelsResponse([]));
    const { GET } = await import('@/app/api/reference/route');
    await GET(new Request('http://test/api/reference?q=red%20apple'));
    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toBe('https://api.pexels.com/v1/search?query=red+apple&per_page=10&orientation=square');
    const headers = new Headers((init as RequestInit | undefined)?.headers);
    expect(headers.get('Authorization')).toBe('test-key');
  });

  it('returns 502 when PEXELS_API_KEY is unset', async () => {
    delete process.env.PEXELS_API_KEY;
    const { GET } = await import('@/app/api/reference/route');
    const res = await GET(new Request('http://test/api/reference?q=apple'));
    expect(res.status).toBe(502);
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/api/reference.test.ts`

Expected: fails with `Failed to resolve import "@/app/api/reference/route"`.

- [x] **Step 3: Create the `Photo` type and Pexels mapper**

Create `lib/reference.ts`:

```typescript
export type Photo = {
  id: string;
  srcMedium: string;
  srcLarge: string;
  alt: string;
  photographer: string;
};

type PexelsPhoto = {
  id: number;
  src: { medium: string; large: string };
  alt?: string;
  photographer?: string;
};

export function mapPexelsPhotos(raw: unknown): Photo[] {
  if (!raw || typeof raw !== 'object') return [];
  const photos = (raw as { photos?: unknown }).photos;
  if (!Array.isArray(photos)) return [];
  return photos.map((p) => {
    const pp = p as PexelsPhoto;
    return {
      id: String(pp.id),
      srcMedium: pp.src.medium,
      srcLarge: pp.src.large,
      alt: pp.alt ?? '',
      photographer: pp.photographer ?? '',
    };
  });
}
```

- [x] **Step 4: Create the route handler**

Create `app/api/reference/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { mapPexelsPhotos } from '@/lib/reference';

export const dynamic = 'force-dynamic';

const PEXELS_ENDPOINT = 'https://api.pexels.com/v1/search';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'missing_query' }, { status: 400 });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'upstream_failed' }, { status: 502 });
  }

  const upstream = new URL(PEXELS_ENDPOINT);
  upstream.searchParams.set('query', q);
  upstream.searchParams.set('per_page', '10');
  upstream.searchParams.set('orientation', 'square');

  let res: Response;
  try {
    res = await fetch(upstream.toString(), {
      headers: { Authorization: apiKey },
    });
  } catch {
    return NextResponse.json({ error: 'upstream_failed' }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'upstream_failed' }, { status: 502 });
  }

  const raw = await res.json().catch(() => null);
  const photos = mapPexelsPhotos(raw);
  return NextResponse.json(
    { photos },
    { headers: { 'cache-control': 'public, max-age=3600' } },
  );
}
```

- [x] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/api/reference.test.ts`

Expected: all 8 tests pass.

- [x] **Step 6: Commit**

```bash
git add lib/reference.ts app/api/reference/route.ts tests/api/reference.test.ts
git commit -m "feat: add /api/reference Pexels proxy"
```

---

### Task 7: Create `ReferenceModal` component

**Files:**
- Create: `components/ReferenceModal.tsx`

- [x] **Step 1: Create the component file**

Create `components/ReferenceModal.tsx`:

```tsx
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
      const res = await fetch(`/api/reference?q=${encodeURIComponent(subject)}`);
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
```

- [x] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add components/ReferenceModal.tsx
git commit -m "feat: add ReferenceModal for image lookups"
```

---

### Task 8: Wire the Reference button into `DrawFlow`'s header

**Files:**
- Modify: `components/DrawFlow.tsx`

- [x] **Step 1: Add imports and state for the reference modal**

Open `components/DrawFlow.tsx`. Add to the imports at the top:

```typescript
import { LuImage } from 'react-icons/lu';
import { ReferenceModal } from './ReferenceModal';
import type { Photo } from '@/lib/reference';
```

Inside the `DrawFlow` component body, alongside the existing `useState` calls, add:

```typescript
const [referenceOpen, setReferenceOpen] = useState(false);
const [referencePhotos, setReferencePhotos] = useState<Photo[] | null>(null);
```

- [x] **Step 2: Add the Reference button to the header**

Find the existing header `<div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">` (the Cancel + Submit cluster). Insert a new button between Cancel and Submit:

```tsx
<button
  type="button"
  onClick={() => setReferenceOpen(true)}
  disabled={phase === 'submitting' || phase === 'previewing' || phase === 'lock_lost'}
  className="flex items-center gap-1.5 rounded-[3px] px-4 py-2 font-display text-[11px] uppercase tracking-eyebrow text-nibsoft transition-colors hover:text-nib disabled:opacity-40"
  aria-label="See a reference image"
>
  <LuImage className="text-sm" />
  Reference
</button>
```

(Place this between the `Cancel` button and the `Submit page` button in the same flex row.)

- [x] **Step 3: Render the ReferenceModal**

Inside the `<main>` for the drawing layout, right next to where you rendered `PreviewModal` in Task 5, add:

```tsx
{referenceOpen && (
  <ReferenceModal
    subject={subject}
    cachedPhotos={referencePhotos}
    onCache={setReferencePhotos}
    onClose={() => setReferenceOpen(false)}
  />
)}
```

- [x] **Step 4: Type-check + run the full test suite**

Run: `npx tsc --noEmit && npm test`

Expected: no TypeScript errors; existing tests still pass; new autofit + reference tests pass. If a DB-dependent test suite reports "skipped" because Docker isn't running locally, that's fine — those are pre-existing.

- [ ] **Step 5: Manual smoke test** _(deferred — no browser-driving in this implementation session)_

Add `PEXELS_API_KEY=<your-key>` to `.env.local` (sign up at https://www.pexels.com/api/ for a free key — instant), then `npm run dev`. Walk through the drawing flow for a letter; click **Reference**; verify the photo loads with the subject as the query, click **Show me another** to advance, close and reopen the modal (should not re-fetch), then submit and verify the rest of the flow still works.

- [x] **Step 6: Commit**

```bash
git add components/DrawFlow.tsx
git commit -m "feat: add reference image button to draw header"
```

---

### Task 9: Update the manual E2E checklist and env documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-06-11-baby-shower-coloring-book-design.md` (env var list)
- Modify: `README.md` (or whichever file holds the pre-party checklist — currently the original spec doc)

- [x] **Step 1: Add `PEXELS_API_KEY` to the env-vars list in the original spec**

In `docs/superpowers/specs/2026-06-11-baby-shower-coloring-book-design.md`, find the **Deployment → Env vars** block (around line 175):

```markdown
- **Env vars:**
  - `DATABASE_URL`
  - `BLOB_READ_WRITE_TOKEN`
  - `PARTY_PASSCODE`
  - `ADMIN_KEY`
```

Add one line:

```markdown
- **Env vars:**
  - `DATABASE_URL`
  - `BLOB_READ_WRITE_TOKEN`
  - `PARTY_PASSCODE`
  - `ADMIN_KEY`
  - `PEXELS_API_KEY`
```

- [x] **Step 2: Append the new manual checklist items**

In the same file, find the **Manual E2E checklist** section (around line 157) and append:

```markdown
- [ ] Draw a small doodle in one corner → preview shows it centered and enlarged.
- [ ] Draw a huge figure that touches the edges → preview shows it shrunk to fit.
- [ ] Draw something then tap a stray dot in a corner → bbox ignores the dot.
- [ ] Draw something already well-centered at a reasonable size → preview is skipped.
- [ ] Tap "Use my original" in the preview → submitted PNG matches the raw drawing.
- [ ] Tap "Use this" in the preview → submitted PNG shows the centered/scaled version.
- [ ] Tap Reference on a letter with subject "Apple" → photo loads with photographer credit.
- [ ] Tap "Show me another" → photo changes.
- [ ] Close and reopen Reference → no extra network request (verify in DevTools Network).
- [ ] Subject like "Xylophonic frogfish" → friendly "couldn't find" message.
- [ ] Reference button is disabled while preview modal is open and while submitting.
```

- [x] **Step 3: Add `PEXELS_API_KEY` to the pre-party checklist**

In the same file's **Pre-party checklist** section (around line 183), add a line:

```markdown
- `PEXELS_API_KEY` configured in Vercel for the production environment.
```

- [x] **Step 4: Verify the env var is set locally** *(local `.env.local` missing the key — informational only; production must set it in Vercel)*

Run: `grep -c '^PEXELS_API_KEY=' .env.local || echo "missing"`

Expected: prints `1` (key present). If `missing`, add it before testing.

- [x] **Step 5: Run the full test suite one more time**

Run: `npm test`

Expected: all unit + non-DB integration tests pass. (DB-dependent tests may be skipped without Docker — that's fine, same as before this work.)

- [x] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-06-11-baby-shower-coloring-book-design.md
git commit -m "docs: add PEXELS_API_KEY and autofit/reference checklist items"
```

---

## Done

After Task 9, the feature is complete: both auto-fit preview and reference image lookup are live, unit-tested, and documented in the original spec's checklists. The plan introduced one new env var (`PEXELS_API_KEY`), no DB migrations, and no changes to existing API contracts.
