'use client';

import type { PenSize, StrokeColor } from '@/lib/drawing/strokes';

export type ToolbarState = {
  size: PenSize;
  color: StrokeColor;
  isEraser: boolean;
};

export function Toolbar({
  state,
  setState,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
}: {
  state: ToolbarState;
  setState: (s: ToolbarState) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  return (
    <div className="flex w-full flex-row items-center justify-center gap-2 md:w-auto md:flex-col md:items-stretch md:justify-start md:gap-2">
      <SizeButton size="thin" current={state.size} onClick={() => setState({ ...state, size: 'thin', isEraser: false })} />
      <SizeButton size="medium" current={state.size} onClick={() => setState({ ...state, size: 'medium', isEraser: false })} />
      <SizeButton size="thick" current={state.size} onClick={() => setState({ ...state, size: 'thick', isEraser: false })} />
      <Divider />
      <ColorSwatch hex="#000000" current={state.color} onClick={() => setState({ ...state, color: '#000000', isEraser: false })} />
      <ColorSwatch hex="#666666" current={state.color} onClick={() => setState({ ...state, color: '#666666', isEraser: false })} />
      <Divider />
      <ToolButton onClick={() => setState({ ...state, isEraser: !state.isEraser })} active={state.isEraser} label="Eraser"><EraserIcon /></ToolButton>
      <ToolButton onClick={onUndo} disabled={!canUndo} label="Undo">↶</ToolButton>
      <ToolButton onClick={onRedo} disabled={!canRedo} label="Redo">↷</ToolButton>
      <ToolButton onClick={onClear} label="Clear all">🗑️</ToolButton>
    </div>
  );
}

function SizeButton({ size, current, onClick }: { size: PenSize; current: PenSize; onClick: () => void }) {
  const px = size === 'thin' ? 4 : size === 'medium' ? 9 : 18;
  const active = size === current;
  return (
    <button
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-lg border ${active ? 'border-ink bg-ink/10' : 'border-stone-300 bg-white'}`}
      aria-label={`${size} pen`}
    >
      <span className="rounded-full bg-ink" style={{ width: px, height: px }} />
    </button>
  );
}

function ColorSwatch({ hex, current, onClick }: { hex: StrokeColor; current: StrokeColor; onClick: () => void }) {
  const active = hex === current;
  return (
    <button
      onClick={onClick}
      className={`h-10 w-10 rounded-lg border ${active ? 'border-ink' : 'border-stone-300'}`}
      style={{ background: hex }}
      aria-label={`color ${hex}`}
    />
  );
}

function ToolButton({
  children, onClick, label, active, disabled,
}: { children: React.ReactNode; onClick: () => void; label: string; active?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`grid h-10 w-10 place-items-center rounded-lg border text-lg ${active ? 'border-ink bg-ink/10' : 'border-stone-300 bg-white'} ${disabled ? 'opacity-40' : ''}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="hidden h-px w-full bg-stone-300 md:block" aria-hidden="true" />;
}

function EraserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M14 3l7 7-9 9H5v-7l9-9z" />
      <line x1="9" y1="8" x2="16" y2="15" />
    </svg>
  );
}
