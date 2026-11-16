export type CardType = 'image' | 'video' | 'audio' | 'embed-url' | 'note';

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number; // strictly clamped between MIN_ZOOM (0.2) and MAX_ZOOM (2.5)
}

export interface CanvasCard {
  id: string;
  type: CardType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees (0 - 360)
  zIndex: number;
  
  // Customization & content
  color?: string;       // Theme accent or sticky note background
  tags?: string[];
  content?: string;     // Text / markdown preview for notes
  url?: string;         // Remote media URL or embed link (or resolved object URL)
  blobId?: string;      // Key reference for Milestone 2 IndexedDB
  metadata?: {
    duration?: string;
    aspectRatio?: string;
    source?: string;
    fileName?: string;
    fileSize?: string;
    naturalWidth?: number;
    naturalHeight?: number;
    sourceCardId?: string;
    timestamp?: number;
    [key: string]: unknown;
  };
  
  // Playback state (ready for Milestone 3)
  playbackState?: {
    volume: number;
    isMuted: boolean;
    playbackRate: number;
    currentTime?: number;
    seekTarget?: number;
    seekNonce?: number;
  };
  
  // Video Timestamps, A/B Loop & Aspect Presets
  bookmarks?: TimestampBookmark[];
  loopRange?: LoopRange;
  aspectRatioPreset?: AspectRatioPreset;
}

export interface TimestampBookmark {
  id: string;
  time: number; // in seconds
  label: string; // e.g. "01:24"
  noteCardId?: string; // ID of spawned connected Note card
  createdAt?: number;
}

export interface LoopRange {
  enabled: boolean;
  start: number; // Point A in seconds
  end: number;   // Point B in seconds
}

export type AspectRatioPreset = 'native' | '16:9' | '9:16' | '1:1';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export type CanvasTool = 'select' | 'hand' | 'frame';

export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left';

export type ConnectionLineStyle = 'solid' | 'dashed' | 'dotted';

export interface Connection {
  id: string;
  fromCardId: string;
  fromAnchor: AnchorPosition;
  toCardId: string;
  toAnchor: AnchorPosition;
  color?: string;
  label?: string;
  style?: ConnectionLineStyle;
}

export type FrameStyle = 'section' | 'storyboard' | 'cluster';

export interface CanvasFrame {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  zIndex?: number;
  collapsed?: boolean;
  styleVariant?: FrameStyle;
  sceneNumber?: number;
}

export interface DraftConnection {
  fromCardId: string;
  fromAnchor: AnchorPosition;
  currentPointerWorld: Point;
  targetSnap?: {
    cardId: string;
    anchor: AnchorPosition;
    point: Point;
  } | null;
}

export type TransformAction =
  | { type: 'idle' }
  | { type: 'pan'; startScreen: Point; startViewport: Viewport }
  | { 
      type: 'drag-card'; 
      cardId: string; 
      startPointerWorld: Point; 
      initialPositions: Record<string, Point>; 
    }
  | { 
      type: 'resize-card'; 
      cardId: string; 
      handle: ResizeHandle; 
      startPointerWorld: Point; 
      initialCard: CanvasCard;
      preserveAspectRatio: boolean;
    }
  | { 
      type: 'rotate-card'; 
      cardId: string; 
      initialRotation: number; 
      cardCenterScreen: Point; 
      startAngleDeg: number;
    }
  | {
      type: 'draw-connection';
      fromCardId: string;
      fromAnchor: AnchorPosition;
    }
  | {
      type: 'marquee';
      startPointerWorld: Point;
      currentPointerWorld: Point;
    }
  | {
      type: 'drag-frame';
      frameId: string;
      startPointerWorld: Point;
      startFramePos: Point;
      containedCardInitialPositions: Record<string, Point>;
    }
  | {
      type: 'resize-frame';
      frameId: string;
      handle: ResizeHandle;
      startPointerWorld: Point;
      initialFrame: CanvasFrame;
    }
  | {
      type: 'draw-frame';
      startPointerWorld: Point;
      currentPointerWorld: Point;
    };

// IndexedDB Schema Types
export interface BoardRecord {
  id: string;
  title: string;
  viewport: Viewport;
  cards: Record<string, CanvasCard>;
  connections?: Connection[];
  frames?: Record<string, CanvasFrame>;
  createdAt: number;
  updatedAt: number;
}

export interface MediaBlobRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  name: string;
  size: number;
  createdAt: number;
}

export interface BoardSummary {
  id: string;
  title: string;
  updatedAt: number;
  cardCount: number;
  createdAt?: number;
}

