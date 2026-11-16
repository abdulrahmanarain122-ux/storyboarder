import React from 'react';
import type { ResizeHandle } from '../../types/canvas';

interface CardTransformBoxProps {
  width: number;
  height: number;
  rotation: number;
  isResizing?: boolean;
  isRotating?: boolean;
  currentAngle?: number;
  onResizeHandlePointerDown: (handle: ResizeHandle, e: React.PointerEvent) => void;
  onRotateHandlePointerDown: (e: React.PointerEvent) => void;
}

export const CardTransformBox: React.FC<CardTransformBoxProps> = ({
  width,
  height,
  rotation,
  isResizing = false,
  isRotating = false,
  currentAngle,
  onResizeHandlePointerDown,
  onRotateHandlePointerDown,
}) => {
  const cornerHandles: { handle: ResizeHandle; className: string; cursor: string }[] = [
    { handle: 'nw', className: '-top-1.5 -left-1.5', cursor: 'cursor-nwse-resize' },
    { handle: 'ne', className: '-top-1.5 -right-1.5', cursor: 'cursor-nesw-resize' },
    { handle: 'se', className: '-bottom-1.5 -right-1.5', cursor: 'cursor-nwse-resize' },
    { handle: 'sw', className: '-bottom-1.5 -left-1.5', cursor: 'cursor-nesw-resize' },
  ];

  const edgeZones: { handle: ResizeHandle; className: string; cursor: string }[] = [
    { handle: 'n', className: '-top-1 left-3 right-3 h-2', cursor: 'cursor-ns-resize' },
    { handle: 's', className: '-bottom-1 left-3 right-3 h-2', cursor: 'cursor-ns-resize' },
    { handle: 'w', className: '-left-1 top-3 bottom-3 w-2', cursor: 'cursor-ew-resize' },
    { handle: 'e', className: '-right-1 top-3 bottom-3 w-2', cursor: 'cursor-ew-resize' },
  ];

  const displayAngle = currentAngle !== undefined ? currentAngle : rotation;

  return (
    <div
      className="selection-transform-box absolute inset-0 pointer-events-none rounded-2xl border-[1.5px] border-[#C93B1D] z-20"
      style={{
        boxShadow: '0 0 0 3px rgba(201, 59, 29, 0.08)',
      }}
    >
      {/* Invisible Edge Resize Strips (keeps midpoints visually clear for connector ports) */}
      {edgeZones.map(({ handle, className, cursor }) => (
        <div
          key={handle}
          onPointerDown={(e) => onResizeHandlePointerDown(handle, e)}
          className={`absolute pointer-events-auto ${className} ${cursor}`}
        />
      ))}

      {/* 4 Visible Corner Resize Squares */}
      {cornerHandles.map(({ handle, className, cursor }) => (
        <div
          key={handle}
          onPointerDown={(e) => onResizeHandlePointerDown(handle, e)}
          className={`absolute w-2.5 h-2.5 bg-white border-[1.5px] border-[#C93B1D] rounded-xs shadow-xs transition-transform duration-75 hover:scale-125 pointer-events-auto z-10 ${className} ${cursor}`}
        />
      ))}

      {/* Dedicated Outer Top-Right Corner Rotation Handle (never collides with midpoint connectors or corner square) */}
      <div className="absolute -top-7 -right-7 flex items-center justify-center pointer-events-auto z-20">
        {isRotating && (
          <div className="absolute -top-7 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#18181B] text-white shadow-md">
            {displayAngle}°
          </div>
        )}

        <button
          type="button"
          onPointerDown={onRotateHandlePointerDown}
          title="Drag to rotate (Hold Shift to snap 15°)"
          className="group/rot flex items-center justify-center w-5 h-5 rounded-full bg-white border-[1.5px] border-[#C93B1D] text-[#C93B1D] shadow-xs hover:bg-[#C93B1D] hover:text-white transition-all duration-150 cursor-grab active:cursor-grabbing hover:scale-115 focus:outline-none"
        >
          <svg
            className="w-2.5 h-2.5 transition-transform duration-200 group-hover/rot:rotate-45"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
        </button>
      </div>

      {/* Resize Dimension Pill when resizing */}
      {isResizing && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-[#18181B] text-white shadow-md pointer-events-none">
          {Math.round(width)} × {Math.round(height)}
        </div>
      )}
    </div>
  );
};
