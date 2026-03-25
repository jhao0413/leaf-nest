import { useState, useCallback, useEffect } from 'react';
import { serializeSelection, SerializedSelection } from '@/utils/selectionSerializer';

export interface PopupPosition {
  x: number;
  y: number;
}

export function useTextSelection(iframeReady: boolean) {
  const [selectionInfo, setSelectionInfo] = useState<SerializedSelection | null>(null);
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(null);
  const [clickedHighlightId, setClickedHighlightId] = useState<string | null>(null);
  const [clickedHighlightPosition, setClickedHighlightPosition] = useState<PopupPosition | null>(
    null
  );

  const clearSelection = useCallback(() => {
    setSelectionInfo(null);
    setPopupPosition(null);
    setClickedHighlightId(null);
    setClickedHighlightPosition(null);
  }, []);

  useEffect(() => {
    if (!iframeReady) return;

    const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
    const iframeDoc = renderer?.contentDocument;
    if (!iframeDoc) return;

    const handleMouseUp = () => {
      requestAnimationFrame(() => {
        const selection = iframeDoc.getSelection();
        if (!selection || selection.toString().trim() === '' || selection.rangeCount === 0) {
          return;
        }

        const serialized = serializeSelection(iframeDoc, selection);
        if (!serialized) return;

        const range = selection.getRangeAt(0);
        const rangeRect = range.getBoundingClientRect();
        const iframeRect = renderer.getBoundingClientRect();

        setSelectionInfo(serialized);
        setPopupPosition({
          x: iframeRect.left + rangeRect.left + rangeRect.width / 2,
          y: iframeRect.top + rangeRect.top - 10
        });
        setClickedHighlightId(null);
        setClickedHighlightPosition(null);
      });
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('epub-user-highlight')) {
        e.preventDefault();
        e.stopPropagation();

        const highlightId = target.dataset.highlightId;
        if (!highlightId) return;

        const rect = target.getBoundingClientRect();
        const iframeRect = renderer.getBoundingClientRect();

        setClickedHighlightId(highlightId);
        setClickedHighlightPosition({
          x: iframeRect.left + rect.left + rect.width / 2,
          y: iframeRect.top + rect.top - 10
        });
        setSelectionInfo(null);
        setPopupPosition(null);
        return;
      }

      if (selectionInfo || popupPosition || clickedHighlightId || clickedHighlightPosition) {
        clearSelection();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const popup = document.getElementById('highlight-popup');
      if (popup && popup.contains(e.target as Node)) return;
      clearSelection();
    };

    iframeDoc.addEventListener('mouseup', handleMouseUp);
    iframeDoc.addEventListener('touchend', handleMouseUp);
    iframeDoc.addEventListener('click', handleClick);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      iframeDoc.removeEventListener('mouseup', handleMouseUp);
      iframeDoc.removeEventListener('touchend', handleMouseUp);
      iframeDoc.removeEventListener('click', handleClick);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [
    clickedHighlightId,
    clickedHighlightPosition,
    iframeReady,
    popupPosition,
    selectionInfo,
    clearSelection
  ]);

  return {
    selectionInfo,
    popupPosition,
    clickedHighlightId,
    clickedHighlightPosition,
    clearSelection
  };
}
