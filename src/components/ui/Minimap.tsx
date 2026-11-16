import React, { useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Maximize2, ChevronDown, ChevronUp, Move } from 'lucide-react';

export const Minimap: React.FC = () => {
  const cards = useCanvasStore((s) => s.cards);
  const selectedCardIds = useCanvasStore((s) => s.selectedCardIds);
  const frames = useCanvasStore((s) => s.frames);
  const viewport = useCanvasStore((s) => s.viewport);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const fitToView = useCanvasStore((s) => s.fitToView);

  const mapRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth < 1280 : false)
  );
  const [isDraggingViewport, setIsDraggingViewport] = useState(false);

  // Drag tracking ref for viewport rectangle
  const dragVpRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    startVpX: number;
    startVpY: number;
  } | null>(null);

  const cardList = Object.values(cards);
  const frameList = Object.values(frames || {});

  // Screen dimensions
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  // Viewport in world space
  const vpWorldX = -viewport.x / viewport.zoom;
  const vpWorldY = -viewport.y / viewport.zoom;
  const vpWorldW = screenWidth / viewport.zoom;
  const vpWorldH = screenHeight / viewport.zoom;

  const allX = [vpWorldX, ...cardList.map((c) => c.x), ...frameList.map((f) => f.x)];
  const allY = [vpWorldY, ...cardList.map((c) => c.y), ...frameList.map((f) => f.y)];
  const allMaxX = [
    vpWorldX + vpWorldW,
    ...cardList.map((c) => c.x + c.width),
    ...frameList.map((f) => f.x + f.width),
  ];
  const allMaxY = [
    vpWorldY + vpWorldH,
    ...cardList.map((c) => c.y + c.height),
    ...frameList.map((f) => f.y + f.height),
  ];

  let minX = Math.min(...allX);
  let minY = Math.min(...allY);
  let maxX = Math.max(...allMaxX);
  let maxY = Math.max(...allMaxY);

  const padding = 200;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const totalWorldW = Math.max(1, maxX - minX);
  const totalWorldH = Math.max(1, maxY - minY);

  const mapW = 168;
  const mapH = 105;

  const scaleX = mapW / totalWorldW;
  const scaleY = mapH / totalWorldH;
  const mapScale = Math.min(scaleX, scaleY);

  const worldToMap = (wx: number, wy: number) => ({
    x: (wx - minX) * mapScale,
    y: (wy - minY) * mapScale,
  });

  // Click on minimap background to jump viewport
  const handleMapBackgroundPointerDown = (e: React.PointerEvent) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const clickMapX = e.clientX - rect.left;
    const clickMapY = e.clientY - rect.top;

    // Convert map click to world coordinates
    const targetWorldX = clickMapX / mapScale + minX;
    const targetWorldY = clickMapY / mapScale + minY;

    // Center viewport at this world coordinate
    setViewport({
      x: screenWidth / 2 - targetWorldX * viewport.zoom,
      y: screenHeight / 2 - targetWorldY * viewport.zoom,
    });
  };

  // Drag handlers for the viewport rectangle
  const handleViewportPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragVpRef.current = {
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startVpX: viewport.x,
      startVpY: viewport.y,
    };
    setIsDraggingViewport(true);
  };

  const handleViewportPointerMove = (e: React.PointerEvent) => {
    if (!dragVpRef.current) return;
    const deltaPointerX = e.clientX - dragVpRef.current.startPointerX;
    const deltaPointerY = e.clientY - dragVpRef.current.startPointerY;

    // Map screen movement to world coordinate change
    const deltaWorldX = deltaPointerX / mapScale;
    const deltaWorldY = deltaPointerY / mapScale;

    setViewport({
      x: dragVpRef.current.startVpX - deltaWorldX * viewport.zoom,
      y: dragVpRef.current.startVpY - deltaWorldY * viewport.zoom,
    });
  };

  const handleViewportPointerUp = (e: React.PointerEvent) => {
    if (dragVpRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      dragVpRef.current = null;
      setIsDraggingViewport(false);
    }
  };

  const vpMap = worldToMap(vpWorldX, vpWorldY);
  const vpMapW = Math.max(12, vpWorldW * mapScale);
  const vpMapH = Math.max(8, vpWorldH * mapScale);

  return (
    <div className="absolute bottom-5 right-5 z-40 hidden md:flex flex-col items-end gap-2 pointer-events-auto select-none minimap-root snapshot-hide">
      {/* Compact Minimap Header Pill */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-xl editorial-panel">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] px-1">
          Map
        </span>
        <button
          type="button"
          onClick={() => fitToView(screenWidth, screenHeight)}
          title="Fit All Cards & Frames to Screen"
          className="p-1 rounded-lg text-[#52525B] hover:text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Show Minimap' : 'Hide Minimap'}
          className="p-1 rounded-lg text-[#52525B] hover:text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Minimap Canvas Container */}
      {!isCollapsed && (
        <div className="flex flex-col gap-1 animate-in fade-in duration-150">
          <div
            ref={mapRef}
            onPointerDown={handleMapBackgroundPointerDown}
            style={{ width: `${mapW}px`, height: `${mapH}px` }}
            className="relative rounded-2xl editorial-panel overflow-hidden cursor-crosshair bg-[#F8F7F4]"
            title="Click to jump or drag viewport box to pan"
          >
            {/* Subtle dot grid inside minimap */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(24,24,27,0.22) 1px, transparent 1px)',
                backgroundSize: '10px 10px',
              }}
            />

            {/* Render Mini Frames behind Mini Cards */}
            {frameList.map((frame) => {
              const pos = worldToMap(frame.x, frame.y);
              const w = Math.max(8, frame.width * mapScale);
              const h = Math.max(8, frame.height * mapScale);
              const frameColor = frame.color || '#52525B';

              return (
                <div
                  key={frame.id}
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: `${w}px`,
                    height: `${h}px`,
                    borderColor: `${frameColor}80`,
                    backgroundColor: `${frameColor}12`,
                  }}
                  className="absolute rounded-[3px] border border-dashed pointer-events-none"
                />
              );
            })}

            {/* Render Mini Cards */}
            {cardList.map((card) => {
              const pos = worldToMap(card.x, card.y);
              const w = Math.max(4, card.width * mapScale);
              const h = Math.max(4, card.height * mapScale);
              const isSelected = selectedCardIds.includes(card.id);

              return (
                <div
                  key={card.id}
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: `${w}px`,
                    height: `${h}px`,
                    backgroundColor: isSelected
                      ? '#C93B1D'
                      : 'rgba(24, 24, 27, 0.16)',
                    borderColor: isSelected ? '#C93B1D' : 'rgba(24, 24, 27, 0.35)',
                  }}
                  className="absolute rounded-[2px] border pointer-events-none transition-all"
                />
              );
            })}

            {/* Draggable Viewport View Rectangle */}
            <div
              onPointerDown={handleViewportPointerDown}
              onPointerMove={handleViewportPointerMove}
              onPointerUp={handleViewportPointerUp}
              onPointerCancel={handleViewportPointerUp}
              style={{
                left: `${vpMap.x}px`,
                top: `${vpMap.y}px`,
                width: `${vpMapW}px`,
                height: `${vpMapH}px`,
                touchAction: 'none',
              }}
              title="Drag to pan canvas"
              className={`absolute border-[1.5px] border-[#C93B1D] bg-[#C93B1D]/10 rounded-[3px] group transition-colors ${
                isDraggingViewport
                  ? 'cursor-grabbing bg-[#C93B1D]/20'
                  : 'cursor-grab hover:bg-[#C93B1D]/15'
              }`}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-70 transition-opacity">
                <Move className="w-2.5 h-2.5 text-[#C93B1D]" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
