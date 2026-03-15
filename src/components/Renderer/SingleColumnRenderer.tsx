'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from '@heroui/button';
import { useBookInfoStore } from '@/store/bookInfoStore';
import { useReaderStateStore } from '@/store/readerStateStore';
import { useRendererConfigStore } from '@/store/fontConfigStore';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { BookOpen, House } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toolbar } from '@/components/Renderer/Toolbar/Index';
import { applyFontAndThemeStyles } from '@/utils/styleHandler';
import { useRendererModeStore } from '@/store/rendererModeStore';
import { loadChapterContent } from '@/utils/chapterLoader';
import { useBookZipStore } from '@/store/bookZipStore';
import { parseAndProcessChapter } from '@/utils/chapterParser';
import { waitForImagesAndCalculatePages, writeToIframe } from '@/utils/iframeHandler';
import { useTranslations } from 'next-intl';
import { useDisclosure } from '@heroui/modal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRouter } from 'next/navigation';
import { BookInfoModal } from '../BookInfoModal';
import { ReadingProgressManager } from '@/utils/readingProgressManager';

const EpubReader: React.FC = () => {
  const t = useTranslations('SingleColumnRenderer');
  const router = useRouter();
  const currentChapter = useReaderStateStore((state) => state.currentChapter);
  const setCurrentChapter = useReaderStateStore((state) => state.setCurrentChapter);
  const currentFontConfig = useRendererConfigStore((state) => state.rendererConfig);
  const bookInfo = useBookInfoStore((state) => state.bookInfo);
  const { theme } = useTheme();
  const bookZip = useBookZipStore((state) => state.bookZip);
  const rendererMode = useRendererModeStore((state) => state.rendererMode);

  const progressManagerRef = useRef<ReadingProgressManager | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const isFirstLoadRef = useRef(true);
  const latestBookInfoRef = useRef(bookInfo);
  const latestStyleRef = useRef({ currentFontConfig, theme, rendererMode });

  // Initialize worker and progress manager
  useEffect(() => {
    const worker = new Worker(new URL('@/utils/handleWorker.ts', import.meta.url));
    workerRef.current = worker;
    progressManagerRef.current = new ReadingProgressManager(worker);

    return () => {
      progressManagerRef.current?.cleanup();
      worker.terminate();
    };
  }, []);

  // Restore reading progress on first load
  useEffect(() => {
    if (isFirstLoadRef.current && bookInfo.currentChapter !== undefined) {
      setCurrentChapter(bookInfo.currentChapter);
      isFirstLoadRef.current = false;
    }
  }, [bookInfo.currentChapter, setCurrentChapter]);

  useEffect(() => {
    latestBookInfoRef.current = bookInfo;
  }, [bookInfo]);

  useEffect(() => {
    latestStyleRef.current = { currentFontConfig, theme, rendererMode };
  }, [currentFontConfig, theme, rendererMode]);

  // Save progress on unmount (only when component unmounts, not on chapter change)
  useEffect(() => {
    return () => {
      // Use latest values via ref to avoid stale closure
      const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
      const { currentChapter: latestChapter } = useReaderStateStore.getState();
      const latestBookInfo = latestBookInfoRef.current;
      if (renderer?.contentWindow && latestBookInfo.id && progressManagerRef.current) {
        progressManagerRef.current.saveProgress(
          latestBookInfo.id,
          latestChapter,
          1, // Single column mode always uses page 1
          renderer.contentWindow,
          latestBookInfo,
          'single',
          0,
          true
        );
      }
    };
  }, []);

  useEffect(() => {
    const processChapter = async () => {
      const { chapterContent, basePath } = await loadChapterContent(
        bookZip,
        bookInfo,
        currentChapter
      );
      const updatedChapter = await parseAndProcessChapter(chapterContent, bookZip, basePath);
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
        0
      );
      const iframeDoc =
        renderer.contentDocument || (renderer.contentWindow && renderer.contentWindow.document);
      if (iframeDoc) {
        waitForImagesAndCalculatePages(renderer, iframeDoc);
      } else {
        console.error('Iframe document not found');
      }

      return handleIframeLoad(renderer);
    };
    if (Object.keys(bookZip.files).length === 0) return;
    processChapter();
  }, [bookInfo, bookZip, currentChapter]);

  useEffect(() => {
    const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
    if (!renderer || !renderer.contentWindow) {
      throw new Error('Renderer not found');
    }

    applyFontAndThemeStyles(currentFontConfig, theme, rendererMode, 0);
  }, [currentFontConfig, theme, rendererMode]);

  const handleIframeLoad = (renderer: HTMLIFrameElement) => {
    renderer.style.visibility = 'hidden';
    const handleLoad = () => {
      const iframeDoc = renderer.contentDocument;

      if (!iframeDoc || !renderer.contentWindow) {
        throw new Error('Iframe document not found');
      }

      renderer.style.height = '0px';
      if (iframeDoc.body) {
        renderer.style.visibility = 'visible';
        const body = iframeDoc.body;
        const html = iframeDoc.documentElement;
        const height = Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        );
        renderer.style.height = `${height + 40}px`;
        renderer.removeEventListener('load', handleLoad);
      }
    };

    renderer.addEventListener('load', handleLoad);
  };

  const handlePrevChapter = () => {
    // Save progress immediately when switching chapter
    const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
    if (renderer?.contentWindow && bookInfo.id && progressManagerRef.current) {
      progressManagerRef.current.saveProgress(
        bookInfo.id,
        currentChapter,
        1,
        renderer.contentWindow,
        bookInfo,
        'single',
        0,
        true
      );
    }

    setCurrentChapter(currentChapter - 1);
  };

  const handleNextChapter = () => {
    // Save progress immediately when switching chapter
    const renderer = document.getElementById('epub-renderer') as HTMLIFrameElement;
    if (renderer?.contentWindow && bookInfo.id && progressManagerRef.current) {
      progressManagerRef.current.saveProgress(
        bookInfo.id,
        currentChapter,
        1,
        renderer.contentWindow,
        bookInfo,
        'single',
        0,
        true
      );
    }

    setCurrentChapter(currentChapter + 1);
  };

  useKeyboardShortcuts({
    onPrevious: handlePrevChapter,
    onNext: handleNextChapter
  });

  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <div className='single-column-reader'>
      <div className='w-full h-screen bg-gray-100 flex justify-center fixed z-0 dark:bg-neutral-800'></div>
      <div className='w-1/2 h-screen mx-auto flex flex-col relative z-10'>
        <div className='w-full h-14 bg-white border-b-2 flex items-center pl-4 shrink-0 dark:bg-neutral-900'>
          <div className='flex w-full justify-between items-center pr-4'>
            <div className='flex items-center cursor-pointer' onClick={onOpen}>
              <BookOpen size={20} />
              <p
                className={`font-bold text-lg font-lxgw max-w-lg truncate ${
                  bookInfo.language === 'zh' ? '' : 'italic'
                }`}
                title={bookInfo.language === 'zh' ? `《${bookInfo.name}》` : bookInfo.name}
              >
                {bookInfo.language === 'zh' ? `《${bookInfo.name}》` : bookInfo.name}
              </p>
            </div>
            <div>
              <LocaleSwitcher />
              <Button
                className='ml-4 bg-white dark:bg-neutral-900'
                isIconOnly
                variant='bordered'
                radius='sm'
                onPress={() => router.push('/')}
              >
                <House size={16} className='dark:bg-neutral-900' />
              </Button>
            </div>
          </div>
        </div>
        <div className='flex-1 overflow-y-auto bg-white flex flex-col reader-scrollbar dark:bg-neutral-900'>
          <iframe id='epub-renderer' className='w-full z-10 px-14 shrink-0 dark:bg-neutral-900'></iframe>
          <div className='w-full z-10 h-20 flex justify-around items-start shrink-0'>
            <Button
              variant='bordered'
              className='text-base rounded-md w-40 dark:bg-neutral-900'
              onPress={handlePrevChapter}
            >
              {t('previous')}
            </Button>
            <Button
              variant='bordered'
              className='text-base rounded-md w-40 dark:bg-neutral-900'
              onPress={handleNextChapter}
            >
              {t('next')}
            </Button>
          </div>
        </div>
        <div className='fixed right-[20%] bottom-[40%] z-50'>
          <Toolbar />
        </div>
      </div>

      <BookInfoModal isOpen={isOpen} onClose={onClose} bookInfo={bookInfo} />
    </div>
  );
};

export default EpubReader;
