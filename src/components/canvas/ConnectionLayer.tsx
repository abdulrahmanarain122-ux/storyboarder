import React, { useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasCard } from '../../types/canvas';
import {
  computeBezierCurveData,
  getCardAnchorWorldPoint,
} from '../../utils/connectionGeometry';
import { Check } from 'lucide-react';

export const ConnectionLayer: React.FC = () => {
  const cards = useCanvasStore((s) => s.cards);
  const frames = useCanvasStore((s) => s.frames);
  const connections = useCanvasStore((s) => s.connections);
  const selectedConnectionId = useCanvasStore((s) => s.selectedConnectionId);
  const draftConnection = useCanvasStore((s) => s.draftConnection);

  const selectConnection = useCanvasStore((s) => s.selectConnection);
  const updateConnection = useCanvasStore((s) => s.updateConnection);

  const [editingLabelConnId, setEditingLabelConnId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');

  const collapsedFrames = Object.values(frames).filter((f) => f.collapsed);
  const isCardHidden = (card: CanvasCard) => {
    const cx = card.x + card.width / 2;
    const cy = card.y + card.height / 2;
    return collapsedFrames.some(
      (f) => cx >= f.x && cx <= f.x + f.width && cy >= f.y && cy <= f.y + f.height
    );
  };

  const handleStartEditLabel = (connId: string, currentLabel?: string) => {
    setEditingLabelConnId(connId);
    setLabelInput(currentLabel || '');
  };

  const handleSaveLabel = (connId: string) => {
    updateConnection(connId, { label: labelInput.trim() || undefined });
    setEditingLabelConnId(null);
  };

  let draftCurveData = null;
  let isDraftSnapped = false;

  if (draftConnection && cards[draftConnection.fromCardId]) {
    const fromCard = cards[draftConnection.fromCardId];
    const sourceAnchorInfo = getCardAnchorWorldPoint(
      fromCard,
      draftConnection.fromAnchor
    );

    if (
      draftConnection.targetSnap &&
      cards[draftConnection.targetSnap.cardId]
    ) {
      isDraftSnapped = true;
      const targetCard = cards[draftConnection.targetSnap.cardId];
      const targetAnchorInfo = getCardAnchorWorldPoint(
        targetCard,
        draftConnection.targetSnap.anchor
      );

      draftCurveData = computeBezierCurveData(
        sourceAnchorInfo.point,
        sourceAnchorInfo.normal,
        targetAnchorInfo.point,
        targetAnchorInfo.normal
      );
    } else {
      draftCurveData = computeBezierCurveData(
        sourceAnchorInfo.point,
        sourceAnchorInfo.normal,
        draftConnection.currentPointerWorld
      );
    }
  }

  return (
    <svg
      id="svg-connection-canvas-layer"
      className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
      style={{ zIndex: 45 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker
          id="arrowhead-default"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerUnits="userSpaceOnUse"
          markerWidth="9"
          markerHeight="9"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#52525B" />
        </marker>

        <marker
          id="arrowhead-selected"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerUnits="userSpaceOnUse"
          markerWidth="10"
          markerHeight="10"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#C93B1D" />
        </marker>

        <marker
          id="arrowhead-snapped"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerUnits="userSpaceOnUse"
          markerWidth="10"
          markerHeight="10"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#15803D" />
        </marker>
      </defs>

      {/* Render Saved Connections */}
      {connections.map((conn) => {
        const fromCard = cards[conn.fromCardId];
        const toCard = cards[conn.toCardId];

        if (!fromCard || !toCard) return null;
        if (isCardHidden(fromCard) || isCardHidden(toCard)) return null;

        const start = getCardAnchorWorldPoint(fromCard, conn.fromAnchor);
        const end = getCardAnchorWorldPoint(toCard, conn.toAnchor);
        const curve = computeBezierCurveData(
          start.point,
          start.normal,
          end.point,
          end.normal
        );

        const isSelected = conn.id === selectedConnectionId;
        const rawColor =
          conn.color === '#818cf8' || conn.color === '#8b5cf6' || conn.color === '#38bdf8'
            ? '#52525B'
            : conn.color;
        const strokeColor = isSelected ? '#C93B1D' : rawColor || '#52525B';
        const lineStyle = conn.style || 'solid';

        let dashArray: string | undefined = undefined;
        let isAnimatedDotted = false;

        if (lineStyle === 'dashed') {
          dashArray = '7 5';
        } else if (lineStyle === 'dotted') {
          dashArray = '3 5';
          isAnimatedDotted = true;
        }

        return (
          <g key={conn.id} className="group/conn">
            <path
              d={curve.path}
              stroke="transparent"
              strokeWidth={14}
              fill="none"
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                selectConnection(conn.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleStartEditLabel(conn.id, conn.label);
              }}
            />

            <path
              d={curve.path}
              stroke={strokeColor}
              strokeWidth={isSelected ? 2.5 : 1.75}
              strokeLinecap="round"
              strokeDasharray={dashArray}
              fill="none"
              markerEnd={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead-default)'}
              className="transition-colors duration-150"
              style={{ pointerEvents: 'none' }}
            >
              {isAnimatedDotted && (
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-16"
                  dur="0.9s"
                  repeatCount="indefinite"
                />
              )}
            </path>

            {(conn.label || editingLabelConnId === conn.id) && (
              <foreignObject
                x={curve.midpoint.x - 80}
                y={curve.midpoint.y - 13}
                width={160}
                height={26}
                style={{ overflow: 'visible', pointerEvents: 'auto' }}
              >
                {editingLabelConnId === conn.id ? (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="mx-auto w-max flex items-center gap-1 bg-white border border-[#C93B1D] rounded-full px-2.5 py-0.5 shadow-sm"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={labelInput}
                      placeholder="Label..."
                      onChange={(e) => setLabelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveLabel(conn.id);
                        if (e.key === 'Escape') setEditingLabelConnId(null);
                      }}
                      className="bg-transparent text-[11px] font-medium text-[#18181B] outline-none w-24"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveLabel(conn.id)}
                      className="p-0.5 rounded text-emerald-700 hover:bg-[#F1EFEA]"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartEditLabel(conn.id, conn.label);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectConnection(conn.id);
                    }}
                    title="Double-click to edit label"
                    className={`mx-auto w-max max-w-[140px] truncate px-2.5 py-0.5 rounded-full bg-white border text-[10px] font-medium cursor-pointer transition-all shadow-xs ${
                      isSelected
                        ? 'border-[#C93B1D] text-[#C93B1D]'
                        : 'border-black/15 text-[#52525B] hover:border-black/30 hover:text-[#18181B]'
                    }`}
                  >
                    {conn.label}
                  </div>
                )}
              </foreignObject>
            )}
          </g>
        );
      })}

      {/* Render Active Draft Connection */}
      {draftCurveData && (
        <g className="pointer-events-none">
          <path
            d={draftCurveData.path}
            stroke={isDraftSnapped ? '#15803D' : '#C93B1D'}
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinecap="round"
            fill="none"
            markerEnd={
              isDraftSnapped ? 'url(#arrowhead-snapped)' : 'url(#arrowhead-selected)'
            }
          />
        </g>
      )}
    </svg>
  );
};
