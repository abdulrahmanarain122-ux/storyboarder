import React from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Canvas & Navigation',
      items: [
        { action: 'Pan Canvas', keys: ['Space + Drag', 'Middle Click'] },
        { action: 'Zoom In / Out', keys: ['Scroll Wheel', '+ / -'] },
        { action: 'Select / Hand / Frame Tool', keys: ['V', 'H', 'F'] },
        { action: 'Toggle Dot Grid', keys: ['G'] },
        { action: 'Search & Jump', keys: ['⌘K', 'Ctrl + K'] },
      ],
    },
    {
      category: 'Cards & Media',
      items: [
        { action: 'Paste Image, Text, or Link', keys: ['⌘V', 'Ctrl + V'] },
        { action: 'Edit Note Text', keys: ['Double-Click Note'] },
        { action: 'Duplicate Card', keys: ['⌘D', 'Ctrl + D'] },
        { action: 'Undo / Redo', keys: ['⌘Z', '⌘⇧Z'] },
        { action: 'Delete Selected', keys: ['Delete', 'Backspace'] },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[82vh] flex flex-col rounded-2xl bg-white border border-black/12 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/8 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#C93B1D]/10 text-[#C93B1D] flex items-center justify-center">
              <Command className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-[#18181B] tracking-tight">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F1EFEA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {shortcuts.map((group) => (
            <div key={group.category} className="space-y-2">
              <h3 className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">
                {group.category}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F8F7F4] text-xs"
                  >
                    <span className="text-[#18181B] font-medium">{item.action}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-1.5 py-0.5 rounded bg-white border border-black/10 text-[10px] font-mono text-[#52525B]"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Footer */}
        <div className="px-5 py-3 border-t border-black/8 bg-[#F8F7F4] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#C93B1D] hover:bg-[#B03217] text-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
