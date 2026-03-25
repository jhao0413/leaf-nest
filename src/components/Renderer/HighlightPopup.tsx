'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from '@/i18n';
import { Check, Trash2, PenLine, Highlighter, Underline } from 'lucide-react';
import { Highlight } from '@/store/highlightStore';
import { PopupPosition } from '@/hooks/useTextSelection';

const DEFAULT_HIGHLIGHT_COLOR = 'yellow';
const COLORS = ['yellow', 'green', 'blue', 'pink'] as const;

const colorDotStyles: Record<string, string> = {
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
  blue: 'bg-blue-400',
  pink: 'bg-pink-400'
};

interface CreateHighlightPopupProps {
  position: PopupPosition;
  onCreateHighlight: (
    color: string,
    style: 'highlight' | 'underline' | 'note',
    note: string
  ) => void;
  onClose: () => void;
}

export function CreateHighlightPopup({
  position,
  onCreateHighlight,
  onClose
}: CreateHighlightPopupProps) {
  const t = useTranslations('Highlights');
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const adjustedPosition = useAdjustedPosition(popupRef, position);

  useEffect(() => {
    if (showNote) {
      noteInputRef.current?.focus();
    }
  }, [showNote]);

  const handleCreate = (style: 'highlight' | 'underline' | 'note') => {
    if (style === 'note' && note.trim() === '') {
      return;
    }
    onCreateHighlight(DEFAULT_HIGHLIGHT_COLOR, style, note);
    onClose();
  };

  return (
    <div
      id="highlight-popup"
      ref={popupRef}
      role="dialog"
      aria-label={t('addThought')}
      className="fixed z-[100] bg-white dark:bg-neutral-800 shadow-lg rounded-xl p-2 border border-gray-200 dark:border-neutral-700"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: 'translate(-50%, -100%)'
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 border-r border-gray-200 dark:border-neutral-600 pr-2">
          <button
            className="py-1.5 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors flex flex-col items-center"
            onClick={() => handleCreate('underline')}
            title={t('underline')}
          >
            <Underline size={16} />
            <span className="text-[10px] mt-0.5 text-gray-500 dark:text-gray-300">
              {t('underline')}
            </span>
          </button>
          <button
            className="py-1.5 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors flex flex-col items-center"
            onClick={() => handleCreate('highlight')}
            title={t('highlight')}
          >
            <Highlighter size={16} />
            <span className="text-[10px] mt-0.5 text-gray-500 dark:text-gray-300">
              {t('highlight')}
            </span>
          </button>
        </div>

        {/* Note button */}
        <button
          className={`py-1.5 px-2 rounded-lg transition-colors flex flex-col items-center ${
            showNote
              ? 'bg-gray-200 dark:bg-neutral-600'
              : 'hover:bg-gray-100 dark:hover:bg-neutral-700'
          }`}
          onClick={() => setShowNote(!showNote)}
          title={t('addThought')}
        >
          <PenLine size={16} />
          <span className="text-[10px] mt-0.5 text-gray-500 dark:text-gray-300">
            {t('addThought')}
          </span>
        </button>
      </div>

      {showNote && (
        <div className="mt-2 flex flex-col gap-1.5">
          <textarea
            ref={noteInputRef}
            className="w-56 h-16 text-sm p-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder={t('notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => handleCreate('note')}
              disabled={note.trim() === ''}
            >
              <Check size={14} />
              <span>{t('confirm')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface EditHighlightPopupProps {
  position: PopupPosition;
  highlight: Highlight;
  onUpdateNote: (id: string, note: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function EditHighlightPopup({
  position,
  highlight,
  onUpdateNote,
  onUpdateColor,
  onDelete,
  onClose
}: EditHighlightPopupProps) {
  const t = useTranslations('Highlights');
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(highlight.note || '');
  const popupRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const adjustedPosition = useAdjustedPosition(popupRef, position);

  useEffect(() => {
    if (editingNote) {
      noteInputRef.current?.focus();
    }
  }, [editingNote]);

  const handleSaveNote = () => {
    onUpdateNote(highlight.id, note);
    setEditingNote(false);
  };

  const handleDelete = () => {
    onDelete(highlight.id);
    onClose();
  };

  return (
    <div
      id="highlight-popup"
      ref={popupRef}
      role="dialog"
      aria-label={highlight.note ? t('editThought') : t('addThought')}
      className="fixed z-[100] bg-white dark:bg-neutral-800 shadow-lg rounded-xl p-2 border border-gray-200 dark:border-neutral-700"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: 'translate(-50%, -100%)'
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {highlight.note && !editingNote && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 max-w-56 line-clamp-3 px-1">
          {highlight.note}
        </p>
      )}

      {editingNote && (
        <div className="mb-2">
          <textarea
            ref={noteInputRef}
            className="w-56 h-16 text-sm p-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder={t('notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end mt-1">
            <button
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              onClick={handleSaveNote}
            >
              {t('save')}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 border-r border-gray-200 dark:border-neutral-600 pr-2">
          {COLORS.map((color) => (
            <button
              key={color}
              className={`w-4 h-4 rounded-full ${colorDotStyles[color]} ${
                highlight.color === color ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => onUpdateColor(highlight.id, color)}
              title={color}
            />
          ))}
        </div>
        <button
          className="flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
          onClick={() => setEditingNote(!editingNote)}
        >
          <PenLine size={14} />
          <span>{highlight.note ? t('editThought') : t('addThought')}</span>
        </button>
        <button
          className="flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          onClick={handleDelete}
        >
          <Trash2 size={14} />
          <span>{t('deleteHighlight')}</span>
        </button>
      </div>
    </div>
  );
}

function useAdjustedPosition(
  ref: React.RefObject<HTMLDivElement | null>,
  position: PopupPosition
): PopupPosition {
  if (typeof window === 'undefined' || !ref.current) return position;

  const rect = ref.current.getBoundingClientRect();
  let x = position.x;
  let y = position.y;

  // Prevent overflow on left/right
  const halfWidth = rect.width / 2;
  if (x - halfWidth < 8) x = halfWidth + 8;
  if (x + halfWidth > window.innerWidth - 8) x = window.innerWidth - halfWidth - 8;

  // If popup would go above viewport, show below selection instead
  if (y - rect.height < 8) {
    y = position.y + 40;
  }

  return { x, y };
}
