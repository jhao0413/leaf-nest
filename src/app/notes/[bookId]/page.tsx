'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from '@/components/AppImage';
import { useTranslations } from '@/i18n';
import { useRouter, useParams } from '@/navigation';
import { Trash2, BookOpen, Highlighter, ChevronLeft, Loader2 } from 'lucide-react';
import { useReaderStateStore } from '@/store/readerStateStore';
import { booksRepository } from '@/lib/repositories/booksRepository';
import { highlightsRepository } from '@/lib/repositories/highlightsRepository';
import { useSessionStore } from '@/lib/auth/sessionStore';

interface HighlightWithBook {
  id: string;
  bookId: string;
  chapterIndex: number;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  color: string;
  style: string;
  note: string;
  createdAt: string;
}

const colorBarMap: Record<string, string> = {
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
  blue: 'bg-blue-400',
  pink: 'bg-pink-400'
};

export default function BookNotesPage() {
  const t = useTranslations('NotesPage');
  const ht = useTranslations('Highlights');
  const router = useRouter();
  const params = useParams();
  const sessionStatus = useSessionStore((state) => state.status);
  const bookId =
    typeof params?.bookId === 'string'
      ? params.bookId
      : Array.isArray(params?.bookId)
        ? params.bookId[0]
        : '';
  const setCurrentChapter = useReaderStateStore((state) => state.setCurrentChapter);

  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState<HighlightWithBook[]>([]);
  const [bookName, setBookName] = useState('Unknown');
  const [bookCoverUrl, setBookCoverUrl] = useState<string | null>(null);
  const [currentChapter, setCurrentChapterFromDb] = useState<number | undefined>(undefined);
  const [percentage, setPercentage] = useState<number | undefined>(undefined);
  const loadHighlights = useCallback(async (id: string) => {
    const [book, items] = await Promise.all([
      booksRepository.getBook(id),
      highlightsRepository.listByBook(id)
    ]);

    setBookName(book.name || 'Unknown');
    setBookCoverUrl(book.coverUrl ?? null);
    setCurrentChapterFromDb(book.currentChapter);
    setPercentage(book.percentage);
    setHighlights(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!bookId || sessionStatus !== 'authenticated') {
      setLoading(sessionStatus === 'loading');
      return;
    }

    void loadHighlights(bookId);
  }, [bookId, loadHighlights, sessionStatus]);

  const handleDelete = async (id: string) => {
    await highlightsRepository.remove(id);
    setHighlights((prev) => prev.filter((item) => item.id !== id));
  };

  const handleNavigate = (chapterIndex: number) => {
    setCurrentChapter(chapterIndex);
    router.push(`/reader/${bookId}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatProgress = () => {
    const percentValue = typeof percentage === 'number' ? percentage : Number(percentage);
    const percent = Number.isFinite(percentValue) ? `${Math.round(percentValue)}%` : '0%';
    const chapterText =
      typeof currentChapter === 'number'
        ? t('chapterProgress', { chapterNumber: currentChapter + 1 })
        : t('chapterUnknown');
    return `${t('progressLabel')}: ${percent} · ${chapterText}`;
  };

  return (
    <>
      {!bookId ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <p className="text-gray-500 font-lxgw">{t('bookNotFound')}</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col h-full p-4 md:p-6 xl:p-8">
          <div className="max-w-4xl w-full mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Loader2 size={20} className="animate-spin text-gray-400" />
              <p className="text-sm text-gray-500 font-lxgw">{t('loading')}</p>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-4 mb-4">
              <div className="flex items-start gap-3 animate-pulse">
                <div className="w-12 h-16 bg-gray-200 dark:bg-neutral-700 rounded-md" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-7 bg-gray-200 dark:bg-neutral-700 rounded w-3/5" />
                  <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-2/5" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden animate-pulse">
              <div className="divide-y divide-gray-50 dark:divide-neutral-700">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex gap-3 p-4">
                    <div className="w-1 rounded-full shrink-0 bg-gray-200 dark:bg-neutral-700" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-11/12" />
                      <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-5/12" />
                      <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-1/3" />
                    </div>
                    <div className="w-7 h-7 bg-gray-200 dark:bg-neutral-700 rounded-lg shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full p-4 md:p-6 xl:p-8">
          <div className="max-w-4xl w-full mx-auto">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6"
              onClick={() => router.push('/notes')}
            >
              <ChevronLeft size={16} />
              <span className="font-lxgw">{t('backToBooks')}</span>
            </button>

            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-4 mb-4">
              <div className="flex items-start gap-3">
                {bookCoverUrl ? (
                  <Image
                    src={bookCoverUrl}
                    alt={bookName}
                    title={bookName}
                    width={48}
                    height={64}
                    className="w-12 h-16 object-cover rounded-md shadow-sm"
                    unoptimized
                  />
                ) : (
                  <div className="w-12 h-16 bg-gray-200 dark:bg-neutral-700 rounded-md flex items-center justify-center">
                    <BookOpen size={18} className="text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold font-lxgw leading-snug truncate" title={bookName}>
                    {bookName}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('noteCount', { count: highlights.length })}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5">
                    {formatProgress()}
                  </p>
                </div>
              </div>
            </div>
            
            {highlights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Highlighter size={42} className="text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 font-lxgw">{t('noHighlights')}</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
                <div className="divide-y divide-gray-50 dark:divide-neutral-700">
                  {highlights.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 p-4 hover:bg-gray-50 dark:hover:bg-neutral-750 items-start"
                    >
                      <div
                        className={`w-1 rounded-full shrink-0 ${colorBarMap[item.color] || colorBarMap.yellow}`}
                      />
                      <button
                        type="button"
                        className="flex-1 min-w-0 text-left"
                        onClick={() => handleNavigate(item.chapterIndex)}
                      >
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                          &ldquo;{item.selectedText}&rdquo;
                        </p>
                        {item.note && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 italic">
                            {item.note}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {ht('chapter', { chapterNumber: item.chapterIndex + 1 })}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(item.createdAt)}
                        </p>
                      </button>
                      <button
                        type="button"
                        className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 opacity-70 hover:opacity-100 transition-all self-start"
                        onClick={() => {
                          void handleDelete(item.id);
                        }}
                        title={ht('deleteHighlight')}
                        aria-label={ht('deleteHighlight')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
