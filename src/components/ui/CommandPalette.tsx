import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasCard, CardType } from '../../types/canvas';
import {
  Search,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Link2,
  X,
  CornerDownLeft,
  ArrowUpDown,
  Tag,
  Clock,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

const TYPE_CONFIG: Record<CardType, { label: string; icon: React.FC<{ className?: string }>; colorClass: string }> = {
  note: { label: 'Note', icon: FileText, colorClass: 'text-[#C93B1D] bg-[#C93B1D]/10 border-[#C93B1D]/20' },
  image: { label: 'Image', icon: ImageIcon, colorClass: 'text-[#18181B] bg-[#F1EFEA] border-black/10' },
  video: { label: 'Video', icon: Video, colorClass: 'text-[#18181B] bg-[#F1EFEA] border-black/10' },
  audio: { label: 'Audio', icon: Music, colorClass: 'text-[#18181B] bg-[#F1EFEA] border-black/10' },
  'embed-url': { label: 'Link', icon: Link2, colorClass: 'text-[#18181B] bg-[#F1EFEA] border-black/10' },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen: controlledIsOpen,
  onOpen: controlledOnOpen,
  onClose: controlledOnClose,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const cards = useCanvasStore((s) => s.cards);
  const viewport = useCanvasStore((s) => s.viewport);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const selectCard = useCanvasStore((s) => s.selectCard);

  const handleClose = useCallback(() => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
    setQuery('');
    setSelectedIndex(0);
  }, [controlledOnClose]);

  const handleOpen = useCallback(() => {
    if (controlledOnOpen) {
      controlledOnOpen();
    } else {
      setInternalIsOpen(true);
    }
  }, [controlledOnOpen]);

  // Global Ctrl+K / Cmd+K shortcut & custom event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) {
          handleClose();
        } else {
          handleOpen();
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleClose();
      }
    };

    const handleCustomOpen = () => handleOpen();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, [isOpen, handleClose, handleOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter cards based on query
  const filteredCards = useMemo(() => {
    const cardList = Object.values(cards);
    if (!query.trim()) {
      return cardList.slice(0, 20);
    }

    const q = query.toLowerCase().trim();

    return cardList.filter((card) => {
      const matchTitle = (card.title || '').toLowerCase().includes(q);
      const matchType = (card.type || '').toLowerCase().includes(q);
      const plainContent = card.content ? stripHtml(card.content).toLowerCase() : '';
      const matchContent = plainContent.includes(q);
      const matchTags = (card.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchUrl = (card.url || '').toLowerCase().includes(q);

      return matchTitle || matchType || matchContent || matchTags || matchUrl;
    });
  }, [cards, query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Navigate & Center mathematically on a card
  const navigateToCard = (card: CanvasCard) => {
    handleClose();

    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    // Mathematical center of target card in world space
    const cardCenterX = card.x + card.width / 2;
    const cardCenterY = card.y + card.height / 2;

    // Ensure comfortable zoom level (clamped between 0.85 and 1.25)
    const targetZoom = Math.max(0.85, Math.min(1.25, viewport.zoom));

    // Screen Center = World Center * Zoom + Viewport Offset
    // => Viewport Offset = Screen Center - World Center * Zoom
    const targetX = screenWidth / 2 - cardCenterX * targetZoom;
    const targetY = screenHeight / 2 - cardCenterY * targetZoom;

    setViewport({
      x: targetX,
      y: targetY,
      zoom: targetZoom,
    });

    // Select target card and bring to front
    selectCard(card.id, false, true);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCards.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCards.length) % Math.max(1, filteredCards.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetCard = filteredCards[selectedIndex];
      if (targetCard) {
        navigateToCard(targetCard);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 sm:pt-28 px-4 bg-black/25 backdrop-blur-xs animate-in fade-in duration-150 snapshot-hide"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl editorial-panel overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-black/10 bg-[#FFFFFF]">
          <Search className="w-4 h-4 text-[#C93B1D] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search notes, card titles, content, or tags... (⌘K)"
            className="flex-1 bg-transparent text-sm sm:text-base text-[#18181B] placeholder-[#71717A] outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F1EFEA] border border-black/10 text-[10px] font-mono font-medium text-[#52525B]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {filteredCards.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-sm font-medium text-[#18181B]">No cards matched &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-[#71717A] mt-1">Try searching for words in notes, bookmarks, or card titles.</p>
            </div>
          ) : (
            filteredCards.map((card, idx) => {
              const typeCfg = TYPE_CONFIG[card.type] || TYPE_CONFIG.note;
              const Icon = typeCfg.icon;
              const isHighlighted = idx === selectedIndex;
              const plainSnippet = card.content ? stripHtml(card.content) : '';

              return (
                <div
                  key={card.id}
                  onClick={() => navigateToCard(card)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group flex items-start gap-3.5 p-3 rounded-xl cursor-pointer transition-all ${
                    isHighlighted
                      ? 'bg-[#C93B1D]/8 border border-[#C93B1D]/25 text-[#18181B]'
                      : 'hover:bg-[#F1EFEA] border border-transparent text-[#18181B]'
                  }`}
                >
                  {/* Card Type Badge Icon */}
                  <div
                    className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${typeCfg.colorClass}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Card Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate text-[#18181B]">
                        {card.title || 'Untitled Card'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-[#F1EFEA] text-[#52525B]">
                        {typeCfg.label}
                      </span>
                      {card.bookmarks && card.bookmarks.length > 0 && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-[#C93B1D] bg-[#C93B1D]/10">
                          <Clock className="w-2.5 h-2.5" />
                          {card.bookmarks.length} pin{card.bookmarks.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Content Snippet / Metadata */}
                    {plainSnippet && (
                      <p className="text-xs text-[#52525B] line-clamp-2 mt-0.5 leading-relaxed">
                        {plainSnippet}
                      </p>
                    )}

                    {/* Tags */}
                    {card.tags && card.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {card.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#F1EFEA] text-[#52525B] border border-black/10"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Jump Indicator Action */}
                  <div className="hidden sm:flex items-center gap-1 text-[#C93B1D] text-xs shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[11px] font-medium">Jump</span>
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-black/10 bg-[#F8F7F4] text-xs text-[#52525B]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#71717A]" />
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3.5 h-3.5 text-[#71717A]" />
              <span>Center & Zoom</span>
            </span>
          </div>

          <span className="text-[11px] font-mono text-[#71717A]">
            {filteredCards.length} result{filteredCards.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};
