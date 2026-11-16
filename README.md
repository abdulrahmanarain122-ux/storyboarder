# Storyboarder | Multimedia Infinite Ideation Canvas

A spatial board built with **React 19**, **Vite**, **Tailwind CSS v4**, **Zustand**, **Dexie.js**, and **TipTap**. Designed for seamless visual thinking, multimedia moodboarding, and creative brainstorming.

---

## Milestone 1: The Spatial Engine (Viewport & Canvas)

### Implemented Features:
1. **Infinite 2D Viewport**:
   - **Pan Navigation**: 
     - Hold `Spacebar` + `Left Mouse Drag`
     - Click and drag with `Middle Mouse Button` (Scrollwheel button)
     - Or switch to the `Hand Tool (H)` from the bottom toolbar
   - **Cursor-Centric Zoom**:
     - Mouse wheel zooming strictly clamped between `0.2x` and `2.5x`
     - Mathematical zoom invariant keeps the exact world point beneath your cursor stationary
     - Dedicated zoom in (`+`), zoom out (`-`), and quick reset-to-100% pill button
   - **Infinite Dot Matrix Grid**:
     - Infinitely repeating SVG pattern that translates and scales seamlessly with pan and zoom
     - Grid toggle button (`G`)
   - **Minimap Radar**:
     - Real-time world mini-map showing all cards and the visible viewport frame
     - Click or drag anywhere on the minimap to pan your view

2. **Card Manipulation Component**:
   - Cards positioned in continuous **world coordinates `(x, y)`**
   - **Free Dragging**:
     - Smooth dragging in world coordinate space regardless of current zoom level
   - **Active Selection & Bounding Box**:
     - Glowing neon accent border with 8-point resize handles (`nw`, `ne`, `se`, `sw`, `n`, `s`, `e`, `w`)
     - Opposite anchor remains stationary during resize
     - Hold `Shift` while dragging corner handles to preserve aspect ratio
   - **Top Rotation Handle**:
     - Dedicated top stem and circular knob above the card
     - Dynamic rotation tooltip displaying the current angle in real time
     - Hold `Shift` while rotating to snap precisely to `15°` increments (0°, 15°, 30°, 45°, 60°, etc.)
   - **Z-Index Layer Management**:
     - Clicking any card brings it directly to the top layer
     - Contextual card inspector supports **Bring to Front** and **Send to Back**
   - **Shortcuts & Actions**:
     - `Backspace` / `Del`: Delete selected card
     - `Ctrl+D` / `Cmd+D`: Duplicate selected card (+30px offset)
     - `Escape`: Deselect active card
     - Quick add buttons for **Sticky Note**, **Image**, **Video**, and **Audio** cards

---

## Milestone 2: IndexedDB Storage & Media Ingestion

### Implemented Features:
1. **Local Database Layer (IndexedDB via Dexie.js)**:
   - `boards`: stores board layout, viewport `(x, y, zoom)`, and card metadata.
   - `mediaBlobs`: stores raw binary media blobs (`blob`, `mimeType`, `name`, `size`, `createdAt`).
   - Managed `MediaService` generating live Object URLs with automatic memory cleanup (`URL.revokeObjectURL`) to prevent leaks.
   - Automatic background debounced persistence keeps canvas state preserved across page refreshes.

2. **Clipboard Paste Ingestion (Ctrl+V / Cmd+V)**:
   - Pasting image files from the OS clipboard or screenshot tools stores the blob directly in IndexedDB and spawns an Image Card.
   - Pasting URLs detects YouTube, Vimeo, direct video (.mp4/.webm), audio (.mp3/.wav), and web links.
   - Pasting regular text creates a Sticky Note card.

3. **Drag-and-Drop Viewport Ingestion**:
   - Dropping files (`image/*`, `video/*`, `audio/*`) from desktop into the canvas.
   - Glowing frosted-glass drop indicator overlay with animated cloud icons.
   - Exact cursor-to-world coordinate mapping:
     `worldX = (screenX - panX) / zoom`
     `worldY = (screenY - panY) / zoom`

4. **Upload Fallback UI**:
   - Floating toolbar button `+ Add Media` with hidden multi-file input supporting images, video, and audio.

5. **Auto-Arrange Layout Algorithm**:
   - When multiple files or items are dropped/pasted at once, automatically calculates non-overlapping centered grid formations with consistent 24px spacing.
   - Extracts native aspect ratios and natural dimensions for images and videos.

---

## Milestone 3: Custom Media Players, URL Embeds & Rich-Text Notes

### Implemented Features:
1. **Unified Video & Audio Player Cards**:
   - **Custom Media Player UI** with floating glassmorphic controls:
     * Play/Pause toggle with animated micro-interactions
     * Interactive progress bar / scrubber with real-time seeking and timecode readout (`00:15 / 03:40`)
     * Hover volume popup slider and instant Mute toggle
     * Playback speed selector pill (`0.5x`, `1x`, `1.25x`, `1.5x`, `2x`)
     * Restart from beginning button
   - Complete event isolation (`e.stopPropagation()`) ensures scrubbing, volume adjusting, and speed changes never trigger card dragging or canvas panning.
   - **Soundwave Equalizer Visualization**:
     * Dynamic frequency spectrum bars for audio tracks that animate responsively during playback.

2. **Web URL Embeds & Media Links**:
   - YouTube embeds (`youtube.com/watch`, `youtu.be`, `shorts`, `embed`) rendered in responsive iframe cards.
   - Vimeo embeds rendered in responsive iframe cards.
   - Direct video/audio links stream directly through the custom media player.
   - **Protective "Click to interact" overlay**:
     * Prevents third-party iframes from swallowing mouse dragging events.
     * Clicking the overlay unlocks interactive mode; clicking "Drag Mode" restores smooth card dragging.

3. **Rich-Text Note Cards (TipTap Integration)**:
   - Powered by `@tiptap/react` and `@tiptap/starter-kit`.
   - Floating format bar supporting:
     * **Bold**, *Italic*, ~~Strikethrough~~
     * **Heading 1**, **Heading 2**
     * **Bullet Lists** and **Numbered Lists**
     * **Blockquotes** and inline **Code**
   - Real-time auto-saving into card's `content` and IndexedDB.
   - Dedicated top grip handle for dragging, isolating text selection and cursor typing.

4. **Creation Toolbar Updates**:
   - **`+ Add Note`** button in the top floating navigation bar.
   - **`+ Add Link`** button in the top bar with quick preset sample links (YouTube, Vimeo, MP4, MP3) for instant one-click testing.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build
```bash
npm run build
```

---

## Roadmap

- [x] **Milestone 1:** The Spatial Engine (Viewport & Canvas)
- [x] **Milestone 2:** IndexedDB Layer & File Drop / Clipboard (Dexie, Ctrl+V images, file drop, auto-arrange)
- [x] **Milestone 3:** Embedded Media & Rich Text Notes (TipTap editor, YouTube embeds, custom video/audio players)
- [ ] **Milestone 4:** Connectors & Arrows (SVG bezier overlay, edge anchor snapping)
- [ ] **Milestone 5:** Board Export / Backup & Cloud Prep (JSON package export/import, sync schema)
