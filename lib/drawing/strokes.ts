export type PenSize = 'thin' | 'medium' | 'thick';
export type StrokeColor = '#000000' | '#666666';
export type Point = { x: number; y: number; pressure: number };

export type Stroke = {
  id: string;
  color: StrokeColor;
  size: PenSize;
  isEraser: boolean;
  points: Point[];
};

export type History = { strokes: Stroke[]; redoStack: Stroke[] };

const HISTORY_CAP = 200;

export function createHistory(): History {
  return { strokes: [], redoStack: [] };
}

export function pushStroke(h: History, s: Stroke): History {
  const strokes = [...h.strokes, s];
  const trimmed = strokes.length > HISTORY_CAP ? strokes.slice(strokes.length - HISTORY_CAP) : strokes;
  return { strokes: trimmed, redoStack: [] };
}

export function undo(h: History): History {
  if (h.strokes.length === 0) return h;
  const next = h.strokes.slice(0, -1);
  const popped = h.strokes[h.strokes.length - 1];
  return { strokes: next, redoStack: [...h.redoStack, popped] };
}

export function redo(h: History): History {
  if (h.redoStack.length === 0) return h;
  const next = h.redoStack.slice(0, -1);
  const popped = h.redoStack[h.redoStack.length - 1];
  return { strokes: [...h.strokes, popped], redoStack: next };
}

export function clear(_: History): History {
  return createHistory();
}
