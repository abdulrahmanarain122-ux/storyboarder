import React, { memo, useState } from 'react';
import type { AnchorPosition, CanvasCard, ResizeHandle } from '../../types/canvas';
import { CardTransformBox } from './CardTransformBox';
import { CardAnchorPorts } from './CardAnchorPorts';
import { RichTextNoteCard } from '../cards/RichTextNoteCard';
import { CustomMediaPlayer } from '../cards/CustomMediaPlayer';
import { EmbedCard } from '../cards/EmbedCard';
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  ExternalLink,
  GripHorizontal,
  Bookmark,
  Play,
  X,
  Edit2,
  Check,
} from 'lucide-react';
import { InstagramIcon } from '../ui/InstagramIcon';
import { useCanvasStore } from '../../store/canvasStore';

interface CanvasCardItemProps {
  card: CanvasCard;
  isSelected: boolean;
  isResizing?: boolean;
  isRotating?: boolean;
  currentAngle?: number;
  onSelect: (e: React.PointerEvent) => void;
  onStartDrag: (cardId: string, e: React.PointerEvent) => void;
  onResizeHandlePointerDown: (handle: ResizeHandle, e: React.PointerEvent) => void;
  onRotateHandlePointerDown: (e: React.PointerEvent) => void;
  onAnchorDraftStart: (cardId: string, anchor: AnchorPosition, e: React.PointerEvent) => void;
}

export const CanvasCardItem: React.FC<CanvasCardItemProps> = memo(({
  card,
  isSelected,
  isResizing,
  isRotating,
  currentAngle,
  onSelect,
  onStartDrag,
  onResizeHandlePointerDown,
  onRotateHandlePointerDown,
  onAnchorDraftStart,
}) => {
  const editingCardId = useCanvasStore((s) => s.editingCardId);
  const setEditingCardId = useCanvasStore((s) => s.setEditingCardId);
  const updateCard = useCanvasStore((s) => s.updateCard);
  const autoSyncMediaAspectRatio = useCanvasStore((s) => s.autoSyncMediaAspectRatio);
  const seekMedia = useCanvasStore((s) => s.seekMedia);
  const deleteBookmark = useCanvasStore((s) => s.deleteBookmark);
  const isEditing = editingCardId === card.id;

  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(card.title);

  const commitTitle = () => {
    if (titleDraft.trim()) {
      updateCard(card.id, { title: titleDraft.trim() });
    } else {
      setTitleDraft(card.title);
    }
    setIsRenamingTitle(false);
  };

  const displayAngle = currentAngle !== undefined ? currentAngle : card.rotation;

  const handlePointerDown = (e: React.PointerEvent) => {
    // If left-click, select and prepare for dragging (unless actively typing in edit mode)
    if (e.button === 0) {
      onSelect(e);
      if (!isEditing) {
        onStartDrag(card.id, e);
      }
    }
  };

  const getCardIcon = () => {
    if (card.url?.includes('instagram.com') || card.tags?.includes('INSTAGRAM')) {
      return <InstagramIcon className="w-3.5 h-3.5 text-[#71717A]" />;
    }
    switch (card.type) {
      case 'note':
        return <FileText className="w-3.5 h-3.5 text-[#71717A]" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-[#71717A]" />;
      case 'video':
        return <Video className="w-3.5 h-3.5 text-[#71717A]" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-[#71717A]" />;
      case 'embed-url':
        return <ExternalLink className="w-3.5 h-3.5 text-[#71717A]" />;
    }
  };

  const isEmbedVideo =
    Boolean(
      card.url?.includes('youtube.com') ||
      card.url?.includes('youtu.be') ||
      card.url?.includes('vimeo.com') ||
      card.url?.includes('instagram.com') ||
      card.tags?.includes('INSTAGRAM') ||
      card.tags?.includes('YOUTUBE') ||
      card.tags?.includes('VIMEO')
    );

  return (
    <div
      id={`canvas-card-${card.id}`}
      style={{
        position: 'absolute',
        left: `${card.x}px`,
        top: `${card.y}px`,
        width: `${card.width}px`,
        height: `${card.height}px`,
        transform: `rotate(${displayAngle}deg)`,
        transformOrigin: '50% 50%',
        zIndex: card.zIndex,
        transition: isResizing ? 'none' : 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onPointerDown={handlePointerDown}
      className={`group select-none transition-[filter,transform-shadow] duration-150 ${isEditing ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        } ${isSelected ? 'z-50' : 'hover:ring-1 hover:ring-white/20'}`}
    >
      {/* Inner Card Container — Swiss Editorial Paper Surface */}
      <div
        className={`w-full h-full min-h-0 rounded-2xl overflow-hidden [clip-path:inset(0_round_16px)] flex flex-col bg-[#FFFFFF] relative transition-all duration-200 ${
          isSelected
            ? 'shadow-[0_14px_40px_rgba(24,24,27,0.14)]'
            : 'border border-black/15 shadow-[0_4px_20px_rgba(24,24,27,0.06)] hover:border-black/30 hover:shadow-[0_8px_28px_rgba(24,24,27,0.09)]'
        }`}
        style={{
          borderColor: card.color && !isSelected ? `${card.color}55` : undefined,
          background:
            card.type === 'note' && card.color
              ? `linear-gradient(180deg, ${card.color}14 0%, #FFFFFF 45%)`
              : '#FFFFFF',
        }}
      >
        {/* Top Header / Bar (Dedicated drag anchor for notes and media) */}
        <div
          onPointerDown={(e) => {
            // Header is always draggable, even in edit mode
            if (e.button === 0) {
              onSelect(e);
              onStartDrag(card.id, e);
            }
          }}
          className="flex items-center justify-between px-3.5 py-2 border-b border-black/6 shrink-0 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-2 overflow-hidden pr-2 flex-1 min-w-0">
            <span className="shrink-0 opacity-75">{getCardIcon()}</span>
            {isRenamingTitle ? (
              <div
                className="flex items-center gap-1 flex-1 min-w-0"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitTitle();
                    if (e.key === 'Escape') {
                      setTitleDraft(card.title);
                      setIsRenamingTitle(false);
                    }
                  }}
                  className="w-full min-w-0 bg-[#F8F7F4] border border-[#C93B1D] rounded px-1.5 py-0.5 text-xs font-medium text-[#18181B] outline-none"
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commitTitle();
                  }}
                  className="p-0.5 rounded text-emerald-700 hover:bg-[#F1EFEA] shrink-0"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 min-w-0 flex-1"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setTitleDraft(card.title);
                  setIsRenamingTitle(true);
                }}
                title="Double-click to rename"
              >
                <span className="text-xs font-medium text-[#18181B] truncate tracking-tight">
                  {card.title}
                </span>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTitleDraft(card.title);
                    setIsRenamingTitle(true);
                  }}
                  title="Rename"
                  className="p-0.5 rounded text-[#71717A] hover:text-[#18181B] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Interactive Note Jump Button (Linked Note to Video Timestamp) */}
            {card.type === 'note' && card.metadata?.sourceCardId && card.metadata?.timestamp !== undefined && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  seekMedia(card.metadata!.sourceCardId as string, card.metadata!.timestamp as number);
                }}
                className="px-2 py-0.5 rounded-md bg-[#C93B1D]/10 hover:bg-[#C93B1D] text-[#C93B1D] hover:text-white text-[10px] font-mono border border-[#C93B1D]/25 transition-colors flex items-center gap-1 cursor-pointer group/btn"
                title="Jump to linked video timestamp"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>Jump</span>
              </button>
            )}
            <GripHorizontal className="w-3.5 h-3.5 text-[#A1A1AA] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Saved Bookmark Chips Bar on Video & Embed Cards */}
        {(card.type === 'video' || isEmbedVideo) && card.bookmarks && card.bookmarks.length > 0 && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#F8F7F4] border-b border-black/8 overflow-x-auto no-scrollbar z-10 shrink-0 select-none"
          >
            <span className="text-[10px] text-[#71717A] font-mono flex items-center gap-1 shrink-0 mr-1">
              <Bookmark className="w-3 h-3 text-[#C93B1D]" />
            </span>
            {card.bookmarks.map((bm) => (
              <div
                key={bm.id}
                onClick={() => seekMedia(card.id, bm.time)}
                className="group/chip inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-[#C93B1D] text-[#18181B] hover:text-white text-[10px] font-mono border border-black/10 hover:border-[#C93B1D] transition-all cursor-pointer shrink-0"
                title={`Jump to [⏱ ${bm.label}] & resume playback`}
              >
                <span>⏱ {bm.label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBookmark(card.id, bm.id);
                  }}
                  className="opacity-0 group-hover/chip:opacity-100 hover:text-white/80 transition-opacity ml-0.5 p-0.5"
                  title="Remove bookmark"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Card Body by Card Type (min-h-0 ensures fluid shrinking and scaling) */}
        <div className="flex-1 w-full h-full min-h-0 overflow-hidden relative flex flex-col">
          {/* 1. TipTap Rich-Text Note Card */}
          {card.type === 'note' && (
            <RichTextNoteCard
              card={card}
              isSelected={isSelected}
              isEditing={isEditing}
              onEnterEdit={() => setEditingCardId(card.id)}
              onExitEdit={() => setEditingCardId(null)}
            />
          )}

          {/* 2. Image Card */}
          {card.type === 'image' && (
            <div className="w-full h-full min-h-0 p-2 flex flex-col">
              <div className="w-full h-full min-h-0 rounded-xl overflow-hidden relative group/img bg-[#F1EFEA] flex items-center justify-center">
                {card.url ? (
                  <img
                    src={card.url}
                    alt={card.title}
                    draggable={false}
                    className="w-full h-full object-cover pointer-events-none transition-transform duration-300 group-hover/img:scale-[1.02]"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        autoSyncMediaAspectRatio(card.id, img.naturalWidth, img.naturalHeight);
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#71717A] gap-2">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                    <span className="text-xs">No image loaded</span>
                  </div>
                )}
                {card.metadata?.fileSize && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-mono text-[#18181B] border border-black/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    {card.metadata.fileSize}
                  </div>
                )}
                {card.metadata?.aspectRatio && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-white/90 text-[9px] font-mono text-[#52525B] border border-black/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    {card.metadata.aspectRatio}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Video Card (Embed or Custom Media Player) */}
          {card.type === 'video' && (
            isEmbedVideo ? (
              <EmbedCard card={card} isSelected={isSelected} />
            ) : (
              <CustomMediaPlayer
                card={card}
                mediaType="video"
                src={card.url || ''}
              />
            )
          )}

          {/* 4. Audio Card (Custom Media Player with Waveform) */}
          {card.type === 'audio' && (
            <CustomMediaPlayer
              card={card}
              mediaType="audio"
              src={card.url || ''}
            />
          )}

          {/* 5. Web Embed URL Card */}
          {card.type === 'embed-url' && (
            <EmbedCard card={card} isSelected={isSelected} />
          )}
        </div>
      </div>

      {/* 4 Card Border Anchor Ports (Top, Right, Bottom, Left) */}
      <CardAnchorPorts
        card={card}
        isSelected={isSelected}
        onStartDraft={onAnchorDraftStart}
      />

      {/* Active Selection Bounding Box, 8-Point Resize Handles & Rotation Handle */}
      {isSelected && (
        <CardTransformBox
          width={card.width}
          height={card.height}
          rotation={card.rotation}
          isResizing={isResizing}
          isRotating={isRotating}
          currentAngle={currentAngle}
          onResizeHandlePointerDown={onResizeHandlePointerDown}
          onRotateHandlePointerDown={onRotateHandlePointerDown}
        />
      )}
    </div>
  );
});

CanvasCardItem.displayName = 'CanvasCardItem';
