import { getStroke } from 'perfect-freehand';
import type { Stroke, PenSize } from './strokes';

const SIZE_MAP: Record<PenSize, number> = { thin: 4, medium: 9, thick: 18 };

function strokeToPath(stroke: Stroke, scale: number): Path2D {
  const inputs = stroke.points.map((p) => [p.x * scale, p.y * scale, p.pressure] as [number, number, number]);
  const outline = getStroke(inputs, {
    size: SIZE_MAP[stroke.size] * scale,
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
  const scale = Math.min(scaleX, scaleY);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, opts.width, opts.height);
  for (const stroke of strokes) {
    const path = strokeToPath(stroke, scale);
    if (stroke.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000000';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = stroke.color;
    }
    ctx.fill(path);
  }
  ctx.restore();
}
