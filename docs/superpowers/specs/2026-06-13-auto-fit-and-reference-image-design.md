# Auto-fit & Reference Image — Design Spec

**Date:** 2026-06-13
**Builds on:** `2026-06-11-baby-shower-coloring-book-design.md`
**Status:** Approved for implementation planning

## Goal

Two small additions to the existing drawing flow, both aimed at helping casual / non-artist guests produce a page that looks great in the printed coloring book:

1. **Auto-fit on submit.** After the artist clicks Submit, automatically compute a bounding box around what they actually drew, then offer a centered + properly-sized version side-by-side with their original. They pick which to use.
2. **Reference image button.** A button on the drawing screen that opens a modal with a royalty-free photo of the subject they typed (e.g. "Apple"), so they have something to glance at while they draw. They can cycle through more photos or close the modal at any time.

Both features ship in a single PR. No data-model changes. Pure additions — no existing behavior is broken.

## Out of scope

- AI-assisted "make my drawing look better" (cleanup is purely geometric — center, scale, crop).
- Saving the reference photo with the entry. The reference is for inspiration only; the drawing is what's persisted.
- Free-text search override in the reference modal. The query is always the subject typed in the name modal.
- Retroactive auto-fit on already-submitted entries.
- Filtering reference images for content beyond what Pexels already curates.

## Feature A — Auto-fit on submit

### User flow

1. Artist clicks **Submit page** in the drawing screen header (same button as today).
2. Client computes the auto-fit transform from the current strokes.
3. **If the transform is effectively identity** (drawing already well-placed, or no real strokes to fit), skip the preview and go directly to the existing submit pipeline.
4. Otherwise, show the **Preview modal**:
   - Side-by-side thumbnails: "Your drawing" on the left, "Cleaned up" on the right, both rendered at 8.5:11 with the caption band included.
   - Buttons: **Back** (return to drawing) / **Use original** / **Use this** (the cleaned-up version, default-highlighted).
5. Whichever strokes the artist chose are passed to the existing `exportToBlob` → Blob upload → `POST /api/entries` pipeline. No backend changes.

### Math: how the transform is computed

Operates entirely in the existing normalized 0–1 stroke coordinate space.

**Step 1 — filter strokes for bbox calculation:**

A stroke is *excluded* from the bbox calculation if any of:
- `isEraser === true`.
- `points.length < 3`.
- Its own bbox extent is `< 0.005` in both X and Y (a sub-pixel-sized speck at print scale).

These strokes are still **rendered** with the same transform — we only exclude them from defining "how big the drawing is." This handles stray finger taps in the corners without dropping intentional small details.

**Step 2 — bounding box:**

Walk every point of every remaining stroke. Track `minX, maxX, minY, maxY`. Pad each side by `maxStrokeRadius` (the largest `SIZE_MAP[size] / 2` value among strokes used in the box) so thick-pen edges don't get clipped at the canvas edge after scaling.

If zero strokes survive the filter → return identity transform.

**Step 3 — target region:**

The export canvas is 2550×3300 with a 360px caption band at the bottom. The drawing region in normalized space is therefore:

- `x ∈ [0, 1.0]`
- `y ∈ [0, 0.8909]` (where `0.8909 = (3300 - 360) / 3300`)

Target fill = **85%** of that region, leaving ~7.5% margin on each side.

**Step 4 — uniform scale:**

```
scaleX = (0.85 × 1.0)    / boxWidth
scaleY = (0.85 × 0.8909) / boxHeight
scale  = min(scaleX, scaleY)
```

`scale > 1` enlarges undersized drawings. `scale < 1` shrinks oversized ones. Same formula either way. Uniform — never distorts aspect.

**Step 5 — cap for tiny boxes:**

If `boxWidth < 0.02` or `boxHeight < 0.02` (basically a single dot or microscopic scribble that passed the filter), cap `scale` at **8×**. Avoids blowing a pixel into a giant blob.

**Step 6 — translation (center the result):**

```
targetCenterX = 0.5
targetCenterY = 0.8909 / 2  ≈ 0.4455
boxCenterX = (minX + maxX) / 2
boxCenterY = (minY + maxY) / 2
dx = targetCenterX - (boxCenterX × scale)
dy = targetCenterY - (boxCenterY × scale)
```

**Step 7 — apply to every point of every stroke:**

```
p.x = p.x × scale + dx
p.y = p.y × scale + dy
```

Pressure unchanged. Stroke widths (`size: 'thin'|'medium'|'thick'`) are **not** scaled — strokes drawn at a sensible thickness by hand should stay that way; the slight thinning relative to a now-larger drawing actually looks more refined.

**Step 8 — identity detection:**

After computing `{ scale, dx, dy }`, treat the transform as identity (and skip the preview modal) if:

```
|scale - 1| < 0.05  AND  |dx| < 0.02  AND  |dy| < 0.02
```

### Components & files

- `lib/drawing/autofit.ts` (new)
  - `computeAutoFit(strokes: Stroke[]): { scale: number; dx: number; dy: number }` — pure function. Implements Steps 1–6 above.
  - `applyTransform(strokes: Stroke[], transform): Stroke[]` — pure function. Returns a new stroke array with the transform applied to every point.
  - `isIdentityTransform(transform): boolean` — implements Step 8.
- `components/PreviewModal.tsx` (new)
  - Props: `{ originalStrokes, transformedStrokes, caption, onBack, onUseOriginal, onUseCleaned }`.
  - Renders two thumbnails using the existing `renderStrokes` from `lib/drawing/render.ts` (and the caption band logic from `lib/drawing/export.ts`) into 400×518 offscreen canvases, then `<canvas>` elements in the DOM.
  - Mobile (≤640px viewport): thumbnails and buttons stack vertically.
- `components/DrawFlow.tsx` (modified)
  - `Phase` union gains `'previewing'`.
  - `handleSubmit()` becomes a two-stage flow:
    1. Compute the autofit transform. If `isIdentityTransform`, proceed directly to the existing submit logic with the original strokes.
    2. Otherwise, transition to `'previewing'` with the transformed strokes stashed in state.
  - New handler for the three preview-modal buttons.
  - Heartbeat continues during `'previewing'` — they still hold the lock. Lock-lost handling unchanged.

### Data persistence

- `entries.stroke_data` stores **whichever strokes were submitted** (cleaned-up or original — the artist's choice).
- `entries.image_url` PNG matches `stroke_data`.
- No new DB columns. No migration.

## Feature B — Reference image

### User flow

1. While drawing, the artist taps **👁 Reference** in the header (between Cancel and Submit).
2. Modal opens. First open for a given subject fetches `/api/reference?q=<subject>` and displays photo 1 of up to 10.
3. **Show me another** advances to the next cached photo, wrapping mod 10.
4. **Close** (✕ or backdrop tap) dismisses. Subsequent re-opens for the same subject reuse the cached photo list — no extra fetch.

### API route — `app/api/reference/route.ts` (new)

```
GET /api/reference?q=<subject>

Auth: passcode cookie required (same guard as other /api routes).

→ 200  { photos: [ { id, srcMedium, srcLarge, alt, photographer } ] }
       photos array length 0..10
→ 400  { error: 'missing_query' }       // q absent or empty
→ 401  passcode missing/invalid
→ 502  { error: 'upstream_failed' }     // Pexels non-2xx, including rate-limit 429
```

**Upstream call:**

```
GET https://api.pexels.com/v1/search?query=<q>&per_page=10&orientation=square
Authorization: <PEXELS_API_KEY>
```

**Response mapping:** for each `photo` in Pexels' response, map to `{ id: photo.id, srcMedium: photo.src.medium, srcLarge: photo.src.large, alt: photo.alt, photographer: photo.photographer }`. Drop everything else.

**Caching:** response carries `Cache-Control: public, max-age=3600`. Two guests querying "Apple" within the same hour share a CDN-cached response — no second Pexels call.

### Components & files

- `app/api/reference/route.ts` (new) — the handler above.
- `lib/reference.ts` (new, optional — fine to inline if it stays small)
  - Type `Photo = { id: string; srcMedium: string; srcLarge: string; alt: string; photographer: string }`.
- `components/ReferenceModal.tsx` (new)
  - Props: `{ subject: string; onClose: () => void }`.
  - Owns: `{ photos: Photo[] | null, cursor: number, loading: boolean, error: string | null }`.
  - On mount, if no `photos` cached on parent, fetches `/api/reference?q=<subject>`.
  - Renders the current photo with `<img src={photos[cursor].srcMedium} alt={photos[cursor].alt} />` in an `object-contain` aspect box.
  - Shows photographer credit underneath ("Photo by Jane Doe on Pexels").
  - "Show me another" advances `cursor` (mod `photos.length`); disabled if `photos.length <= 1`.
  - Empty / error states: friendly inline message + Close. Error state shows a Retry button.
- `components/DrawFlow.tsx` (modified)
  - New header button between Cancel and Submit, labeled "Reference" with an `LuImage` icon.
  - Disabled while phase is `submitting`, `previewing`, or `lock_lost`.
  - Stashes the fetched photo list on the parent so closing/reopening doesn't refetch.

### Edge cases

- **Pexels returns 0 photos** (subject is gibberish): modal shows "We couldn't find a reference for *Subject*. Sorry — you've got this." with a Close button.
- **Network / API failure**: friendly message + Retry button.
- **Rate limit (Pexels free tier: 200/hr)**: server route returns `502 upstream_failed`. With ~26 letters × ~2 clicks per artist at the event, plus 1-hour CDN caching, we expect to be nowhere near the limit.
- **Subject changes**: cannot happen during a session — subject is locked once the name modal submits. The cached photo list belongs to that subject for the entire drawing session.

## Env vars

New: `PEXELS_API_KEY` — added to `.env.local`, Vercel project env (Production + Preview), and the env-vars list in the original spec.

Existing env vars unchanged: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `PARTY_PASSCODE`, `ADMIN_KEY`.

## Testing

### Unit (Vitest)

`lib/drawing/autofit.test.ts`:

- Single-stroke bbox matches the stroke's own min/max.
- Strokes with `points.length < 3` are excluded from the bbox.
- Strokes with bbox extent `< 0.005` in both axes are excluded.
- Eraser strokes are excluded from the bbox.
- All-tiny / all-eraser drawing returns identity transform.
- Uniform scale: `scaleX == scaleY` in the output (no aspect distortion).
- Centered: after applying transform, the result's bbox center sits at `(0.5, 0.4455)` ± epsilon.
- Oversized input (bbox larger than the drawing region) gets `scale < 1`.
- Tiny input that passes the filter gets `scale` capped at 8.
- "Already well-placed" input triggers `isIdentityTransform === true`.

`app/api/reference/route.test.ts`:

- Missing `q` → 400.
- Missing passcode cookie → 401.
- Pexels 200 with photos → mapped slim shape, photographer credit preserved.
- Pexels 5xx → 502 `upstream_failed`.
- Pexels 0 photos → 200 with `photos: []`.

### Manual E2E (additions to existing checklist)

- [ ] Draw a small doodle in one corner → preview shows it centered and enlarged.
- [ ] Draw a huge figure that touches the edges → preview shows it shrunk to fit.
- [ ] Draw something then tap a stray dot in a corner → bbox ignores the dot (preview matches what you'd expect from just the main drawing).
- [ ] Draw something perfectly centered at a reasonable size → preview is skipped, goes straight to submit.
- [ ] Tap "Use my original" in the preview → submitted PNG matches the raw drawing exactly.
- [ ] Tap "Use this" → submitted PNG shows the centered/scaled version.
- [ ] Tap Reference with subject "Apple" → photo loads, photographer credit visible.
- [ ] Tap "Show me another" → photo changes.
- [ ] Close and reopen Reference → no extra network request (cached).
- [ ] Subject like "Xylophonic frogfish" → friendly "couldn't find" message.
- [ ] Reference button is disabled during preview and submitting phases.

## Sequencing within the PR

1. `lib/drawing/autofit.ts` + unit tests.
2. `components/PreviewModal.tsx` + integration into `DrawFlow.tsx`.
3. `app/api/reference/route.ts` + unit tests + `PEXELS_API_KEY` env var.
4. `components/ReferenceModal.tsx` + header button in `DrawFlow.tsx`.
5. Manual smoke test on a phone.

## Open questions

None. All design questions resolved during brainstorming.
