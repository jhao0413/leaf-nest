'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Loader2, Share2, X } from 'lucide-react';
import { useTranslations } from '@/i18n';

export interface HighlightShareItem {
  selectedText: string;
  note?: string | null;
  chapterIndex: number;
  createdAt?: string | null;
}

interface HighlightShareModalProps {
  item: HighlightShareItem;
  bookName: string;
  bookCoverUrl?: string | null;
  onClose: () => void;
}

interface HighlightShareLabels {
  chapter: string;
  shareBook: string;
  shareCardHeader: string;
}

export function HighlightShareModal({
  item,
  bookName,
  bookCoverUrl,
  onClose
}: HighlightShareModalProps) {
  const t = useTranslations('NotesPage');
  const ht = useTranslations('Highlights');
  const [isCopying, setIsCopying] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [sharePreviewBlob, setSharePreviewBlob] = useState<Blob | null>(null);
  const [sharePreviewUrl, setSharePreviewUrl] = useState<string | null>(null);
  const [isSharePreviewLoading, setIsSharePreviewLoading] = useState(false);

  const createdAt = useMemo(() => item.createdAt || new Date().toISOString(), [item.createdAt]);
  const chapterLabel = ht('chapter', { chapterNumber: item.chapterIndex + 1 });
  const shareBookLabel = t('shareBook');
  const shareCardHeaderLabel = t('shareCardHeader');
  const labels = useMemo(
    () => ({
      chapter: chapterLabel,
      shareBook: shareBookLabel,
      shareCardHeader: shareCardHeaderLabel
    }),
    [chapterLabel, shareBookLabel, shareCardHeaderLabel]
  );

  const buildImageBlob = useCallback(() => {
    return buildHighlightShareImageBlob({
      item,
      bookName,
      bookCoverUrl,
      labels,
      createdAt
    });
  }, [bookCoverUrl, bookName, createdAt, item, labels]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setIsSharePreviewLoading(true);
    setSharePreviewBlob(null);
    setSharePreviewUrl(null);
    setCopyMessage(null);

    void buildImageBlob()
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
  }, [buildImageBlob]);

  const handleCopyShare = async () => {
    setIsCopying(true);
    setCopyMessage(null);

    try {
      const imageBlob = sharePreviewBlob || (await buildImageBlob());
      await copyShareImageToClipboard(imageBlob);
      setCopyMessage(t('shareCopied'));
      window.setTimeout(() => setCopyMessage(null), 1600);
      return;
    } catch (error) {
      const fallbackMessage = getShareMessage({
        item,
        bookName,
        labels,
        createdAt
      });

      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(fallbackMessage);
          setCopyMessage(t('shareCopyFallback'));
          window.setTimeout(() => setCopyMessage(null), 2000);
          return;
        }

        throw error;
      } catch {
        setCopyMessage(t('shareCopyFailed'));
      } finally {
        window.setTimeout(() => setCopyMessage(null), 2200);
      }
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-neutral-950 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-neutral-800 flex flex-col">
        <div className="flex flex-row items-center justify-between px-6 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/50">
            <Share2 className="size-5" />
          </div>

          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center rounded-full p-2.5 -mr-2 text-gray-400 dark:text-gray-500 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/20 transition-colors outline-none"
            onClick={onClose}
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
                className={`flex items-center gap-2 text-[15px] font-semibold text-gray-900 dark:text-gray-100 transition-opacity ${
                  isCopying || isSharePreviewLoading
                    ? 'opacity-50'
                    : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                }`}
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
  );
}

export async function buildHighlightShareImageBlob({
  item,
  bookName,
  bookCoverUrl,
  labels,
  createdAt
}: {
  item: HighlightShareItem;
  bookName: string;
  bookCoverUrl?: string | null;
  labels: HighlightShareLabels;
  createdAt: string;
}) {
  const canvas = document.createElement('canvas');
  const width = 1100;
  const height = 760;
  const coverImage = await loadShareCoverImage(bookCoverUrl ?? null);

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

  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, '#f8fafc');
  bgGradient.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.7);
  ctx.lineTo(width, height * 0.3);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();

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

  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  ctx.stroke();

  const innerPadding = 84;
  const contentWidth = width - innerPadding * 2;

  ctx.fillStyle = `${blueAccent}15`;
  ctx.beginPath();
  ctx.font = '600 15px "PingFang SC", "Microsoft YaHei", sans-serif';
  const tagWidth = ctx.measureText(labels.chapter).width + 28;
  ctx.roundRect(innerPadding, 84, tagWidth, 28, 14);
  ctx.fill();

  ctx.fillStyle = blueAccent;
  ctx.fillText(labels.chapter, innerPadding + 14, 103);

  ctx.fillStyle = textSecondary;
  ctx.font = '500 15px "PingFang SC", "Microsoft YaHei", sans-serif';
  const dateFormatted = formatShareDate(createdAt);
  ctx.fillText(dateFormatted, width - innerPadding - ctx.measureText(dateFormatted).width, 103);

  const primaryText = getSharePrimaryText(item);
  const secondaryText = getShareSecondaryText(item);

  ctx.fillStyle = blueAccent;
  ctx.font = '800 64px "Georgia", serif';
  ctx.fillText('\u201c', innerPadding, 170);

  const endY = drawWrappedText(ctx, primaryText, innerPadding, 216, contentWidth, 54, {
    size: 34,
    color: textPrimary,
    style: '600',
    maxLines: 4,
    family: '"Noto Serif SC", "PingFang SC", "Microsoft YaHei", serif'
  });

  ctx.fillStyle = `${blueAccent}60`;
  ctx.font = '800 64px "Georgia", serif';
  ctx.textAlign = 'right';
  ctx.fillText('\u201d', width - innerPadding + 8, endY + 24);
  ctx.textAlign = 'left';

  if (secondaryText) {
    const secondaryY = 460;
    ctx.fillStyle = blueAccent;
    ctx.beginPath();
    ctx.roundRect(innerPadding, secondaryY, 4, 60, 2);
    ctx.fill();

    drawWrappedText(ctx, secondaryText, innerPadding + 20, secondaryY + 20, contentWidth - 40, 28, {
      size: 18,
      color: textSecondary,
      style: '400',
      maxLines: 2,
      family: '"PingFang SC", "Microsoft YaHei", Arial, sans-serif'
    });
  }

  ctx.strokeStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.moveTo(innerPadding, height - 160);
  ctx.lineTo(width - innerPadding, height - 160);
  ctx.stroke();

  const footerY = height - 130;

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
  drawSingleLineEllipsis(ctx, bookName, textX, footerY + 26, contentWidth - 80, {
    size: 22,
    color: textPrimary,
    style: '600',
    family: '"PingFang SC", "Microsoft YaHei", sans-serif'
  });

  ctx.fillStyle = textSecondary;
  ctx.font = '400 15px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(labels.shareBook, textX, footerY + 54);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('toBlob-failed'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

function getSharePrimaryText(item: HighlightShareItem) {
  return (item.note || item.selectedText).trim();
}

function getShareSecondaryText(item: HighlightShareItem) {
  if (!item.note?.trim()) {
    return '';
  }

  return item.selectedText.trim();
}

function getShareMessage({
  item,
  bookName,
  labels,
  createdAt
}: {
  item: HighlightShareItem;
  bookName: string;
  labels: HighlightShareLabels;
  createdAt: string;
}) {
  const noteLines = [
    getSharePrimaryText(item),
    labels.chapter,
    getShareSecondaryText(item),
    bookName,
    formatShareDate(createdAt)
  ].filter(Boolean);
  return `${labels.shareCardHeader}\n${noteLines.join('\n')}`;
}

function loadShareCoverImage(src: string | null) {
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
}

async function copyShareImageToClipboard(imageBlob: Blob) {
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
}

function formatShareDate(dateStr: string) {
  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  source: string,
  startX: number,
  startY: number,
  maxW: number,
  lineHeight: number,
  options: {
    size: number;
    color: string;
    style?: string;
    maxLines?: number;
    family?: string;
  }
) {
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
          lines[lines.length - 1] = `${trimmedLine}...`;
          let overflowY = startY;
          lines.forEach((line) => {
            ctx.fillText(line, startX, overflowY);
            overflowY += lineHeight;
          });
          return overflowY;
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
    if (last && !last.endsWith('...')) {
      ctx.fillText(
        `${last.slice(0, Math.max(0, last.length - 2))}...`,
        startX,
        currentY - lineHeight
      );
    }
  }

  return currentY;
}

function drawSingleLineEllipsis(
  ctx: CanvasRenderingContext2D,
  source: string,
  startX: number,
  startY: number,
  maxW: number,
  options: { size: number; color: string; style?: string; family?: string }
) {
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
}
