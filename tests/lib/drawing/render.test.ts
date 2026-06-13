import { describe, it, expect, beforeAll } from 'vitest';
import { renderStrokes } from '@/lib/drawing/render';
import type { Stroke } from '@/lib/drawing/strokes';

beforeAll(() => {
  if (typeof globalThis.Path2D === 'undefined') {
    (globalThis as unknown as Record<string, unknown>).Path2D = class {
      moveTo() {}
      lineTo() {}
      closePath() {}
    };
  }
});

type FillCall = { fillStyle: string; op: GlobalCompositeOperation };

function makeCtx() {
  const fills: FillCall[] = [];
  const ctx = {
    fillStyle: '' as string,
    globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
    save() {},
    restore() {},
    fillRect() {},
    fill() {
      fills.push({ fillStyle: this.fillStyle, op: this.globalCompositeOperation });
    },
  };
  return { ctx, fills };
}

const longStroke = (isEraser: boolean): Stroke => ({
  id: isEraser ? 'e' : 'p',
  color: '#000000',
  size: 'medium',
  isEraser,
  points: [
    { x: 0.1, y: 0.1, pressure: 0.5 },
    { x: 0.5, y: 0.5, pressure: 0.5 },
    { x: 0.9, y: 0.9, pressure: 0.5 },
  ],
});

describe('renderStrokes eraser', () => {
  it('paints opaque white in source-over (not destination-out, not black)', () => {
    const { ctx, fills } = makeCtx();
    renderStrokes(ctx as unknown as CanvasRenderingContext2D, [longStroke(true)], { width: 100, height: 100 });
    expect(fills).toHaveLength(1);
    expect(fills[0].fillStyle).toBe('#ffffff');
    expect(fills[0].op).toBe('source-over');
  });

  it('ink strokes still paint their color in source-over', () => {
    const { ctx, fills } = makeCtx();
    renderStrokes(ctx as unknown as CanvasRenderingContext2D, [longStroke(false)], { width: 100, height: 100 });
    expect(fills).toHaveLength(1);
    expect(fills[0].fillStyle).toBe('#000000');
    expect(fills[0].op).toBe('source-over');
  });
});
