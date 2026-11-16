import React, { useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  Layers,
  HelpCircle,
  Maximize2,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Video,
  Music,
  Play,
  Download,
  Upload,
  Camera,
  Search,
  ChevronDown,
  Plus,
  Check,
  Edit3,
  Copy,
  Trash2,
  MoreHorizontal,
  Undo2,
  Redo2,
  ChevronLeft,
} from 'lucide-react';
import { InstagramIcon } from './InstagramIcon';

interface TopBarProps {
  onOpenShortcuts: () => void;
  onOpenSearch?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenShortcuts, onOpenSearch }) => {
  const boardImportInputRef = useRef<HTMLInputElement>(null);

  // Store state
  const cards = useCanvasStore((s) => s.cards);
  const resetViewport = useCanvasStore((s) => s.resetViewport);
  const fitToView = useCanvasStore((s) => s.fitToView);
  const saveStatus = useCanvasStore((s) => s.saveStatus);
  const ingestMediaUrl = useCanvasStore((s) => s.ingestMediaUrl);
  const exportBoard = useCanvasStore((s) => s.exportBoard);
  const importBoard = useCanvasStore((s) => s.importBoard);
  const notification = useCanvasStore((s) => s.notification);
  const clearNotification = useCanvasStore((s) => s.clearNotification);

  // Multi-board workspace state & actions
  const currentBoardId = useCanvasStore((s) => s.currentBoardId);
  const boardTitle = useCanvasStore((s) => s.boardTitle);
  const availableBoards = useCanvasStore((s) => s.availableBoards);
  const switchBoard = useCanvasStore((s) => s.switchBoard);
  const goToProjects = useCanvasStore((s) => s.goToProjects);
  const createBoard = useCanvasStore((s) => s.createBoard);
  const renameBoard = useCanvasStore((s) => s.renameBoard);
  const duplicateBoard = useCanvasStore((s) => s.duplicateBoard);
  const deleteBoard = useCanvasStore((s) => s.deleteBoard);
  const captureSnapshot = useCanvasStore((s) => s.captureSnapshot);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const canUndo = useCanvasStore((s) => s.historyPast.length > 0);
  const canRedo = useCanvasStore((s) => s.historyFuture.length > 0);

  // Local UI states
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // Menus & modals
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);
  const [isNewBoardModalOpen, setIsNewBoardModalOpen] = useState(false);
  const [newBoardTitleInput, setNewBoardTitleInput] = useState('');
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingBoardId, setRenamingBoardId] = useState('');
  const [renameInput, setRenameInput] = useState('');

  const cardCount = Object.keys(cards).length;

  // Listen for unified '+ Add -> Web Link' trigger from CanvasToolbar
  useEffect(() => {
    const handleOpenUrlModal = () => setIsUrlModalOpen(true);
    window.addEventListener('open-url-modal', handleOpenUrlModal);
    return () => window.removeEventListener('open-url-modal', handleOpenUrlModal);
  }, []);

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    await ingestMediaUrl(urlInput.trim());
    setUrlInput('');
    setIsUrlModalOpen(false);
  };

  const handleExportBoard = async () => {
    try {
      setIsExporting(true);
      await exportBoard();
    } finally {
      setIsExporting(false);
      setIsBoardMenuOpen(false);
    }
  };

  const handleBoardImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsImporting(true);
      await importBoard(file);
    } finally {
      setIsImporting(false);
      setIsBoardMenuOpen(false);
      e.target.value = '';
    }
  };

  const handleSnapshot = async () => {
    try {
      setIsTakingSnapshot(true);
      setIsBoardMenuOpen(false);
      await captureSnapshot();
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  const handleCreateBoardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitleInput.trim()) return;
    await createBoard(newBoardTitleInput.trim());
    setNewBoardTitleInput('');
    setIsNewBoardModalOpen(false);
  };

  const handleRenameBoardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameInput.trim() || !renamingBoardId) return;
    await renameBoard(renamingBoardId, renameInput.trim());
    setRenameInput('');
    setRenamingBoardId('');
    setIsRenameModalOpen(false);
  };

  return (
    <>
      <input
        ref={boardImportInputRef}
        type="file"
        accept=".board,.zip,application/zip"
        onChange={handleBoardImportChange}
        className="hidden"
      />

      {/* Floating Corner Islands Header */}
      <header className="absolute top-5 left-5 right-5 z-40 flex items-center justify-between pointer-events-none topbar-root snapshot-hide">
        {/* TOP-LEFT ISLAND: Brand + Workspace Switcher + Overflow Menu */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl editorial-panel pointer-events-auto">
          {/* Back to All Projects (Home) */}
          <button
            type="button"
            onClick={goToProjects}
            title="Back to All Projects (Auto-saves)"
            className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-xl editorial-button group"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[#71717A] group-hover:text-[#18181B] transition-colors" />
            <div className="w-6 h-6 rounded-lg bg-[#C93B1D] flex items-center justify-center shadow-xs">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-xs tracking-tight text-[#18181B] hidden sm:inline">
              Projects
            </span>
          </button>

          <div className="w-[1px] h-5 bg-black/10" />

          {/* Workspace Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsWorkspaceDropdownOpen((prev) => !prev);
                setIsBoardMenuOpen(false);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl editorial-button text-xs font-semibold text-[#18181B]"
              title="Switch or manage workspaces"
            >
              <span className="max-w-[140px] truncate">{boardTitle || 'Untitled Board'}</span>
              <span className="text-[10px] font-mono font-medium text-[#71717A] px-1.5 py-0.5 rounded bg-[#F1EFEA]">
                {cardCount}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#71717A] transition-transform duration-150 ${
                  isWorkspaceDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isWorkspaceDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsWorkspaceDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 mt-2.5 w-72 rounded-2xl bg-white border border-black/12 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-2.5 py-2 border-b border-black/10 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
                      Boards ({availableBoards.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsWorkspaceDropdownOpen(false);
                        setNewBoardTitleInput(`Board ${availableBoards.length + 1}`);
                        setIsNewBoardModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#C93B1D] hover:text-[#B03217] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Board</span>
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {availableBoards.map((b) => {
                      const isActive = b.id === currentBoardId;
                      return (
                        <div
                          key={b.id}
                          onClick={() => {
                            if (!isActive) switchBoard(b.id);
                            setIsWorkspaceDropdownOpen(false);
                          }}
                          className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                            isActive
                              ? 'bg-[#C93B1D]/10 text-[#18181B] font-semibold'
                              : 'hover:bg-[#F1EFEA] text-[#52525B]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            {isActive ? (
                              <Check className="w-3.5 h-3.5 text-[#C93B1D] shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" />
                            )}
                            <div className="truncate">
                              <p className="truncate text-[#18181B]">{b.title}</p>
                              <p className="text-[10px] text-[#71717A] font-normal">
                                {b.cardCount} item{b.cardCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              title="Rename Board"
                              onClick={() => {
                                setRenamingBoardId(b.id);
                                setRenameInput(b.title);
                                setIsRenameModalOpen(true);
                                setIsWorkspaceDropdownOpen(false);
                              }}
                              className="p-1.5 rounded-lg text-[#52525B] hover:text-[#18181B] hover:bg-black/5"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              title="Duplicate Board"
                              onClick={async () => {
                                await duplicateBoard(b.id);
                                setIsWorkspaceDropdownOpen(false);
                              }}
                              className="p-1.5 rounded-lg text-[#52525B] hover:text-[#18181B] hover:bg-black/5"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {availableBoards.length > 1 && (
                              <button
                                type="button"
                                title="Delete Board"
                                onClick={async () => {
                                  if (confirm(`Delete board "${b.title}"?`)) {
                                    await deleteBoard(b.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-[#C93B1D] hover:bg-[#C93B1D]/10"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Subtle Save Status */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-[#71717A]"
            title={saveStatus === 'saving' ? 'Saving to local IndexedDB...' : 'All changes saved locally'}
          >
            {saveStatus === 'saving' ? (
              <Loader2 className="w-3 h-3 text-[#C93B1D] animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            )}
          </div>

          <div className="w-[1px] h-5 bg-black/10" />

          {/* Clean Overflow Menu (Export, Import, Snapshot, Fit, Reset, Shortcuts) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsBoardMenuOpen((prev) => !prev);
                setIsWorkspaceDropdownOpen(false);
              }}
              title="Board Actions & View Options"
              className="flex items-center justify-center w-8 h-8 rounded-xl editorial-button text-[#52525B] hover:text-[#18181B]"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isBoardMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsBoardMenuOpen(false)}
                />
                <div className="absolute top-full left-0 mt-2.5 w-56 rounded-2xl bg-white border border-black/12 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      fitToView(window.innerWidth, window.innerHeight);
                      setIsBoardMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#52525B]" />
                    <span>Fit All to View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetViewport();
                      setIsBoardMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#52525B]" />
                    <span>Reset Zoom (100%)</span>
                  </button>

                  <div className="my-1.5 border-t border-black/10" />

                  <button
                    type="button"
                    onClick={handleSnapshot}
                    disabled={isTakingSnapshot}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#18181B] hover:bg-[#F1EFEA] disabled:opacity-50 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#52525B]" />
                    <span>{isTakingSnapshot ? 'Capturing...' : 'Export PNG Snapshot'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportBoard}
                    disabled={isExporting}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#18181B] hover:bg-[#F1EFEA] disabled:opacity-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[#52525B]" />
                    <span>{isExporting ? 'Exporting...' : 'Backup Board (.board)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => boardImportInputRef.current?.click()}
                    disabled={isImporting}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#18181B] hover:bg-[#F1EFEA] disabled:opacity-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#52525B]" />
                    <span>{isImporting ? 'Importing...' : 'Import Board (.board)'}</span>
                  </button>

                  <div className="my-1.5 border-t border-black/10" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsBoardMenuOpen(false);
                      onOpenShortcuts();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#52525B]" />
                      <span>Shortcuts & Help</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[#F1EFEA] border border-black/10 text-[10px] font-mono text-[#52525B]">
                      ?
                    </kbd>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* TOP-RIGHT ISLAND: Undo/Redo + Search */}
        <div className="flex items-center gap-1 p-1.5 rounded-2xl editorial-panel pointer-events-auto">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z / Cmd+Z)"
            className="flex items-center justify-center w-8 h-8 rounded-xl editorial-button disabled:opacity-30 disabled:pointer-events-none"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y / Cmd+Shift+Z)"
            className="flex items-center justify-center w-8 h-8 rounded-xl editorial-button disabled:opacity-30 disabled:pointer-events-none"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-5 bg-black/10 mx-0.5" />

          <button
            type="button"
            onClick={onOpenSearch}
            title="Search cards & notes (⌘K / Ctrl+K)"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl editorial-button text-xs font-medium text-[#18181B]"
          >
            <Search className="w-3.5 h-3.5 text-[#52525B]" />
            <span className="hidden sm:inline text-[#52525B]">Search</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#F1EFEA] border border-black/10 text-[10px] font-mono text-[#52525B]">
              ⌘K
            </kbd>
          </button>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {notification && (
        <div
          onClick={clearNotification}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full editorial-panel text-xs font-medium text-[#18181B] flex items-center gap-2.5 cursor-pointer animate-in fade-in slide-in-from-top-2 duration-200 snapshot-hide"
        >
          <span className="w-2 h-2 rounded-full bg-[#C93B1D]" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* New Workspace Dialog */}
      {isNewBoardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs animate-in fade-in duration-150 snapshot-hide">
          <div className="w-full max-w-sm rounded-2xl editorial-panel p-6">
            <h3 className="text-base font-bold tracking-tight text-[#18181B] mb-1">
              Create New Board
            </h3>
            <p className="text-xs text-[#52525B] mb-4">
              Give your new ideation board a clear title.
            </p>
            <form onSubmit={handleCreateBoardSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder="e.g. Brand Campaign Q4"
                value={newBoardTitleInput}
                onChange={(e) => setNewBoardTitleInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F7F4] border border-black/15 text-xs text-[#18181B] placeholder:text-[#71717A] focus:outline-none focus:border-[#C93B1D]"
              />
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setIsNewBoardModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#52525B] hover:text-[#18181B] hover:bg-[#F1EFEA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newBoardTitleInput.trim()}
                  className="px-4 py-1.5 rounded-xl bg-[#C93B1D] hover:bg-[#B03217] disabled:opacity-50 text-xs font-semibold text-white transition-colors"
                >
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Workspace Dialog */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs animate-in fade-in duration-150 snapshot-hide">
          <div className="w-full max-w-sm rounded-2xl editorial-panel p-6">
            <h3 className="text-base font-bold tracking-tight text-[#18181B] mb-1">
              Rename Board
            </h3>
            <p className="text-xs text-[#52525B] mb-4">Update the title of this board.</p>
            <form onSubmit={handleRenameBoardSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F7F4] border border-black/15 text-xs text-[#18181B] placeholder:text-[#71717A] focus:outline-none focus:border-[#C93B1D]"
              />
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#52525B] hover:text-[#18181B] hover:bg-[#F1EFEA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameInput.trim()}
                  className="px-4 py-1.5 rounded-xl bg-[#C93B1D] hover:bg-[#B03217] disabled:opacity-50 text-xs font-semibold text-white transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media URL Dialog with Presets */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs animate-in fade-in duration-150 snapshot-hide">
          <div className="w-full max-w-lg rounded-2xl editorial-panel p-6">
            <h3 className="text-base font-bold tracking-tight text-[#18181B] mb-1">
              Add Media from URL
            </h3>
            <p className="text-xs text-[#52525B] mb-4">
              Paste a YouTube, Vimeo, Instagram, direct MP4 video, or MP3 audio link.
            </p>

            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder="https://www.youtube.com/watch?v=..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F7F4] border border-black/15 text-xs text-[#18181B] placeholder:text-[#71717A] focus:outline-none focus:border-[#C93B1D] font-mono"
              />

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">
                  Sample Links
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUrlInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F1EFEA] hover:bg-black/10 text-[11px] font-medium text-[#18181B] transition-colors"
                  >
                    <Play className="w-3 h-3 text-[#C93B1D]" />
                    <span>YouTube</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrlInput('https://vimeo.com/76979871')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F1EFEA] hover:bg-black/10 text-[11px] font-medium text-[#18181B] transition-colors"
                  >
                    <Video className="w-3 h-3 text-[#52525B]" />
                    <span>Vimeo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setUrlInput(
                        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                      )
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F1EFEA] hover:bg-black/10 text-[11px] font-medium text-[#18181B] transition-colors"
                  >
                    <Video className="w-3 h-3 text-[#52525B]" />
                    <span>MP4 Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrlInput('https://www.instagram.com/reel/C8qY59hR_3A/')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F1EFEA] hover:bg-black/10 text-[11px] font-medium text-[#18181B] transition-colors"
                  >
                    <InstagramIcon className="w-3 h-3 text-[#52525B]" size={12} />
                    <span>Instagram</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setUrlInput('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3')
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F1EFEA] hover:bg-black/10 text-[11px] font-medium text-[#18181B] transition-colors"
                  >
                    <Music className="w-3 h-3 text-[#52525B]" />
                    <span>MP3 Audio</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#52525B] hover:text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!urlInput.trim()}
                  className="px-4 py-1.5 rounded-xl bg-[#C93B1D] hover:bg-[#B03217] disabled:opacity-50 text-xs font-semibold text-white transition-colors"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
