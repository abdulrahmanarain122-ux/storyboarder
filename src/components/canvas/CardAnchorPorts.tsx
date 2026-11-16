import React from 'react';
import type { AnchorPosition, CanvasCard } from '../../types/canvas';
import { useCanvasStore } from '../../store/canvasStore';

interface CardAnchorPortsProps {
  card: CanvasCard;
  isSelected: boolean;
  onStartDraft: (cardId: string, anchor: AnchorPosition, e: React.PointerEvent) => void;
}

const ANCHORS: AnchorPosition[] = ['top', 'right', 'bottom', 'left'];

// Positioned 14px outside each card edge with a continuous hover bridge back to the card border
const ANCHOR_WRAPPER_STYLES: Record<
  AnchorPosition,
  { style: React.CSSProperties; alignClass: string; label: string }
> = {
  top: {
    style: { top: -22, left: '50%', width: 24, height: 22, transform: 'translateX(-50%)' },
    alignClass: 'items-start justify-center pt-1',
    label: 'Drag to connect top',
  },
  right: {
    style: { top: '50%', right: -22, width: 22, height: 24, transform: 'translateY(-50%)' },
    alignClass: 'items-center justify-end pr-1',
    label: 'Drag to connect right',
  },
  bottom: {
    style: { bottom: -22, left: '50%', width: 24, height: 22, transform: 'translateX(-50%)' },
    alignClass: 'items-end justify-center pb-1',
    label: 'Drag to connect bottom',
  },
  left: {
    style: { top: '50%', left: -22, width: 22, height: 24, transform: 'translateY(-50%)' },
    alignClass: 'items-center justify-start pl-1',
    label: 'Drag to connect left',
  },
};

export const CardAnchorPorts: React.FC<CardAnchorPortsProps> = ({
  card,
  onStartDraft,
}) => {
  const draftConnection = useCanvasStore((s) => s.draftConnection);
  const isDrafting = draftConnection !== null;
  const isDraftSource = isDrafting && draftConnection.fromCardId === card.id;

  return (
    <>
      {ANCHORS.map((anchor) => {
        const isSnappedTarget =
          isDrafting &&
          draftConnection.targetSnap?.cardId === card.id &&
          draftConnection.targetSnap?.anchor === anchor;

        const isSourcePort = isDraftSource && draftConnection.fromAnchor === anchor;

        const visibilityClasses = isDrafting
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto';

        let dotStyles =
          'bg-white border-[#18181B]/40 group-hover/port:bg-[#C93B1D] group-hover/port:border-[#C93B1D] group-hover/port:scale-125 shadow-xs';

        if (isSnappedTarget) {
          dotStyles = 'bg-[#15803D] border-white scale-150 ring-2 ring-[#15803D]/30';
        } else if (isSourcePort) {
          dotStyles = 'bg-[#C93B1D] border-white scale-125';
        }

        const cfg = ANCHOR_WRAPPER_STYLES[anchor];

        return (
          <div
            key={anchor}
            id={`anchor-${card.id}-${anchor}`}
            data-anchor={anchor}
            data-card-id={card.id}
            title={cfg.label}
            style={cfg.style}
            onPointerDown={(e) => {
              if (e.button === 0) {
                onStartDraft(card.id, anchor, e);
              }
            }}
            className={`card-anchor-port group/port absolute z-30 flex cursor-crosshair transition-opacity duration-150 ${cfg.alignClass} ${visibilityClasses}`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full border-[1.5px] transition-all duration-150 ${dotStyles}`}
            />
          </div>
        );
      })}
    </>
  );
};
