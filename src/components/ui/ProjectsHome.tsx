import React, { useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { db } from '../../db/database';
import type { BoardRecord } from '../../types/canvas';
import {
  Layers,
  Plus,
  Upload,
  CheckCircle2,
  Loader2,
  Edit3,
  Copy,
  Trash2,
  Check,
  Search,
  ArrowUpRight,
  Sun,
  Moon,
} from 'lucide-react';

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

const BoardMiniPreview: React.FC<{ record?: BoardRecord }> = ({ record }) => {
  if (!record) {
    return <div className="w-full h-full bg-[#F8F7F4]" />;
  }

  const cards = Object.values(record.cards || {});
  const frames = Object.values(record.frames || {});

  if (cards.length === 0 && frames.length === 0) {
    return (
      <div
        className="w-full h-full bg-[#F8F7F4] flex items-center justify-center"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(24,24,27,0.12) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      >
        <span className="text-[11px] font-mono text-[#A1A1AA]">Empty canvas</span>
      </div>
    );
  }

  const allX = [...cards.map((c) => c.x), ...frames.map((f) => f.x)];
  const allY = [...cards.map((c) => c.y), ...frames.map((f) => f.y)];
  const allMaxX = [...cards.map((c) => c.x + c.width), ...frames.map((f) => f.x + f.width)];
  const allMaxY = [...cards.map((c) => c.y + c.height), ...frames.map((f) => f.y + f.height)];

  const pad = 120;
  const minX = Math.min(...allX) - pad;
  const minY = Math.min(...allY) - pad;
  const maxX = Math.max(...allMaxX) + pad;
  const maxY = Math.max(...allMaxY) + pad;

  const worldW = Math.max(400, maxX - minX);
  const worldH = Math.max(250, maxY - minY);

  const viewW = 320;
  const viewH = 200;
  const scale = Math.min(viewW / worldW, viewH / worldH);
  const offsetX = (viewW - worldW * scale) / 2;
  const offsetY = (viewH - worldH * scale) / 2;

  return (
    <div
      className="w-full h-full bg-[#F8F7F4] relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(24,24,27,0.12) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
      }}
    >
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Frames */}
        {frames.map((f) => {
          const x = offsetX + (f.x - minX) * scale;
          const y = offsetY + (f.y - minY) * scale;
          const w = Math.max(12, f.width * scale);
          const h = Math.max(10, (f.collapsed ? 52 : f.height) * scale);
          const stroke = f.color || '#18181B';
          return (
            <rect
              key={f.id}
              x={x}
              y={y}
              width={w}
              height={h}
              rx={4}
              fill={stroke}
              fillOpacity={0.04}
              stroke={stroke}
              strokeOpacity={0.35}
              strokeWidth={1}
              strokeDasharray={f.styleVariant === 'cluster' ? undefined : '3 2'}
            />
          );
        })}

        {/* Cards */}
        {cards.map((c) => {
          const x = offsetX + (c.x - minX) * scale;
          const y = offsetY + (c.y - minY) * scale;
          const w = Math.max(10, c.width * scale);
          const h = Math.max(8, c.height * scale);
          const accent =
            c.type === 'video' || c.type === 'embed-url'
              ? '#18181B'
              : c.color || '#FFFFFF';
          const isDarkMedia = c.type === 'video' || c.type === 'embed-url';

          return (
            <g key={c.id}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={3}
                fill={isDarkMedia ? '#27272A' : '#FFFFFF'}
                stroke={c.color ? c.color : 'rgba(24,24,27,0.18)'}
                strokeWidth={1}
              />
              {!isDarkMedia && (
                <rect
                  x={x + 2.5}
                  y={y + 3}
                  width={Math.max(4, w * 0.45)}
                  height={Math.min(2.5, h * 0.18)}
                  rx={1}
                  fill={c.type === 'note' && c.color ? accent : '#A1A1AA'}
                  fillOpacity={0.65}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const ProjectsHome: React.FC = () => {
  const importInputRef = useRef<HTMLInputElement>(null);

  const availableBoards = useCanvasStore((s) => s.availableBoards);
  const saveStatus = useCanvasStore((s) => s.saveStatus);
  const theme = useCanvasStore((s) => s.theme);
  const toggleTheme = useCanvasStore((s) => s.toggleTheme);
  const openProject = useCanvasStore((s) => s.openProject);
  const createBoard = useCanvasStore((s) => s.createBoard);
  const renameBoard = useCanvasStore((s) => s.renameBoard);
  const duplicateBoard = useCanvasStore((s) => s.duplicateBoard);
  const deleteBoard = useCanvasStore((s) => s.deleteBoard);
  const importBoard = useCanvasStore((s) => s.importBoard);

  const [recordsMap, setRecordsMap] = useState<Record<string, BoardRecord>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    let active = true;
    db.boards.toArray().then((all) => {
      if (!active) return;
      const map: Record<string, BoardRecord> = {};
      for (const b of all) {
        map[b.id] = b;
      }
      setRecordsMap(map);
    });
    return () => {
      active = false;
    };
  }, [availableBoards]);

  const filteredBoards = availableBoards.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim() || `Project ${availableBoards.length + 1}`;
    setIsNewModalOpen(false);
    setNewTitle('');
    await createBoard(title);
  };

  const handleRenameSubmit = async (boardId: string) => {
    if (renameValue.trim()) {
      await renameBoard(boardId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importBoard(file);
    e.target.value = '';
  };

  return (
    <div
      className={`w-screen h-screen overflow-y-auto select-none transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-[#121215] text-[#F4F4F5]'
          : 'bg-[#F8F7F4] text-[#18181B]'
      }`}
    >
      <input
        ref={importInputRef}
        type="file"
        accept=".board,.zip,application/zip"
        onChange={handleImportChange}
        className="hidden"
      />

      {/* Top Navigation Strip */}
      <header className="max-w-5xl mx-auto px-6 sm:px-12 pt-8 sm:pt-12 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#C93B1D] flex items-center justify-center shadow-xs">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">Storyboarder</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-black/12 hover:border-black/25 text-[#18181B] transition-all"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-[#52525B]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-black/12 hover:border-black/25 text-xs font-medium text-[#18181B] transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-[#52525B]" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewTitle(`Project ${availableBoards.length + 1}`);
              setIsNewModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C93B1D] hover:bg-[#B03217] text-xs font-semibold text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      </header>

      {/* Editorial Hero & Filter Bar */}
      <section className="max-w-5xl mx-auto px-6 sm:px-12 pt-12 pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-black/8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#C93B1D]">
              Workspace
            </span>
            <span className="text-black/20">•</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-[#71717A]">
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3 h-3 text-[#C93B1D] animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Auto-saved locally</span>
                </>
              )}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Projects
          </h1>
        </div>

        {availableBoards.length > 1 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-black/10 w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter projects..."
              className="w-full bg-transparent text-xs text-[#18181B] placeholder:text-[#A1A1AA] outline-none"
            />
          </div>
        )}
      </section>

      {/* Projects Grid */}
      <section className="max-w-5xl mx-auto px-6 sm:px-12 py-10 pb-20">
        {filteredBoards.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm font-medium text-[#18181B]">
              {searchQuery ? `No projects matching "${searchQuery}"` : 'No projects yet'}
            </p>
            <p className="text-xs text-[#71717A] mt-1 mb-5">
              Every project you create is automatically saved in your browser.
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setNewTitle('Project 1');
                  setIsNewModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C93B1D] hover:bg-[#B03217] text-xs font-semibold text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Project</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoards.map((board) => {
              const isRenaming = renamingId === board.id;

              return (
                <div
                  key={board.id}
                  onClick={() => {
                    if (!isRenaming) openProject(board.id);
                  }}
                  className="group rounded-2xl bg-white border border-black/10 hover:border-black/25 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer"
                >
                  {/* Spatial Board Thumbnail */}
                  <div className="aspect-[16/10] w-full border-b border-black/6 relative overflow-hidden">
                    <BoardMiniPreview record={recordsMap[board.id]} />
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 border border-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#18181B]" />
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {isRenaming ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSubmit(board.id);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            onBlur={() => handleRenameSubmit(board.id)}
                            className="w-full px-2 py-0.5 rounded bg-[#F8F7F4] border border-[#C93B1D] text-sm font-semibold text-[#18181B] outline-none"
                          />
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleRenameSubmit(board.id);
                            }}
                            className="p-1 rounded text-emerald-700 hover:bg-[#F1EFEA]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h2 className="text-sm font-semibold text-[#18181B] truncate">
                            {board.title}
                          </h2>
                          <p className="text-[11px] font-mono text-[#71717A] mt-0.5">
                            {board.cardCount} item{board.cardCount !== 1 ? 's' : ''} ·{' '}
                            {formatRelativeTime(board.updatedAt)}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Hover Actions */}
                    {!isRenaming && (
                      <div
                        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          title="Rename"
                          onClick={() => {
                            setRenamingId(board.id);
                            setRenameValue(board.title);
                          }}
                          className="p-1.5 rounded-lg text-[#52525B] hover:text-[#18181B] hover:bg-[#F1EFEA]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Duplicate"
                          onClick={() => duplicateBoard(board.id)}
                          className="p-1.5 rounded-lg text-[#52525B] hover:text-[#18181B] hover:bg-[#F1EFEA]"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {availableBoards.length > 1 && (
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => {
                              if (confirm(`Delete project "${board.title}"?`)) {
                                deleteBoard(board.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#C93B1D] hover:bg-[#C93B1D]/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* New Project Modal */}
      {isNewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsNewModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white border border-black/12 shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold tracking-tight text-[#18181B] mb-1">
              New Project
            </h3>
            <p className="text-xs text-[#52525B] mb-4">
              Name your spatial board. It saves automatically as you work.
            </p>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder="e.g. Autumn Campaign"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F7F4] border border-black/15 text-xs text-[#18181B] placeholder:text-[#71717A] focus:outline-none focus:border-[#C93B1D]"
              />
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/8">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#52525B] hover:text-[#18181B] hover:bg-[#F1EFEA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#C93B1D] hover:bg-[#B03217] text-xs font-semibold text-white transition-colors"
                >
                  Create &amp; Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
