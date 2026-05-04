import { applyFontAndThemeStyles } from '@/utils/styleHandler';
import { TextPositionMapper, TextPosition } from './textPositionMapper';
import { useReaderStateStore } from '@/store/readerStateStore';
import type { MutableRefObject } from 'react';

const PAGE_SPACER_SELECTOR = '[data-epub-page-spacer="true"]';

interface RecalculateIframePagesOptions {
  renderer: HTMLIFrameElement;
  pageWidthRef: MutableRefObject<number>;
  pageCountRef: MutableRefObject<number>;
  setCurrentPageIndex: (pageIndex: number) => void;
  columnGap: number;
  goToLastPage?: boolean;
  currentSearchQuery?: string;
  onTextPositionsAnalyzed?: (searchQuery: string, positions: TextPosition[]) => void;
}

export const writeToIframe = (
  updatedChapter: string,
  currentFontConfig: {
    fontSize: number;
    fontFamily: string;
    fontUrl: string;
    fontFormat: string;
  },
  theme: string = 'light',
  mode: string = 'double',
  COLUMN_GAP: number
) => {
  const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
  if (!renderer || !renderer.contentWindow) {
    throw new Error('Renderer not found');
  }
  const iframeDoc =
    renderer.contentDocument || (renderer.contentWindow && renderer.contentWindow.document);

  const script = `
    <script>
      document.addEventListener('keydown', function(e) {
        // Create a new event and dispatch it to the parent window
        const event = new KeyboardEvent('keydown', {
          key: e.key,
          code: e.code,
          keyCode: e.keyCode,
          bubbles: true,
          cancelable: true
        });
        window.parent.document.dispatchEvent(event);
      });
    </script>
  `;
  iframeDoc.open();
  iframeDoc.write(updatedChapter + script);
  iframeDoc.close();

  applyFontAndThemeStyles(currentFontConfig, theme, mode, COLUMN_GAP);
  return renderer;
};

export const waitForImagesAndCalculatePages = (
  renderer: HTMLIFrameElement,
  iframeDoc: Document
): Promise<void> => {
  const iframeImages = iframeDoc.images;
  const imagesLoaded = Array.from(iframeImages).map((img) => {
    return new Promise<void>((resolve) => {
      if (img.complete) {
        resolve();
      } else {
        img.addEventListener('load', () => resolve());
        img.addEventListener('error', () => resolve());
      }
    });
  });

  return Promise.all(imagesLoaded).then(() => {
    if (!renderer?.contentWindow) {
      console.error('Renderer not found');
      return;
    }
  });
};

export const recalculateIframePages = ({
  renderer,
  pageWidthRef,
  pageCountRef,
  setCurrentPageIndex,
  columnGap,
  goToLastPage = false,
  currentSearchQuery = '',
  onTextPositionsAnalyzed
}: RecalculateIframePagesOptions): boolean => {
  const iframeDoc = renderer.contentDocument || renderer.contentWindow?.document;

  if (!iframeDoc || !renderer.contentWindow || !iframeDoc.body) {
    console.error('Iframe document not found');
    return false;
  }

  const body = renderer.contentWindow.document.body;
  const computedStyle = renderer.contentWindow.getComputedStyle(body);
  const marginLeft = parseFloat(computedStyle.marginLeft);
  const marginRight = parseFloat(computedStyle.marginRight);
  const newPageWidth = body.clientWidth - marginLeft - marginRight + columnGap;

  // Preserve the last good width for the next successful run, but report this
  // recalculation as failed while the body is transient (e.g. mid-resize 0 width).
  if (newPageWidth > 0 && newPageWidth !== pageWidthRef.current) {
    pageWidthRef.current = newPageWidth;
  }

  if (newPageWidth <= 0 || pageWidthRef.current <= 0) {
    return false;
  }

  // Remove any spacer from a previous run before measuring scrollWidth, otherwise
  // the spacer's width feeds back into the page count we compute below.
  body.querySelectorAll(PAGE_SPACER_SELECTOR).forEach((spacer) => spacer.remove());

  const scrollWidth = iframeDoc.body.scrollWidth;
  const ratio = scrollWidth / pageWidthRef.current;
  const fraction = ratio - Math.floor(ratio);

  // Add one stable spacer when the last generated page would otherwise be too short.
  if (fraction <= 0.5) {
    const emptyDiv = renderer.contentWindow.document.createElement('div');
    emptyDiv.dataset.epubPageSpacer = 'true';
    emptyDiv.style.height = '100%';
    body.appendChild(emptyDiv);
  }

  pageCountRef.current = Math.max(1, Math.ceil(scrollWidth / pageWidthRef.current));

  if (goToLastPage) {
    renderer.contentWindow.scrollTo({
      left: (pageCountRef.current - 1) * pageWidthRef.current
    });
    setCurrentPageIndex(pageCountRef.current);
  } else {
    const { currentPageIndex } = useReaderStateStore.getState();
    const targetPage = Math.max(1, Math.min(currentPageIndex, pageCountRef.current));
    renderer.contentWindow.scrollTo({
      left: (targetPage - 1) * pageWidthRef.current
    });
    if (targetPage !== currentPageIndex) {
      setCurrentPageIndex(targetPage);
    }
  }

  if (onTextPositionsAnalyzed) {
    const textMapper = new TextPositionMapper(pageWidthRef.current, columnGap);
    const textPositions = textMapper.analyzeTextPositions(iframeDoc);
    onTextPositionsAnalyzed(currentSearchQuery, textPositions);
  }

  return true;
};

export const handleIframeLoad = (
  renderer: HTMLIFrameElement,
  pageWidthRef: MutableRefObject<number>,
  pageCountRef: MutableRefObject<number>,
  goToLastPageRef: MutableRefObject<boolean>,
  setCurrentPageIndex: (pageIndex: number) => void,
  COLUMN_GAP: number,
  currentSearchQuery: string,
  onTextPositionsAnalyzed: (searchQuery: string, positions: TextPosition[]) => void,
  onPageReady?: () => void
): Promise<void> => {
  return new Promise((resolve) => {
    renderer.style.visibility = 'hidden';

    const handleLoad = () => {
      const iframeDoc = renderer.contentDocument || renderer.contentWindow?.document;

      if (!iframeDoc || !renderer.contentWindow) {
        console.error('Iframe document not found');
        resolve();
        return;
      }

      if (iframeDoc.body) {
        const shouldGoToLastPage = goToLastPageRef.current;
        recalculateIframePages({
          renderer,
          pageWidthRef,
          pageCountRef,
          setCurrentPageIndex,
          columnGap: COLUMN_GAP,
          goToLastPage: shouldGoToLastPage,
          currentSearchQuery,
          onTextPositionsAnalyzed
        });

        goToLastPageRef.current = false;

        // Call onPageReady to update React state
        onPageReady?.();
        renderer.style.visibility = 'visible';

        renderer.removeEventListener('load', handleLoad);
        resolve();
      }
    };

    // Check if iframe has already loaded (handles synchronous load case)
    const iframeDoc = renderer.contentDocument || renderer.contentWindow?.document;
    if (iframeDoc && iframeDoc.readyState === 'complete' && iframeDoc.body) {
      handleLoad();
    } else {
      renderer.addEventListener('load', handleLoad);
    }
  });
};
