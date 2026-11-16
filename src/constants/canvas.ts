import type { CanvasCard, Viewport } from '../types/canvas';

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2.5;
export const ZOOM_STEP = 0.15;
export const MIN_CARD_WIDTH = 160;
export const MIN_CARD_HEIGHT = 120;
export const ROTATION_SNAP_DEGREES = 15;

export const INITIAL_VIEWPORT: Viewport = {
  x: 80,
  y: 95,
  zoom: 0.78,
};

export const INITIAL_MOCK_CARDS: Record<string, CanvasCard> = {
  'card-1': {
    id: 'card-1',
    type: 'note',
    title: 'Creative Direction',
    x: 80,
    y: 70,
    width: 340,
    height: 290,
    rotation: 0,
    zIndex: 1,
    color: '#C93B1D',
    content: `<h1>Editorial System</h1>
<p>Quiet surfaces, deliberate contrast, and generous negative space.</p>
<ul>
  <li><strong>Structure:</strong> Orthogonal grid alignment</li>
  <li><strong>Accent:</strong> International Vermilion</li>
  <li><strong>Storage:</strong> 100% offline local database</li>
</ul>
<blockquote>"Less, but better."</blockquote>`,
  },
  'card-2': {
    id: 'card-2',
    type: 'image',
    title: 'Form & Light Study',
    x: 540,
    y: 70,
    width: 340,
    height: 290,
    rotation: 0,
    zIndex: 2,
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    metadata: {
      aspectRatio: '4:3',
      source: 'Unsplash',
      fileName: 'form_study.jpg',
      fileSize: '2.4 MB',
    },
  },
  'card-3': {
    id: 'card-3',
    type: 'video',
    title: 'Motion Reel',
    x: 1000,
    y: 70,
    width: 400,
    height: 290,
    rotation: 0,
    zIndex: 3,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    metadata: {
      duration: '09:56',
      source: 'MP4',
      fileName: 'motion_reel.mp4',
      fileSize: '15.8 MB',
    },
    playbackState: {
      volume: 0.85,
      isMuted: false,
      playbackRate: 1,
      currentTime: 0,
    },
    aspectRatioPreset: '16:9',
    bookmarks: [
      { id: 'bm-initial-1', time: 12, label: '00:12' },
      { id: 'bm-initial-2', time: 38, label: '00:38' },
    ],
    loopRange: {
      enabled: false,
      start: 5,
      end: 25,
    },
  },
  'card-4': {
    id: 'card-4',
    type: 'audio',
    title: 'Ambient Score',
    x: 80,
    y: 440,
    width: 340,
    height: 190,
    rotation: 0,
    zIndex: 4,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    metadata: {
      duration: '06:12',
      source: 'SoundHelix',
      fileName: 'ambient_score.mp3',
      fileSize: '4.2 MB',
    },
    playbackState: {
      volume: 0.9,
      isMuted: false,
      playbackRate: 1,
      currentTime: 0,
    },
  },
  'card-5': {
    id: 'card-5',
    type: 'embed-url',
    title: 'Reference Clip',
    x: 540,
    y: 440,
    width: 400,
    height: 270,
    rotation: 0,
    zIndex: 5,
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    metadata: {
      source: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
  },
};

export const ACCENT_COLORS = [
  { name: 'Charcoal', value: '#18181B', hex: '#18181B' },
  { name: 'Vermilion', value: '#C93B1D', hex: '#C93B1D' },
  { name: 'Cobalt', value: '#1D4ED8', hex: '#1D4ED8' },
  { name: 'Forest', value: '#15803D', hex: '#15803D' },
  { name: 'Ochre', value: '#B45309', hex: '#B45309' },
  { name: 'Plum', value: '#6D28D9', hex: '#6D28D9' },
] as const;

export const INITIAL_CONNECTIONS: import('../types/canvas').Connection[] = [
  {
    id: 'conn-1',
    fromCardId: 'card-1',
    fromAnchor: 'right',
    toCardId: 'card-2',
    toAnchor: 'left',
    label: 'Form',
    style: 'solid',
    color: '#52525B',
  },
  {
    id: 'conn-2',
    fromCardId: 'card-2',
    fromAnchor: 'right',
    toCardId: 'card-3',
    toAnchor: 'left',
    label: 'Motion',
    style: 'dashed',
    color: '#C93B1D',
  },
];

export const INITIAL_FRAMES: Record<string, import('../types/canvas').CanvasFrame> = {
  'frame-1': {
    id: 'frame-1',
    title: 'Visual Studies',
    x: 44,
    y: 24,
    width: 872,
    height: 368,
    color: '#18181B',
    zIndex: 0,
    styleVariant: 'section',
  },
};
