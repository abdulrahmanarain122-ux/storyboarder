import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { AnchorPosition, CanvasCard, Point, ResizeHandle, TransformAction } from '../../types/canvas';
import { CanvasCardItem } from './CanvasCardItem';
import { CanvasFrameItem } from './CanvasFrameItem';
import { ConnectionLayer } from './ConnectionLayer';
import { FloatingSelectionBar } from './FloatingSelectionBar';
import { ConnectionPopover } from './ConnectionPopover';
import { EmptyBoardOverlay } from './EmptyBoardOverlay';
import {
  clamp,
  computeCardResize,
  computeFrameResize,
  computeRotationAngle,
  screenToWorld,
  worldToScreen,
} from '../../utils/coordinates';
import {
  findNearestAnchor,
  getCardAnchorWorldPoint,
} from '../../utils/connectionGeometry';
import { parseMediaUrl } from '../../utils/urlParser';
import { UploadCloud, Image as ImageIcon, Video, Music } from 'lucide-react';

export const InfiniteCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef<number>(0);

  // Store state
  const viewport = useCanvasStore((s) => s.viewport);
  const cards = useCanvasStore((s) => s.cards);
  const selectedCardId = useCanvasStore((s) => s.selectedCardId);
  const selectedCardIds = useCanvasStore((s) => s.selectedCardIds);
  const selectedConnectionId = useCanvasStore((s) => s.selectedConnectionId);
  const frames = useCanvasStore((s) => s.frames);
  const selectedFrameId = useCanvasStore((s) => s.selectedFrameId);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const isSpacePressed = useCanvasStore((s) => s.isSpacePressed);
  const showGrid = useCanvasStore((s) => s.showGrid);
  const isDraggingFilesOver = useCanvasStore((s) => s.isDraggingFilesOver);

  // Store actions
  const initDB = useCanvasStore((s) => s.initDB);
  const panBy = useCanvasStore((s) => s.panBy);
  const zoomAt = useCanvasStore((s) => s.zoomAt);
  const selectCard = useCanvasStore((s) => s.selectCard);
  const setSelectedCardIds = useCanvasStore((s) => s.setSelectedCardIds);
  const selectConnection = useCanvasStore((s) => s.selectConnection);
  const deleteConnection = useCanvasStore((s) => s.deleteConnection);
  const selectFrame = useCanvasStore((s) => s.selectFrame);
  const addFrame = useCanvasStore((s) => s.addFrame);
  const updateFrame = useCanvasStore((s) => s.updateFrame);
  const deleteFrame = useCanvasStore((s) => s.deleteFrame);
  const moveFrameWithContainedCards = useCanvasStore((s) => s.moveFrameWithContainedCards);
  const startDraftConnection = useCanvasStore((s) => s.startDraftConnection);
  const updateDraftConnection = useCanvasStore((s) => s.updateDraftConnection);
  const completeDraftConnection = useCanvasStore((s) => s.completeDraftConnection);
  const cancelDraftConnection = useCanvasStore((s) => s.cancelDraftConnection);
  const updateCard = useCanvasStore((s) => s.updateCard);
  const moveCards = useCanvasStore((s) => s.moveCards);
  const addCard = useCanvasStore((s) => s.addCard);
  const deleteCard = useCanvasStore((s) => s.deleteCard);
  const deleteSelectedCards = useCanvasStore((s) => s.deleteSelectedCards);
  const duplicateCard = useCanvasStore((s) => s.duplicateCard);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const setSpacePressed = useCanvasStore((s) => s.setSpacePressed);
  const setIsPanning = useCanvasStore((s) => s.setIsPanning);
  const setIsDraggingFilesOver = useCanvasStore((s) => s.setIsDraggingFilesOver);
  const ingestMediaFiles = useCanvasStore((s) => s.ingestMediaFiles);
  const ingestMediaUrl = useCanvasStore((s) => s.ingestMediaUrl);

  // Local interaction state
  const transformActionRef = useRef<TransformAction>({ type: 'idle' });
  const [activeActionType, setActiveActionType] = useState<TransformAction['type']>('idle');
  const [activeRotationAngle, setActiveRotationAngle] = useState<number | undefined>(undefined);
  const [marqueeBox, setMarqueeBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [frameDrawBox, setFrameDrawBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<{ vertical: number | null; horizontal: number | null }>({
    vertical: null,
    horizontal: null,
  });

  const isPanning = activeActionType === 'pan';
  const isResizing = activeActionType === 'resize-card';
  const isRotating = activeActionType === 'rotate-card';

  // 1. Initialize DB hydration on mount
  useEffect(() => {
    initDB();
  }, [initDB]);

  // 2. Non-passive Wheel Zoom listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // Trackpad pinch or mouse wheel
      const zoomFactor = -e.deltaY * 0.0018;
      zoomAt(screenX, screenY, zoomFactor);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoomAt]);

  // 3. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      const isElement = target instanceof Element;
      const isTyping =
        (isElement &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            (target as HTMLElement).isContentEditable ||
            Boolean(target.closest('input, textarea, [contenteditable="true"], .ProseMirror')))) ||
        Boolean(useCanvasStore.getState().editingCardId);

      if (isTyping) {
        if (e.key === 'Escape') {
          useCanvasStore.getState().setEditingCardId(null);
        }
        return;
      }

      const store = useCanvasStore.getState();

      // Spacebar toggles pan & embed card drag mode
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      }

      // Delete or Backspace removes selected connection, cards, or frame
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (store.selectedConnectionId) {
          e.preventDefault();
          deleteConnection(store.selectedConnectionId);
        } else if (store.selectedCardIds.length > 0) {
          e.preventDefault();
          deleteSelectedCards();
        } else if (store.selectedFrameId) {
          e.preventDefault();
          deleteFrame(store.selectedFrameId);
        } else if (store.selectedCardId) {
          e.preventDefault();
          deleteCard(store.selectedCardId);
        }
      }

      // Undo / Redo (Ctrl+Z / Cmd+Z / Ctrl+Y / Cmd+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          store.redo();
        } else {
          store.undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        store.redo();
        return;
      }

      // Quick Tool & View Shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const keyLower = e.key.toLowerCase();
        if (keyLower === 'v') {
          setActiveTool('select');
          return;
        }
        if (keyLower === 'h') {
          setActiveTool('hand');
          return;
        }
        if (keyLower === 'f') {
          setActiveTool('frame');
          return;
        }
        if (keyLower === 'g') {
          store.toggleGrid();
          return;
        }
      }

      // Ctrl+D or Cmd+D duplicates selected card
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && store.selectedCardId) {
        e.preventDefault();
        store.duplicateCard(store.selectedCardId);
      }

      // Escape deselects
      if (e.key === 'Escape') {
        selectCard(null);
        selectConnection(null);
        selectFrame(null);
        cancelDraftConnection();
        if (transformActionRef.current.type === 'draw-connection') {
          transformActionRef.current = { type: 'idle' };
          setActiveActionType('idle');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    selectedCardId,
    selectedCardIds,
    selectedConnectionId,
    selectedFrameId,
    setSpacePressed,
    deleteCard,
    deleteConnection,
    deleteFrame,
    deleteSelectedCards,
    duplicateCard,
    selectCard,
    selectConnection,
    selectFrame,
    setActiveTool,
    cancelDraftConnection,
  ]);

  // 4. Global Clipboard Paste Listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      // A. Pasted Files (Images from clipboard / screenshot tools)
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length > 0) {
        e.preventDefault();
        await ingestMediaFiles(files);
        return;
      }

      // B. Pasted Text or URL
      const text = e.clipboardData?.getData('text/plain')?.trim();
      if (text) {
        const parsed = parseMediaUrl(text);
        if (parsed) {
          e.preventDefault();
          await ingestMediaUrl(text);
        } else if (text.length > 0) {
          e.preventDefault();
          const cardId = addCard('note');
          updateCard(cardId, {
            title: 'Pasted Note',
            content: text,
          });
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [ingestMediaFiles, ingestMediaUrl, addCard, updateCard]);

  // 5. Drag-and-Drop Ingestion Handlers on Canvas
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFilesOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingFilesOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingFilesOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const rect = containerRef.current?.getBoundingClientRect();
    const screenPos = rect
      ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
      : undefined;

    await ingestMediaFiles(files, screenPos);
  };

  // 6. Pointer Handlers on Canvas Container (Pan / Deselect / Marquee Selection)
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    const isSpace = isSpacePressed || useCanvasStore.getState().isSpacePressed;
    const shouldPan =
      e.button === 1 ||
      (e.button === 0 && (isSpace || activeTool === 'hand'));

    if (shouldPan) {
      e.preventDefault();
      transformActionRef.current = {
        type: 'pan',
        startScreen: { x: e.clientX, y: e.clientY },
        startViewport: { ...viewport },
      };
      setActiveActionType('pan');
      setIsPanning(true);
      return;
    }

    if (e.button === 0 && activeTool === 'frame' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const pointerScreen: Point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const pointerWorld = screenToWorld(pointerScreen, viewport);

      transformActionRef.current = {
        type: 'draw-frame',
        startPointerWorld: pointerWorld,
        currentPointerWorld: pointerWorld,
      };
      setActiveActionType('draw-frame');
      setFrameDrawBox({
        x: pointerWorld.x,
        y: pointerWorld.y,
        width: 0,
        height: 0,
      });
      return;
    }

    if (e.button === 0 && activeTool === 'select' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const pointerScreen: Point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const pointerWorld = screenToWorld(pointerScreen, viewport);

      if (!e.shiftKey) {
        selectCard(null);
        selectConnection(null);
        selectFrame(null);
      }

      transformActionRef.current = {
        type: 'marquee',
        startPointerWorld: pointerWorld,
        currentPointerWorld: pointerWorld,
      };
      setActiveActionType('marquee');
      setMarqueeBox({
        x: pointerWorld.x,
        y: pointerWorld.y,
        width: 0,
        height: 0,
      });
    }
  };

  // 7. Card Drag Start (Supports moving all selected cards together)
  const handleCardDragStart = useCallback(
    (cardId: string, e: React.PointerEvent) => {
      // Don't drag card if activeTool is 'hand' (hand tool is reserved exclusively for canvas panning)
      if (activeTool === 'hand') return;

      const card = cards[cardId];
      if (!card || !containerRef.current) return;

      // Stop propagation so canvas background pan or marquee is not triggered simultaneously
      e.stopPropagation();

      const rect = containerRef.current.getBoundingClientRect();
      const pointerScreen: Point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const pointerWorld = screenToWorld(pointerScreen, viewport);

      const store = useCanvasStore.getState();
      const currentSelectedIds = store.selectedCardIds;

      // If this card is already part of the multi-selection, drag the whole group in unison
      const effectiveIds = currentSelectedIds.includes(cardId)
        ? currentSelectedIds
        : [cardId];

      const initialPositions: Record<string, Point> = {};
      const allCards = store.cards;
      for (const id of effectiveIds) {
        if (allCards[id]) {
          initialPositions[id] = { x: allCards[id].x, y: allCards[id].y };
        }
      }

      store.pushHistory();

      transformActionRef.current = {
        type: 'drag-card',
        cardId,
        startPointerWorld: pointerWorld,
        initialPositions,
      };
      setActiveActionType('drag-card');
    },
    [cards, activeTool, viewport]
  );

  // 7b. Frame Drag Start (Spatial containment moves all cards inside frame)
  const handleFrameDragStart = useCallback(
    (frameId: string, e: React.PointerEvent) => {
      if (activeTool === 'hand') return;
      const frame = frames[frameId];
      if (!frame || !containerRef.current) return;

      e.stopPropagation();
      selectFrame(frameId);

      const rect = containerRef.current.getBoundingClientRect();
      const pointerScreen: Point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const pointerWorld = screenToWorld(pointerScreen, viewport);

      // Find cards whose center coordinates lie inside this frame
      const containedCardInitialPositions: Record<string, Point> = {};
      const allCards = useCanvasStore.getState().cards;
      for (const card of Object.values(allCards)) {
        const cx = card.x + card.width / 2;
        const cy = card.y + card.height / 2;
        if (
          cx >= frame.x &&
          cx <= frame.x + frame.width &&
          cy >= frame.y &&
          cy <= frame.y + frame.height
        ) {
          containedCardInitialPositions[card.id] = { x: card.x, y: card.y };
        }
      }

      useCanvasStore.getState().pushHistory();

      transformActionRef.current = {
        type: 'drag-frame',
        frameId,
        startPointerWorld: pointerWorld,
        startFramePos: { x: frame.x, y: frame.y },
        containedCardInitialPositions,
      };
      setActiveActionType('drag-frame');
    },
    [frames, activeTool, viewport, selectFrame]
  );

  // 7c. Frame Resize Start
  const handleFrameResizeHandleStart = useCallback(
    (frameId: string, handle: ResizeHandle, e: React.PointerEvent) => {
      e.stopPropagation();
      const frame = frames[frameId];
      if (!frame || !containerRef.current) return;

      selectFrame(frameId);

      const rect = containerRef.current.getBoundingClientRect();
      const pointerScreen: Point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const pointerWorld = screenToWorld(pointerScreen, viewport);

      useCanvasStore.getState().pushHistory();

      transformActionRef.current = {
        type: 'resize-frame',
        frameId,
        handle,
        startPointerWorld: pointerWorld,
        initialFrame: { ...frame },
      };
      setActiveActionType('resize-frame');
    },
    [frames, viewport, selectFrame]
  );

  // 8. Card Resize Start
  const handleResizeHandleStart = useCallback(
    (handle: ResizeHandle, e: React.PointerEvent) => {
      e.stopPropagation();
      if (!selectedCardId || !cards[selectedCardId] || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const pointerScreen: Point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const pointerWorld = screenToWorld(pointerScreen, viewport);

      useCanvasStore.getState().pushHistory();

      transformActionRef.current = {
        type: 'resize-card',
        cardId: selectedCardId,
        handle,
        startPointerWorld: pointerWorld,
        initialCard: { ...cards[selectedCardId] },
        preserveAspectRatio: e.shiftKey,
      };
      setActiveActionType('resize-card');
    },
    [cards, selectedCardId, viewport]
  );

  // 9. Card Rotation Start
  const handleRotateHandleStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (!selectedCardId || !cards[selectedCardId] || !containerRef.current) return;

      const card = cards[selectedCardId];

      const centerWorld: Point = {
        x: card.x + card.width / 2,
        y: card.y + card.height / 2,
      };
      const centerScreen: Point = worldToScreen(centerWorld, viewport);

      useCanvasStore.getState().pushHistory();

      transformActionRef.current = {
        type: 'rotate-card',
        cardId: selectedCardId,
        initialRotation: card.rotation,
        cardCenterScreen: centerScreen,
        startAngleDeg: card.rotation,
      };
      setActiveActionType('rotate-card');
      setActiveRotationAngle(card.rotation);
    },
    [cards, selectedCardId, viewport]
  );

  // 10. Anchor Port Draft Connection Start
  const handleAnchorDraftStart = useCallback(
    (cardId: string, anchor: AnchorPosition, e: React.PointerEvent) => {
      e.stopPropagation();
      const card = cards[cardId];
      if (!card) return;

      const { point } = getCardAnchorWorldPoint(card, anchor);
      startDraftConnection(cardId, anchor, point);

      transformActionRef.current = {
        type: 'draw-connection',
        fromCardId: cardId,
        fromAnchor: anchor,
      };
      setActiveActionType('draw-connection');
    },
    [cards, startDraftConnection]
  );

  // 11. Global Window Pointer Move & Up listeners
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      const action = transformActionRef.current;
      if (action.type === 'idle' || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const currentScreen: Point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      if (action.type === 'pan') {
        const dx = e.clientX - action.startScreen.x;
        const dy = e.clientY - action.startScreen.y;
        panBy(dx, dy);
        action.startScreen = { x: e.clientX, y: e.clientY };
      } else if (action.type === 'marquee') {
        const currentWorld = screenToWorld(currentScreen, viewport);
        const minX = Math.min(action.startPointerWorld.x, currentWorld.x);
        const maxX = Math.max(action.startPointerWorld.x, currentWorld.x);
        const minY = Math.min(action.startPointerWorld.y, currentWorld.y);
        const maxY = Math.max(action.startPointerWorld.y, currentWorld.y);

        setMarqueeBox({
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        });

        // Intersect marquee with cards
        const allCards = useCanvasStore.getState().cards;
        const intersectingIds = Object.values(allCards)
          .filter((card) => {
            return (
              card.x < maxX &&
              card.x + card.width > minX &&
              card.y < maxY &&
              card.y + card.height > minY
            );
          })
          .map((c) => c.id);

        if (e.shiftKey) {
          const currentIds = useCanvasStore.getState().selectedCardIds;
          const unionIds = Array.from(new Set([...currentIds, ...intersectingIds]));
          setSelectedCardIds(unionIds);
        } else {
          setSelectedCardIds(intersectingIds);
        }
      } else if (action.type === 'draw-frame') {
        const currentWorld = screenToWorld(currentScreen, viewport);
        const minX = Math.min(action.startPointerWorld.x, currentWorld.x);
        const maxX = Math.max(action.startPointerWorld.x, currentWorld.x);
        const minY = Math.min(action.startPointerWorld.y, currentWorld.y);
        const maxY = Math.max(action.startPointerWorld.y, currentWorld.y);

        setFrameDrawBox({
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        });
      } else if (action.type === 'drag-card') {
        const currentWorld = screenToWorld(currentScreen, viewport);
        const dx = currentWorld.x - action.startPointerWorld.x;
        const dy = currentWorld.y - action.startPointerWorld.y;

        const count = Object.keys(action.initialPositions || {}).length;
        if (count > 1) {
          setAlignmentGuides({ vertical: null, horizontal: null });
          const moves: Record<string, Point> = {};
          for (const [id, initialPos] of Object.entries(action.initialPositions)) {
            moves[id] = {
              x: Math.round(initialPos.x + dx),
              y: Math.round(initialPos.y + dy),
            };
          }
          moveCards(moves);
        } else {
          const draggedCard = cards[action.cardId];
          const initialPos =
            action.initialPositions?.[action.cardId] ||
            (draggedCard ? { x: draggedCard.x, y: draggedCard.y } : { x: 0, y: 0 });
          let nextX = Math.round(initialPos.x + dx);
          let nextY = Math.round(initialPos.y + dy);

          // Smart Alignment Guides (snap within 8px world-space unless Alt is held)
          let snapV: number | null = null;
          let snapH: number | null = null;
          if (draggedCard && !e.altKey) {
            const threshold = 8;
            const dW = draggedCard.width;
            const dH = draggedCard.height;
            const dLeft = nextX;
            const dCenterX = nextX + dW / 2;
            const dRight = nextX + dW;
            const dTop = nextY;
            const dCenterY = nextY + dH / 2;
            const dBottom = nextY + dH;

            let bestDx = threshold + 1;
            let bestDy = threshold + 1;

            for (const other of Object.values(cards)) {
              if (other.id === action.cardId) continue;
              const oXs = [other.x, other.x + other.width / 2, other.x + other.width];
              const oYs = [other.y, other.y + other.height / 2, other.y + other.height];

              for (const ox of oXs) {
                for (const [curVal, offset] of [
                  [dLeft, 0],
                  [dCenterX, -dW / 2],
                  [dRight, -dW],
                ] as const) {
                  const diff = Math.abs(curVal - ox);
                  if (diff < bestDx) {
                    bestDx = diff;
                    nextX = Math.round(ox + offset);
                    snapV = ox;
                  }
                }
              }

              for (const oy of oYs) {
                for (const [curVal, offset] of [
                  [dTop, 0],
                  [dCenterY, -dH / 2],
                  [dBottom, -dH],
                ] as const) {
                  const diff = Math.abs(curVal - oy);
                  if (diff < bestDy) {
                    bestDy = diff;
                    nextY = Math.round(oy + offset);
                    snapH = oy;
                  }
                }
              }
            }
          }

          setAlignmentGuides({ vertical: snapV, horizontal: snapH });
          updateCard(action.cardId, {
            x: nextX,
            y: nextY,
          });
        }
      } else if (action.type === 'drag-frame') {
        const currentWorld = screenToWorld(currentScreen, viewport);
        const dx = currentWorld.x - action.startPointerWorld.x;
        const dy = currentWorld.y - action.startPointerWorld.y;

        const newPos = {
          x: Math.round(action.startFramePos.x + dx),
          y: Math.round(action.startFramePos.y + dy),
        };

        moveFrameWithContainedCards(
          action.frameId,
          newPos,
          action.containedCardInitialPositions,
          { x: dx, y: dy }
        );
      } else if (action.type === 'resize-frame') {
        const currentWorld = screenToWorld(currentScreen, viewport);
        const newBounds = computeFrameResize(
          action.initialFrame,
          action.handle,
          action.startPointerWorld,
          currentWorld
        );
        updateFrame(action.frameId, newBounds);
      } else if (action.type === 'resize-card') {
        const currentWorld = screenToWorld(currentScreen, viewport);
        const preserveAspect = e.shiftKey || action.preserveAspectRatio;

        const newBounds = computeCardResize(
          action.initialCard,
          action.handle,
          action.startPointerWorld,
          currentWorld,
          preserveAspect
        );

        updateCard(action.cardId, newBounds);
      } else if (action.type === 'rotate-card') {
        const pointerScreenRelativeToCanvas: Point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };

        const angle = computeRotationAngle(
          action.cardCenterScreen,
          pointerScreenRelativeToCanvas,
          e.shiftKey
        );

        setActiveRotationAngle(angle);
        updateCard(action.cardId, { rotation: angle });
      } else if (action.type === 'draw-connection') {
        const currentWorld = screenToWorld(currentScreen, viewport);
        const nearest = findNearestAnchor(currentWorld, cards, action.fromCardId, 42);
        updateDraftConnection(currentWorld, nearest);
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      setAlignmentGuides({ vertical: null, horizontal: null });
      if (transformActionRef.current.type === 'draw-frame') {
        const action = transformActionRef.current;
        if (action.startPointerWorld && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const pointerScreen: Point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
          const currentWorld = screenToWorld(pointerScreen, viewport);
          const minX = Math.min(action.startPointerWorld.x, currentWorld.x);
          const maxX = Math.max(action.startPointerWorld.x, currentWorld.x);
          const minY = Math.min(action.startPointerWorld.y, currentWorld.y);
          const maxY = Math.max(action.startPointerWorld.y, currentWorld.y);

          if (maxX - minX > 40 && maxY - minY > 40) {
            addFrame('New Section', undefined, {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
            });
          }
        }
        setFrameDrawBox(null);
        setActiveTool('select');
      }
      if (transformActionRef.current.type === 'marquee') {
        const action = transformActionRef.current;
        if (action.startPointerWorld && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const pointerScreen: Point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
          const currentWorld = screenToWorld(pointerScreen, viewport);
          const minX = Math.min(action.startPointerWorld.x, currentWorld.x);
          const maxX = Math.max(action.startPointerWorld.x, currentWorld.x);
          const minY = Math.min(action.startPointerWorld.y, currentWorld.y);
          const maxY = Math.max(action.startPointerWorld.y, currentWorld.y);

          if (maxX - minX > 4 || maxY - minY > 4) {
            const allCards = useCanvasStore.getState().cards;
            const intersectingIds = Object.values(allCards)
              .filter((card) => {
                return (
                  card.x < maxX &&
                  card.x + card.width > minX &&
                  card.y < maxY &&
                  card.y + card.height > minY
                );
              })
              .map((c) => c.id);

            if (e.shiftKey) {
              const currentIds = useCanvasStore.getState().selectedCardIds;
              const unionIds = Array.from(new Set([...currentIds, ...intersectingIds]));
              setSelectedCardIds(unionIds);
            } else {
              setSelectedCardIds(intersectingIds);
            }
          }
        }
        setMarqueeBox(null);
      }
      if (transformActionRef.current.type === 'draw-connection') {
        completeDraftConnection();
      }
      if (transformActionRef.current.type !== 'idle') {
        transformActionRef.current = { type: 'idle' };
        setActiveActionType('idle');
        setIsPanning(false);
        setActiveRotationAngle(undefined);
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [
    panBy,
    updateCard,
    moveCards,
    addFrame,
    updateFrame,
    moveFrameWithContainedCards,
    setSelectedCardIds,
    setActiveTool,
    viewport,
    cards,
    setIsPanning,
    updateDraftConnection,
    completeDraftConnection,
  ]);

  const getCursorClass = () => {
    if (isPanning) return 'cursor-grabbing';
    if (isSpacePressed || activeTool === 'hand') return 'cursor-grab';
    if (activeTool === 'frame') return 'cursor-crosshair';
    return 'cursor-default';
  };

  const collapsedFrames = Object.values(frames).filter((f) => f.collapsed);
  const isCardHiddenByCollapsedFrame = (card: CanvasCard) => {
    const cx = card.x + card.width / 2;
    const cy = card.y + card.height / 2;
    return collapsedFrames.some(
      (f) => cx >= f.x && cx <= f.x + f.width && cy >= f.y && cy <= f.y + f.height
    );
  };

  const gridStep = 40 * viewport.zoom;
  const gridOffsetX = ((viewport.x % gridStep) + gridStep) % gridStep;
  const gridOffsetY = ((viewport.y % gridStep) + gridStep) % gridStep;

  return (
    <div
      ref={containerRef}
      onPointerDown={handleCanvasPointerDown}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative w-full h-full overflow-hidden select-none touch-none bg-[#F8F7F4] ${getCursorClass()}`}
    >
      {/* Infinite Grid Background (SVG Pattern) */}
      {showGrid && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="infinite-dots-grid"
              width={gridStep}
              height={gridStep}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${gridOffsetX}, ${gridOffsetY})`}
            >
              <circle
                cx={gridStep / 2}
                cy={gridStep / 2}
                r={clamp(1.1 * Math.sqrt(viewport.zoom), 0.75, 2.0)}
                fill="rgba(24, 24, 27, 0.14)"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#infinite-dots-grid)" />
        </svg>
      )}

      {/* World Canvas Container */}
      <div
        id="world-canvas-container"
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: isPanning ? 'none' : 'auto',
        }}
      >
        {/* Canvas Frames / Grouping Sections (renders behind standard cards) */}
        {Object.values(frames).map((frame) => (
          <CanvasFrameItem
            key={frame.id}
            frame={frame}
            isSelected={frame.id === selectedFrameId}
            onSelect={() => selectFrame(frame.id)}
            onStartDrag={handleFrameDragStart}
            onResizeHandlePointerDown={handleFrameResizeHandleStart}
          />
        ))}

        {/* SVG Connection Layer (underneath interactive cards) */}
        <ConnectionLayer />

        {/* Render Cards in World Coordinate Space */}
        {Object.values(cards)
          .filter((card) => !isCardHiddenByCollapsedFrame(card))
          .map((card: CanvasCard) => {
            const isSelected = selectedCardIds.includes(card.id) || card.id === selectedCardId;
            return (
              <CanvasCardItem
                key={card.id}
                card={card}
                isSelected={isSelected}
                isResizing={isSelected && isResizing}
                isRotating={isSelected && isRotating}
                currentAngle={isSelected && isRotating ? activeRotationAngle : undefined}
                onSelect={(e) => selectCard(card.id, e.shiftKey)}
                onStartDrag={handleCardDragStart}
                onResizeHandlePointerDown={handleResizeHandleStart}
                onRotateHandlePointerDown={handleRotateHandleStart}
                onAnchorDraftStart={handleAnchorDraftStart}
              />
            );
          })}

        {/* Smart Alignment Guides */}
        {alignmentGuides.vertical !== null && (
          <div
            style={{
              position: 'absolute',
              left: `${alignmentGuides.vertical}px`,
              top: '-10000px',
              width: '1px',
              height: '20000px',
              pointerEvents: 'none',
              zIndex: 9998,
            }}
            className="border-l border-dashed border-[#C93B1D]"
          />
        )}
        {alignmentGuides.horizontal !== null && (
          <div
            style={{
              position: 'absolute',
              top: `${alignmentGuides.horizontal}px`,
              left: '-10000px',
              height: '1px',
              width: '20000px',
              pointerEvents: 'none',
              zIndex: 9998,
            }}
            className="border-t border-dashed border-[#C93B1D]"
          />
        )}

        {/* Drag-to-Create Frame Preview Box */}
        {frameDrawBox && (frameDrawBox.width > 4 || frameDrawBox.height > 4) && (
          <div
            style={{
              position: 'absolute',
              left: `${frameDrawBox.x}px`,
              top: `${frameDrawBox.y}px`,
              width: `${frameDrawBox.width}px`,
              height: `${frameDrawBox.height}px`,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
            className="border-[1.5px] border-dashed border-[#C93B1D] bg-[#C93B1D]/5 rounded-2xl pointer-events-none"
          />
        )}

        {/* Rubber-band Marquee Selection Box */}
        {marqueeBox && (marqueeBox.width > 2 || marqueeBox.height > 2) && (
          <div
            id="rubber-band-marquee"
            style={{
              position: 'absolute',
              left: `${marqueeBox.x}px`,
              top: `${marqueeBox.y}px`,
              width: `${marqueeBox.width}px`,
              height: `${marqueeBox.height}px`,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
            className="border-[1.5px] border-[#C93B1D] bg-[#C93B1D]/8 rounded pointer-events-none"
          />
        )}
      </div>

      {/* Empty Board Onboarding / Starter Templates */}
      <EmptyBoardOverlay />

      {/* Floating Selection Bar (Tidy Grid, Align Row/Col, Color Swatches, Bulk Delete) */}
      <FloatingSelectionBar />

      {/* Floating Connection Styling Popover (Solid/Dashed/Dotted, Color, Label, Delete) */}
      <ConnectionPopover />

      {/* Visual File Drop Indicator Overlay */}
      {isDraggingFilesOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-[#F8F7F4]/80 backdrop-blur-sm pointer-events-none animate-in fade-in duration-150">
          <div className="w-full max-w-xl p-10 rounded-3xl border-2 border-dashed border-[#C93B1D] bg-[#FFFFFF] shadow-xl flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#C93B1D]/10 text-[#C93B1D] flex items-center justify-center animate-bounce">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#18181B] tracking-tight">
                Drop Media to Add to Board
              </h3>
              <p className="text-sm text-[#52525B] mt-1">
                Release anywhere to place at cursor
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1EFEA] text-xs font-medium text-[#18181B]">
                <ImageIcon className="w-3.5 h-3.5 text-[#C93B1D]" />
                Images
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1EFEA] text-xs font-medium text-[#18181B]">
                <Video className="w-3.5 h-3.5 text-[#C93B1D]" />
                Videos
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1EFEA] text-xs font-medium text-[#18181B]">
                <Music className="w-3.5 h-3.5 text-[#C93B1D]" />
                Audio
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
