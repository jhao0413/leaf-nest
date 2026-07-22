import { useCallback, useEffect, useRef, useState } from 'react';
import { bindImagePreviewInteractions, type PreviewableImage } from '@/utils/iframeHandler';

export const useEpubImagePreview = (iframeReady: boolean, documentKey: unknown) => {
  const [activeImage, setActiveImage] = useState<PreviewableImage | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const openImagePreview = useCallback((image: PreviewableImage) => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    setActiveImage(image);
    setIsImagePreviewOpen(true);
  }, []);

  useEffect(() => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    setIsImagePreviewOpen(false);
    setActiveImage(null);
    if (!iframeReady) return;

    const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement | null;
    const iframeDoc = renderer?.contentDocument;
    if (!iframeDoc) return;

    return bindImagePreviewInteractions(iframeDoc, openImagePreview);
  }, [documentKey, iframeReady, openImagePreview]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    },
    []
  );

  const closeImagePreview = useCallback(() => {
    setIsImagePreviewOpen(false);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setActiveImage((image) => {
        if (image?.trigger.isConnected) image.trigger.focus();
        return null;
      });
      closeTimerRef.current = null;
    }, 200);
  }, []);

  return { activeImage, isImagePreviewOpen, closeImagePreview };
};
