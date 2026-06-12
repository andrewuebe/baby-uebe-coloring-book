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
