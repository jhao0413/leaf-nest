import { applyFontAndThemeStyles } from "@/utils/styleHandler";
import { TextPositionMapper, TextPosition } from './textPositionMapper';
import { useReaderStateStore } from '@/store/readerStateStore';

export const writeToIframe = (
  updatedChapter: string,
  currentFontConfig: {
    fontSize: number;
    fontFamily: string;
    fontUrl: string;
    fontFormat: string;
  },
  theme: string = "light",
  mode: string = "double",
  COLUMN_GAP: number
) => {
  const renderer = document.getElementById("epub-renderer") as HTMLIFrameElement;
  if (!renderer || !renderer.contentWindow) {
    throw new Error("Renderer not found");
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
        img.addEventListener("load", () => resolve());
        img.addEventListener("error", () => resolve());
      }
    });
  });

  return Promise.all(imagesLoaded).then(() => {
    if (!renderer?.contentWindow) {
      console.error("Renderer not found");
      return;
    }
  });
};

export const handleIframeLoad = (
  renderer: HTMLIFrameElement,
  pageWidthRef: React.MutableRefObject<number>,
  pageCountRef: React.MutableRefObject<number>,
  goToLastPageRef: React.MutableRefObject<boolean>,
  setCurrentPageIndex: (pageIndex: number) => void,
  COLUMN_GAP: number,
  currentSearchQuery: string,
  onTextPositionsAnalyzed: (searchQuery: string, positions: TextPosition[]) => void,
  onPageReady?: () => void
): Promise<void> => {
  return new Promise((resolve) => {
    renderer.style.visibility = "hidden";

    const handleLoad = () => {
      const iframeDoc = renderer.contentDocument || renderer.contentWindow?.document;

      if (!iframeDoc || !renderer.contentWindow) {
        console.error("Iframe document not found");
        resolve();
        return;
      }

      if (iframeDoc.body) {
        const body = renderer.contentWindow.document.body;
        const computedStyle = renderer.contentWindow.getComputedStyle(body);
        const marginLeft = parseFloat(computedStyle.marginLeft);
        const marginRight = parseFloat(computedStyle.marginRight);
        const newPageWidth = body.clientWidth - marginLeft - marginRight + COLUMN_GAP;

        if (newPageWidth !== pageWidthRef.current) {
          pageWidthRef.current = newPageWidth;
        }

        const scrollWidth = iframeDoc.body.scrollWidth;
        const ratio = scrollWidth / pageWidthRef.current;
        const fraction = ratio - Math.floor(ratio);

        // add an empty div to the end of the content if the last page is less than half full
        if (fraction <= 0.5) {
          const emptyDiv = renderer.contentWindow.document.createElement("div");
          emptyDiv.style.height = "100%";
          body.appendChild(emptyDiv);
        }

        pageCountRef.current = Math.ceil(scrollWidth / pageWidthRef.current);

        if (goToLastPageRef.current) {
          renderer.contentWindow.scrollTo({
            left: (pageCountRef.current - 1) * pageWidthRef.current,
          });
          goToLastPageRef.current = false;
          setCurrentPageIndex(pageCountRef.current);
        } else {
          // Restore to the page index from store (set by reader page on load)
          const { currentPageIndex } = useReaderStateStore.getState();
          const targetPage = Math.max(1, Math.min(currentPageIndex, pageCountRef.current));
          renderer.contentWindow.scrollTo({
            left: (targetPage - 1) * pageWidthRef.current,
          });
          if (targetPage !== currentPageIndex) {
            setCurrentPageIndex(targetPage);
          }
        }

        const textMapper = new TextPositionMapper(pageWidthRef.current, COLUMN_GAP);
        const textPositions = textMapper.analyzeTextPositions(iframeDoc);

        if (onTextPositionsAnalyzed) {
          onTextPositionsAnalyzed(currentSearchQuery, textPositions);
        }

        // Call onPageReady to update React state
        onPageReady?.();
        renderer.style.visibility = "visible";

        renderer.removeEventListener("load", handleLoad);
        resolve();
      }
    };

    // Check if iframe has already loaded (handles synchronous load case)
    const iframeDoc = renderer.contentDocument || renderer.contentWindow?.document;
    if (iframeDoc && iframeDoc.readyState === 'complete' && iframeDoc.body) {
      handleLoad();
    } else {
      renderer.addEventListener("load", handleLoad);
    }
  });
};
