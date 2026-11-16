import { useState, useEffect } from 'react';
import { InfiniteCanvas } from './components/canvas/InfiniteCanvas';
import { TopBar } from './components/ui/TopBar';
import { CanvasToolbar } from './components/ui/CanvasToolbar';
import { CardInspector } from './components/ui/CardInspector';
import { Minimap } from './components/ui/Minimap';
import { ShortcutsModal } from './components/ui/ShortcutsModal';
import { CommandPalette } from './components/ui/CommandPalette';
import { ProjectsHome } from './components/ui/ProjectsHome';
import { useCanvasStore } from './store/canvasStore';

export function App() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const activeView = useCanvasStore((s) => s.activeView);
  const theme = useCanvasStore((s) => s.theme);
  const initDB = useCanvasStore((s) => s.initDB);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    initDB();
  }, [initDB]);

  useEffect(() => {
    (window as unknown as { __canvasStore: typeof useCanvasStore }).__canvasStore = useCanvasStore;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (useCanvasStore.getState().activeView !== 'canvas') return;

      const target = e.target;
      const isElement = target instanceof Element;
      const isTyping =
        (isElement &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            (target as HTMLElement).isContentEditable ||
            Boolean(target.closest('input, textarea, [contenteditable="true"], .ProseMirror')))) ||
        Boolean(useCanvasStore.getState().editingCardId);

      if (isTyping) return;

      if (e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };

    const flushAutoSave = () => {
      useCanvasStore.getState().saveToDB();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushAutoSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flushAutoSave);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flushAutoSave);
    };
  }, []);

  if (activeView === 'projects') {
    return <ProjectsHome />;
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#F8F7F4] dark:bg-[#121215] text-[#18181B] dark:text-[#F4F4F5] select-none transition-colors duration-200">
      {/* Top Floating App Bar */}
      <TopBar
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* The Core Spatial Engine Infinite 2D Canvas */}
      <InfiniteCanvas />

      {/* Floating Bottom Toolbar */}
      <CanvasToolbar />

      {/* Floating Contextual Inspector for Active Card */}
      <CardInspector />

      {/* Interactive Minimap */}
      <Minimap />

      {/* Shortcuts & Documentation Modal */}
      <ShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Global Quick Search & Command Palette (Ctrl+K / Cmd+K) */}
      <CommandPalette
        isOpen={searchOpen}
        onOpen={() => setSearchOpen(true)}
        onClose={() => setSearchOpen(false)}
      />
    </main>
  );
}

export default App;
