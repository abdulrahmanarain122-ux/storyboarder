import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Node, mergeAttributes } from '@tiptap/core';
import type { CanvasCard } from '../../types/canvas';
import { useCanvasStore } from '../../store/canvasStore';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Check,
  Play,
} from 'lucide-react';
import { mediaService } from '../../services/mediaService';

// TipTap Atom Node for Interactive Timestamp Badges
const TimestampBadgeExtension = Node.create({
  name: 'timestampBadge',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      'data-video-id': {
        default: null,
      },
      'data-time': {
        default: null,
      },
      label: {
        default: '⏱ 00:00',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'button.timestamp-badge',
        getAttrs: (dom) => {
          if (typeof dom === 'string') return {};
          const el = dom as HTMLElement;
          return {
            'data-video-id': el.getAttribute('data-video-id'),
            'data-time': el.getAttribute('data-time'),
            label: el.textContent?.trim() || '⏱ 00:00',
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'button',
      mergeAttributes(HTMLAttributes, {
        type: 'button',
        class: 'timestamp-badge',
        'data-video-id': node.attrs['data-video-id'],
        'data-time': node.attrs['data-time'],
      }),
      node.attrs.label || '⏱ 00:00',
    ];
  },
});

interface RichTextNoteCardProps {
  card: CanvasCard;
  isSelected: boolean;
  isEditing: boolean;
  onEnterEdit: () => void;
  onExitEdit: () => void;
}

export const RichTextNoteCard: React.FC<RichTextNoteCardProps> = ({
  card,
  isEditing,
  onEnterEdit,
  onExitEdit,
}) => {
  const updateCard = useCanvasStore((s) => s.updateCard);
  const seekMedia = useCanvasStore((s) => s.seekMedia);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      TimestampBadgeExtension,
    ],
    content: card.content || '<p>Write your ideas, brief, or feedback here...</p>',
    editable: isEditing,
    onUpdate: ({ editor }) => {
      updateCard(card.id, { content: editor.getHTML() });
    },
  });

  // Toggle TipTap editable status when isEditing state changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
      if (isEditing) {
        editor.commands.focus('end');
      }
    }
  }, [isEditing, editor]);

  // Sync external content update if changed externally
  useEffect(() => {
    if (editor && card.content && editor.getHTML() !== card.content) {
      if (!editor.isFocused) {
        editor.commands.setContent(card.content, { emitUpdate: false });
      }
    }
  }, [card.content, editor]);

  // Click delegation for interactive timestamp badges
  const handleContentClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('.timestamp-badge');
    if (target) {
      e.stopPropagation();
      e.preventDefault();
      const videoId = target.getAttribute('data-video-id') || (card.metadata?.sourceCardId as string);
      const timeAttr = target.getAttribute('data-time');
      const time = timeAttr !== null ? parseFloat(timeAttr) : (card.metadata?.timestamp as number);
      if (videoId && time !== undefined && !isNaN(time)) {
        seekMedia(videoId, time);
      }
      return;
    }
    if (isEditing) {
      e.stopPropagation();
    }
  };

  const handleContentPointerDown = (e: React.PointerEvent) => {
    const target = (e.target as HTMLElement).closest('.timestamp-badge');
    if (target) {
      e.stopPropagation();
      return;
    }
    if (isEditing) {
      e.stopPropagation();
    }
  };

  if (!editor) return null;

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEnterEdit();
      }}
      onPointerDown={handleContentPointerDown}
      onClick={handleContentClick}
      className="flex-1 w-full h-full min-h-0 flex flex-col overflow-hidden relative"
    >
      {/* 1. Rich Text Formatting Toolbar (only visible in edit mode) */}
      {isEditing ? (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between gap-1 px-2.5 py-1.5 bg-[#F8F7F4] border-b border-black/10 shrink-0 overflow-x-auto z-10 animate-in fade-in duration-100"
        >
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1 rounded hover:bg-black/5 transition-colors ${
                editor.isActive('bold') ? 'text-[#C93B1D] bg-[#C93B1D]/10' : 'text-[#52525B] hover:text-[#18181B]'
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1 rounded hover:bg-black/5 transition-colors ${
                editor.isActive('italic') ? 'text-[#C93B1D] bg-[#C93B1D]/10' : 'text-[#52525B] hover:text-[#18181B]'
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1 rounded hover:bg-black/5 transition-colors ${
                editor.isActive('strike') ? 'text-[#C93B1D] bg-[#C93B1D]/10' : 'text-[#52525B] hover:text-[#18181B]'
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="w-3 h-3" />
            </button>

            <div className="w-[1px] h-3.5 bg-black/10 mx-0.5" />

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1 rounded hover:bg-black/5 transition-colors ${
                editor.isActive('heading', { level: 1 }) ? 'text-[#C93B1D] bg-[#C93B1D]/10' : 'text-[#52525B] hover:text-[#18181B]'
              }`}
              title="Heading 1"
            >
              <Heading1 className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1 rounded hover:bg-black/5 transition-colors ${
                editor.isActive('heading', { level: 2 }) ? 'text-[#C93B1D] bg-[#C93B1D]/10' : 'text-[#52525B] hover:text-[#18181B]'
              }`}
              title="Heading 2"
            >
              <Heading2 className="w-3 h-3" />
            </button>

            <div className="w-[1px] h-3.5 bg-black/10 mx-0.5" />

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1 rounded hover:bg-black/5 transition-colors ${
                editor.isActive('bulletList') ? 'text-[#C93B1D] bg-[#C93B1D]/10' : 'text-[#52525B] hover:text-[#18181B]'
              }`}
              title="Bullet List"
            >
              <List className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1 rounded hover:bg-black/5 transition-colors ${
                editor.isActive('orderedList') ? 'text-[#C93B1D] bg-[#C93B1D]/10' : 'text-[#52525B] hover:text-[#18181B]'
              }`}
              title="Numbered List"
            >
              <ListOrdered className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1 rounded hover:bg-black/5 transition-colors ${
                editor.isActive('blockquote') ? 'text-[#C93B1D] bg-[#C93B1D]/10' : 'text-[#52525B] hover:text-[#18181B]'
              }`}
              title="Quote"
            >
              <Quote className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-1 rounded hover:bg-black/5 transition-colors ${
                editor.isActive('code') ? 'text-[#C93B1D] bg-[#C93B1D]/10' : 'text-[#52525B] hover:text-[#18181B]'
              }`}
              title="Code"
            >
              <Code className="w-3 h-3" />
            </button>
          </div>

          {/* Exit Edit Mode Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExitEdit();
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#C93B1D] hover:bg-[#B03217] text-white text-[11px] font-medium transition-colors shrink-0"
            title="Finish Editing (Esc)"
          >
            <Check className="w-3 h-3" />
            <span>Done</span>
          </button>
        </div>
      ) : null}
      {/* Interactive Time Jump Banner for Video-Linked Notes */}
      {card.metadata?.sourceCardId && card.metadata?.timestamp !== undefined && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            seekMedia(card.metadata!.sourceCardId as string, card.metadata!.timestamp as number);
          }}
          className="mx-3 mt-2 px-2.5 py-1.5 rounded-xl bg-[#C93B1D]/8 hover:bg-[#C93B1D]/15 border border-[#C93B1D]/25 text-[#18181B] text-xs font-mono flex items-center justify-between gap-2 transition-all group/jump cursor-pointer shrink-0 select-none"
          title={`Click to jump linked video to ${mediaService.formatDuration(card.metadata.timestamp as number)} and resume playback`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#C93B1D] text-white flex items-center justify-center">
              <Play className="w-2.5 h-2.5 fill-current" />
            </span>
            <span className="font-semibold">Jump to ⏱ {mediaService.formatDuration(card.metadata.timestamp as number)}</span>
          </div>
          <span className="text-[10px] text-[#C93B1D] font-sans font-semibold">
            Play →
          </span>
        </div>
      )}

      {/* 2. Editor Content Body */}
      <div
        onPointerDown={handleContentPointerDown}
        onClick={handleContentClick}
        className={`flex-1 w-full min-h-0 p-4 overflow-y-auto ${
          isEditing
            ? 'pointer-events-auto select-text cursor-text'
            : 'pointer-events-none select-none cursor-grab'
        }`}
      >
        <EditorContent
          editor={editor}
          className="h-full w-full [&>.ProseMirror]:min-h-full [&>.ProseMirror]:w-full"
        />
      </div>
    </div>
  );
};
