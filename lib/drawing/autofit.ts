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
