import { getStroke } from 'perfect-freehand';
import type { Stroke, PenSize } from './strokes';

// Pen widths as fractions of canvas width so strokes look identical at any resolution.
const SIZE_MAP: Record<PenSize, number> = { thin: 0.007, medium: 0.015, thick: 0.030 };

function strokeToPath(stroke: Stroke, scaleX: number, scaleY: number, sizeScale: number): Path2D {
  const inputs = stroke.points.map((p) => [p.x * scaleX, p.y * scaleY, p.pressure] as [number, number, number]);
  const outline = getStroke(inputs, {
    size: SIZE_MAP[stroke.size] * sizeScale,
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
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, opts.width, opts.height);
  ctx.globalCompositeOperation = 'source-over';
  for (const stroke of strokes) {
    const path = strokeToPath(stroke, scaleX, scaleY, scaleX);
    // Eraser paints opaque white instead of cutting alpha. Background is always
    // white in this app, and PNG transparency renders as gray in many viewers.
    ctx.fillStyle = stroke.isEraser ? '#ffffff' : stroke.color;
    ctx.fill(path);
  }
  ctx.restore();
}
