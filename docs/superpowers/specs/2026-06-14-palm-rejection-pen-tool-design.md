# Palm Rejection + Pen Tool Button

**Date:** 2026-06-14
**Status:** Approved for implementation

## Problem

Testers using an Apple Pencil on iPad rest their hand on the canvas while drawing. Two failure modes:

1. The resting palm registers as a touch and produces an unwanted stroke alongside the Pencil stroke.
2. After the palm contact, iOS Safari falls back to native text-selection / long-press behavior on chrome elements around the canvas (letter title, "is for", subject text). The page appears to "highlight" text instead of drawing.

Both failures are well-known web-canvas-on-iPad issues with standard fixes.

## Goals

- Pencil strokes register normally; resting palm contact does not produce strokes.
- Users without a Pencil (finger drawing) continue to work unchanged.
- The current drawing mode (pen vs. eraser) is always visually obvious.
- No new runtime dependencies. No persistence layer.

## Non-Goals

- A user-facing "pen-only" toggle setting.
- Persisting pen-detection across sessions.
- Stroke-smoothing libraries (perfect-freehand, etc.).
- Touch-vs-stylus distinction beyond the native `pointerType` property.

## Design

Three changes across three files. Total scope ~25 lines.

### 1. Auto-on pen-only filtering — `components/DrawCanvas.tsx`

The Pointer Events API exposes `pointerType` as `"pen" | "touch" | "mouse"`. Apple Pencil reports as `"pen"`; finger and palm both report as `"touch"`.

Add a session-scoped ref that flips to `true` the first time a `pen` event is seen. Gate all three pointer handlers (`onPointerDown`, `onPointerMove`, `onPointerUp`) so that once a pen has been detected, all non-pen pointer events are ignored for the rest of the session.

```ts
const penDetectedRef = useRef(false);

function shouldAccept(e: React.PointerEvent) {
  if (e.pointerType === 'pen') {
    penDetectedRef.current = true;
    return true;
  }
  return !penDetectedRef.current;
}
```

Each handler early-returns when `!shouldAccept(e)`.

**Behavior:**
- Finger-only user: never triggers pen mode, draws normally.
- Apple Pencil user: first Pencil contact enables palm rejection for the rest of the session. Hand resting on screen is silently ignored.
- Mixed user (rare — toddler with Pencil who switches to finger mid-session): after first Pencil contact, finger is rejected. They can refresh to reset. Acceptable for this audience.

No persistence. Fresh session = fresh detection.

### 2. Pen tool button — `components/Toolbar.tsx`

Add a Pen button (`LuPencil` from `react-icons/lu`) paired with the existing Eraser button as a mutually-exclusive toggle group:

- Pen button: `active={!state.isEraser}`, on click → `setState({ ...state, isEraser: false })`.
- Eraser button: `active={state.isEraser}` (existing behavior unchanged).

The new button slots into the toolbar just before the Eraser button. Always exactly one of the two appears active, so the user can see the current mode at a glance.

### 3. iOS selection suppression — `components/DrawFlow.tsx`

Add to the drawing-phase `<main>` element:
- Tailwind `select-none` class.
- Inline styles: `WebkitTouchCallout: 'none'`, `WebkitUserSelect: 'none'`.

This kills the second-touch text-highlight behavior on iOS Safari even when a palm lands on chrome elements around the canvas (letter heading, subject text, toolbar labels).

## Files Touched

- `components/DrawCanvas.tsx` — add ref + `shouldAccept` gate
- `components/Toolbar.tsx` — add Pen button, import `LuPencil`
- `components/DrawFlow.tsx` — add `select-none` + webkit styles to drawing `<main>`

## Testing

- Typecheck: `npm run typecheck` (or equivalent).
- Existing test suite passes unchanged — no logic in `lib/drawing/*` is touched.
- Manual verification on iPad with Apple Pencil:
  1. Pencil draws strokes; resting palm does not.
  2. Touching chrome with a finger no longer highlights text.
  3. Pen and Eraser buttons reflect mode visually; exactly one is active.
- Manual verification on desktop / finger-only iPad:
  1. Mouse / finger draws strokes normally (no pen ever detected → no filtering).

## Risks

- **Toddler switches mid-session from Pencil to finger:** finger gets rejected. Mitigation: refresh page to reset. Acceptable trade-off for the target audience.
- **Some styluses report as `touch`, not `pen`:** Apple Pencil specifically reports `"pen"`. Non-Apple styluses on iPad may not. Out of scope — this app targets Apple Pencil users.
