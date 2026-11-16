import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Film, Layout, StickyNote } from 'lucide-react';

export const EmptyBoardOverlay: React.FC = () => {
  const cards = useCanvasStore((s) => s.cards);
  const frames = useCanvasStore((s) => s.frames);
  const addFrame = useCanvasStore((s) => s.addFrame);
  const updateFrame = useCanvasStore((s) => s.updateFrame);
  const addCard = useCanvasStore((s) => s.addCard);
  const updateCard = useCanvasStore((s) => s.updateCard);
  const theme = useCanvasStore((s) => s.theme);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const fitToView = useCanvasStore((s) => s.fitToView);

  if (Object.keys(cards).length > 0 || Object.keys(frames).length > 0) {
    return null;
  }

  const handleApplyStoryboardTemplate = () => {
    const scenes = [
      { title: 'Opening Hook', x: -640, note: '<h2>Scene 01 — Hook</h2><p>First 3 seconds: visual tension and core premise.</p>' },
      { title: 'Core Sequence', x: -195, note: '<h2>Scene 02 — Proof</h2><p>Key detail shots, pacing, and contrast.</p>' },
      { title: 'Closing Frame', x: 250, note: '<h2>Scene 03 — Payoff</h2><p>Final reveal and memorable closing image.</p>' },
    ];

    scenes.forEach((scene, idx) => {
      const frameId = addFrame(scene.title, undefined, {
        x: scene.x,
        y: -220,
        width: 390,
        height: 440,
      });
      updateFrame(frameId, {
        styleVariant: 'storyboard',
        sceneNumber: idx + 1,
        color: idx === 0 ? '#C93B1D' : '#18181B',
      });

      const noteId = addCard('note');
      updateCard(noteId, {
        title: `Scene 0${idx + 1}`,
        x: scene.x + 28,
        y: -156,
        width: 334,
        height: 185,
        color: idx === 0 ? '#C93B1D' : undefined,
        content: scene.note,
      });
    });

    clearSelection();
    setTimeout(() => fitToView(window.innerWidth, window.innerHeight), 40);
  };

  const handleApplyMoodboardTemplate = () => {
    const visualFrameId = addFrame('Visual Direction', undefined, {
      x: -480,
      y: -240,
      width: 520,
      height: 480,
    });
    updateFrame(visualFrameId, {
      styleVariant: 'cluster',
      color: '#C93B1D',
    });

    const copyFrameId = addFrame('Notes & Palette', undefined, {
      x: 80,
      y: -240,
      width: 400,
      height: 480,
    });
    updateFrame(copyFrameId, {
      styleVariant: 'section',
      color: '#18181B',
    });

    const note1 = addCard('note');
    updateCard(note1, {
      title: 'Direction',
      x: 112,
      y: -176,
      width: 336,
      height: 200,
      content: '<h1>Direction</h1><p>Drop reference images on the left, then click <strong>Extract</strong> in the color panel to sample exact swatches.</p>',
    });

    clearSelection();
    setTimeout(() => fitToView(window.innerWidth, window.innerHeight), 40);
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-6 pointer-events-none snapshot-hide">
      <div className="max-w-lg w-full text-center flex flex-col items-center gap-6 pointer-events-auto">
        <div className="space-y-2">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#C93B1D]">
            Local-First Spatial Studio
          </p>
          <h1
            className={`text-2xl sm:text-3xl font-bold tracking-tight ${
              theme === 'dark' ? 'text-[#F4F4F5]' : 'text-[#18181B]'
            }`}
          >
            Your canvas is ready.
          </h1>
          <p
            className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed ${
              theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#52525B]'
            }`}
          >
            Drag &amp; drop images, videos, or audio anywhere, paste with{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-[#FFFFFF] border border-black/12 text-[11px] font-mono text-[#18181B]">
              Ctrl+V
            </kbd>
            , or start with a structure:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          <button
            type="button"
            onClick={handleApplyStoryboardTemplate}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl editorial-panel hover:border-[#C93B1D]/50 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#C93B1D]/10 text-[#C93B1D] flex items-center justify-center group-hover:bg-[#C93B1D] group-hover:text-white transition-colors">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#18181B]">Video Storyboard</p>
              <p className="text-[11px] text-[#71717A] mt-0.5">3 numbered scenes</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleApplyMoodboardTemplate}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl editorial-panel hover:border-[#18181B]/30 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#F1EFEA] text-[#18181B] flex items-center justify-center group-hover:bg-[#18181B] group-hover:text-white transition-colors">
              <Layout className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#18181B]">Brand Moodboard</p>
              <p className="text-[11px] text-[#71717A] mt-0.5">Visual + notes split</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => addCard('note')}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl editorial-panel hover:border-[#18181B]/30 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#F1EFEA] text-[#18181B] flex items-center justify-center group-hover:bg-[#18181B] group-hover:text-white transition-colors">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#18181B]">Blank Note</p>
              <p className="text-[11px] text-[#71717A] mt-0.5">Start freehand</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
