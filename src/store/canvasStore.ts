import { create } from 'zustand';
import type {
  AnchorPosition,
  AspectRatioPreset,
  BoardSummary,
  CanvasCard,
  CanvasFrame,
  CanvasTool,
  CardType,
  Connection,
  DraftConnection,
  LoopRange,
  Point,
  TimestampBookmark,
  Viewport,
} from '../types/canvas';
import {
  INITIAL_CONNECTIONS,
  INITIAL_FRAMES,
  INITIAL_MOCK_CARDS,
  INITIAL_VIEWPORT,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
} from '../constants/canvas';
import { clamp, screenToWorld } from '../utils/coordinates';
import { db } from '../db/database';
import { mediaService } from '../services/mediaService';
import { computeAutoArrangePositions, type CardLayoutItem } from '../utils/layout';
import { parseMediaUrl } from '../utils/urlParser';
import { exportProject, importProject } from '../services/projectService';
import { captureCanvasSnapshot, type SnapshotOptions } from '../services/snapshotService';

interface CanvasState {
  // Viewport
  viewport: Viewport;
  activeTool: CanvasTool;
  isSpacePressed: boolean;
  isPanning: boolean;
  showGrid: boolean;

  // Drag-and-drop file hover state
  isDraggingFilesOver: boolean;

  // Save / Hydration status
  isInitialized: boolean;
  saveStatus: 'saved' | 'saving';
  notification: { message: string; type: 'success' | 'info' | 'error' } | null;

  // Workspace / Multi-board Projects
  activeView: 'projects' | 'canvas';
  currentBoardId: string;
  boardTitle: string;
  availableBoards: BoardSummary[];
  openProject: (boardId: string) => Promise<void>;
  goToProjects: () => Promise<void>;
  loadAvailableBoards: () => Promise<void>;
  switchBoard: (boardId: string) => Promise<void>;
  createBoard: (title?: string) => Promise<string>;
  renameBoard: (boardId: string, newTitle: string) => Promise<void>;
  duplicateBoard: (boardId: string) => Promise<string>;
  deleteBoard: (boardId: string) => Promise<void>;
  captureSnapshot: (options?: SnapshotOptions) => Promise<void>;

  // Cards & Multi-selection
  cards: Record<string, CanvasCard>;
  selectedCardId: string | null;
  selectedCardIds: string[];
  editingCardId: string | null;
  maxZIndex: number;

  // Frames (Sections / Groups)
  frames: Record<string, CanvasFrame>;
  selectedFrameId: string | null;

  // Lifecycle & Persistence
  initDB: () => Promise<void>;
  saveToDB: () => Promise<void>;
  clearNotification: () => void;
  exportBoard: () => Promise<void>;
  importBoard: (file: File | Blob) => Promise<void>;

  // Viewport Actions
  setViewport: (viewport: Partial<Viewport>) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (screenX: number, screenY: number, zoomFactorDelta: number) => void;
  zoomIn: (centerScreen?: Point) => void;
  zoomOut: (centerScreen?: Point) => void;
  setZoomPercent: (percent: number, centerScreen?: Point) => void;
  resetViewport: () => void;
  fitToView: (containerWidth: number, containerHeight: number) => void;

  // Interaction modes & theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setActiveTool: (tool: CanvasTool) => void;
  setSpacePressed: (pressed: boolean) => void;
  setIsPanning: (panning: boolean) => void;
  toggleGrid: () => void;
  setIsDraggingFilesOver: (dragging: boolean) => void;

  // Card Operations & Multi-selection
  selectCard: (id: string | null, isShiftKey?: boolean, bringToTop?: boolean) => void;
  setSelectedCardIds: (ids: string[]) => void;
  clearSelection: () => void;
  moveCards: (moves: Record<string, Point>) => void;
  setSelectionColor: (color: string) => void;
  deleteSelectedCards: () => Promise<void>;
  tidySelectionGrid: () => void;
  alignSelectionRow: () => void;
  alignSelectionColumn: () => void;
  setEditingCardId: (id: string | null) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  updateCard: (id: string, updates: Partial<CanvasCard>) => void;
  addCard: (type: CardType, screenCenter?: Point) => string;
  deleteCard: (id: string) => Promise<void>;
  duplicateCard: (id: string) => string | null;

  // Frames Operations
  addFrame: (
    title?: string,
    screenCenter?: Point,
    bounds?: { x: number; y: number; width: number; height: number }
  ) => string;
  updateFrame: (id: string, updates: Partial<CanvasFrame>) => void;
  deleteFrame: (id: string) => void;
  selectFrame: (id: string | null) => void;
  focusFrame: (frameId: string, containerWidth: number, containerHeight: number) => void;
  tidyFrameCards: (frameId: string) => void;
  toggleFrameCollapse: (frameId: string) => void;
  moveFrameWithContainedCards: (
    frameId: string,
    newPos: Point,
    containedCardInitialPositions: Record<string, Point>,
    delta: Point
  ) => void;

  // Undo / Redo History
  historyPast: Array<{
    cards: Record<string, CanvasCard>;
    frames: Record<string, CanvasFrame>;
    connections: Connection[];
  }>;
  historyFuture: Array<{
    cards: Record<string, CanvasCard>;
    frames: Record<string, CanvasFrame>;
    connections: Connection[];
  }>;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Milestone 4 Connections
  connections: Connection[];
  selectedConnectionId: string | null;
  draftConnection: DraftConnection | null;

  addConnection: (connection: Omit<Connection, 'id'>) => string;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  selectConnection: (id: string | null) => void;
  startDraftConnection: (fromCardId: string, fromAnchor: AnchorPosition, startPointerWorld: Point) => void;
  updateDraftConnection: (currentPointerWorld: Point, targetSnap?: { cardId: string; anchor: AnchorPosition; point: Point } | null) => void;
  completeDraftConnection: () => void;
  cancelDraftConnection: () => void;

  // Milestone 2 Ingestion
  ingestMediaFiles: (files: File[], screenPos?: Point) => Promise<string[]>;
  ingestMediaUrl: (url: string, screenPos?: Point) => Promise<string | null>;

  // Video Timestamps, A/B Loop & Aspect Presets
  pinVideoTimestamp: (cardId: string, time: number) => { bookmarkId: string; noteId: string } | null;
  deleteBookmark: (cardId: string, bookmarkId: string) => void;
  seekMedia: (cardId: string, time: number) => void;
  setLoopRange: (cardId: string, loopRange: LoopRange) => void;
  setCardAspectRatio: (cardId: string, preset: AspectRatioPreset) => void;
  autoSyncMediaAspectRatio: (cardId: string, naturalWidth: number, naturalHeight: number) => void;
}

// Debounce timer for saving to IndexedDB
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let idSeq = 0;
const uid = (prefix: string) => `${prefix}-${Date.now()}-${++idSeq}`;

const scheduleAutoSave = (get: () => CanvasState, set: (s: Partial<CanvasState> | ((prev: CanvasState) => Partial<CanvasState>)) => void) => {
  set({ saveStatus: 'saving' });
  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(async () => {
    try {
      const state = get();
      if (!state.isInitialized) return;

      const boardId = state.currentBoardId || 'default-board';
      const boardTitle = state.boardTitle || 'Spatial Moodboard';
      const now = Date.now();

      const existing = await db.boards.get(boardId);
      await db.boards.put({
        id: boardId,
        title: boardTitle,
        viewport: state.viewport,
        cards: state.cards,
        connections: state.connections,
        frames: state.frames,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      });
      set({ saveStatus: 'saved' });

      // Update cardCount and updatedAt in availableBoards
      set((prev) => ({
        availableBoards: prev.availableBoards.map((b) =>
          b.id === boardId
            ? { ...b, cardCount: Object.keys(state.cards).length, updatedAt: now }
            : b
        ),
      }));
    } catch (err) {
      console.error('Failed to auto-save to IndexedDB:', err);
      set({ saveStatus: 'saved' });
    }
  }, 400);
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  viewport: INITIAL_VIEWPORT,
  activeTool: 'select',
  isSpacePressed: false,
  isPanning: false,
  showGrid: true,
  isDraggingFilesOver: false,

  isInitialized: false,
  saveStatus: 'saved',
  notification: null,

  theme:
    typeof localStorage !== 'undefined' && localStorage.getItem('storyboarder-theme') === 'dark'
      ? 'dark'
      : 'light',
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('storyboarder-theme', next);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next === 'dark');
    }
    set({ theme: next });
  },

  activeView: 'projects',
  currentBoardId: 'default-board',
  boardTitle: 'Visual Studies',
  availableBoards: [
    {
      id: 'default-board',
      title: 'Visual Studies',
      updatedAt: Date.now(),
      cardCount: Object.keys(INITIAL_MOCK_CARDS).length,
    },
  ],

  cards: INITIAL_MOCK_CARDS,
  selectedCardId: null,
  selectedCardIds: [],
  editingCardId: null,
  maxZIndex: Object.keys(INITIAL_MOCK_CARDS).length,

  frames: INITIAL_FRAMES,
  selectedFrameId: null,

  // Milestone 4 Connections initial state
  connections: INITIAL_CONNECTIONS,
  selectedConnectionId: null,
  draftConnection: null,

  // Undo / Redo History initial state
  historyPast: [],
  historyFuture: [],

  pushHistory: () => {
    const { cards, frames, connections, historyPast } = get();
    const snapshot = {
      cards: structuredClone(cards),
      frames: structuredClone(frames),
      connections: structuredClone(connections),
    };
    const nextPast = [...historyPast, snapshot].slice(-40);
    set({
      historyPast: nextPast,
      historyFuture: [],
    });
  },

  undo: () => {
    const { historyPast, historyFuture, cards, frames, connections } = get();
    if (historyPast.length === 0) return;

    const previous = historyPast[historyPast.length - 1];
    const currentSnapshot = {
      cards: structuredClone(cards),
      frames: structuredClone(frames),
      connections: structuredClone(connections),
    };

    set({
      cards: previous.cards,
      frames: previous.frames,
      connections: previous.connections,
      historyPast: historyPast.slice(0, -1),
      historyFuture: [currentSnapshot, ...historyFuture].slice(0, 40),
      selectedCardId: null,
      selectedCardIds: [],
      selectedFrameId: null,
      selectedConnectionId: null,
      notification: { message: 'Undid last action', type: 'info' },
    });
    scheduleAutoSave(get, set);
  },

  redo: () => {
    const { historyPast, historyFuture, cards, frames, connections } = get();
    if (historyFuture.length === 0) return;

    const next = historyFuture[0];
    const currentSnapshot = {
      cards: structuredClone(cards),
      frames: structuredClone(frames),
      connections: structuredClone(connections),
    };

    set({
      cards: next.cards,
      frames: next.frames,
      connections: next.connections,
      historyPast: [...historyPast, currentSnapshot].slice(-40),
      historyFuture: historyFuture.slice(1),
      selectedCardId: null,
      selectedCardIds: [],
      selectedFrameId: null,
      selectedConnectionId: null,
      notification: { message: 'Redid action', type: 'info' },
    });
    scheduleAutoSave(get, set);
  },

  clearNotification: () => set({ notification: null }),

  initDB: async () => {
    if (get().isInitialized) return;
    try {
      const allBoards = await db.boards.toArray();
      const summaries: BoardSummary[] = allBoards.map((b) => ({
        id: b.id,
        title: b.title || 'Untitled Project',
        updatedAt: b.updatedAt || Date.now(),
        cardCount: b.cards ? Object.keys(b.cards).length : 0,
        createdAt: b.createdAt,
      })).sort((a, b) => b.updatedAt - a.updatedAt);

      const lastBoardId = typeof localStorage !== 'undefined'
        ? localStorage.getItem('musaic-active-board-id')
        : null;

      let targetBoard = allBoards.find((b) => b.id === lastBoardId);
      if (!targetBoard && allBoards.length > 0) {
        targetBoard = allBoards.find((b) => b.id === 'default-board') ||
          (summaries[0] && allBoards.find((b) => b.id === summaries[0].id));
      }

      if (targetBoard) {
        // Hydrate active object URLs for any stored blobIds
        const hydratedCards: Record<string, CanvasCard> = { ...(targetBoard.cards || {}) };

        for (const card of Object.values(hydratedCards)) {
          if (card.blobId) {
            const liveUrl = await mediaService.getObjectUrl(card.blobId);
            if (liveUrl) {
              card.url = liveUrl;
            }
          }
        }

        const maxZ = Math.max(
          ...Object.values(hydratedCards).map((c) => c.zIndex || 1),
          1
        );

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('musaic-active-board-id', targetBoard.id);
        }

        set({
          currentBoardId: targetBoard.id,
          boardTitle: targetBoard.title || 'Untitled Project',
          availableBoards: summaries.length > 0 ? summaries : [
            {
              id: targetBoard.id,
              title: targetBoard.title || 'Untitled Project',
              updatedAt: targetBoard.updatedAt || Date.now(),
              cardCount: Object.keys(hydratedCards).length,
            },
          ],
          viewport: targetBoard.viewport || INITIAL_VIEWPORT,
          cards: hydratedCards,
          connections: targetBoard.connections ?? [],
          frames: targetBoard.frames ?? {},
          maxZIndex: maxZ,
          selectedCardId: null,
          selectedCardIds: [],
          selectedConnectionId: null,
          selectedFrameId: null,
          draftConnection: null,
          isInitialized: true,
          saveStatus: 'saved',
        });
      } else {
        // First run or empty DB: persist initial mock cards, connections and frames
        const initialBoardId = 'default-board';
        const initialTitle = 'Visual Studies';
        await db.boards.put({
          id: initialBoardId,
          title: initialTitle,
          viewport: INITIAL_VIEWPORT,
          cards: INITIAL_MOCK_CARDS,
          connections: INITIAL_CONNECTIONS,
          frames: INITIAL_FRAMES,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const initialSummary: BoardSummary = {
          id: initialBoardId,
          title: initialTitle,
          updatedAt: Date.now(),
          cardCount: Object.keys(INITIAL_MOCK_CARDS).length,
          createdAt: Date.now(),
        };

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('musaic-active-board-id', initialBoardId);
        }

        set({
          currentBoardId: initialBoardId,
          boardTitle: initialTitle,
          availableBoards: [initialSummary],
          cards: INITIAL_MOCK_CARDS,
          connections: INITIAL_CONNECTIONS,
          frames: INITIAL_FRAMES,
          selectedCardId: null,
          selectedCardIds: [],
          selectedConnectionId: null,
          selectedFrameId: null,
          draftConnection: null,
          isInitialized: true,
          saveStatus: 'saved',
        });
      }
    } catch (err) {
      console.error('Failed to initialize IndexedDB:', err);
      set({ isInitialized: true });
    }
  },

  saveToDB: async () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    const { currentBoardId, boardTitle, viewport, cards, connections, frames, isInitialized } = get();
    if (!isInitialized || !currentBoardId) return;

    set({ saveStatus: 'saving' });
    try {
      const now = Date.now();
      const existing = await db.boards.get(currentBoardId);
      await db.boards.put({
        id: currentBoardId,
        title: boardTitle || 'Untitled Project',
        viewport,
        cards,
        connections,
        frames,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      });
      set({ saveStatus: 'saved' });

      // Refresh available boards
      const allBoards = await db.boards.toArray();
      const summaries: BoardSummary[] = allBoards.map((b) => ({
        id: b.id,
        title: b.title || 'Untitled Project',
        updatedAt: b.updatedAt || Date.now(),
        cardCount: b.cards ? Object.keys(b.cards).length : 0,
        createdAt: b.createdAt,
      })).sort((a, b) => b.updatedAt - a.updatedAt);
      set({ availableBoards: summaries });
    } catch (err) {
      console.error('Save to DB failed:', err);
      set({ saveStatus: 'saved' });
    }
  },

  openProject: async (boardId: string) => {
    const state = get();
    if (boardId !== state.currentBoardId) {
      await get().switchBoard(boardId);
    }
    set({ activeView: 'canvas', notification: null });
  },

  goToProjects: async () => {
    await get().saveToDB();
    set({
      activeView: 'projects',
      selectedCardId: null,
      selectedCardIds: [],
      selectedFrameId: null,
      selectedConnectionId: null,
      editingCardId: null,
    });
  },

  setViewport: (updates) => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        ...updates,
        zoom:
          updates.zoom !== undefined
            ? clamp(updates.zoom, MIN_ZOOM, MAX_ZOOM)
            : state.viewport.zoom,
      },
    }));
    scheduleAutoSave(get, set);
  },

  panBy: (dx, dy) => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        x: state.viewport.x + dx,
        y: state.viewport.y + dy,
      },
    }));
    scheduleAutoSave(get, set);
  },

  zoomAt: (screenX, screenY, zoomFactorDelta) => {
    set((state) => {
      const currentZoom = state.viewport.zoom;
      const newZoom = clamp(currentZoom * (1 + zoomFactorDelta), MIN_ZOOM, MAX_ZOOM);

      if (newZoom === currentZoom) return state;

      const worldX = (screenX - state.viewport.x) / currentZoom;
      const worldY = (screenY - state.viewport.y) / currentZoom;

      const newViewportX = screenX - worldX * newZoom;
      const newViewportY = screenY - worldY * newZoom;

      return {
        viewport: {
          x: newViewportX,
          y: newViewportY,
          zoom: newZoom,
        },
      };
    });
    scheduleAutoSave(get, set);
  },

  zoomIn: (centerScreen) => {
    const { zoomAt } = get();
    const cx = centerScreen ? centerScreen.x : window.innerWidth / 2;
    const cy = centerScreen ? centerScreen.y : window.innerHeight / 2;
    zoomAt(cx, cy, ZOOM_STEP);
  },

  zoomOut: (centerScreen) => {
    const { zoomAt } = get();
    const cx = centerScreen ? centerScreen.x : window.innerWidth / 2;
    const cy = centerScreen ? centerScreen.y : window.innerHeight / 2;
    zoomAt(cx, cy, -ZOOM_STEP);
  },

  setZoomPercent: (percent, centerScreen) => {
    const targetZoom = clamp(percent / 100, MIN_ZOOM, MAX_ZOOM);
    const { viewport } = get();
    const cx = centerScreen ? centerScreen.x : window.innerWidth / 2;
    const cy = centerScreen ? centerScreen.y : window.innerHeight / 2;

    const worldX = (cx - viewport.x) / viewport.zoom;
    const worldY = (cy - viewport.y) / viewport.zoom;

    set({
      viewport: {
        x: cx - worldX * targetZoom,
        y: cy - worldY * targetZoom,
        zoom: targetZoom,
      },
    });
    scheduleAutoSave(get, set);
  },

  resetViewport: () => {
    set({
      viewport: {
        x: window.innerWidth / 2 - 450,
        y: window.innerHeight / 2 - 300,
        zoom: 1.0,
      },
    });
    scheduleAutoSave(get, set);
  },

  fitToView: (containerWidth, containerHeight) => {
    const { cards, frames } = get();
    const cardList = Object.values(cards);
    const frameList = Object.values(frames || {});
    if (cardList.length === 0 && frameList.length === 0) {
      set({ viewport: { x: containerWidth / 2, y: containerHeight / 2, zoom: 1 } });
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const card of cardList) {
      minX = Math.min(minX, card.x);
      minY = Math.min(minY, card.y);
      maxX = Math.max(maxX, card.x + card.width);
      maxY = Math.max(maxY, card.y + card.height);
    }

    for (const frame of frameList) {
      minX = Math.min(minX, frame.x);
      minY = Math.min(minY, frame.y);
      maxX = Math.max(maxX, frame.x + frame.width);
      maxY = Math.max(maxY, frame.y + frame.height);
    }

    const padding = 120;
    const boardWidth = maxX - minX + padding * 2;
    const boardHeight = maxY - minY + padding * 2;

    const zoomX = containerWidth / boardWidth;
    const zoomY = containerHeight / boardHeight;
    const targetZoom = clamp(Math.min(zoomX, zoomY), MIN_ZOOM, 1.2);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    set({
      viewport: {
        x: containerWidth / 2 - centerX * targetZoom,
        y: containerHeight / 2 - centerY * targetZoom,
        zoom: targetZoom,
      },
    });
    scheduleAutoSave(get, set);
  },

  setActiveTool: (tool) => set({ activeTool: tool }),
  setSpacePressed: (pressed) => set({ isSpacePressed: pressed }),
  setIsPanning: (panning) => set({ isPanning: panning }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  setIsDraggingFilesOver: (dragging) => set({ isDraggingFilesOver: dragging }),

  selectCard: (id, isShiftKey = false, bringToTop = true) => {
    const currentEditing = get().editingCardId;
    const nextEditing = currentEditing === id ? currentEditing : null;
    const { selectedCardIds, bringToFront } = get();

    if (!id) {
      set({
        selectedCardId: null,
        selectedCardIds: [],
        selectedConnectionId: null,
        selectedFrameId: null,
        editingCardId: nextEditing,
      });
      return;
    }

    if (isShiftKey) {
      const isAlreadySelected = selectedCardIds.includes(id);
      const nextIds = isAlreadySelected
        ? selectedCardIds.filter((cid) => cid !== id)
        : [...selectedCardIds, id];
      set({
        selectedCardIds: nextIds,
        selectedCardId: nextIds[nextIds.length - 1] || null,
        selectedConnectionId: null,
        selectedFrameId: null,
        editingCardId: nextEditing,
      });
    } else {
      if (bringToTop) {
        bringToFront(id);
      }
      const isAlreadyInMultiSelect = selectedCardIds.includes(id) && selectedCardIds.length > 1;
      set({
        selectedCardIds: isAlreadyInMultiSelect ? selectedCardIds : [id],
        selectedCardId: id,
        selectedConnectionId: null,
        selectedFrameId: null,
        editingCardId: nextEditing,
      });
    }
  },

  setSelectedCardIds: (ids) => {
    set({
      selectedCardIds: ids,
      selectedCardId: ids[ids.length - 1] || null,
      selectedConnectionId: null,
      selectedFrameId: null,
    });
  },

  clearSelection: () => {
    set({
      selectedCardIds: [],
      selectedCardId: null,
      selectedConnectionId: null,
      selectedFrameId: null,
      editingCardId: null,
    });
  },

  moveCards: (moves) => {
    set((state) => {
      const nextCards = { ...state.cards };
      for (const [id, pos] of Object.entries(moves)) {
        if (nextCards[id]) {
          nextCards[id] = {
            ...nextCards[id],
            x: Math.round(pos.x),
            y: Math.round(pos.y),
          };
        }
      }
      return { cards: nextCards };
    });
    scheduleAutoSave(get, set);
  },

  setSelectionColor: (color) => {
    const { selectedCardIds, cards } = get();
    if (selectedCardIds.length === 0) return;
    const nextCards = { ...cards };
    for (const id of selectedCardIds) {
      if (nextCards[id]) {
        nextCards[id] = { ...nextCards[id], color };
      }
    }
    set({
      cards: nextCards,
      notification: {
        message: `Applied accent color to ${selectedCardIds.length} card(s)`,
        type: 'success',
      },
    });
    scheduleAutoSave(get, set);
  },

  deleteSelectedCards: async () => {
    const { selectedCardIds, cards, connections } = get();
    if (selectedCardIds.length === 0) return;
    get().pushHistory();

    const nextCards = { ...cards };
    for (const id of selectedCardIds) {
      const card = nextCards[id];
      if (card?.blobId) {
        await mediaService.deleteMediaBlob(card.blobId);
      }
      delete nextCards[id];
    }

    const selectedSet = new Set(selectedCardIds);
    const nextConnections = connections.filter(
      (c) => !selectedSet.has(c.fromCardId) && !selectedSet.has(c.toCardId)
    );

    set({
      cards: nextCards,
      connections: nextConnections,
      selectedCardIds: [],
      selectedCardId: null,
      editingCardId: null,
      notification: {
        message: `Deleted ${selectedCardIds.length} card(s)`,
        type: 'info',
      },
    });
    scheduleAutoSave(get, set);
  },

  tidySelectionGrid: () => {
    const { selectedCardIds, cards } = get();
    const selected = selectedCardIds.map((id) => cards[id]).filter(Boolean);
    if (selected.length < 2) return;

    // 1. Sort selected cards by current Y then X position
    const sorted = [...selected].sort((a, b) => {
      if (Math.abs(a.y - b.y) > 30) {
        return a.y - b.y;
      }
      return a.x - b.x;
    });

    const minX = Math.min(...selected.map((c) => c.x));
    const minY = Math.min(...selected.map((c) => c.y));
    const cols = Math.ceil(Math.sqrt(sorted.length));
    const padding = 24;

    // Compute column widths and row heights so cards NEVER overlap
    const colWidths: number[] = new Array(cols).fill(0);
    const rowHeights: number[] = [];

    sorted.forEach((card, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      colWidths[col] = Math.max(colWidths[col], card.width);
      rowHeights[row] = Math.max(rowHeights[row] || 0, card.height);
    });

    // Compute column X offsets
    const colOffsets: number[] = [0];
    for (let c = 0; c < cols - 1; c++) {
      colOffsets.push(colOffsets[c] + colWidths[c] + padding);
    }

    // Compute row Y offsets
    const rowOffsets: number[] = [0];
    for (let r = 0; r < rowHeights.length - 1; r++) {
      rowOffsets.push(rowOffsets[r] + rowHeights[r] + padding);
    }

    const updates: Record<string, CanvasCard> = { ...cards };
    sorted.forEach((card, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      updates[card.id] = {
        ...card,
        x: Math.round(minX + colOffsets[col]),
        y: Math.round(minY + rowOffsets[row]),
      };
    });

    set({
      cards: updates,
      notification: {
        message: `Arranged ${selected.length} cards into tidy grid`,
        type: 'success',
      },
    });
    scheduleAutoSave(get, set);
  },

  alignSelectionRow: () => {
    const { selectedCardIds, cards } = get();
    const selected = selectedCardIds.map((id) => cards[id]).filter(Boolean);
    if (selected.length < 2) return;

    const sorted = [...selected].sort((a, b) => a.x - b.x);
    const minX = Math.min(...selected.map((c) => c.x));
    const minY = Math.min(...selected.map((c) => c.y));
    const padding = 24;

    let curX = minX;
    const updates: Record<string, CanvasCard> = { ...cards };
    sorted.forEach((card) => {
      updates[card.id] = {
        ...card,
        x: Math.round(curX),
        y: Math.round(minY),
      };
      curX += card.width + padding;
    });

    set({
      cards: updates,
      notification: {
        message: `Aligned ${selected.length} cards horizontally`,
        type: 'success',
      },
    });
    scheduleAutoSave(get, set);
  },

  alignSelectionColumn: () => {
    const { selectedCardIds, cards } = get();
    const selected = selectedCardIds.map((id) => cards[id]).filter(Boolean);
    if (selected.length < 2) return;

    const sorted = [...selected].sort((a, b) => a.y - b.y);
    const minX = Math.min(...selected.map((c) => c.x));
    const minY = Math.min(...selected.map((c) => c.y));
    const padding = 24;

    let curY = minY;
    const updates: Record<string, CanvasCard> = { ...cards };
    sorted.forEach((card) => {
      updates[card.id] = {
        ...card,
        x: Math.round(minX),
        y: Math.round(curY),
      };
      curY += card.height + padding;
    });

    set({
      cards: updates,
      notification: {
        message: `Aligned ${selected.length} cards vertically`,
        type: 'success',
      },
    });
    scheduleAutoSave(get, set);
  },

  setEditingCardId: (id) => set({ editingCardId: id }),

  bringToFront: (id) => {
    set((state) => {
      const card = state.cards[id];
      if (!card) return state;

      const nextZIndex = state.maxZIndex + 1;
      return {
        selectedCardId: id,
        maxZIndex: nextZIndex,
        cards: {
          ...state.cards,
          [id]: {
            ...card,
            zIndex: nextZIndex,
          },
        },
      };
    });
    scheduleAutoSave(get, set);
  },

  sendToBack: (id) => {
    set((state) => {
      const card = state.cards[id];
      if (!card) return state;

      const minZ = Math.min(...Object.values(state.cards).map((c) => c.zIndex), 1);
      const newZ = Math.max(1, minZ - 1);

      return {
        cards: {
          ...state.cards,
          [id]: {
            ...card,
            zIndex: newZ,
          },
        },
      };
    });
    scheduleAutoSave(get, set);
  },

  updateCard: (id, updates) => {
    set((state) => {
      const card = state.cards[id];
      if (!card) return state;

      return {
        cards: {
          ...state.cards,
          [id]: {
            ...card,
            ...updates,
          },
        },
      };
    });
    scheduleAutoSave(get, set);
  },

  addCard: (type, screenCenter) => {
    get().pushHistory();
    const { viewport, maxZIndex } = get();
    const id = uid('card');
    const nextZ = maxZIndex + 1;

    const centerScreenX = screenCenter ? screenCenter.x : window.innerWidth / 2;
    const centerScreenY = screenCenter ? screenCenter.y : window.innerHeight / 2;

    const worldCenterX = (centerScreenX - viewport.x) / viewport.zoom;
    const worldCenterY = (centerScreenY - viewport.y) / viewport.zoom;

    let defaultWidth = 320;
    let defaultHeight = 220;
    let defaultTitle = 'Note';
    let defaultColor: string | undefined = undefined;
    let defaultContent = '';
    let defaultUrl: string | undefined;
    let tags: string[] = [];

    switch (type) {
      case 'note':
        defaultTitle = 'Note';
        defaultWidth = 300;
        defaultHeight = 210;
        defaultContent = '<p>Write your thoughts here...</p>';
        break;
      case 'image':
        defaultTitle = 'Image';
        defaultWidth = 360;
        defaultHeight = 270;
        defaultUrl = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
        break;
      case 'video':
        defaultTitle = 'Video';
        defaultWidth = 380;
        defaultHeight = 250;
        defaultUrl = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80';
        break;
      case 'audio':
        defaultTitle = 'Audio';
        defaultWidth = 320;
        defaultHeight = 160;
        break;
      case 'embed-url':
        defaultTitle = 'Link';
        defaultWidth = 360;
        defaultHeight = 200;
        defaultUrl = 'https://dribbble.com';
        break;
    }

    const jitter = (Math.random() - 0.5) * 40;

    const newCard: CanvasCard = {
      id,
      type,
      title: defaultTitle,
      x: Math.round(worldCenterX - defaultWidth / 2 + jitter),
      y: Math.round(worldCenterY - defaultHeight / 2 + jitter),
      width: defaultWidth,
      height: defaultHeight,
      rotation: 0,
      zIndex: nextZ,
      color: defaultColor,
      content: defaultContent,
      url: defaultUrl,
      tags,
    };

    set((state) => ({
      cards: {
        ...state.cards,
        [id]: newCard,
      },
      selectedCardId: id,
      maxZIndex: nextZ,
    }));

    scheduleAutoSave(get, set);
    return id;
  },

  deleteCard: async (id) => {
    get().pushHistory();
    const card = get().cards[id];
    if (card?.blobId) {
      await mediaService.deleteMediaBlob(card.blobId);
    }

    set((state) => {
      const nextCards = { ...state.cards };
      delete nextCards[id];

      // Cascade remove any connections referencing this card
      const nextConnections = state.connections.filter(
        (c) => c.fromCardId !== id && c.toCardId !== id
      );
      const nextSelectedConn =
        state.selectedConnectionId &&
        !nextConnections.some((c) => c.id === state.selectedConnectionId)
          ? null
          : state.selectedConnectionId;

      return {
        cards: nextCards,
        connections: nextConnections,
        selectedCardId: state.selectedCardId === id ? null : state.selectedCardId,
        editingCardId: state.editingCardId === id ? null : state.editingCardId,
        selectedConnectionId: nextSelectedConn,
      };
    });
    scheduleAutoSave(get, set);
  },

  duplicateCard: (id) => {
    const { cards, maxZIndex } = get();
    const sourceCard = cards[id];
    if (!sourceCard) return null;
    get().pushHistory();

    const newId = uid('card');
    const nextZ = maxZIndex + 1;

    const duplicatedCard: CanvasCard = {
      ...sourceCard,
      id: newId,
      title: `${sourceCard.title} (Copy)`,
      x: sourceCard.x + 30,
      y: sourceCard.y + 30,
      zIndex: nextZ,
    };

    set((state) => ({
      cards: {
        ...state.cards,
        [newId]: duplicatedCard,
      },
      selectedCardId: newId,
      maxZIndex: nextZ,
    }));

    scheduleAutoSave(get, set);
    return newId;
  },

  // ---------------------------------------------------------------------------
  // Milestone 4 Connections: Creation, Selection & Removal
  // ---------------------------------------------------------------------------

  addConnection: (connection) => {
    const { fromCardId, fromAnchor, toCardId, toAnchor } = connection;
    // Disallow self-connections to the same card
    if (fromCardId === toCardId) return '';

    const { connections } = get();
    // Prevent duplicate connection in either direction between same anchors
    const exists = connections.some(
      (c) =>
        (c.fromCardId === fromCardId &&
          c.fromAnchor === fromAnchor &&
          c.toCardId === toCardId &&
          c.toAnchor === toAnchor) ||
        (c.fromCardId === toCardId &&
          c.fromAnchor === toAnchor &&
          c.toCardId === fromCardId &&
          c.toAnchor === fromAnchor)
    );
    if (exists) return '';

    const id = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newConn: Connection = {
      id,
      fromCardId,
      fromAnchor,
      toCardId,
      toAnchor,
      color: connection.color,
      label: connection.label,
    };

    set((state) => ({
      connections: [...state.connections, newConn],
      selectedConnectionId: id,
      selectedCardId: null,
      notification: {
        message: 'Connected cards with curved arrow',
        type: 'success',
      },
    }));

    scheduleAutoSave(get, set);
    return id;
  },

  deleteConnection: (id) => {
    get().pushHistory();
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
      selectedConnectionId: state.selectedConnectionId === id ? null : state.selectedConnectionId,
      notification: {
        message: 'Connector removed',
        type: 'info',
      },
    }));
    scheduleAutoSave(get, set);
  },

  selectConnection: (id) => {
    set({
      selectedConnectionId: id,
      selectedCardId: id ? null : get().selectedCardId,
    });
  },

  startDraftConnection: (fromCardId, fromAnchor, startPointerWorld) => {
    set({
      draftConnection: {
        fromCardId,
        fromAnchor,
        currentPointerWorld: startPointerWorld,
        targetSnap: null,
      },
      selectedConnectionId: null,
      selectedCardId: null,
    });
  },

  updateDraftConnection: (currentPointerWorld, targetSnap) => {
    set((state) => {
      if (!state.draftConnection) return state;
      return {
        draftConnection: {
          ...state.draftConnection,
          currentPointerWorld,
          targetSnap: targetSnap !== undefined ? targetSnap : state.draftConnection.targetSnap,
        },
      };
    });
  },

  completeDraftConnection: () => {
    const { draftConnection, addConnection } = get();
    if (draftConnection && draftConnection.targetSnap) {
      get().pushHistory();
      addConnection({
        fromCardId: draftConnection.fromCardId,
        fromAnchor: draftConnection.fromAnchor,
        toCardId: draftConnection.targetSnap.cardId,
        toAnchor: draftConnection.targetSnap.anchor,
      });
    }
    set({ draftConnection: null });
  },

  cancelDraftConnection: () => {
    set({ draftConnection: null });
  },

  updateConnection: (id, updates) => {
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
    scheduleAutoSave(get, set);
  },

  // ---------------------------------------------------------------------------
  // Canvas Frames (Sections / Groups)
  // ---------------------------------------------------------------------------

  addFrame: (title = 'New Section', screenCenter, bounds) => {
    get().pushHistory();
    const { viewport, frames } = get();
    const id = uid('frame');
    const width = bounds ? Math.max(240, Math.round(bounds.width)) : 640;
    const height = bounds ? Math.max(180, Math.round(bounds.height)) : 480;

    let worldX: number;
    let worldY: number;
    if (bounds) {
      worldX = bounds.x;
      worldY = bounds.y;
    } else {
      const cx = screenCenter ? screenCenter.x : window.innerWidth / 2;
      const cy = screenCenter ? screenCenter.y : window.innerHeight / 2;
      worldX = (cx - viewport.x) / viewport.zoom - width / 2;
      worldY = (cy - viewport.y) / viewport.zoom - height / 2;
    }

    const frameCount = Object.keys(frames).length;
    const newFrame: CanvasFrame = {
      id,
      title,
      x: Math.round(worldX),
      y: Math.round(worldY),
      width,
      height,
      color: '#C93B1D',
      zIndex: 0,
      collapsed: false,
      styleVariant: 'section',
      sceneNumber: frameCount + 1,
    };

    set((state) => ({
      frames: {
        ...state.frames,
        [id]: newFrame,
      },
      selectedFrameId: id,
      selectedCardIds: [],
      selectedCardId: null,
      selectedConnectionId: null,
      notification: {
        message: `Created section "${title}"`,
        type: 'success',
      },
    }));

    scheduleAutoSave(get, set);
    return id;
  },

  updateFrame: (id, updates) => {
    set((state) => {
      const frame = state.frames[id];
      if (!frame) return state;
      return {
        frames: {
          ...state.frames,
          [id]: { ...frame, ...updates },
        },
      };
    });
    scheduleAutoSave(get, set);
  },

  deleteFrame: (id) => {
    get().pushHistory();
    set((state) => {
      const nextFrames = { ...state.frames };
      delete nextFrames[id];
      return {
        frames: nextFrames,
        selectedFrameId: state.selectedFrameId === id ? null : state.selectedFrameId,
        notification: {
          message: 'Frame section removed',
          type: 'info',
        },
      };
    });
    scheduleAutoSave(get, set);
  },

  selectFrame: (id) => {
    set({
      selectedFrameId: id,
      selectedCardIds: [],
      selectedCardId: null,
      selectedConnectionId: null,
    });
  },

  focusFrame: (frameId, containerWidth, containerHeight) => {
    const frame = get().frames[frameId];
    if (!frame) return;

    const padding = 100;
    const targetH = frame.collapsed ? 64 : frame.height;
    const zoomX = containerWidth / (frame.width + padding * 2);
    const zoomY = containerHeight / (targetH + padding * 2);
    const zoom = clamp(Math.min(zoomX, zoomY), MIN_ZOOM, 1.4);

    const centerX = frame.x + frame.width / 2;
    const centerY = frame.y + targetH / 2;

    set({
      viewport: {
        x: containerWidth / 2 - centerX * zoom,
        y: containerHeight / 2 - centerY * zoom,
        zoom,
      },
      selectedFrameId: frameId,
      selectedCardIds: [],
      selectedCardId: null,
    });
    scheduleAutoSave(get, set);
  },

  toggleFrameCollapse: (frameId) => {
    const frame = get().frames[frameId];
    if (!frame) return;
    get().pushHistory();
    get().updateFrame(frameId, { collapsed: !frame.collapsed });
  },

  tidyFrameCards: (frameId) => {
    const { frames, cards } = get();
    const frame = frames[frameId];
    if (!frame) return;

    const contained = Object.values(cards).filter((c) => {
      const cx = c.x + c.width / 2;
      const cy = c.y + c.height / 2;
      return (
        cx >= frame.x &&
        cx <= frame.x + frame.width &&
        cy >= frame.y &&
        cy <= frame.y + frame.height
      );
    });

    if (contained.length === 0) {
      set({ notification: { message: 'No cards inside this frame to tidy', type: 'info' } });
      return;
    }

    get().pushHistory();

    // Sort top-to-bottom, left-to-right for natural reading order
    contained.sort((a, b) => (Math.abs(a.y - b.y) < 40 ? a.x - b.x : a.y - b.y));

    const gap = 24;
    const padX = 28;
    const padTop = 36;
    const cols = Math.max(1, Math.min(contained.length, Math.floor((frame.width - padX * 2 + gap) / 300) || 2));

    let curX = frame.x + padX;
    let curY = frame.y + padTop;
    let rowMaxH = 0;
    let maxRight = frame.x + frame.width;
    let maxBottom = frame.y + frame.height;

    const nextCards = { ...cards };
    contained.forEach((card, idx) => {
      if (idx > 0 && idx % cols === 0) {
        curX = frame.x + padX;
        curY += rowMaxH + gap;
        rowMaxH = 0;
      }

      nextCards[card.id] = {
        ...card,
        x: Math.round(curX),
        y: Math.round(curY),
      };

      rowMaxH = Math.max(rowMaxH, card.height);
      curX += card.width + gap;
      maxRight = Math.max(maxRight, curX - gap + padX);
      maxBottom = Math.max(maxBottom, curY + card.height + padX);
    });

    set((state) => ({
      cards: nextCards,
      frames: {
        ...state.frames,
        [frameId]: {
          ...frame,
          width: Math.max(frame.width, Math.round(maxRight - frame.x)),
          height: Math.max(frame.height, Math.round(maxBottom - frame.y)),
        },
      },
      notification: { message: `Tidied ${contained.length} cards inside "${frame.title}"`, type: 'success' },
    }));
    scheduleAutoSave(get, set);
  },

  moveFrameWithContainedCards: (frameId, newPos, containedCardInitialPositions, delta) => {
    set((state) => {
      const frame = state.frames[frameId];
      if (!frame) return state;

      const nextFrames = {
        ...state.frames,
        [frameId]: {
          ...frame,
          x: Math.round(newPos.x),
          y: Math.round(newPos.y),
        },
      };

      const nextCards = { ...state.cards };
      for (const [cardId, initialPos] of Object.entries(containedCardInitialPositions)) {
        if (nextCards[cardId]) {
          nextCards[cardId] = {
            ...nextCards[cardId],
            x: Math.round(initialPos.x + delta.x),
            y: Math.round(initialPos.y + delta.y),
          };
        }
      }

      return {
        frames: nextFrames,
        cards: nextCards,
      };
    });
    scheduleAutoSave(get, set);
  },

  // ---------------------------------------------------------------------------
  // Milestone 2 Ingestion: Files & URLs
  // ---------------------------------------------------------------------------

  ingestMediaFiles: async (files: File[], screenPos?: Point) => {
    if (!files || files.length === 0) return [];
    const { viewport, maxZIndex } = get();

    // Determine target world coordinate for center of cluster
    const screenOrigin: Point = screenPos || {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    const worldOrigin = screenToWorld(screenOrigin, viewport);

    interface PreparedCard {
      cardData: Omit<CanvasCard, 'x' | 'y'>;
      width: number;
      height: number;
    }

    const preparedCards: PreparedCard[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');

      if (!isImage && !isVideo && !isAudio) continue;

      // 1. Save binary blob into IndexedDB
      const { blobId, objectUrl } = await mediaService.saveMediaBlob(file, file.name);
      const cardId = `card-media-${Date.now()}-${i}`;
      const fileSizeStr = mediaService.formatFileSize(file.size);

      if (isImage) {
        const { width: natW, height: natH } = await mediaService.getImageDimensions(file);
        // Constrain width to 360px while preserving native aspect ratio
        const targetWidth = Math.min(380, Math.max(240, natW));
        const aspect = natW / (natH || 1);
        const targetHeight = Math.round(targetWidth / aspect);

        preparedCards.push({
          width: targetWidth,
          height: targetHeight,
          cardData: {
            id: cardId,
            type: 'image',
            title: file.name.replace(/\.[^/.]+$/, ''),
            width: targetWidth,
            height: targetHeight,
            rotation: 0,
            zIndex: maxZIndex + i + 1,
            blobId,
            url: objectUrl,
            tags: ['Uploaded Image'],
            metadata: {
              fileName: file.name,
              fileSize: fileSizeStr,
              aspectRatio: `${Math.round(aspect * 100) / 100}:1`,
              naturalWidth: natW,
              naturalHeight: natH,
              mimeType: file.type,
            },
          },
        });
      } else if (isVideo) {
        const { width: natW, height: natH, duration } = await mediaService.getVideoMetadata(file);
        const targetWidth = 400;
        const aspect = (natW && natH) ? natW / natH : 16 / 9;
        const targetHeight = Math.round(targetWidth / aspect);

        preparedCards.push({
          width: targetWidth,
          height: targetHeight,
          cardData: {
            id: cardId,
            type: 'video',
            title: file.name.replace(/\.[^/.]+$/, ''),
            width: targetWidth,
            height: targetHeight,
            rotation: 0,
            zIndex: maxZIndex + i + 1,
            blobId,
            url: objectUrl,
            tags: ['Local Video'],
            metadata: {
              fileName: file.name,
              fileSize: fileSizeStr,
              duration: mediaService.formatDuration(duration),
              naturalWidth: natW,
              naturalHeight: natH,
              mimeType: file.type,
            },
            playbackState: {
              volume: 0.8,
              isMuted: false,
              playbackRate: 1,
              currentTime: 0,
            },
          },
        });
      } else if (isAudio) {
        const { duration } = await mediaService.getAudioMetadata(file);
        const targetWidth = 340;
        const targetHeight = 170;

        preparedCards.push({
          width: targetWidth,
          height: targetHeight,
          cardData: {
            id: cardId,
            type: 'audio',
            title: file.name.replace(/\.[^/.]+$/, ''),
            width: targetWidth,
            height: targetHeight,
            rotation: 0,
            zIndex: maxZIndex + i + 1,
            color: '#06b6d4',
            blobId,
            url: objectUrl,
            tags: ['Local Audio'],
            metadata: {
              fileName: file.name,
              fileSize: fileSizeStr,
              duration: mediaService.formatDuration(duration),
              mimeType: file.type,
            },
            playbackState: {
              volume: 0.8,
              isMuted: false,
              playbackRate: 1,
              currentTime: 0,
            },
          },
        });
      }
    }

    if (preparedCards.length === 0) return [];

    // 2. Compute non-overlapping auto-arranged positions
    const layoutInput: CardLayoutItem[] = preparedCards.map((p) => ({
      width: p.width,
      height: p.height,
    }));
    const positions = computeAutoArrangePositions(layoutInput, worldOrigin, 24);

    const newCardsMap: Record<string, CanvasCard> = {};
    const createdIds: string[] = [];

    preparedCards.forEach((prep, idx) => {
      const pos = positions[idx];
      const card: CanvasCard = {
        ...prep.cardData,
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
      };
      newCardsMap[card.id] = card;
      createdIds.push(card.id);
    });

    set((state) => ({
      cards: {
        ...state.cards,
        ...newCardsMap,
      },
      selectedCardId: createdIds[createdIds.length - 1],
      maxZIndex: maxZIndex + preparedCards.length,
      notification: {
        message: `Imported ${preparedCards.length} ${preparedCards.length === 1 ? 'file' : 'files'} to canvas`,
        type: 'success',
      },
    }));

    scheduleAutoSave(get, set);
    return createdIds;
  },

  ingestMediaUrl: async (rawUrl: string, screenPos?: Point) => {
    const parsed = parseMediaUrl(rawUrl);
    if (!parsed) return null;

    const { viewport, maxZIndex } = get();
    const screenOrigin: Point = screenPos || {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    const worldOrigin = screenToWorld(screenOrigin, viewport);

    const cardId = `card-url-${Date.now()}`;
    const nextZ = maxZIndex + 1;

    let width = 380;
    let height = 240;

    if (parsed.provider === 'instagram') {
      // 9:16 vertical ratio matching native Instagram Reels styling
      width = 360;
      height = 640;
    } else if (parsed.type === 'video') {
      width = 420;
      height = 270;
    } else if (parsed.type === 'audio') {
      width = 340;
      height = 160;
    } else if (parsed.type === 'image') {
      width = 360;
      height = 270;
    }

    const jitter = (Math.random() - 0.5) * 30;

    const newCard: CanvasCard = {
      id: cardId,
      type: parsed.type,
      title: parsed.title,
      x: Math.round(worldOrigin.x - width / 2 + jitter),
      y: Math.round(worldOrigin.y - height / 2 + jitter),
      width,
      height,
      rotation: 0,
      zIndex: nextZ,
      url: parsed.embedUrl || parsed.sourceUrl,
      tags: [parsed.provider.toUpperCase()],
      metadata: {
        source: parsed.sourceUrl,
        aspectRatio: parsed.aspectRatio,
      },
    };

    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: newCard,
      },
      selectedCardId: cardId,
      maxZIndex: nextZ,
      notification: {
        message: `Added ${parsed.provider} link to canvas`,
        type: 'success',
      },
    }));

    scheduleAutoSave(get, set);
    return cardId;
  },

  pinVideoTimestamp: (cardId, time) => {
    const { cards, maxZIndex, addConnection, connections } = get();
    const videoCard = cards[cardId];
    if (!videoCard) return null;

    const formattedTime = mediaService.formatDuration(time);
    const bookmarkId = `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const existingBookmarks = videoCard.bookmarks || [];

    // Check if the video card already has an outgoing or bidirectional connection to a Note card
    const outgoingNoteConn = connections.find(
      (conn) =>
        (conn.fromCardId === cardId && cards[conn.toCardId]?.type === 'note') ||
        (conn.toCardId === cardId && cards[conn.fromCardId]?.type === 'note')
    );

    const existingNoteCardId = outgoingNoteConn
      ? outgoingNoteConn.fromCardId === cardId
        ? outgoingNoteConn.toCardId
        : outgoingNoteConn.fromCardId
      : null;

    const existingNoteCard = existingNoteCardId ? cards[existingNoteCardId] : null;

    if (existingNoteCard) {
      // IF YES: Append the new interactive timestamp badge into the existing note's content
      const badgeHtml = `<p><button type="button" class="timestamp-badge" data-video-id="${cardId}" data-time="${time.toFixed(2)}">⏱ ${formattedTime}</button> <em>Note for ${formattedTime}...</em></p>`;
      const updatedContent = existingNoteCard.content
        ? `${existingNoteCard.content}${badgeHtml}`
        : badgeHtml;

      const updatedNote: CanvasCard = {
        ...existingNoteCard,
        content: updatedContent,
        metadata: {
          ...existingNoteCard.metadata,
          sourceCardId: cardId,
          timestamp: time,
        },
      };

      const newBookmark: TimestampBookmark = {
        id: bookmarkId,
        time: Math.round(time * 100) / 100,
        label: formattedTime,
        noteCardId: existingNoteCard.id,
        createdAt: Date.now(),
      };

      const updatedVideo: CanvasCard = {
        ...videoCard,
        bookmarks: [...existingBookmarks, newBookmark],
      };

      set((state) => ({
        cards: {
          ...state.cards,
          [cardId]: updatedVideo,
          [existingNoteCard.id]: updatedNote,
        },
        selectedCardId: cardId,
        selectedCardIds: [cardId],
        notification: {
          message: `Pinned timestamp ${formattedTime} & appended to linked Note`,
          type: 'success',
        },
      }));

      scheduleAutoSave(get, set);
      return { bookmarkId, noteId: existingNoteCard.id };
    } else {
      // IF NO: Spawn a new note card, insert badge, and draw SVG connection line
      const noteId = `card-note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const nextZ = maxZIndex + 2;

      const noteWidth = 300;
      const noteHeight = 220;
      const targetX = Math.round(videoCard.x + videoCard.width + 60);
      const targetY = Math.round(videoCard.y);

      const newNoteCard: CanvasCard = {
        id: noteId,
        type: 'note',
        title: `${videoCard.title} Notes`,
        x: targetX,
        y: targetY,
        width: noteWidth,
        height: noteHeight,
        rotation: 0,
        zIndex: nextZ - 1,
        color: '#8b5cf6',
        tags: ['Video Notes', formattedTime],
        content: `<p><button type="button" class="timestamp-badge" data-video-id="${cardId}" data-time="${time.toFixed(2)}">⏱ ${formattedTime}</button> <em>Key motion note for ${formattedTime}...</em></p>`,
        metadata: {
          sourceCardId: cardId,
          timestamp: time,
        },
      };

      const newBookmark: TimestampBookmark = {
        id: bookmarkId,
        time: Math.round(time * 100) / 100,
        label: formattedTime,
        noteCardId: noteId,
        createdAt: Date.now(),
      };

      const updatedVideo: CanvasCard = {
        ...videoCard,
        bookmarks: [...existingBookmarks, newBookmark],
        zIndex: nextZ,
      };

      set((state) => ({
        cards: {
          ...state.cards,
          [cardId]: updatedVideo,
          [noteId]: newNoteCard,
        },
        selectedCardId: cardId,
        selectedCardIds: [cardId],
        maxZIndex: nextZ,
        notification: {
          message: `Pinned timestamp ${formattedTime} & spawned linked Note`,
          type: 'success',
        },
      }));

      // Connect video's right anchor to note's left anchor
      addConnection({
        fromCardId: cardId,
        fromAnchor: 'right',
        toCardId: noteId,
        toAnchor: 'left',
        color: '#8b5cf6',
        label: `⏱ ${formattedTime}`,
      });

      scheduleAutoSave(get, set);
      return { bookmarkId, noteId };
    }
  },

  deleteBookmark: (cardId, bookmarkId) => {
    const card = get().cards[cardId];
    if (!card || !card.bookmarks) return;

    const nextBookmarks = card.bookmarks.filter((b) => b.id !== bookmarkId);
    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: {
          ...card,
          bookmarks: nextBookmarks,
        },
      },
      notification: {
        message: 'Removed timestamp bookmark',
        type: 'info',
      },
    }));
    scheduleAutoSave(get, set);
  },

  seekMedia: (cardId, time) => {
    const card = get().cards[cardId];
    if (!card) return;

    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: {
          ...card,
          playbackState: {
            volume: card.playbackState?.volume ?? 0.85,
            isMuted: card.playbackState?.isMuted ?? false,
            playbackRate: card.playbackState?.playbackRate ?? 1,
            currentTime: time,
            seekTarget: time,
            seekNonce: Date.now(),
          },
        },
      },
      selectedCardId: cardId,
      selectedCardIds: [cardId],
    }));
    scheduleAutoSave(get, set);
  },

  setLoopRange: (cardId, loopRange) => {
    const card = get().cards[cardId];
    if (!card) return;

    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: {
          ...card,
          loopRange,
        },
      },
      notification: {
        message: loopRange.enabled
          ? `A-B Loop enabled (${mediaService.formatDuration(loopRange.start)} - ${mediaService.formatDuration(loopRange.end)})`
          : 'A-B Loop disabled',
        type: 'info',
      },
    }));
    scheduleAutoSave(get, set);
  },

  setCardAspectRatio: (cardId, preset) => {
    const card = get().cards[cardId];
    if (!card) return;

    const headerH = 38;
    let targetWidth = card.width;
    let targetHeight = card.height;

    switch (preset) {
      case '16:9': {
        targetWidth = Math.max(340, Math.min(560, card.width));
        const contentH = Math.round((targetWidth * 9) / 16);
        targetHeight = contentH + headerH;
        break;
      }
      case '9:16': {
        targetWidth = Math.max(240, Math.min(320, card.width > 340 ? 280 : card.width));
        const contentH = Math.round((targetWidth * 16) / 9);
        targetHeight = contentH + headerH;
        break;
      }
      case '1:1': {
        targetWidth = Math.max(280, Math.min(460, card.width));
        targetHeight = targetWidth + headerH;
        break;
      }
      case 'native':
      default: {
        const nw = card.metadata?.naturalWidth || 16;
        const nh = card.metadata?.naturalHeight || 9;
        const ratio = nw / nh;
        targetWidth = Math.max(320, Math.min(560, card.width));
        const contentH = Math.round(targetWidth / ratio);
        targetHeight = contentH + headerH;
        break;
      }
    }

    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: {
          ...card,
          width: targetWidth,
          height: targetHeight,
          aspectRatioPreset: preset,
          metadata: {
            ...card.metadata,
            aspectRatio: preset,
          },
        },
      },
      notification: {
        message: `Applied ${preset.toUpperCase()} aspect ratio preset`,
        type: 'success',
      },
    }));

    scheduleAutoSave(get, set);
  },

  autoSyncMediaAspectRatio: (cardId: string, naturalWidth: number, naturalHeight: number) => {
    const card = get().cards[cardId];
    if (!card || naturalWidth <= 0 || naturalHeight <= 0) return;

    const meta = card.metadata || {};
    if (meta.naturalWidth === naturalWidth && meta.naturalHeight === naturalHeight) {
      return;
    }

    const ratio = naturalWidth / naturalHeight;
    const topHeaderH = 37;
    const bookmarksH = (card.type === 'video' && card.bookmarks && card.bookmarks.length > 0) ? 25 : 0;
    const headerOffset = topHeaderH + bookmarksH;

    let targetWidth = card.width;
    if (ratio < 0.8 && targetWidth > 320) {
      targetWidth = 280;
    }
    const contentH = Math.round(targetWidth / ratio);
    const targetHeight = contentH + headerOffset;

    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: {
          ...card,
          width: targetWidth,
          height: targetHeight,
          metadata: {
            ...meta,
            naturalWidth,
            naturalHeight,
            aspectRatio: `${naturalWidth}:${naturalHeight}`,
          },
        },
      },
    }));

    scheduleAutoSave(get, set);
  },

  exportBoard: async () => {
    try {
      set({
        notification: {
          message: 'Packaging board and media assets into .board archive...',
          type: 'info',
        },
      });
      const { boardTitle, viewport, cards, connections, frames } = get();
      await exportProject(boardTitle || 'Spatial Moodboard', viewport, cards, connections, frames);
      set({
        notification: {
          message: 'Board exported successfully as .board archive',
          type: 'success',
        },
      });
    } catch (err) {
      console.error('Failed to export board:', err);
      set({
        notification: {
          message: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
          type: 'error',
        },
      });
    }
  },

  importBoard: async (file: File | Blob) => {
    try {
      set({
        notification: {
          message: 'Unpacking .board archive and restoring media...',
          type: 'info',
        },
      });
      const result = await importProject(file);
      const maxZ = Math.max(
        ...Object.values(result.cards).map((c) => c.zIndex || 1),
        1
      );
      await get().saveToDB();
      const newBoardId = uid('board');
      const now = Date.now();

      set({
        activeView: 'canvas',
        currentBoardId: newBoardId,
        viewport: result.viewport,
        cards: result.cards,
        connections: result.connections,
        frames: result.frames,
        boardTitle: result.title,
        maxZIndex: maxZ,
        selectedCardId: null,
        selectedCardIds: [],
        selectedConnectionId: null,
        selectedFrameId: null,
        draftConnection: null,
        historyPast: [],
        historyFuture: [],
        notification: {
          message: `Imported "${result.title}"`,
          type: 'success',
        },
      });

      // Persist immediately into IndexedDB
      await db.boards.put({
        id: newBoardId,
        title: result.title,
        viewport: result.viewport,
        cards: result.cards,
        connections: result.connections,
        frames: result.frames,
        createdAt: now,
        updatedAt: now,
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('musaic-active-board-id', newBoardId);
      }
      set({ saveStatus: 'saved' });
      await get().loadAvailableBoards();
    } catch (err) {
      console.error('Failed to import board:', err);
      set({
        notification: {
          message: `Import failed: ${err instanceof Error ? err.message : String(err)}`,
          type: 'error',
        },
      });
    }
  },

  // Multi-board Workspace Operations
  loadAvailableBoards: async () => {
    try {
      const allBoards = await db.boards.toArray();
      const summaries: BoardSummary[] = allBoards.map((b) => ({
        id: b.id,
        title: b.title || 'Untitled Workspace',
        updatedAt: b.updatedAt || Date.now(),
        cardCount: b.cards ? Object.keys(b.cards).length : 0,
        createdAt: b.createdAt,
      })).sort((a, b) => b.updatedAt - a.updatedAt);
      set({ availableBoards: summaries });
    } catch (err) {
      console.error('Failed to load available boards:', err);
    }
  },

  switchBoard: async (boardId: string) => {
    const state = get();
    if (boardId === state.currentBoardId) return;

    // 1. Flush/save current board state first (if it still exists)
    if (state.currentBoardId) {
      try {
        const existing = await db.boards.get(state.currentBoardId);
        if (existing) {
          await db.boards.put({
            id: state.currentBoardId,
            title: state.boardTitle,
            viewport: state.viewport,
            cards: state.cards,
            connections: state.connections,
            frames: state.frames,
            createdAt: existing.createdAt || Date.now(),
            updatedAt: Date.now(),
          });
        }
      } catch (err) {
        console.warn('Failed to pre-save before board switch:', err);
      }
    }

    // 2. Revoke all active Object URLs from memory to prevent memory leaks
    mediaService.revokeAllObjectUrls();

    // 3. Clear canvas state temporarily
    set({
      cards: {},
      connections: [],
      frames: {},
      selectedCardId: null,
      selectedCardIds: [],
      editingCardId: null,
      selectedConnectionId: null,
      selectedFrameId: null,
      draftConnection: null,
      historyPast: [],
      historyFuture: [],
      saveStatus: 'saving',
    });

    // 4. Load target board record from IndexedDB
    try {
      const targetBoard = await db.boards.get(boardId);
      if (!targetBoard) {
        throw new Error(`Project "${boardId}" not found.`);
      }

      // 5. Hydrate media object URLs for cards with binary blobs
      const hydratedCards: Record<string, CanvasCard> = { ...(targetBoard.cards || {}) };
      for (const card of Object.values(hydratedCards)) {
        if (card.blobId) {
          const liveUrl = await mediaService.getObjectUrl(card.blobId);
          if (liveUrl) {
            card.url = liveUrl;
          }
        }
      }

      const maxZ = Math.max(
        ...Object.values(hydratedCards).map((c) => c.zIndex || 1),
        1
      );

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('musaic-active-board-id', boardId);
      }

      set({
        currentBoardId: targetBoard.id,
        boardTitle: targetBoard.title || 'Untitled Project',
        viewport: targetBoard.viewport || INITIAL_VIEWPORT,
        cards: hydratedCards,
        connections: targetBoard.connections || [],
        frames: targetBoard.frames || {},
        maxZIndex: maxZ,
        selectedCardId: null,
        selectedCardIds: [],
        saveStatus: 'saved',
      });

      await get().loadAvailableBoards();
    } catch (err) {
      console.error('Failed to switch board:', err);
      set({
        saveStatus: 'saved',
        notification: {
          message: `Failed to open project: ${err instanceof Error ? err.message : String(err)}`,
          type: 'error',
        },
      });
    }
  },

  createBoard: async (title?: string) => {
    const newBoardId = uid('board');
    const newBoardTitle = title?.trim() || `Untitled Project ${get().availableBoards.length + 1}`;

    // Flush current board if any
    if (get().currentBoardId) {
      await get().saveToDB();
    }

    // Revoke old object URLs
    mediaService.revokeAllObjectUrls();

    const now = Date.now();
    const newRecord = {
      id: newBoardId,
      title: newBoardTitle,
      viewport: INITIAL_VIEWPORT,
      cards: {},
      connections: [],
      frames: {},
      createdAt: now,
      updatedAt: now,
    };

    await db.boards.put(newRecord);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('musaic-active-board-id', newBoardId);
    }

    set({
      activeView: 'canvas',
      currentBoardId: newBoardId,
      boardTitle: newBoardTitle,
      viewport: INITIAL_VIEWPORT,
      cards: {},
      connections: [],
      frames: {},
      maxZIndex: 1,
      selectedCardId: null,
      selectedCardIds: [],
      editingCardId: null,
      selectedConnectionId: null,
      selectedFrameId: null,
      draftConnection: null,
      historyPast: [],
      historyFuture: [],
      saveStatus: 'saved',
      notification: {
        message: `Created project "${newBoardTitle}"`,
        type: 'success',
      },
    });

    await get().loadAvailableBoards();
    return newBoardId;
  },

  renameBoard: async (boardId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    try {
      await db.boards.update(boardId, {
        title: trimmed,
        updatedAt: Date.now(),
      });

      const state = get();
      if (state.currentBoardId === boardId) {
        set({ boardTitle: trimmed });
      }

      await get().loadAvailableBoards();
      set({
        notification: {
          message: `Workspace renamed to "${trimmed}"`,
          type: 'success',
        },
      });
    } catch (err) {
      console.error('Failed to rename board:', err);
    }
  },

  duplicateBoard: async (boardId: string) => {
    try {
      const state = get();
      if (boardId === state.currentBoardId) {
        await get().saveToDB();
      }

      const sourceBoard = await db.boards.get(boardId);
      if (!sourceBoard) throw new Error('Source board not found.');

      const newBoardId = uid('board');
      const newTitle = `${sourceBoard.title || 'Project'} (Copy)`;
      const now = Date.now();

      await db.boards.put({
        ...sourceBoard,
        id: newBoardId,
        title: newTitle,
        createdAt: now,
        updatedAt: now,
      });

      await get().loadAvailableBoards();
      if (state.activeView === 'canvas') {
        await get().switchBoard(newBoardId);
      }

      set({
        notification: {
          message: `Duplicated "${newTitle}"`,
          type: 'success',
        },
      });
      return newBoardId;
    } catch (err) {
      console.error('Failed to duplicate board:', err);
      set({
        notification: {
          message: `Duplication failed: ${err instanceof Error ? err.message : String(err)}`,
          type: 'error',
        },
      });
      return '';
    }
  },

  deleteBoard: async (boardId: string) => {
    try {
      const state = get();
      const boards = await db.boards.toArray();

      if (boards.length <= 1) {
        set({
          notification: {
            message: 'Cannot delete the only remaining workspace.',
            type: 'error',
          },
        });
        return;
      }

      await db.boards.delete(boardId);

      // If we deleted the active board, switch to another existing board
      if (boardId === state.currentBoardId) {
        const remaining = boards.filter((b) => b.id !== boardId);
        const nextBoard = remaining[0];
        await get().switchBoard(nextBoard.id);
      } else {
        await get().loadAvailableBoards();
      }

      set({
        notification: {
          message: 'Workspace deleted successfully.',
          type: 'info',
        },
      });
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  },

  // High-Res Snapshot Export
  captureSnapshot: async (options?: SnapshotOptions) => {
    try {
      set({
        notification: {
          message: 'Generating high-resolution snapshot...',
          type: 'info',
        },
      });
      const filename = options?.filename || `${get().boardTitle || 'storyboarder'}-snapshot`;
      await captureCanvasSnapshot({ ...options, filename });
      set({
        notification: {
          message: 'High-res snapshot downloaded successfully!',
          type: 'success',
        },
      });
    } catch (err) {
      console.error('Snapshot capture failed:', err);
      set({
        notification: {
          message: `Snapshot failed: ${err instanceof Error ? err.message : String(err)}`,
          type: 'error',
        },
      });
    }
  },
}));

if (typeof window !== 'undefined') {
  (window as unknown as { __CANVAS_STORE__: typeof useCanvasStore }).__CANVAS_STORE__ = useCanvasStore;
}
