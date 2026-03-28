'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, House, Search, Loader2 } from 'lucide-react';
import { useTranslations } from '@/i18n';
import { Button } from '@heroui/button';
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
  waitForImagesAndCalculatePages,
  writeToIframe
} from '@/utils/iframeHandler';
import { applyFontAndThemeStyles } from '@/utils/styleHandler';
import { useRendererModeStore } from '@/store/rendererModeStore';
import { useDisclosure } from '@heroui/modal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTextNavigation } from '@/hooks/useTextNavigation';
import { useFullBookSearchStore } from '@/store/fullBookSearchStore';
import { TextPosition, TextPositionMapper } from '@/utils/textPositionMapper';
import { Input } from '@heroui/input';
import { Kbd } from '@heroui/kbd';
import { SearchModal } from './SearchModal';
import { useRouter } from '@/navigation';
import { BookInfoModal } from '../BookInfoModal';
import { ReadingProgressManager } from '@/utils/readingProgressManager';
import { useTextSelection } from '@/hooks/useTextSelection';
import { useChapterHighlightStore } from '@/store/highlightStore';
import { applyHighlights, removeHighlightFromDOM } from '@/utils/highlightRenderer';
import { CreateHighlightPopup, EditHighlightPopup } from './HighlightPopup';
import { readingRepository } from '@/lib/repositories/readingRepository';
import { highlightsRepository } from '@/lib/repositories/highlightsRepository';
const COLUMN_GAP = 100;

const EpubReader: React.FC = () => {
  const t = useTranslations('Renderer');
  const router = useRouter();

  // book info modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  // search modal
  const { isOpen: isOpenSearch, onOpen: onOpenSearch, onClose: onCloseSearch } = useDisclosure();

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
  const latestBookInfoRef = useRef(bookInfo);
  const latestStyleRef = useRef({ currentFontConfig, theme, rendererMode });
  const [isRestoring, setIsRestoring] = useState(true);
  const [iframeReady, setIframeReady] = useState(false);
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

          onCloseSearch();
        }
      }
    },
    [searchAndNavigate, onCloseSearch, highlightText, setCurrentPageIndex]
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

      await handleIframeLoad(
        renderer,
        pageWidthRef,
        pageCountRef,
        goToLastPageRef,
        setCurrentPageIndex,
        COLUMN_GAP,
        currentSearchQuery,
        handleTextSearchWithPositions,
        onPageReady
      );

      if (bookInfo.id) {
        const items = await highlightsRepository.listByBook(bookInfo.id, {
          chapterIndex: currentChapter
        });
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

  const handleSearchResultClick = useCallback(
    (resultIndex: number) => {
      const { searchResults, currentSearchQuery } = useFullBookSearchStore.getState();

      if (resultIndex >= 0 && resultIndex < searchResults.length) {
        const result = searchResults[resultIndex];

        if (result.chapterIndex === currentChapter) {
          if (currentSearchQuery) {
            const rendererWindow = getRendererWindow();
            if (rendererWindow) {
              const textMapper = new TextPositionMapper(pageWidthRef.current, COLUMN_GAP);
              const positions = textMapper.analyzeTextPositions(rendererWindow.document);
              handleTextSearchWithPositions(currentSearchQuery, positions);
            }
          }
        } else {
          setCurrentChapter(result.chapterIndex);
        }
      }
    },
    [setCurrentChapter, currentChapter, handleTextSearchWithPositions]
  );

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
    onSearch: onOpenSearch
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

  const handleUpdateNote = useCallback((id: string, note: string) => {
    void highlightsRepository.update(id, { note }).then((updated) => {
      updateChapterHighlight(id, { note: updated.note });
    });
  }, [updateChapterHighlight]);

  const clickedHighlight = clickedHighlightId
    ? chapterHighlights.find((h) => h.id === clickedHighlightId)
    : null;

  return (
    <div className="w-full h-full bg-gray-100 flex justify-center items-center flex-col dark:bg-neutral-800">
      <div className="flex w-4/5 h-12 justify-between items-center">
        <button
          type="button"
          className="flex items-center"
          onClick={onOpen}
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
          <Input
            className="w-40 mr-4"
            color="default"
            radius="full"
            variant="bordered"
            placeholder={'Search'}
            onClick={onOpenSearch}
            startContent={<Search size={16} />}
            endContent={<Kbd keys={['ctrl']}>K</Kbd>}
          />
          {/* <LocaleSwitcher /> */}
          <Button
            className="ml-4 bg-white dark:bg-neutral-900"
            isIconOnly
            variant="shadow"
            radius="sm"
            onPress={() => router.push('/')}
          >
            <House size={16} className="dark:bg-neutral-900" />
          </Button>
        </div>
      </div>

      {/* renderer */}
      <div className="w-4/5 h-[86vh] bg-white p-14 mt-4 rounded-2xl dark:bg-neutral-900">
        <div className="h-full relative">
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

          {popupPosition && selectionInfo && (
            <CreateHighlightPopup
              position={popupPosition}
              onCreateHighlight={handleCreateHighlight}
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
              onClose={clearSelection}
            />
          )}
          <div className="w-full flex justify-between">
            <Button
              radius="full"
              variant="bordered"
              className="bg-white border-2 border-inherit dark:bg-neutral-900"
              onPress={handlePrevPage}
            >
              <ChevronLeft size={16} />
              {t('previous')}
            </Button>
            <Button
              radius="full"
              variant="bordered"
              className="bg-white border-2 border-inherit dark:bg-neutral-900"
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
      <BookInfoModal isOpen={isOpen} onClose={onClose} bookInfo={bookInfo} />

      <SearchModal
        isOpen={isOpenSearch}
        onClose={onCloseSearch}
        onSearchResultClick={handleSearchResultClick}
      />
    </div>
  );
};

export default EpubReader;
