'use client';

import { useEffect, useRef, useState } from 'react';
import { renderStrokes } from '@/lib/drawing/render';
import {
  createHistory, pushStroke, undo as undoHistory, redo as redoHistory, clear as clearHistory,
  type Stroke, type History,
} from '@/lib/drawing/strokes';
import { Toolbar, type ToolbarState } from './Toolbar';

const newStrokeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function DrawCanvas({
  onHistoryChange,
}: {
  onHistoryChange: (h: History) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [history, setHistory] = useState<History>(createHistory());
  const [tool, setTool] = useState<ToolbarState>({ size: 'medium', color: '#000000', isEraser: false });
  const drawingRef = useRef<Stroke | null>(null);

  useEffect(() => { onHistoryChange(history); }, [history, onHistoryChange]);

  useEffect(() => {
    const observer = new ResizeObserver(() => paint(history));
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  function paint(h: History) {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const all = drawingRef.current ? [...h.strokes, drawingRef.current] : h.strokes;
    renderStrokes(ctx, all, { width: canvas.width, height: canvas.height });
  }

  function normalizedPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = {
      id: newStrokeId(),
      color: tool.color,
      size: tool.size,
      isEraser: tool.isEraser,
      points: [normalizedPoint(e)],
    };
    paint(history);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current.points.push(normalizedPoint(e));
    paint(history);
  }

  function onPointerUp() {
    if (!drawingRef.current) return;
    const next = pushStroke(history, drawingRef.current);
    drawingRef.current = null;
    setHistory(next);
    paint(next);
  }

  function handleUndo() {
    const next = undoHistory(history);
    setHistory(next);
    paint(next);
  }

  function handleRedo() {
    const next = redoHistory(history);
    setHistory(next);
    paint(next);
  }

  function handleClear() {
    if (!confirm('Erase the whole drawing?')) return;
    const next = clearHistory(history);
    setHistory(next);
    paint(next);
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <div ref={containerRef} className="aspect-[8.5/11] w-full overflow-hidden rounded-[6px] bg-white ink-shadow ring-1 ring-nib/10 md:flex-1">
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <div className="md:order-first md:w-16">
        <Toolbar
          state={tool}
          setState={setTool}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          canUndo={history.strokes.length > 0}
          canRedo={history.redoStack.length > 0}
        />
      </div>
    </div>
  );
}
