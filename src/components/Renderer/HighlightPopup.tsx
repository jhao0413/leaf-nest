'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslations } from '@/i18n';
import { Check, Copy, Trash2, PenLine, Highlighter, Underline, Share2 } from 'lucide-react';
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
  onShare: () => void;
  onClose: () => void;
}

export function CreateHighlightPopup({
  position,
  onCreateHighlight,
  onShare,
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
      className="fixed z-[100] max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain bg-white dark:bg-neutral-800 shadow-lg rounded-xl p-2 border border-gray-200 dark:border-neutral-700"
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
        <button
          className="py-1.5 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors flex flex-col items-center"
          onClick={onShare}
          title={t('share')}
        >
          <Share2 size={16} />
          <span className="text-[10px] mt-0.5 text-gray-500 dark:text-gray-300">{t('share')}</span>
        </button>
      </div>

      {showNote && (
        <div className="mt-2 flex flex-col gap-1.5">
          <textarea
            ref={noteInputRef}
            className="h-16 w-56 resize-none rounded-lg border border-gray-200 bg-transparent p-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400 dark:border-neutral-600 dark:focus:ring-brand-300"
            placeholder={t('notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              className="flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-xs text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-brand-300 dark:text-brand-950 dark:hover:bg-brand-200"
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
  onShare: () => void;
  onClose: () => void;
}

export function EditHighlightPopup({
  position,
  highlight,
  onUpdateNote,
  onUpdateColor,
  onDelete,
  onShare,
  onClose
}: EditHighlightPopupProps) {
  const t = useTranslations('Highlights');
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(highlight.note || '');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [isCopying, setIsCopying] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const copyStatusTimerRef = useRef<number | null>(null);
  const copyRequestIdRef = useRef(0);
  const copyInFlightRef = useRef(false);

  const adjustedPosition = useAdjustedPosition(popupRef, position);

  useEffect(() => {
    if (editingNote) {
      noteInputRef.current?.focus();
    }
  }, [editingNote]);

  const clearCopyStatusTimer = useCallback(() => {
    if (copyStatusTimerRef.current !== null) {
      window.clearTimeout(copyStatusTimerRef.current);
      copyStatusTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    copyRequestIdRef.current += 1;
    copyInFlightRef.current = false;
    clearCopyStatusTimer();
    setIsCopying(false);
    setCopyStatus('idle');

    return () => {
      copyRequestIdRef.current += 1;
      copyInFlightRef.current = false;
      clearCopyStatusTimer();
    };
  }, [clearCopyStatusTimer, highlight.id]);

  const handleSaveNote = () => {
    onUpdateNote(highlight.id, note);
    setEditingNote(false);
  };

  const handleDelete = () => {
    onDelete(highlight.id);
    onClose();
  };

  const handleCopy = async () => {
    if (copyInFlightRef.current) return;

    copyInFlightRef.current = true;
    const requestId = copyRequestIdRef.current + 1;
    copyRequestIdRef.current = requestId;
    clearCopyStatusTimer();
    setCopyStatus('idle');
    setIsCopying(true);

    try {
      await copyTextToClipboard(highlight.selectedText, t('copy'));
      if (requestId !== copyRequestIdRef.current) return;

      setCopyStatus('copied');
      copyStatusTimerRef.current = window.setTimeout(() => {
        if (requestId === copyRequestIdRef.current) {
          setCopyStatus('idle');
          copyStatusTimerRef.current = null;
        }
      }, 1800);
    } catch {
      if (requestId !== copyRequestIdRef.current) return;
      setCopyStatus('failed');
    } finally {
      if (requestId === copyRequestIdRef.current) {
        copyInFlightRef.current = false;
        setIsCopying(false);
      }
    }
  };

  return (
    <div
      id="highlight-popup"
      ref={popupRef}
      role="dialog"
      aria-label={highlight.note ? t('editThought') : t('addThought')}
      className="fixed z-[100] max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain bg-white dark:bg-neutral-800 shadow-lg rounded-xl p-2 border border-gray-200 dark:border-neutral-700"
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
            className="h-16 w-56 resize-none rounded-lg border border-gray-200 bg-transparent p-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400 dark:border-neutral-600 dark:focus:ring-brand-300"
            placeholder={t('notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end mt-1">
            <button
              className="rounded-md bg-brand-600 px-2 py-1 text-xs text-white hover:bg-brand-700 dark:bg-brand-300 dark:text-brand-950 dark:hover:bg-brand-200"
              onClick={handleSaveNote}
            >
              {t('save')}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
        <div className="flex items-center gap-1 border-r border-gray-200 dark:border-neutral-600 pr-2">
          {COLORS.map((color) => (
            <button
              key={color}
              className={`w-4 h-4 rounded-full ${colorDotStyles[color]} ${
                highlight.color === color ? 'ring-2 ring-brand-600 dark:ring-brand-300' : ''
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
          type="button"
          className="flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg hover:bg-gray-100 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-neutral-700 transition-colors"
          onClick={() => void handleCopy()}
          disabled={isCopying}
          aria-busy={isCopying}
        >
          {copyStatus === 'copied' ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <Copy size={14} aria-hidden="true" />
          )}
          <span>{copyStatus === 'copied' ? t('copied') : t('copy')}</span>
        </button>
        <button
          className="flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
          onClick={onShare}
        >
          <Share2 size={14} />
          <span>{t('share')}</span>
        </button>
        <button
          className="flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          onClick={handleDelete}
        >
          <Trash2 size={14} />
          <span>{t('deleteHighlight')}</span>
        </button>
      </div>
      <output
        className={
          copyStatus === 'failed'
            ? 'mt-1 block px-1 text-xs text-red-500 dark:text-red-400'
            : 'sr-only'
        }
      >
        {copyStatus === 'copied' ? t('copied') : copyStatus === 'failed' ? t('copyFailed') : ''}
      </output>
    </div>
  );
}

async function copyTextToClipboard(text: string, accessibleLabel: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for non-secure browser contexts where the Clipboard API is unavailable.
    }
  }

  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
    throw new Error('Clipboard API is not available');
  }

  const activeElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  textarea.setAttribute('aria-label', accessibleLabel);
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let didCopy = false;

  try {
    didCopy = document.execCommand('copy');
  } finally {
    textarea.remove();
    activeElement?.focus({ preventScroll: true });
  }

  if (!didCopy) {
    throw new Error('Unable to copy text');
  }
}

function useAdjustedPosition(
  ref: React.RefObject<HTMLDivElement | null>,
  position: PopupPosition
): PopupPosition {
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useLayoutEffect(() => {
    const popup = ref.current;
    if (typeof window === 'undefined' || !popup) return;

    const updatePosition = () => {
      const rect = popup.getBoundingClientRect();
      const halfWidth = rect.width / 2;
      const minX = halfWidth + 8;
      const maxX = window.innerWidth - halfWidth - 8;
      const x = minX <= maxX ? Math.min(Math.max(position.x, minX), maxX) : window.innerWidth / 2;
      const preferredTop = position.y - rect.height;
      const fallbackTop = Math.min(position.y + 40, window.innerHeight - rect.height - 8);
      const top = Math.max(8, preferredTop >= 8 ? preferredTop : fallbackTop);
      const y = top + rect.height;

      setAdjustedPosition((current) => (current.x === x && current.y === y ? current : { x, y }));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    resizeObserver?.observe(popup);

    return () => {
      window.removeEventListener('resize', updatePosition);
      resizeObserver?.disconnect();
    };
  }, [position.x, position.y, ref]);

  return adjustedPosition;
}
