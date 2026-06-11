# Baby Uebe Coloring Book — Design Spec

**Date:** 2026-06-11
**Target event:** Baby shower on 2026-06-20 (nine days out)
**Status:** Approved for implementation planning

## Goal

A web app that lets baby shower guests collaboratively create an A–Z coloring book. Each letter gets one drawing by one guest. Submitted pages are viewable as a gallery on the iPad at the party (and on guests' phones). After the party, the pages export as print-ready images so we can have a physical coloring book made.

## MVP scope

- Shared party passcode gate (one code, set via env var).
- Home screen: 26-letter alphabet grid showing each letter's state (available / in-progress / done).
- Tap a "done" letter → full-screen lightbox with the drawing, caption, and artist name.
- Tap an "available" letter → drawing flow:
  1. Modal: "Who are you?" (e.g., "Uncle Daniel") + "A is for…" (e.g., "Apple"). Submit → drawing canvas.
  2. Canvas: portrait 8.5×11 aspect, black + medium gray ink, three pen sizes, eraser, undo/redo, clear.
  3. Submit → page is finalized, becomes "done" on the grid.
- "In-progress" letters are not selectable; if the drawer goes idle for ~3 min the lock expires and the letter is available again (in-progress work is discarded).
- Hidden admin URL (`/admin?key=…`) to delete entries, force-unlock a stuck letter, and download a ZIP of all submissions as print-ready PNGs.

### Explicitly out of scope for MVP (revisit if time)

- Live presence indicators ("Uncle Daniel is drawing now").
- Resuming an expired draft.
- Comments on pages.
- "Surprise me" random-letter pick.
- Per-user identity / accounts.
- Staging environment.
- Automated E2E tests (Playwright).

## Stack

- **Framework:** Next.js 15 (App Router, TypeScript) on Vercel.
- **Database:** Postgres via Neon (Vercel's serverless Postgres).
- **ORM:** Drizzle.
- **Image storage:** Vercel Blob, using client uploads to bypass the serverless body-size limit for the 300 DPI export.
- **Styling:** Tailwind CSS. Theme: warm cream background (`#fdfaf3`), Georgia/serif for letters and "X is for…" text, system-sans for UI.
- **Client data fetching:** SWR. Home page polls `/api/state` every 10s during the party so locks and submissions appear quickly without WebSockets.
- **Drawing:** native HTML5 canvas, [perfect-freehand](https://github.com/steveruizok/perfect-freehand) for smooth strokes, Pointer Events for mouse/touch/Apple Pencil.

## Data model

Two tables.

```sql
entries
├── id           uuid PRIMARY KEY
├── letter       char(1) UNIQUE NOT NULL  -- enforces one entry per letter
├── artist_name  text NOT NULL
├── subject      text NOT NULL
├── image_url    text NOT NULL            -- Vercel Blob URL
├── stroke_data  jsonb                    -- optional, for possible re-render
└── created_at   timestamptz NOT NULL DEFAULT now()

letter_locks
├── letter             char(1) PRIMARY KEY
├── lock_token         uuid NOT NULL        -- per-session secret
├── artist_name        text                 -- set when name modal submits
├── subject            text
├── acquired_at        timestamptz NOT NULL DEFAULT now()
└── last_heartbeat_at  timestamptz NOT NULL DEFAULT now()
```

`entries.letter UNIQUE` is the canonical "one-entry-per-letter" guarantee. `letter_locks.letter PRIMARY KEY` + stale-row sweep gives mutex during drawing.

## Routes & API

### Pages

- `GET /welcome` — collects the passcode, sets `passcode` cookie (httpOnly), redirects to `/`.
- `GET /` — alphabet grid. Server component fetches initial state; client polls `/api/state` every 10s via SWR.
- `GET /draw/[letter]` — drawing flow. Server component guards passcode + renders `<DrawFlow letter={…} />`.
- `GET /admin?key=…` — admin panel.

### API

All non-admin routes check the passcode cookie; missing/invalid → 401.

- `GET  /api/state` → `{ letters: [{ letter, status: 'available'|'locked'|'done', artistName?, subject?, thumbnailUrl? }] }`. Single query joining `entries` and a stale-sweep view of `letter_locks`.
- `POST /api/locks` — body `{ letter }`. Sweeps locks with `last_heartbeat_at < now() - interval '180 seconds'`, inserts new lock with `ON CONFLICT (letter) DO NOTHING`, also checks `entries.letter`. Returns `{ lock_token }` (201) | `409 done` | `409 in_use`.
- `POST /api/locks/heartbeat` — body `{ letter, lock_token }`. Updates `last_heartbeat_at` if token matches; else `410`.
- `PATCH /api/locks` — body `{ letter, lock_token, artist_name, subject }`. Stores the modal answers so admin can see who's holding what.
- `DELETE /api/locks` — body `{ letter, lock_token }`. Used when user cancels.
- `POST /api/entries` — body `{ letter, lock_token, artist_name, subject, image_url, stroke_data }`. Single transaction: verify lock_token + heartbeat-fresh, INSERT entry (unique constraint enforces atomicity), DELETE lock. Returns 201 with the entry, or 410 lock_lost, or 409 done.
- `POST /api/admin/unlock` — body `{ letter }`. Deletes any `letter_locks` row.
- `DELETE /api/admin/entries/:letter` — removes the entry, letter becomes available again.
- `GET  /api/admin/zip` — streams a ZIP of all entry PNGs named `A-Apple-Uncle-Daniel.png` etc.

## Component breakdown

Keeping files focused so each one is easy to reason about and ship in nine days.

- `app/page.tsx` — server component; fetches initial `/api/state` data.
- `components/AlphabetGrid.tsx` — client; renders the 26 cells with state styling, SWR polls every 10s, handles tap routing.
- `components/EntryLightbox.tsx` — full-screen lightbox for viewing a finished page. No edit affordances.
- `app/draw/[letter]/page.tsx` — server component; passcode guard + renders `<DrawFlow />`.
- `components/DrawFlow.tsx` — state machine: `idle → acquiring → naming → drawing → submitting → done`.
- `components/NameModal.tsx` — "Who are you?" + "X is for…" form. On submit, PATCHes lock with name/subject and transitions to `drawing`.
- `components/DrawCanvas.tsx` — canvas + toolbar layout. Responsive: bottom toolbar at viewport width ≤900px, left-rail toolbar ≥901px.
- `components/Toolbar.tsx` — pen size (3 options), color (black / medium gray), eraser, undo, redo, clear.
- `app/admin/page.tsx` + `components/AdminPanel.tsx` — admin listing + actions.
- `lib/drawing/strokes.ts` — `Stroke` type, undo/redo history (cap 200).
- `lib/drawing/render.ts` — pure: render a stroke list to a canvas context.
- `lib/drawing/export.ts` — pure: render a stroke list + caption to a 2550×3300 offscreen canvas and return a PNG blob.
- `lib/heartbeat.ts` — interval manager that pings `/api/locks/heartbeat` every 15s while drawing; stops on submit/unmount; alerts the UI on 410.
- `lib/db/schema.ts` — Drizzle schema definitions.
- `lib/db/index.ts` — Drizzle client.

## Drawing implementation

- **Stroke representation:** `{ id, color: '#000'|'#666', size: 'thin'|'medium'|'thick', points: [{ x, y, pressure }], isEraser: boolean }`. Coordinates stored as normalized 0–1 floats so phone/iPad/landscape all produce identical export.
- **Rendering:** perfect-freehand turns each stroke's points into a smooth polygon. Eraser strokes drawn with `globalCompositeOperation = 'destination-out'`. Pressure from Pointer Events drives perfect-freehand weight; falls back to constant on mouse.
- **Undo/redo:** two arrays — `strokes` and `redoStack`. Undo pops from `strokes` onto `redoStack`. Any new stroke clears `redoStack`. History capped at 200 strokes.
- **Clear:** confirm dialog ("Erase the whole drawing?"). Wipes both arrays.
- **Aspect lock:** display canvas is aspect-ratio-locked 8.5:11. CSS handles sizing; we always export at a fixed 2550×3300 internal resolution (300 DPI for an 8.5×11" print) regardless of display size.
- **Export:** on submit, render all strokes onto a 2550×3300 offscreen canvas, then draw "{LETTER} is for {Subject}" in Georgia at the bottom, encode as PNG, upload to Vercel Blob via client upload, then `POST /api/entries`.

## Concurrency / locking

- **Heartbeat cadence:** browser pings every 15s while in the `drawing` state.
- **Staleness threshold:** server treats a lock as dead when `last_heartbeat_at < now() - 180 seconds` (3 minutes). This is the value used by the sweep in `POST /api/locks` and by the validity check in `POST /api/entries`. With a 15s heartbeat cadence, the effective forgiveness window is the threshold plus up to one missed heartbeat (~195s), which matches the brief's "a few minutes".
- **Acquire is atomic** via `INSERT … ON CONFLICT (letter) DO NOTHING RETURNING …`. The stale sweep is run inside the same transaction, immediately before the insert, so a stale lock can't beat a real attempt.
- **Submit is atomic** via a single transaction: verify token + heartbeat-fresh, INSERT entry (unique constraint on `letter` is the canonical exclusion), DELETE lock. Any failed check aborts.
- **Two-tab/two-device race for the same letter:** the `ON CONFLICT DO NOTHING` is the actual mutex. The loser gets `409 in_use`.
- **Already-finished letter:** acquire also checks `entries.letter`; returns `409 done` if found.

## Error handling

- **Lock lost mid-draw** (heartbeat returns `410`): client shows a non-blocking banner — "This letter got freed up. We're trying to grab it back." Auto-retry acquire every 5s. If they hit submit while we don't hold the lock, show the error and offer "download my drawing" so they don't lose the art.
- **Submit `410 lock_lost`**: same as above. Image data is preserved client-side.
- **Submit `409 done`** (defense in depth — shouldn't happen if locks work): "Someone else just finished this letter. Pick another." Image preserved.
- **Image upload fails:** heartbeats continue holding the lock; show "Couldn't save — retry?" with three auto-retries (backoff 1s/3s/9s) before falling back to a manual retry button.
- **Network down mid-draw:** strokes are local; nothing to do. The heartbeat is the only ongoing network dependency; if it's offline past the staleness threshold (~3 min) the lock dies and the user gets the "lock lost" recovery path on resume.
- **Wrong passcode:** friendly error message, no rate limit (party context).
- **Refresh / close mid-draw:** heartbeat stops, lock expires within ~3 min, in-progress drawing is discarded. Acceptable per the brief.

## Testing

MVP scope. Lean and pragmatic.

### Unit (Vitest)

- `lib/drawing/strokes.ts` — undo/redo invariants, redo cleared on new stroke, history cap at 200.
- `lib/drawing/export.ts` — caption renders at correct position; output dimensions are exactly 2550×3300.

### Integration (Vitest against a real Postgres via testcontainers)

- Full lock lifecycle: acquire → heartbeat → submit succeeds.
- Concurrent acquire of the same letter — only one wins, other gets 409.
- Submit with expired lock returns 410.
- Submit with valid lock but `entries.letter` already exists returns 409.
- Stale lock is swept on next acquire attempt.

### Manual E2E checklist (run on real iPad + a phone before the party)

- [ ] `/welcome` → enter passcode → land on home.
- [ ] Tap A → name modal → enter "Uncle Test" / "Apple" → draw with each pen size, color, eraser, undo, redo → submit → A shows as done on grid.
- [ ] Tap done A → lightbox shows drawing + caption + artist.
- [ ] Two tabs both try to acquire B → second tab gets in-use message.
- [ ] Open draw screen, stop interacting for ~3.5 min → letter returns to available on the home grid.
- [ ] Phone Safari + Android Chrome can complete a full submission.
- [ ] iPad portrait shows bottom toolbar; iPad landscape shows left-rail toolbar.
- [ ] `/admin?key=…` shows entries; delete one and it returns to available.
- [ ] `/api/admin/zip` downloads a ZIP containing all submitted PNGs at 300 DPI.

### Skipped

- Playwright / browser automation. Not worth the setup time in a nine-day window; the manual checklist gives high-confidence coverage for a single-event app.

## Deployment

- **Environments:** production only. No staging.
- **Env vars:**
  - `DATABASE_URL`
  - `BLOB_READ_WRITE_TOKEN`
  - `PARTY_PASSCODE`
  - `ADMIN_KEY`
- **Migrations:** Drizzle `drizzle-kit push` for first deploy, `drizzle-kit migrate` as part of the Vercel build step thereafter.
- **Roll-back:** Vercel keeps prior deploys; one-click revert if the party-day deploy breaks.

## Pre-party checklist (lives in README after implementation)

- Tested on the actual iPad (Safari) in both orientations.
- Tested on iOS Safari + Android Chrome on a phone.
- Passcode set and family informed.
- Admin URL bookmarked on Andrew's phone.
- At least one real-feeling test entry submitted and visible in gallery.
- ZIP download produces a valid archive with print-ready PNGs.

## Visual aesthetic

- Background: warm cream `#fdfaf3`.
- Ink / text: near-black `#2a2a2a`; secondary gray `#666`.
- Letter typography: Georgia (serif), bold.
- UI typography: system sans.
- "Done" letter cells: white card with dark border + small artist name caption.
- "In-progress" cells: muted yellow card with "Drawing…" badge, not tappable.
- "Available" cells: cream card with dashed border.
- Lightbox: full-bleed dark backdrop with a single white page floating, caption + artist below.

## Open questions resolved during brainstorming

- Hosting: Vercel public host.
- Persistence: Postgres + Vercel Blob, no per-user accounts.
- Concurrency: heartbeat auto-expire, in-progress work discarded on expiry.
- Access: shared party passcode.
- Stack: Next.js + Postgres + Vercel.
- Home layout: single alphabet grid.
- Canvas layout: responsive — bottom toolbar on narrow viewports, left rail on wide.
- Output: print-ready PNGs at 300 DPI + admin ZIP download.
