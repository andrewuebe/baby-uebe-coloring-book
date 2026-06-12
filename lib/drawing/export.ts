import { renderStrokes } from './render';
import type { Stroke } from './strokes';

export const EXPORT_WIDTH = 2550;
export const EXPORT_HEIGHT = 3300;
const CAPTION_BAND_HEIGHT = 360;

export function renderExportCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  caption: { letter: string; subject: string },
) {
  const drawingHeight = EXPORT_HEIGHT - CAPTION_BAND_HEIGHT;
  renderStrokes(ctx, strokes, {
    width: EXPORT_WIDTH,
    height: drawingHeight,
  });
  // White caption band covering the bottom region.
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, drawingHeight, EXPORT_WIDTH, CAPTION_BAND_HEIGHT);
  ctx.fillStyle = '#2a2a2a';
  ctx.font = '600 140px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const captionY = drawingHeight + CAPTION_BAND_HEIGHT / 2;
  ctx.fillText(`${caption.letter} is for ${caption.subject}`, EXPORT_WIDTH / 2, captionY);
  ctx.restore();
}

export async function exportToBlob(strokes: Stroke[], caption: { letter: string; subject: string }): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('exportToBlob must run in the browser');
  }
  const canvas = document.createElement('canvas');
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to obtain canvas context');
  renderExportCanvas(ctx, strokes, caption);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/png');
  });
}
