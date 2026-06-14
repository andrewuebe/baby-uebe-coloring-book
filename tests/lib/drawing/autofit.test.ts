import { describe, it, expect } from 'vitest';
import { computeAutoFit, applyTransform } from '@/lib/drawing/autofit';
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
