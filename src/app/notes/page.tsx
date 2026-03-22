'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { BookOpen, ChevronRight, Highlighter, Loader2 } from 'lucide-react';
import { createBlobUrlFromBinary } from '@/utils/blobUrl';

interface GroupedHighlights {
  bookId: string;
  bookName: string;
  bookCoverBlob: Uint8Array | null;
  bookCoverUrl?: string;
  noteCount: number;
  currentChapter?: number;
  percentage?: number;
}

export default function NotesPage() {
  const t = useTranslations('NotesPage');
  const router = useRouter();

  const [books, setBooks] = useState<GroupedHighlights[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHighlights = useCallback((worker: Worker) => {
    worker.postMessage({ action: 'getAllHighlights' });
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL('@/utils/handleWorker.ts', import.meta.url));

    worker.onmessage = (event: MessageEvent) => {
      const { action, success, data } = event.data;
      if (!success) {
        if (action === 'getAllHighlights') {
          setLoading(false);
        }
        return;
      }

      if (action === 'getAllHighlights') {
        const groupMap = new Map<string, GroupedHighlights>();
        for (const h of data) {
        if (!groupMap.has(h.bookId)) {
            groupMap.set(h.bookId, {
              bookId: h.bookId,
              bookName: h.bookName || 'Unknown',
              bookCoverBlob: h.bookCoverBlob,
              bookCoverUrl: h.bookCoverBlob
                ? createBlobUrlFromBinary(h.bookCoverBlob)
                : undefined,
              noteCount: 0,
              currentChapter: h.bookCurrentChapter,
              percentage: h.bookPercentage
            });
          }
          const group = groupMap.get(h.bookId);
          if (group) {
            group.noteCount += 1;
            if (!group.bookCoverUrl && group.bookCoverBlob) {
              group.bookCoverUrl = createBlobUrlFromBinary(group.bookCoverBlob);
            }
          }
        }
        setBooks(Array.from(groupMap.values()));
        setLoading(false);
      }
    };

    loadHighlights(worker);

    return () => worker.terminate();
  }, [loadHighlights]);

  const formatProgress = (book: GroupedHighlights) => {
    const percentValue = typeof book.percentage === 'number' ? book.percentage : Number(book.percentage);
    const percent = Number.isFinite(percentValue) ? `${Math.round(percentValue)}%` : '0%';
    const chapterText =
      typeof book.currentChapter === 'number'
        ? t('chapterProgress', { chapterNumber: book.currentChapter + 1 })
        : t('chapterUnknown');

    return `${t('progressLabel')}: ${percent} · ${chapterText}`;
  };

  const goToBookNotes = (bookId: string) => {
    router.push(`/notes/${bookId}`);
  };

  if (loading) {
    return (
      <div className='flex flex-col h-full p-4 md:p-6 xl:p-8'>
        <div className='mx-auto w-full'>
          <div className='flex items-center gap-2 mb-8'>
            <Loader2 size={20} className='animate-spin text-gray-400' />
            <p className='text-lg text-gray-500 font-lxgw'>{t('loading')}</p>
          </div>
          <div className='w-full grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className='bg-white dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-neutral-700 p-4 animate-pulse'
              >
                <div className='flex gap-3'>
                  <div className='w-10 h-14 bg-gray-200 dark:bg-neutral-700 rounded-md' />
                  <div className='flex-1 space-y-2'>
                    <div className='h-4 bg-gray-200 dark:bg-neutral-700 rounded w-4/5' />
                    <div className='h-3 bg-gray-200 dark:bg-neutral-700 rounded w-1/2' />
                  </div>
                </div>
                <div className='h-3 bg-gray-200 dark:bg-neutral-700 rounded w-3/4 mt-3' />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-center p-8'>
        <Highlighter size={48} className='text-gray-300 dark:text-gray-600 mb-4' />
        <h1 className='text-3xl font-bold mb-4 font-lxgw'>{t('title')}</h1>
        <p className='text-gray-500 font-lxgw'>{t('noHighlights')}</p>
        <p className='text-gray-400 text-sm mt-2 font-lxgw'>{t('noHighlightsDesc')}</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full p-4 md:p-6 xl:p-8'>
      <h1 className='text-3xl font-bold mb-8 font-lxgw'>{t('title')}</h1>

      <div className='w-full mx-auto grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {books.map((book) => (
          <button
            key={book.bookId}
            type='button'
            className='bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-4 text-left hover:bg-gray-50 dark:hover:bg-neutral-750 transition-colors'
            onClick={() => goToBookNotes(book.bookId)}
          >
            <div className='flex items-start gap-3'>
              {book.bookCoverUrl ? (
                <Image
                  src={book.bookCoverUrl}
                  alt={book.bookName}
                  title={book.bookName}
                  width={40}
                  height={56}
                  className='w-10 h-14 object-cover rounded-md shadow-sm'
                  unoptimized
                />
              ) : (
                <div className='w-10 h-14 bg-gray-200 dark:bg-neutral-700 rounded-md flex items-center justify-center'>
                  <BookOpen size={16} className='text-gray-400' />
                </div>
              )}
              <div className='min-w-0 flex-1'>
                <h2 className='font-bold text-base sm:text-lg font-lxgw leading-snug truncate' title={book.bookName}>
                  {book.bookName}
                </h2>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>{t('noteCount', { count: book.noteCount })}</p>
              </div>
              <ChevronRight size={18} className='text-gray-400 mt-1 shrink-0' />
            </div>
            <p className='text-sm text-gray-600 dark:text-gray-300 mt-3'>{formatProgress(book)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
