'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { flushSync } from 'react-dom';
import { BookOpen, ChevronLeft, ChevronRight, House, Search, Loader2 } from 'lucide-react';
import { useTranslations } from '@/i18n';
import { Button, Kbd, useOverlayState } from '@heroui/react';
import { useBookInfoStore } from '@/store/bookInfoStore';
import { useReaderStateStore } from '@/store/readerStateStore';
import { useRendererConfigStore } from '@/store/fontConfigStore';
import { Toolbar } from '@/components/Renderer/Toolbar/Index';
import { useTheme } from '@/theme';
import { useBookZipStore } from '@/store/bookZipStore';
import { loadChapterContent } from '@/utils/chapterLoader';
import { parseAndProcessChapter } from '@/utils/chapterParser';
import {
  handleIframeLoad,
  recalculateIframePages,
  waitForImagesAndCalculatePages,
  writeToIframe
} from '@/utils/iframeHandler';
import { applyFontAndThemeStyles } from '@/utils/styleHandler';
import { useRendererModeStore } from '@/store/rendererModeStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTextNavigation } from '@/hooks/useTextNavigation';
import { useFullBookSearchStore } from '@/store/fullBookSearchStore';
import { TextPosition, TextPositionMapper } from '@/utils/textPositionMapper';
import type { SearchResult } from '@/utils/fullBookTextIndexer';
import { SearchModal } from './SearchModal';
import { useRouter } from '@/navigation';
import { BookInfoModal } from '../BookInfoModal';
import { ReadingProgressManager } from '@/utils/readingProgressManager';
import { useTextSelection } from '@/hooks/useTextSelection';
import { useChapterHighlightStore, type Highlight } from '@/store/highlightStore';
import { applyHighlights, removeHighlightFromDOM } from '@/utils/highlightRenderer';
import { CreateHighlightPopup, EditHighlightPopup } from './HighlightPopup';
import { readingRepository } from '@/lib/repositories/readingRepository';
import { highlightsRepository } from '@/lib/repositories/highlightsRepository';
import { HighlightShareModal, type HighlightShareItem } from '@/components/HighlightShareModal';
const COLUMN_GAP = 100;
const RESIZE_REFRESH_DEBOUNCE_MS = 120;
// Controls the resize mask fade-out after pagination has been recalculated.
const RESIZE_FADE_DURATION_MS = 200;

const EpubReader: React.FC = () => {
  const t = useTranslations('Renderer');
  const router = useRouter();

  // book info modal
  const { isOpen: isBookInfoOpen, open: openBookInfo, close: closeBookInfo } = useOverlayState();
  // search modal
  const { isOpen: isSearchOpen, open: openSearch, close: closeSearch } = useOverlayState();

  // page state
  const currentChapter = useReaderStateStore((state) => state.currentChapter);
  const currentPageIndex = useReaderStateStore((state) => state.currentPageIndex);
  const setCurrentChapter = useReaderStateStore((state) => state.setCurrentChapter);
  const setCurrentPageIndex = useReaderStateStore((state) => state.setCurrentPageIndex);

  // font and theme
  const currentFontConfig = useRendererConfigStore((state) => state.rendererConfig);
  const { theme } = useTheme();

  // epub book info and zip
  const bookInfo = useBookInfoStore((state) => state.bookInfo);
  const bookZip = useBookZipStore((state) => state.bookZip);
  const rendererMode = useRendererModeStore((state) => state.rendererMode);

  const goToLastPageRef = useRef(false);
  const pageWidthRef = useRef(0);
  const pageCountRef = useRef(0);
  const progressManagerRef = useRef<ReadingProgressManager | null>(null);
  const isFirstLoadRef = useRef(true);
  const loadVersionRef = useRef(0);
  const pendingSearchQueryRef = useRef('');
  const readerViewportRef = useRef<HTMLDivElement | null>(null);
  const resizeRefreshTimerRef = useRef<number | null>(null);
  const resizeAnimationFrameRef = useRef<number | null>(null);
  const lastReaderSizeRef = useRef<{ width: number; height: number } | null>(null);
  const latestBookInfoRef = useRef(bookInfo);
  const latestStyleRef = useRef({ currentFontConfig, theme, rendererMode });
  const [isRestoring, setIsRestoring] = useState(true);
  const [isResizeRefreshing, setIsResizeRefreshing] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [activeShareItem, setActiveShareItem] = useState<HighlightShareItem | null>(null);
  const { searchAndNavigate, highlightText } = useTextNavigation();
  const { indexer, setIndexing } = useFullBookSearchStore();
  const {
    selectionInfo,
    popupPosition,
    clickedHighlightId,
    clickedHighlightPosition,
    clearSelection
  } = useTextSelection(iframeReady);
  const {
    chapterHighlights,
    setChapterHighlights,
    addChapterHighlight,
    removeChapterHighlight,
    updateChapterHighlight
  } = useChapterHighlightStore();
  const chapterHighlightsRef = useRef(chapterHighlights);

  useEffect(() => {
    chapterHighlightsRef.current = chapterHighlights;
  }, [chapterHighlights]);

  const handleTextSearchWithPositions = useCallback(
    (searchText: string, positions: TextPosition[]) => {
      const targetPage = searchAndNavigate(searchText, positions);
      if (targetPage) {
        const rendererWindow = getRendererWindow();
        if (rendererWindow) {
          rendererWindow.scrollTo({
            left: (targetPage - 1) * pageWidthRef.current
          });
          setCurrentPageIndex(targetPage);

          highlightText(rendererWindow.document, searchText);

          closeSearch();
        }
      }
    },
    [searchAndNavigate, closeSearch, highlightText, setCurrentPageIndex]
  );

  // Initialize progress manager
  useEffect(() => {
    progressManagerRef.current = new ReadingProgressManager(async (data) => {
      await readingRepository.saveProgress(data);
    });

    return () => {
      progressManagerRef.current?.cleanup();
    };
  }, []);

  useEffect(() => {
    latestBookInfoRef.current = bookInfo;
  }, [bookInfo]);

  useEffect(() => {
    latestStyleRef.current = { currentFontConfig, theme, rendererMode };
  }, [currentFontConfig, theme, rendererMode]);

  const showResizeRefreshMask = useCallback(() => {
    flushSync(() => {
      setIsResizeRefreshing(true);
    });
  }, []);

  const cancelPendingResizeRefresh = useCallback(() => {
    if (resizeRefreshTimerRef.current) {
      window.clearTimeout(resizeRefreshTimerRef.current);
      resizeRefreshTimerRef.current = null;
    }
    if (resizeAnimationFrameRef.current) {
      window.cancelAnimationFrame(resizeAnimationFrameRef.current);
      resizeAnimationFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cancelPendingResizeRefresh;
  }, [cancelPendingResizeRefresh]);

  // Save progress on unmount (only when component unmounts, not on page change)
  useEffect(() => {
    return () => {
      // Use latest values via ref to avoid stale closure
      const rendererWindow = getRendererWindow();
      const { currentChapter: latestChapter, currentPageIndex: latestPage } =
        useReaderStateStore.getState();
      const latestBookInfo = latestBookInfoRef.current;
      if (rendererWindow && latestBookInfo.id && progressManagerRef.current) {
        progressManagerRef.current.saveProgress(
          latestBookInfo.id,
          latestChapter,
          latestPage,
          rendererWindow,
          latestBookInfo,
          'double',
          0,
          true
        );
      }
    };
  }, []);

  const onPageReady = useCallback(() => {
    // Page is ready, hide loading state
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      setIsRestoring(false);
    }
  }, []);

  useEffect(() => {
    cancelPendingResizeRefresh();
    setIsResizeRefreshing(false);
    setIframeReady(false);

    const currentVersion = ++loadVersionRef.current;

    const processChapter = async () => {
      const { chapterContent, basePath } = await loadChapterContent(
        bookZip,
        bookInfo,
        currentChapter
      );

      // Check if this load has been superseded by a newer one
      if (loadVersionRef.current !== currentVersion) {
        return;
      }

      const updatedChapter = await parseAndProcessChapter(chapterContent, bookZip, basePath);

      // Check again after parsing
      if (loadVersionRef.current !== currentVersion) {
        return;
      }

      const {
        currentFontConfig: latestFontConfig,
        theme: latestTheme,
        rendererMode: latestRendererMode
      } = latestStyleRef.current;

      const renderer = writeToIframe(
        updatedChapter,
        latestFontConfig,
        latestTheme,
        latestRendererMode,
        COLUMN_GAP
      );
      const iframeDoc =
        renderer.contentDocument || (renderer.contentWindow && renderer.contentWindow.document);
      if (iframeDoc) {
        waitForImagesAndCalculatePages(renderer, iframeDoc);
      } else {
        console.error('Iframe document not found');
      }

      const { currentSearchQuery } = useFullBookSearchStore.getState();
      const activeSearchQuery = pendingSearchQueryRef.current || currentSearchQuery;

      await handleIframeLoad(
        renderer,
        pageWidthRef,
        pageCountRef,
        goToLastPageRef,
        setCurrentPageIndex,
        COLUMN_GAP,
        activeSearchQuery,
        handleTextSearchWithPositions,
        onPageReady
      );

      if (loadVersionRef.current !== currentVersion) {
        return;
      }

      if (pendingSearchQueryRef.current === activeSearchQuery) {
        pendingSearchQueryRef.current = '';
      }

      if (bookInfo.id) {
        const items = await highlightsRepository.listByBook(bookInfo.id, {
          chapterIndex: currentChapter
        });

        if (loadVersionRef.current !== currentVersion) {
          return;
        }

        setChapterHighlights(items);

        const highlightRenderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
        const highlightDoc = highlightRenderer?.contentDocument;
        if (highlightDoc) {
          applyHighlights(highlightDoc, items);
        }
      }

      setIframeReady(true);
    };
    if (Object.keys(bookZip.files).length === 0) return;
    processChapter();
  }, [
    bookInfo,
    bookZip,
    rendererMode,
    currentChapter,
    cancelPendingResizeRefresh,
    handleTextSearchWithPositions,
    setCurrentPageIndex,
    onPageReady,
    setChapterHighlights
  ]);

  // book index init
  useEffect(() => {
    const initializeFullBookIndex = async () => {
      if (!bookZip || !bookInfo.toc.length || !bookInfo.id) {
        return;
      }

      try {
        setIndexing(true);
        await indexer.indexFullBook(bookZip, bookInfo, bookInfo.id);
      } catch (error) {
        console.error(error);
      } finally {
        setIndexing(false);
      }
    };
    initializeFullBookIndex();
  }, [bookZip, bookInfo, indexer, setIndexing]);

  const getRendererWindow = () => {
    const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
    if (renderer?.contentWindow) {
      return renderer.contentWindow;
    } else {
      return null;
    }
  };

  const reapplyChapterHighlights = useCallback(() => {
    const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
    const iframeDoc = renderer?.contentDocument;
    const highlights = chapterHighlightsRef.current;

    if (!iframeDoc || !highlights.length) {
      return;
    }

    highlights.forEach((highlight) => removeHighlightFromDOM(iframeDoc, highlight.id));
    applyHighlights(iframeDoc, highlights);
  }, []);

  const scheduleResizeRefresh = useCallback(() => {
    if (!iframeReady || isRestoring) {
      return;
    }

    cancelPendingResizeRefresh();

    showResizeRefreshMask();
    const scheduledLoadVersion = loadVersionRef.current;
    const scheduledChapter = useReaderStateStore.getState().currentChapter;

    // Wait for the user to stop resizing before mutating the iframe layout.
    // The mask is already visible, so stale intermediate pagination is hidden.
    resizeRefreshTimerRef.current = window.setTimeout(() => {
      resizeRefreshTimerRef.current = null;

      const { currentChapter: latestChapter } = useReaderStateStore.getState();
      if (loadVersionRef.current !== scheduledLoadVersion || latestChapter !== scheduledChapter) {
        setIsResizeRefreshing(false);
        return;
      }

      const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
      if (renderer?.contentWindow) {
        const {
          currentFontConfig: latestFontConfig,
          theme: latestTheme,
          rendererMode: latestRendererMode
        } = latestStyleRef.current;

        applyFontAndThemeStyles(latestFontConfig, latestTheme, latestRendererMode, COLUMN_GAP);
        const didRecalculate = recalculateIframePages({
          renderer,
          pageWidthRef,
          pageCountRef,
          setCurrentPageIndex,
          columnGap: COLUMN_GAP
        });
        if (didRecalculate) {
          reapplyChapterHighlights();
        }
      }

      // rAF lets the browser paint the recalculated layout at opacity 0
      // before we trigger the fade-in, avoiding a flicker of stale content.
      resizeAnimationFrameRef.current = window.requestAnimationFrame(() => {
        resizeAnimationFrameRef.current = null;
        setIsResizeRefreshing(false);
      });
    }, RESIZE_REFRESH_DEBOUNCE_MS);
  }, [
    cancelPendingResizeRefresh,
    iframeReady,
    isRestoring,
    reapplyChapterHighlights,
    setCurrentPageIndex,
    showResizeRefreshMask
  ]);

  useEffect(() => {
    const viewport = readerViewportRef.current;
    if (!viewport || !iframeReady) {
      return;
    }

    const handleViewportResize = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;

      if (!width || !height) {
        return;
      }

      const lastSize = lastReaderSizeRef.current;
      lastReaderSizeRef.current = { width, height };

      if (!lastSize) {
        return;
      }

      if (lastSize.width === width && lastSize.height === height) {
        return;
      }

      scheduleResizeRefresh();
    };

    handleViewportResize();

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(handleViewportResize);
      resizeObserver.observe(viewport);
      return () => resizeObserver.disconnect();
    }

    window.addEventListener('resize', handleViewportResize);
    return () => window.removeEventListener('resize', handleViewportResize);
  }, [iframeReady, scheduleResizeRefresh]);

  const handleSearchResultClick = useCallback(
    (result: SearchResult, searchQuery: string) => {
      if (result.chapterIndex === currentChapter) {
        if (searchQuery) {
          const rendererWindow = getRendererWindow();
          if (rendererWindow) {
            const textMapper = new TextPositionMapper(pageWidthRef.current, COLUMN_GAP);
            const positions = textMapper.analyzeTextPositions(rendererWindow.document);
            handleTextSearchWithPositions(searchQuery, positions);
          }
        }
      } else {
        pendingSearchQueryRef.current = searchQuery;
        setCurrentChapter(result.chapterIndex);
      }
    },
    [setCurrentChapter, currentChapter, handleTextSearchWithPositions]
  );

  const handleCloseSearchModal = useCallback(() => {
    closeSearch();
  }, [closeSearch]);

  useEffect(() => {
    const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
    if (!renderer || !renderer.contentWindow) {
      return;
    }
    applyFontAndThemeStyles(currentFontConfig, theme, rendererMode, COLUMN_GAP);
  }, [currentFontConfig, theme, rendererMode]);

  const handleNextPage = () => {
    const rendererWindow = getRendererWindow();
    if (!rendererWindow) return;

    if (currentPageIndex < pageCountRef.current) {
      rendererWindow.scrollTo({
        left: currentPageIndex * pageWidthRef.current
      });
      setCurrentPageIndex(currentPageIndex + 1);

      // Save progress with debounce (after scrollTo completes)
      if (progressManagerRef.current && bookInfo.id) {
        progressManagerRef.current.saveProgress(
          bookInfo.id,
          currentChapter,
          currentPageIndex + 1,
          rendererWindow,
          bookInfo,
          'double',
          3000,
          false
        );
      }
    } else if (currentChapter < bookInfo.toc.length - 1) {
      // Save progress immediately when switching chapter
      if (progressManagerRef.current && bookInfo.id) {
        progressManagerRef.current.saveProgress(
          bookInfo.id,
          currentChapter,
          currentPageIndex,
          rendererWindow,
          bookInfo,
          'double',
          0,
          true
        );
      }

      setCurrentPageIndex(1);
      setCurrentChapter(currentChapter + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex === 1 && currentChapter === 0) {
      return;
    }

    const rendererWindow = getRendererWindow();
    if (!rendererWindow) return;

    if (currentPageIndex === 1 && currentChapter > 0) {
      // Save progress immediately when switching chapter
      if (progressManagerRef.current && bookInfo.id) {
        progressManagerRef.current.saveProgress(
          bookInfo.id,
          currentChapter,
          currentPageIndex,
          rendererWindow,
          bookInfo,
          'double',
          0,
          true
        );
      }

      goToLastPageRef.current = true;
      setCurrentChapter(currentChapter - 1);
    } else if (currentPageIndex > 1) {
      rendererWindow.scrollTo({
        left: (currentPageIndex - 2) * pageWidthRef.current
      });
      setCurrentPageIndex(currentPageIndex - 1);

      // Save progress with debounce (after scrollTo completes)
      if (progressManagerRef.current && bookInfo.id) {
        progressManagerRef.current.saveProgress(
          bookInfo.id,
          currentChapter,
          currentPageIndex - 1,
          rendererWindow,
          bookInfo,
          'double',
          3000,
          false
        );
      }
    }
  };

  useKeyboardShortcuts({
    onPrevious: handlePrevPage,
    onNext: handleNextPage,
    onSearch: openSearch
  });

  const handleCreateHighlight = useCallback(
    (color: string, style: 'highlight' | 'underline' | 'note', note: string) => {
      if (!selectionInfo || !bookInfo.id) return;

      void highlightsRepository
        .create({
          bookId: bookInfo.id,
          chapterIndex: currentChapter,
          selectedText: selectionInfo.selectedText,
          contextBefore: selectionInfo.contextBefore,
          contextAfter: selectionInfo.contextAfter,
          color,
          style,
          note
        })
        .then((item) => {
          addChapterHighlight(item);
          const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
          const iframeDoc = renderer?.contentDocument;
          if (iframeDoc) {
            applyHighlights(iframeDoc, [item]);
            iframeDoc.getSelection()?.removeAllRanges();
          }
        })
        .finally(() => {
          clearSelection();
        });
    },
    [addChapterHighlight, bookInfo.id, clearSelection, currentChapter, selectionInfo]
  );

  const handleDeleteHighlight = useCallback(
    (id: string) => {
      void highlightsRepository.remove(id).then(() => {
        removeChapterHighlight(id);
        const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
        const iframeDoc = renderer?.contentDocument;
        if (iframeDoc) {
          removeHighlightFromDOM(iframeDoc, id);
        }
        clearSelection();
      });
    },
    [clearSelection, removeChapterHighlight]
  );

  const handleUpdateColor = useCallback(
    (id: string, color: string) => {
      void highlightsRepository.update(id, { color }).then((updated) => {
        updateChapterHighlight(id, { color: updated.color, note: updated.note });

        const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
        const iframeDoc = renderer?.contentDocument;
        if (iframeDoc) {
          removeHighlightFromDOM(iframeDoc, id);
          applyHighlights(iframeDoc, [updated]);
        }

        clearSelection();
      });
    },
    [clearSelection, updateChapterHighlight]
  );

  const handleUpdateNote = useCallback(
    (id: string, note: string) => {
      void highlightsRepository.update(id, { note }).then((updated) => {
        updateChapterHighlight(id, { note: updated.note });
      });
    },
    [updateChapterHighlight]
  );

  const handleShareSelection = useCallback(() => {
    if (!selectionInfo) return;

    setActiveShareItem({
      selectedText: selectionInfo.selectedText,
      chapterIndex: currentChapter
    });
    clearSelection();
  }, [clearSelection, currentChapter, selectionInfo]);

  const handleShareHighlight = useCallback(
    (highlight: Highlight) => {
      setActiveShareItem({
        selectedText: highlight.selectedText,
        note: highlight.note,
        chapterIndex: highlight.chapterIndex,
        createdAt: highlight.createdAt
      });
      clearSelection();
    },
    [clearSelection]
  );

  const closeShareModal = useCallback(() => {
    setActiveShareItem(null);
  }, []);

  const clickedHighlight = clickedHighlightId
    ? chapterHighlights.find((h) => h.id === clickedHighlightId)
    : null;

  return (
    <div className="w-full h-full bg-gray-100 flex justify-center items-center flex-col dark:bg-neutral-800">
      <div className="flex w-4/5 h-12 justify-between items-center">
        <button
          type="button"
          className="flex items-center"
          onClick={openBookInfo}
          aria-label="Open book details"
        >
          <BookOpen size={20} />
          <p
            className={`font-bold text-lg font-lxgw max-w-lg truncate ${
              bookInfo.language === 'zh' ? '' : 'italic'
            }`}
            title={bookInfo.language === 'zh' ? `《${bookInfo.name}》` : bookInfo.name}
          >
            {bookInfo.language === 'zh' ? `《${bookInfo.name}》` : bookInfo.name}
          </p>
        </button>
        <div className="flex">
          <button
            type="button"
            className="mr-4 flex w-40 items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={openSearch}
          >
            <Search size={16} />
            <span className="flex-1 text-left">Search</span>
            <Kbd>Ctrl K</Kbd>
          </button>
          {/* <LocaleSwitcher /> */}
          <Button
            className="ml-4 bg-white dark:bg-neutral-900 rounded-md"
            isIconOnly
            variant="secondary"
            onPress={() => router.push('/')}
          >
            <House size={16} className="text-black dark:text-white" />
          </Button>
        </div>
      </div>

      {/* renderer */}
      <div className="w-4/5 h-[86vh] bg-white p-14 mt-4 rounded-2xl dark:bg-neutral-900">
        <div ref={readerViewportRef} className="h-full relative">
          {isRestoring && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-neutral-900 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}
          <iframe
            id="epub-renderer"
            style={{ width: '100%', height: '100%' }}
            title={`${bookInfo.name || 'Book'} reader content`}
          ></iframe>
          <div
            aria-hidden="true"
            data-testid="resize-refresh-mask"
            className={`absolute inset-0 z-10 bg-white transition-opacity ease-out dark:bg-neutral-900 ${
              isResizeRefreshing ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            style={{
              transitionDuration: isResizeRefreshing ? '0ms' : `${RESIZE_FADE_DURATION_MS}ms`
            }}
          />

          {popupPosition && selectionInfo && (
            <CreateHighlightPopup
              position={popupPosition}
              onCreateHighlight={handleCreateHighlight}
              onShare={handleShareSelection}
              onClose={clearSelection}
            />
          )}

          {clickedHighlightPosition && clickedHighlight && (
            <EditHighlightPopup
              position={clickedHighlightPosition}
              highlight={clickedHighlight}
              onUpdateNote={handleUpdateNote}
              onUpdateColor={handleUpdateColor}
              onDelete={handleDeleteHighlight}
              onShare={() => handleShareHighlight(clickedHighlight)}
              onClose={clearSelection}
            />
          )}
          <div className="w-full flex justify-between">
            <Button
              variant="outline"
              className="bg-white border-2 border-inherit dark:bg-neutral-900 rounded-full"
              onPress={handlePrevPage}
            >
              <ChevronLeft size={16} />
              {t('previous')}
            </Button>
            <Button
              variant="outline"
              className="bg-white border-2 border-inherit dark:bg-neutral-900 rounded-full"
              onPress={handleNextPage}
            >
              {t('next')}
              <ChevronRight size={16} />
            </Button>
          </div>
          <div className="absolute right-[-140px] top-0 bottom-0 flex flex-col justify-center items-center">
            <Toolbar />
          </div>
        </div>
      </div>

      {/* book info */}
      <BookInfoModal isOpen={isBookInfoOpen} onClose={closeBookInfo} bookInfo={bookInfo} />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={handleCloseSearchModal}
        onSearchResultClick={handleSearchResultClick}
      />

      {activeShareItem ? (
        <HighlightShareModal
          item={activeShareItem}
          bookName={bookInfo.name || 'Unknown'}
          bookCoverUrl={bookInfo.coverUrl}
          onClose={closeShareModal}
        />
      ) : null}
    </div>
  );
};

export default EpubReader;
