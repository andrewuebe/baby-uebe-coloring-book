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

    // jsdom also lacks Path2D; provide a minimal polyfill so render.ts can build stroke outlines.
    if (typeof globalThis.Path2D === 'undefined') {
      (globalThis as unknown as Record<string, unknown>).Path2D = class Path2D {
        private _commands: unknown[][] = [];
        moveTo(x: number, y: number) { this._commands.push(['moveTo', x, y]); }
        lineTo(x: number, y: number) { this._commands.push(['lineTo', x, y]); }
        closePath() { this._commands.push(['closePath']); }
      };
    }
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
