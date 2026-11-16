import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { ACCENT_COLORS } from '../../constants/canvas';
import {
  LayoutGrid,
  Columns2,
  Rows2,
  Trash2,
} from 'lucide-react';

export const FloatingSelectionBar: React.FC = () => {
  const selectedCardIds = useCanvasStore((s) => s.selectedCardIds);
  const cards = useCanvasStore((s) => s.cards);

  const tidySelectionGrid = useCanvasStore((s) => s.tidySelectionGrid);
  const alignSelectionRow = useCanvasStore((s) => s.alignSelectionRow);
  const alignSelectionColumn = useCanvasStore((s) => s.alignSelectionColumn);
  const setSelectionColor = useCanvasStore((s) => s.setSelectionColor);
  const deleteSelectedCards = useCanvasStore((s) => s.deleteSelectedCards);

  if (selectedCardIds.length < 2) return null;

  const selectedCards = selectedCardIds.map((id) => cards[id]).filter(Boolean);
  if (selectedCards.length < 2) return null;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl bg-white border border-black/12 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150 select-none whitespace-nowrap floating-selection-bar snapshot-hide"
    >
      <span className="px-2 py-1 rounded-lg bg-[#C93B1D]/10 text-[#C93B1D] font-mono text-[11px] font-semibold shrink-0">
        {selectedCards.length}
      </span>

      <div className="w-[1px] h-4 bg-black/10 mx-0.5" />

      <button
        type="button"
        onClick={tidySelectionGrid}
        title="Tidy Grid"
        className="flex items-center gap-1 px-2 py-1 rounded-lg editorial-button text-xs font-medium text-[#18181B]"
      >
        <LayoutGrid className="w-3.5 h-3.5 text-[#C93B1D]" />
        <span>Tidy</span>
      </button>

      <button
        type="button"
        onClick={alignSelectionRow}
        title="Align Row"
        className="flex items-center gap-1 px-2 py-1 rounded-lg editorial-button text-xs font-medium text-[#18181B]"
      >
        <Columns2 className="w-3.5 h-3.5 text-[#52525B]" />
        <span>Row</span>
      </button>

      <button
        type="button"
        onClick={alignSelectionColumn}
        title="Align Column"
        className="flex items-center gap-1 px-2 py-1 rounded-lg editorial-button text-xs font-medium text-[#18181B]"
      >
        <Rows2 className="w-3.5 h-3.5 text-[#52525B]" />
        <span>Col</span>
      </button>

      <div className="w-[1px] h-4 bg-black/10 mx-0.5" />

      <div className="flex items-center gap-1 px-0.5">
        {ACCENT_COLORS.map((swatch) => (
          <button
            key={swatch.name}
            type="button"
            onClick={() => setSelectionColor(swatch.value)}
            title={swatch.name}
            style={{ backgroundColor: swatch.hex }}
            className="w-3.5 h-3.5 rounded-full border border-black/15 hover:scale-120 transition-transform"
          />
        ))}
      </div>

      <div className="w-[1px] h-4 bg-black/10 mx-0.5" />

      <button
        type="button"
        onClick={deleteSelectedCards}
        title="Delete Selected (Del)"
        className="p-1.5 rounded-lg text-[#71717A] hover:text-[#C93B1D] hover:bg-[#C93B1D]/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
