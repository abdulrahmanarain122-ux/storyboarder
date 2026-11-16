import React, { useState } from 'react';
import type { CanvasFrame, FrameStyle, ResizeHandle } from '../../types/canvas';
import { useCanvasStore } from '../../store/canvasStore';
import {
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Crosshair,
  LayoutGrid,
  Palette,
  Edit2,
} from 'lucide-react';

interface CanvasFrameItemProps {
  frame: CanvasFrame;
  isSelected: boolean;
  onSelect: (e: React.PointerEvent) => void;
  onStartDrag: (frameId: string, e: React.PointerEvent) => void;
  onResizeHandlePointerDown: (frameId: string, handle: ResizeHandle, e: React.PointerEvent) => void;
}

const CORNER_HANDLES: { handle: ResizeHandle; style: React.CSSProperties; cursor: string }[] = [
  { handle: 'nw', style: { top: -5, left: -5 }, cursor: 'nwse-resize' },
  { handle: 'ne', style: { top: -5, right: -5 }, cursor: 'nesw-resize' },
  { handle: 'se', style: { bottom: -5, right: -5 }, cursor: 'nwse-resize' },
  { handle: 'sw', style: { bottom: -5, left: -5 }, cursor: 'nesw-resize' },
];

const EDGE_ZONES: { handle: ResizeHandle; className: string; cursor: string }[] = [
  { handle: 'n', className: '-top-1 left-3 right-3 h-2', cursor: 'cursor-ns-resize' },
  { handle: 's', className: '-bottom-1 left-3 right-3 h-2', cursor: 'cursor-ns-resize' },
  { handle: 'w', className: '-left-1 top-3 bottom-3 w-2', cursor: 'cursor-ew-resize' },
  { handle: 'e', className: '-right-1 top-3 bottom-3 w-2', cursor: 'cursor-ew-resize' },
];

const FRAME_COLORS = [
  { name: 'Charcoal', value: '#18181B' },
  { name: 'Vermilion', value: '#C93B1D' },
  { name: 'Cobalt', value: '#1D4ED8' },
  { name: 'Forest', value: '#15803D' },
  { name: 'Ochre', value: '#B45309' },
];

export const CanvasFrameItem: React.FC<CanvasFrameItemProps> = ({
  frame,
  isSelected,
  onSelect,
  onStartDrag,
  onResizeHandlePointerDown,
}) => {
  const cards = useCanvasStore((s) => s.cards);
  const updateFrame = useCanvasStore((s) => s.updateFrame);
  const deleteFrame = useCanvasStore((s) => s.deleteFrame);
  const focusFrame = useCanvasStore((s) => s.focusFrame);
  const tidyFrameCards = useCanvasStore((s) => s.tidyFrameCards);
  const toggleFrameCollapse = useCanvasStore((s) => s.toggleFrameCollapse);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(frame.title);
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      updateFrame(frame.id, { title: titleInput.trim() });
    } else {
      setTitleInput(frame.title);
    }
    setIsEditingTitle(false);
  };

  const containedCount = Object.values(cards).filter((c) => {
    const cx = c.x + c.width / 2;
    const cy = c.y + c.height / 2;
    return (
      cx >= frame.x &&
      cx <= frame.x + frame.width &&
      cy >= frame.y &&
      cy <= frame.y + frame.height
    );
  }).length;

  const accentColor = frame.color || '#18181B';
  const styleVariant: FrameStyle = frame.styleVariant || 'section';
  const isCollapsed = Boolean(frame.collapsed);

  return (
    <div
      id={`canvas-frame-${frame.id}`}
      style={{
        position: 'absolute',
        left: `${frame.x}px`,
        top: `${frame.y}px`,
        width: `${frame.width}px`,
        height: isCollapsed ? '52px' : `${frame.height}px`,
        zIndex: frame.zIndex ?? 0,
        borderColor: isSelected ? accentColor : `${accentColor}75`,
        backgroundColor:
          styleVariant === 'cluster'
            ? `${accentColor}14`
            : isCollapsed
            ? '#FFFFFF'
            : 'rgba(241, 239, 234, 0.72)',
      }}
      onPointerDown={(e) => {
        if (e.button === 0) {
          onSelect(e);
        }
      }}
      className={`group rounded-2xl transition-[border-color,background-color,height] duration-200 select-none ${
        styleVariant === 'cluster' ? 'border-[1.5px] border-solid' : 'border-[1.5px] border-dashed'
      } ${isSelected ? 'shadow-md' : 'hover:border-black/45'}`}
    >
      {/* Minimal Section Header Pill */}
      <div
        style={{
          position: 'absolute',
          top: isCollapsed ? 9 : -15,
          left: 16,
        }}
        onPointerDown={(e) => {
          if (isEditingTitle) {
            e.stopPropagation();
            return;
          }
          if (e.button === 0) {
            onSelect(e);
            onStartDrag(frame.id, e);
          }
        }}
        className={`flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-black/20 text-[#18181B] shadow-sm transition-all z-10 ${
          isEditingTitle
            ? 'cursor-default border-[#C93B1D]'
            : 'cursor-grab active:cursor-grabbing hover:border-black/35'
        }`}
      >
        {styleVariant === 'storyboard' ? (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            S{String(frame.sceneNumber || 1).padStart(2, '0')}
          </span>
        ) : (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: accentColor }}
          />
        )}

        {isEditingTitle ? (
          <div
            className="flex items-center gap-1"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              autoFocus
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleInput(frame.title);
                  setIsEditingTitle(false);
                }
              }}
              className="bg-[#F8F7F4] border border-[#C93B1D] rounded px-1.5 py-0.5 text-xs font-semibold text-[#18181B] outline-none w-36"
            />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleTitleSubmit();
              }}
              className="p-0.5 rounded hover:bg-[#F1EFEA] text-emerald-700"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setTitleInput(frame.title);
              setIsEditingTitle(true);
            }}
            className="flex items-center gap-1.5 cursor-pointer group/title"
            title="Double-click to rename"
          >
            <span className="text-xs font-semibold text-[#18181B] tracking-tight max-w-[200px] truncate">
              {frame.title}
            </span>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setTitleInput(frame.title);
                setIsEditingTitle(true);
              }}
              title="Rename section"
              className="p-0.5 rounded text-[#71717A] hover:text-[#18181B] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit2 className="w-2.5 h-2.5" />
            </button>
            <span className="text-[10px] font-mono text-[#52525B] bg-[#F1EFEA] px-1.5 py-0.5 rounded">
              {containedCount}
            </span>
          </div>
        )}

        {/* Action buttons hidden while editing title so the pill focuses solely on renaming */}
        {!isEditingTitle && (
          <div
            className="flex items-center gap-0.5 pl-1 border-l border-black/8"
            onPointerDown={(e) => e.stopPropagation()}
          >
          <button
            type="button"
            onClick={() => toggleFrameCollapse(frame.id)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
            className="p-1 rounded-md text-[#71717A] hover:text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
          >
            {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          {isSelected && (
            <>
              <button
                type="button"
                onClick={() => focusFrame(frame.id, window.innerWidth, window.innerHeight)}
                title="Focus Frame"
                className="p-1 rounded-md text-[#52525B] hover:text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
              >
                <Crosshair className="w-3 h-3" />
              </button>

              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => tidyFrameCards(frame.id)}
                  title="Tidy Cards Inside"
                  className="p-1 rounded-md text-[#52525B] hover:text-[#C93B1D] hover:bg-[#C93B1D]/10 transition-colors"
                >
                  <LayoutGrid className="w-3 h-3" />
                </button>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStyleMenu((p) => !p)}
                  title="Style & Color"
                  className="p-1 rounded-md text-[#52525B] hover:text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
                >
                  <Palette className="w-3 h-3" />
                </button>
                {showStyleMenu && (
                  <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-2 p-2.5 rounded-xl bg-white border border-black/12 shadow-lg z-30 min-w-[168px]">
                    <div className="flex items-center gap-1 bg-[#F1EFEA] p-0.5 rounded-lg text-[10px] font-medium">
                      {(['section', 'storyboard', 'cluster'] as FrameStyle[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => updateFrame(frame.id, { styleVariant: st })}
                          className={`flex-1 px-1.5 py-1 rounded-md capitalize transition-colors ${
                            styleVariant === st ? 'bg-white text-[#18181B] shadow-xs' : 'text-[#52525B]'
                          }`}
                        >
                          {st === 'storyboard' ? 'Scene' : st}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-0.5">
                      {FRAME_COLORS.map((col) => (
                        <button
                          key={col.value}
                          type="button"
                          title={col.name}
                          onClick={() => {
                            updateFrame(frame.id, { color: col.value });
                            setShowStyleMenu(false);
                          }}
                          className={`w-4 h-4 rounded-full border ${
                            accentColor === col.value ? 'border-[#18181B] scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: col.value }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => deleteFrame(frame.id)}
                title="Delete Frame"
                className="p-1 rounded-md text-[#71717A] hover:text-[#C93B1D] hover:bg-[#C93B1D]/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
          </div>
        )}
      </div>

      {/* Edge Resize Strips + 4 Corner Resize Handles */}
      {isSelected && !isCollapsed && (
        <>
          {EDGE_ZONES.map(({ handle, className, cursor }) => (
            <div
              key={handle}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeHandlePointerDown(frame.id, handle, e);
              }}
              className={`absolute pointer-events-auto z-10 ${className} ${cursor}`}
            />
          ))}
          {CORNER_HANDLES.map(({ handle, style, cursor }) => (
            <div
              key={handle}
              style={{ ...style, cursor, borderColor: accentColor }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeHandlePointerDown(frame.id, handle, e);
              }}
              className="absolute w-2.5 h-2.5 bg-white border-[1.5px] rounded-xs shadow-xs hover:scale-125 transition-transform pointer-events-auto z-20"
            />
          ))}
        </>
      )}
    </div>
  );
};
