import React, { useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  MousePointer,
  Hand,
  StickyNote,
  Image,
  Video,
  Music,
  Link2,
  FolderPlus,
  ZoomIn,
  ZoomOut,
  Grid,
  Plus,
} from 'lucide-react';

export const CanvasToolbar: React.FC = () => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const addCard = useCanvasStore((s) => s.addCard);
  const addFrame = useCanvasStore((s) => s.addFrame);
  const ingestMediaFiles = useCanvasStore((s) => s.ingestMediaFiles);
  const viewport = useCanvasStore((s) => s.viewport);
  const zoomIn = useCanvasStore((s) => s.zoomIn);
  const zoomOut = useCanvasStore((s) => s.zoomOut);
  const setZoomPercent = useCanvasStore((s) => s.setZoomPercent);
  const showGrid = useCanvasStore((s) => s.showGrid);
  const toggleGrid = useCanvasStore((s) => s.toggleGrid);

  const zoomPercent = Math.round(viewport.zoom * 100);

  const handleScopedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await ingestMediaFiles(files);
      e.target.value = '';
    }
  };

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-2xl editorial-panel pointer-events-auto canvas-toolbar-root snapshot-hide">
      {/* Hidden Scoped File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleScopedUpload}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        multiple
        accept="video/*"
        onChange={handleScopedUpload}
        className="hidden"
      />
      <input
        ref={audioInputRef}
        type="file"
        multiple
        accept="audio/*"
        onChange={handleScopedUpload}
        className="hidden"
      />

      {/* Tool Selection (Select / Hand) */}
      <div className="flex items-center gap-0.5 bg-[#F1EFEA] p-0.5 rounded-xl border border-black/5">
        <button
          type="button"
          onClick={() => setActiveTool('select')}
          title="Select Tool (V)"
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
            activeTool === 'select'
              ? 'bg-[#FFFFFF] text-[#18181B] shadow-xs border border-black/10'
              : 'text-[#52525B] hover:text-[#18181B]'
          }`}
        >
          <MousePointer className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('hand')}
          title="Hand Tool (H) - Pan canvas"
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
            activeTool === 'hand'
              ? 'bg-[#FFFFFF] text-[#18181B] shadow-xs border border-black/10'
              : 'text-[#52525B] hover:text-[#18181B]'
          }`}
        >
          <Hand className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('frame')}
          title="Draw Frame Tool (F) - Drag to group cards"
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
            activeTool === 'frame'
              ? 'bg-[#C93B1D] text-white shadow-xs'
              : 'text-[#52525B] hover:text-[#18181B]'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      <div className="w-[1px] h-5 bg-black/10 mx-0.5" />

      {/* Unified + Add Menu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsAddMenuOpen((prev) => !prev)}
          title="Add card, media, link, or frame"
          className="flex items-center gap-1.5 px-3.5 h-8 rounded-xl bg-[#C93B1D] hover:bg-[#B03217] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className={`w-3.5 h-3.5 transition-transform duration-150 ${isAddMenuOpen ? 'rotate-45' : ''}`} />
          <span>Add</span>
        </button>

        {isAddMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsAddMenuOpen(false)}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-52 rounded-2xl editorial-panel p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <button
                type="button"
                onClick={() => {
                  addCard('note');
                  setIsAddMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <StickyNote className="w-3.5 h-3.5 text-[#C93B1D]" />
                  <span>Note</span>
                </span>
                <kbd className="text-[10px] font-mono text-[#71717A]">N</kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAddMenuOpen(false);
                  imageInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
              >
                <Image className="w-3.5 h-3.5 text-[#52525B]" />
                <span>Image</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAddMenuOpen(false);
                  videoInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
              >
                <Video className="w-3.5 h-3.5 text-[#52525B]" />
                <span>Video</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAddMenuOpen(false);
                  audioInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
              >
                <Music className="w-3.5 h-3.5 text-[#52525B]" />
                <span>Audio</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAddMenuOpen(false);
                  window.dispatchEvent(new CustomEvent('open-url-modal'));
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
              >
                <Link2 className="w-3.5 h-3.5 text-[#52525B]" />
                <span>Web Link / Embed</span>
              </button>

              <div className="my-1.5 border-t border-black/10" />

              <button
                type="button"
                onClick={() => {
                  addFrame('New Section');
                  setIsAddMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <FolderPlus className="w-3.5 h-3.5 text-[#52525B]" />
                  <span>Section Frame</span>
                </span>
                <kbd className="text-[10px] font-mono text-[#71717A]">F</kbd>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="w-[1px] h-5 bg-black/10 mx-0.5" />

      {/* Viewport Zoom Controls */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => zoomOut()}
          title="Zoom Out (-)"
          className="flex items-center justify-center w-8 h-8 rounded-lg editorial-button"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setZoomPercent(100)}
          title="Click to reset zoom to 100%"
          className="px-2 py-1 rounded-lg bg-[#F1EFEA] hover:bg-black/10 text-[11px] font-mono font-semibold text-[#18181B] transition-colors min-w-[48px] text-center"
        >
          {zoomPercent}%
        </button>

        <button
          type="button"
          onClick={() => zoomIn()}
          title="Zoom In (+)"
          className="flex items-center justify-center w-8 h-8 rounded-lg editorial-button"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-[1px] h-5 bg-black/10 mx-0.5" />

      {/* Toggle Dot Grid */}
      <button
        type="button"
        onClick={toggleGrid}
        title="Toggle Dot Grid (G)"
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
          showGrid
            ? 'bg-[#C93B1D]/10 text-[#C93B1D]'
            : 'text-[#52525B] hover:text-[#18181B] hover:bg-[#F1EFEA]'
        }`}
      >
        <Grid className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
