import React, { useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { extractDominantColors } from '../../utils/colorExtractor';
import {
  BringToFront,
  SendToBack,
  Copy,
  Trash2,
  RotateCcw,
  Bookmark,
  Repeat,
  X,
  Palette,
  Check,
  StickyNote,
} from 'lucide-react';

const NOTE_COLORS = [
  { name: 'Vermilion', value: '#C93B1D' },
  { name: 'Cobalt', value: '#1D4ED8' },
  { name: 'Forest', value: '#15803D' },
  { name: 'Ochre', value: '#B45309' },
  { name: 'Plum', value: '#6D28D9' },
  { name: 'Charcoal', value: '#18181B' },
];

export const CardInspector: React.FC = () => {
  const cards = useCanvasStore((s) => s.cards);
  const selectedCardId = useCanvasStore((s) => s.selectedCardId);
  const selectedCardIds = useCanvasStore((s) => s.selectedCardIds);
  const bringToFront = useCanvasStore((s) => s.bringToFront);
  const sendToBack = useCanvasStore((s) => s.sendToBack);
  const updateCard = useCanvasStore((s) => s.updateCard);
  const duplicateCard = useCanvasStore((s) => s.duplicateCard);
  const deleteCard = useCanvasStore((s) => s.deleteCard);
  const seekMedia = useCanvasStore((s) => s.seekMedia);
  const deleteBookmark = useCanvasStore((s) => s.deleteBookmark);
  const setLoopRange = useCanvasStore((s) => s.setLoopRange);
  const addCard = useCanvasStore((s) => s.addCard);
  const selectCard = useCanvasStore((s) => s.selectCard);

  const [paletteMap, setPaletteMap] = useState<Record<string, string[]>>({});
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Hide when multi-selecting (FloatingSelectionBar handles multi-select) or nothing selected
  if (!selectedCardId || !cards[selectedCardId] || selectedCardIds.length > 1) return null;
  const card = cards[selectedCardId];
  const extractedPalette = paletteMap[card.id] || [];

  const handleExtractPalette = async () => {
    if (!card.url) return;
    setIsExtracting(true);
    const colors = await extractDominantColors(card.url, 5);
    setPaletteMap((prev) => ({ ...prev, [card.id]: colors }));
    setIsExtracting(false);
  };

  const handleCopyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 1200);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleSpawnPaletteNote = () => {
    if (extractedPalette.length === 0) return;
    const noteId = addCard('note');
    const html = `<h2>${card.title || 'Image'} Palette</h2><ul>${extractedPalette
      .map((hex) => `<li><code>${hex}</code></li>`)
      .join('')}</ul>`;
    updateCard(noteId, {
      title: 'Palette',
      x: Math.round(card.x + card.width + 24),
      y: Math.round(card.y),
      width: 220,
      height: 210,
      color: extractedPalette[0],
      content: html,
    });
  };

  return (
    <div className="absolute top-20 right-5 z-40 w-52 p-3 rounded-2xl bg-white border border-black/12 shadow-lg flex flex-col gap-2.5 animate-in fade-in slide-in-from-right-2 duration-150 pointer-events-auto snapshot-hide">
      {/* Editable Title + Close */}
      <div className="flex items-center gap-1.5 border-b border-black/8 pb-2">
        <input
          type="text"
          value={card.title}
          onChange={(e) => updateCard(card.id, { title: e.target.value })}
          placeholder="Title..."
          className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-[#18181B] outline-none focus:bg-[#F8F7F4] rounded px-1 py-0.5"
        />
        <button
          type="button"
          onClick={() => selectCard(null)}
          title="Close"
          className="p-1 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F1EFEA] transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Image Color Palette Extractor */}
      {card.type === 'image' && card.url && (
        <div className="flex flex-col gap-2 pb-2 border-b border-black/8">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-[#71717A] flex items-center gap-1">
              <Palette className="w-3 h-3 text-[#C93B1D]" />
              Palette
            </span>
            <button
              type="button"
              onClick={handleExtractPalette}
              disabled={isExtracting}
              className="px-2 py-0.5 rounded-md bg-[#F1EFEA] hover:bg-black/10 text-[10px] font-semibold text-[#18181B] transition-colors disabled:opacity-50"
            >
              {isExtracting ? '...' : extractedPalette.length > 0 ? 'Refresh' : 'Extract'}
            </button>
          </div>

          {extractedPalette.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-5 gap-1">
                {extractedPalette.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => handleCopyHex(hex)}
                    title={`Copy ${hex}`}
                    className="group/swatch flex flex-col items-center gap-0.5"
                  >
                    <span
                      className="w-full h-5 rounded border border-black/15 flex items-center justify-center transition-transform group-hover/swatch:scale-105"
                      style={{ backgroundColor: hex }}
                    >
                      {copiedHex === hex && <Check className="w-2.5 h-2.5 text-white drop-shadow" />}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSpawnPaletteNote}
                className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-[#F8F7F4] hover:bg-[#F1EFEA] border border-black/10 text-[10px] font-medium text-[#18181B] transition-colors"
              >
                <StickyNote className="w-3 h-3 text-[#C93B1D]" />
                <span>Save Swatches</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Video Bookmarks & Loop */}
      {card.type === 'video' && (
        <div className="flex flex-col gap-2 pb-2 border-b border-black/8">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-[#71717A] flex items-center gap-1">
              <Repeat className="w-3 h-3 text-[#C93B1D]" />
              A/B Loop
            </span>
            <button
              type="button"
              onClick={() => {
                const cur = card.loopRange || { enabled: false, start: 0, end: 10 };
                setLoopRange(card.id, { ...cur, enabled: !cur.enabled });
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                card.loopRange?.enabled
                  ? 'bg-[#C93B1D] text-white'
                  : 'bg-[#F1EFEA] text-[#52525B] hover:text-[#18181B]'
              }`}
            >
              {card.loopRange?.enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {card.bookmarks && card.bookmarks.length > 0 && (
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto no-scrollbar">
              {card.bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center justify-between px-2 py-1 rounded-lg bg-[#F8F7F4] text-[11px] font-mono"
                >
                  <button
                    type="button"
                    onClick={() => seekMedia(card.id, bm.time)}
                    className="flex items-center gap-1 text-[#18181B] hover:text-[#C93B1D]"
                  >
                    <Bookmark className="w-2.5 h-2.5 text-[#C93B1D]" />
                    <span>{bm.label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBookmark(card.id, bm.id)}
                    className="text-[#71717A] hover:text-[#C93B1D]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Note Color Swatches */}
      {card.type === 'note' && (
        <div className="flex items-center justify-between pb-2 border-b border-black/8">
          {NOTE_COLORS.map((col) => (
            <button
              key={col.value}
              type="button"
              onClick={() => updateCard(card.id, { color: col.value })}
              title={col.name}
              className={`w-5 h-5 rounded-full border-[1.5px] transition-transform ${
                card.color === col.value
                  ? 'border-[#18181B] scale-110'
                  : 'border-transparent opacity-75 hover:opacity-100 hover:scale-105'
              }`}
              style={{ backgroundColor: col.value }}
            />
          ))}
        </div>
      )}

      {/* Compact Action Strip */}
      <div className="flex items-center justify-between gap-0.5">
        <button
          type="button"
          onClick={() => bringToFront(card.id)}
          title="Bring to Front"
          className="p-1.5 rounded-lg editorial-button"
        >
          <BringToFront className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => sendToBack(card.id)}
          title="Send to Back"
          className="p-1.5 rounded-lg editorial-button"
        >
          <SendToBack className="w-3.5 h-3.5" />
        </button>

        {card.rotation !== 0 && (
          <button
            type="button"
            onClick={() => updateCard(card.id, { rotation: 0 })}
            title="Reset Rotation"
            className="p-1.5 rounded-lg editorial-button"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => duplicateCard(card.id)}
          title="Duplicate (Ctrl+D)"
          className="p-1.5 rounded-lg editorial-button"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => deleteCard(card.id)}
          title="Delete (Del)"
          className="p-1.5 rounded-lg text-[#71717A] hover:text-[#C93B1D] hover:bg-[#C93B1D]/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
