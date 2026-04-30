'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from '@/components/AppImage';
import { useTranslations } from '@/i18n';
import { useRouter, useParams } from '@/navigation';
import { Trash2, BookOpen, Highlighter, ChevronLeft, Loader2, Share2, Copy, X } from 'lucide-react';
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
  const [activeShareItem, setActiveShareItem] = useState<HighlightWithBook | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [sharePreviewBlob, setSharePreviewBlob] = useState<Blob | null>(null);
  const [sharePreviewUrl, setSharePreviewUrl] = useState<string | null>(null);
  const [isSharePreviewLoading, setIsSharePreviewLoading] = useState(false);

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

  const getSharePrimaryText = (item: HighlightWithBook) => {
    return (item.note || item.selectedText).trim();
  };

  const getShareSecondaryText = (item: HighlightWithBook) => {
    if (!item.note.trim()) {
      return '';
    }

    return item.selectedText.trim();
  };

  const loadShareCoverImage = useCallback((src: string | null) => {
    return new Promise<HTMLImageElement | null>((resolve) => {
      if (!src) {
        resolve(null);
        return;
      }

      const image = new window.Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }, []);

  const buildShareImageBlob = useCallback(
    async (item: HighlightWithBook) => {
      const canvas = document.createElement('canvas');
      const width = 1100;
      const height = 760;
      const coverImage = await loadShareCoverImage(bookCoverUrl);

      canvas.width = width * 2;
      canvas.height = height * 2;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('canvas-context-missing');
      }

      const ctx = context;
      const ratio = 2;
      ctx.scale(ratio, ratio);

      const blueAccent = '#2563eb';
      const textPrimary = '#0f172a';
      const textSecondary = '#64748b';
      const cardBg = '#ffffff';

      // 1. Sleek minimal off-white background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#f8fafc');
      bgGradient.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Decorative geometric accent
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.7);
      ctx.lineTo(width, height * 0.3);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fill();

      // 2. Premium Clean Card Container
      ctx.shadowColor = 'rgba(15, 23, 42, 0.05)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 16;

      ctx.fillStyle = cardBg;
      ctx.beginPath();
      ctx.roundRect(40, 40, width - 80, height - 80, 24);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Subtle inner border
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3. Header: Blue pill + Date
      const innerPadding = 84;
      const contentWidth = width - innerPadding * 2;

      ctx.fillStyle = `${blueAccent}15`;
      ctx.beginPath();
      const chapterLabel = `${ht('chapter', { chapterNumber: item.chapterIndex + 1 })}`;
      ctx.font = '600 15px "PingFang SC", "Microsoft YaHei", sans-serif';
      const tagWidth = ctx.measureText(chapterLabel).width + 28;
      ctx.roundRect(innerPadding, 84, tagWidth, 28, 14);
      ctx.fill();

      ctx.fillStyle = blueAccent;
      ctx.fillText(chapterLabel, innerPadding + 14, 103);

      ctx.fillStyle = textSecondary;
      ctx.font = '500 15px "PingFang SC", "Microsoft YaHei", sans-serif';
      const dateFormatted = formatDate(item.createdAt);
      ctx.fillText(dateFormatted, width - innerPadding - ctx.measureText(dateFormatted).width, 103);

      // Helper functions
      const drawWrappedText = (
        source: string,
        startX: number,
        startY: number,
        maxW: number,
        lineHeight: number,
        options: { size: number; color: string; style?: string; maxLines?: number; family?: string }
      ) => {
        const { size, color, style = 'normal', maxLines, family } = options;
        const lines: string[] = [];
        const paragraphs = source.split('\n');
        const fontFamily =
          family || '"LXGW WenKai", "Noto Serif SC", "PingFang SC", "Microsoft YaHei", serif';
        ctx.fillStyle = color;
        ctx.font = `${style} ${size}px ${fontFamily}`;

        for (const paragraph of paragraphs) {
          let currentLine = '';

          for (const char of paragraph) {
            const tryLine = currentLine + char;

            if (ctx.measureText(tryLine).width > maxW && currentLine) {
              lines.push(currentLine);
              currentLine = char;

              if (maxLines && lines.length >= maxLines) {
                const trimmedLine = lines[lines.length - 1].slice(
                  0,
                  Math.max(0, lines[lines.length - 1].length - 1)
                );
                lines[lines.length - 1] = `${trimmedLine}…`;
                let overflowY = startY;
                lines.forEach((line) => {
                  ctx.fillText(line, startX, overflowY);
                  overflowY += lineHeight;
                });
                return;
              }
              continue;
            }

            currentLine = tryLine;
          }

          lines.push(currentLine);
        }

        const renderLines = maxLines ? lines.slice(0, maxLines) : lines;
        let currentY = startY;
        renderLines.forEach((line) => {
          ctx.fillText(line, startX, currentY);
          currentY += lineHeight;
        });

        if (maxLines && lines.length > maxLines) {
          const last = renderLines[renderLines.length - 1];
          if (last && !last.endsWith('…')) {
            ctx.fillText(
              `${last.slice(0, Math.max(0, last.length - 2))}…`,
              startX,
              currentY - lineHeight
            );
          }
        }

        return currentY;
      };

      const drawSingleLineEllipsis = (
        source: string,
        startX: number,
        startY: number,
        maxW: number,
        options: { size: number; color: string; style?: string; family?: string }
      ) => {
        const {
          size,
          color,
          style = 'normal',
          family = '"PingFang SC", "Microsoft YaHei", Arial, sans-serif'
        } = options;
        ctx.fillStyle = color;
        ctx.font = `${style} ${size}px ${family}`;

        let output = source;
        while (output.length > 0 && ctx.measureText(output).width > maxW) {
          output = output.slice(0, -1);
        }

        const finalText = output.length < source.length ? `${output}...` : output;
        ctx.fillText(finalText, startX, startY);
      };

      const primaryText = getSharePrimaryText(item);
      const secondaryText = getShareSecondaryText(item);

      // 4. Main content area
      // Large decorative quotation mark
      ctx.fillStyle = blueAccent;
      ctx.font = '800 64px "Georgia", serif';
      ctx.fillText('“', innerPadding, 170);

      // Note Text
      const endY = drawWrappedText(primaryText, innerPadding, 216, contentWidth, 54, {
        size: 34,
        color: textPrimary,
        style: '600',
        maxLines: 4,
        family: '"Noto Serif SC", "PingFang SC", "Microsoft YaHei", serif'
      });

      // Closing decorative quotation mark
      ctx.fillStyle = `${blueAccent}60`; // Slightly transparent
      ctx.font = '800 64px "Georgia", serif';
      ctx.textAlign = 'right';
      ctx.fillText('”', width - innerPadding + 8, endY + 24);
      ctx.textAlign = 'left'; // Reset

      // Secondary text
      if (secondaryText) {
        // Minimalist left border
        const secondaryY = 460;
        ctx.fillStyle = blueAccent;
        ctx.beginPath();
        ctx.roundRect(innerPadding, secondaryY, 4, 60, 2);
        ctx.fill();

        drawWrappedText(secondaryText, innerPadding + 20, secondaryY + 20, contentWidth - 40, 28, {
          size: 18,
          color: textSecondary,
          style: '400',
          maxLines: 2,
          family: '"PingFang SC", "Microsoft YaHei", Arial, sans-serif'
        });
      }

      // 5. Footer Layout
      // Draw a subtle divider
      ctx.strokeStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(innerPadding, height - 160);
      ctx.lineTo(width - innerPadding, height - 160);
      ctx.stroke();

      const footerY = height - 130;

      // Book details container
      if (coverImage) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(innerPadding, footerY, 48, 64, 8);
        ctx.clip();
        ctx.drawImage(coverImage, innerPadding, footerY, 48, 64);
        ctx.restore();
      } else {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(innerPadding, footerY, 48, 64, 8);
        ctx.fill();

        ctx.strokeStyle = '#e2e8f0';
        ctx.stroke();

        ctx.fillStyle = textSecondary;
        ctx.font = '600 12px "PingFang SC", sans-serif';
        ctx.fillText('BOOK', innerPadding + 8, footerY + 36);
      }

      const textX = innerPadding + 64;
      ctx.fillStyle = textPrimary;
      drawSingleLineEllipsis(bookName, textX, footerY + 26, contentWidth - 80, {
        size: 22,
        color: textPrimary,
        style: '600',
        family: '"PingFang SC", "Microsoft YaHei", sans-serif'
      });

      ctx.fillStyle = textSecondary;
      ctx.font = '400 15px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(t('shareBook'), textX, footerY + 54);

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('toBlob-failed'));
            return;
          }
          resolve(blob);
        }, 'image/png');
      });
    },
    [bookCoverUrl, bookName, ht, loadShareCoverImage, t]
  );

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (!activeShareItem) {
      setSharePreviewBlob(null);
      setSharePreviewUrl(null);
      setIsSharePreviewLoading(false);
      return;
    }

    setIsSharePreviewLoading(true);
    setSharePreviewBlob(null);
    setSharePreviewUrl(null);

    void buildShareImageBlob(activeShareItem)
      .then((blob) => {
        if (cancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setSharePreviewBlob(blob);
        setSharePreviewUrl(objectUrl);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setSharePreviewBlob(null);
        setSharePreviewUrl(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsSharePreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    activeShareItem?.id,
    activeShareItem?.selectedText,
    activeShareItem?.note,
    activeShareItem?.chapterIndex,
    activeShareItem?.createdAt,
    activeShareItem?.color,
    bookCoverUrl,
    bookName
  ]);

  const copyShareImageToClipboard = useCallback(async (imageBlob: Blob) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.write) {
      throw new Error('clipboard-unavailable');
    }
    const ItemCtor = (window as Window & typeof globalThis).ClipboardItem;

    if (!ItemCtor) {
      throw new Error('clipboard-item-unavailable');
    }

    await navigator.clipboard.write([
      new ItemCtor({ 'image/png': imageBlob } as Record<string, Blob>)
    ]);
  }, []);

  const getShareMessage = (item: HighlightWithBook) => {
    const date = formatDate(item.createdAt);
    const chapter = ht('chapter', { chapterNumber: item.chapterIndex + 1 });
    const noteLines = [
      getSharePrimaryText(item),
      chapter,
      getShareSecondaryText(item),
      bookName,
      date
    ].filter(Boolean);
    return `${t('shareCardHeader')}\n${noteLines.join('\n')}`;
  };

  const handleCopyShare = async () => {
    if (!activeShareItem) {
      return;
    }

    const item = activeShareItem;
    setIsCopying(true);
    setCopyMessage(null);
    try {
      const imageBlob = sharePreviewBlob || (await buildShareImageBlob(item));
      await copyShareImageToClipboard(imageBlob);
      setCopyMessage(t('shareCopied'));
      setTimeout(() => {
        setCopyMessage(null);
      }, 1600);
      return;
    } catch (error) {
      const fallbackMessage = getShareMessage(item);
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(fallbackMessage);
          setCopyMessage(t('shareCopyFallback'));
          setTimeout(() => {
            setCopyMessage(null);
          }, 2000);
          return;
        }

        throw error;
      } catch {
        setCopyMessage(t('shareCopyFailed'));
      } finally {
        setTimeout(() => {
          setCopyMessage(null);
        }, 2200);
      }
    } finally {
      setIsCopying(false);
    }
  };

  const handleOpenShare = useCallback((item: HighlightWithBook) => {
    setActiveShareItem(item);
    setCopyMessage(null);
  }, []);

  const closeShareModal = useCallback(() => {
    setActiveShareItem(null);
    setSharePreviewBlob(null);
    setSharePreviewUrl(null);
    setIsSharePreviewLoading(false);
    setCopyMessage(null);
  }, []);

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
                  <h1
                    className="text-2xl font-bold font-lxgw leading-snug truncate"
                    title={bookName}
                  >
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
                      <div className="shrink-0 flex flex-col gap-2 self-start">
                        <button
                          type="button"
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 dark:bg-neutral-700 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 dark:hover:text-blue-300 transition-all"
                          onClick={() => {
                            handleOpenShare(item);
                          }}
                          title={t('share')}
                          aria-label={t('shareThisNote')}
                        >
                          <Share2 size={14} />
                          <span>{t('share')}</span>
                        </button>
                        <button
                          type="button"
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:bg-neutral-700 dark:hover:bg-red-950 dark:hover:text-red-300 transition-all"
                          onClick={() => {
                            void handleDelete(item.id);
                          }}
                          title={ht('deleteHighlight')}
                          aria-label={ht('deleteHighlight')}
                        >
                          <Trash2 size={14} />
                          <span>{ht('deleteHighlight')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeShareItem ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-neutral-950 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-neutral-800 flex flex-col">
            <div className="flex flex-row items-center justify-between px-6 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/50">
                <Share2 className="size-5" />
              </div>

              <button
                type="button"
                className="inline-flex shrink-0 items-center justify-center rounded-full p-2.5 -mr-2 text-gray-400 dark:text-gray-500 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/20 transition-colors outline-none"
                onClick={closeShareModal}
                aria-label={t('close')}
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="md:p-4 bg-gray-50/50 dark:bg-neutral-900/20 flex justify-center items-center">
              <div className="w-full relative shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 transition-all">
                {sharePreviewUrl ? (
                  <img
                    src={sharePreviewUrl}
                    alt={t('shareCardHeader')}
                    className="block w-full h-auto object-cover"
                  />
                ) : (
                  <div className="aspect-[55/38] flex flex-col gap-3 items-center justify-center bg-white dark:bg-neutral-900">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void handleCopyShare();
              }}
              disabled={isCopying || isSharePreviewLoading || copyMessage !== null}
              className="w-full group flex items-center justify-center p-5 border-t border-gray-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 hover:bg-gray-50 dark:hover:bg-neutral-900 active:bg-gray-100 dark:active:bg-neutral-800 transition-colors disabled:opacity-100 disabled:bg-white dark:disabled:bg-neutral-950 disabled:cursor-default"
            >
              <div className="flex items-center justify-center h-6">
                {copyMessage ? (
                  <span className="text-[15px] font-semibold text-green-600 dark:text-green-500">
                    {copyMessage}
                  </span>
                ) : (
                  <div
                    className={`flex items-center gap-2 text-[15px] font-semibold text-gray-900 dark:text-gray-100 transition-opacity ${isCopying || isSharePreviewLoading ? 'opacity-50' : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}
                  >
                    <Copy
                      size={18}
                      className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"
                    />
                    <span>
                      {isCopying
                        ? t('shareCopying')
                        : isSharePreviewLoading
                          ? t('loading')
                          : t('shareCopy')}
                    </span>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
