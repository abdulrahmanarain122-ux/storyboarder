import React, { useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { ACCENT_COLORS } from '../../constants/canvas';
import { worldToScreen } from '../../utils/coordinates';
import {
  computeBezierCurveData,
  getCardAnchorWorldPoint,
} from '../../utils/connectionGeometry';
import { Minus, Trash2, Edit3, Check } from 'lucide-react';

export const ConnectionPopover: React.FC = () => {
  const selectedConnectionId = useCanvasStore((s) => s.selectedConnectionId);
  const connections = useCanvasStore((s) => s.connections);
  const cards = useCanvasStore((s) => s.cards);
  const viewport = useCanvasStore((s) => s.viewport);

  const updateConnection = useCanvasStore((s) => s.updateConnection);
  const deleteConnection = useCanvasStore((s) => s.deleteConnection);

  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState('');

  if (!selectedConnectionId) return null;

  const conn = connections.find((c) => c.id === selectedConnectionId);
  if (!conn) return null;

  const fromCard = cards[conn.fromCardId];
  const toCard = cards[conn.toCardId];
  if (!fromCard || !toCard) return null;

  const sourceAnchor = getCardAnchorWorldPoint(fromCard, conn.fromAnchor);
  const targetAnchor = getCardAnchorWorldPoint(toCard, conn.toAnchor);
  const curve = computeBezierCurveData(
    sourceAnchor.point,
    sourceAnchor.normal,
    targetAnchor.point,
    targetAnchor.normal
  );

  const screenPos = worldToScreen(curve.midpoint, viewport);
  const screenX = screenPos.x;
  const screenY = Math.max(75, screenPos.y - 18);

  const lineStyle = conn.style || 'solid';

  const handleStartEdit = () => {
    setLabelInput(conn.label || '');
    setIsEditingLabel(true);
  };

  const handleSaveLabel = () => {
    updateConnection(conn.id, { label: labelInput.trim() || undefined });
    setIsEditingLabel(false);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${screenX}px`,
        top: `${screenY}px`,
        transform: 'translate(-50%, -100%)',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="z-50 pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-white border border-black/12 shadow-lg animate-in zoom-in-95 duration-150 select-none text-xs snapshot-hide"
    >
      {/* Line Style Toggles */}
      <div className="flex items-center gap-0.5 bg-[#F1EFEA] p-0.5 rounded-xl">
        <button
          type="button"
          onClick={() => updateConnection(conn.id, { style: 'solid' })}
          title="Solid"
          className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
            lineStyle === 'solid'
              ? 'bg-white text-[#18181B] shadow-xs'
              : 'text-[#52525B] hover:text-[#18181B]'
          }`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => updateConnection(conn.id, { style: 'dashed' })}
          title="Dashed"
          className={`px-2 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
            lineStyle === 'dashed'
              ? 'bg-white text-[#18181B] shadow-xs'
              : 'text-[#52525B] hover:text-[#18181B]'
          }`}
        >
          --
        </button>

        <button
          type="button"
          onClick={() => updateConnection(conn.id, { style: 'dotted' })}
          title="Animated Flow"
          className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
            lineStyle === 'dotted'
              ? 'bg-white text-[#18181B] shadow-xs'
              : 'text-[#52525B] hover:text-[#18181B]'
          }`}
        >
          •••
        </button>
      </div>

      <div className="w-[1px] h-4 bg-black/10" />

      {/* Color Swatches */}
      <div className="flex items-center gap-1 px-0.5">
        {ACCENT_COLORS.map((swatch) => (
          <button
            key={swatch.name}
            type="button"
            onClick={() => updateConnection(conn.id, { color: swatch.hex })}
            title={swatch.name}
            style={{ backgroundColor: swatch.hex }}
            className={`w-3.5 h-3.5 rounded-full border transition-transform ${
              (conn.color || '#52525B') === swatch.hex
                ? 'scale-120 border-[#18181B]'
                : 'border-black/15 hover:scale-115'
            }`}
          />
        ))}
      </div>

      <div className="w-[1px] h-4 bg-black/10" />

      {/* Label Edit / Input */}
      {isEditingLabel ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            autoFocus
            value={labelInput}
            placeholder="Label..."
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveLabel();
              if (e.key === 'Escape') setIsEditingLabel(false);
            }}
            className="bg-[#F8F7F4] border border-[#C93B1D] rounded-md px-1.5 py-0.5 text-[11px] text-[#18181B] outline-none w-24"
          />
          <button
            type="button"
            onClick={handleSaveLabel}
            title="Save"
            className="p-1 rounded-lg text-emerald-700 hover:bg-[#F1EFEA]"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleStartEdit}
          title="Edit label"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-[#52525B] hover:text-[#18181B] hover:bg-[#F1EFEA] transition-colors max-w-[110px] truncate"
        >
          <Edit3 className="w-3 h-3 shrink-0" />
          <span className="truncate">{conn.label || 'Label'}</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => deleteConnection(conn.id)}
        title="Delete"
        className="p-1 rounded-lg text-[#71717A] hover:text-[#C93B1D] hover:bg-[#C93B1D]/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
