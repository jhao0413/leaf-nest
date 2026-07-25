import { useEffect, useMemo, useRef, useState } from 'react';
import Image from '@/components/AppImage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MenuIcon } from '@/components/ui/menu';
import { Button, Tooltip, TooltipTrigger, TooltipContent } from '@heroui/react';
import { useRendererModeStore } from '@/store/rendererModeStore';
import { useBookInfoStore } from '@/store/bookInfoStore';
import { useReaderStateStore } from '@/store/readerStateStore';
import { useTheme } from '@/theme';
import { useTranslations } from '@/i18n';
import { createBlobUrlFromBinary } from '@/utils/blobUrl';

const Menu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const currentChapterRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations('ReaderMenu');
  const bookInfo = useBookInfoStore((state) => state.bookInfo);
  const coverUrl = useMemo(() => {
    if (bookInfo.coverUrl) return bookInfo.coverUrl;
    if (!bookInfo.coverBlob) return null;
    return createBlobUrlFromBinary(bookInfo.coverBlob);
  }, [bookInfo.coverBlob, bookInfo.coverUrl]);
  const mode = useRendererModeStore((state) => state.rendererMode);
  const currentChapter = useReaderStateStore((state) => state.currentChapter);
  const setCurrentChapter = useReaderStateStore((state) => state.setCurrentChapter);
  const setCurrentPageIndex = useReaderStateStore((state) => state.setCurrentPageIndex);
  const { theme } = useTheme();

  useEffect(() => {
    if (coverUrl && coverUrl.startsWith('blob:')) {
      return () => {
        URL.revokeObjectURL(coverUrl);
      };
    }
  }, [coverUrl]);

  useEffect(() => {
    if (!isOpen) return;

    const frame = requestAnimationFrame(() => {
      currentChapterRef.current?.scrollIntoView({
        block: 'center',
        behavior: 'auto'
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [currentChapter, isOpen]);

  const handleMenuClick = () => {
    setIsOpen(!isOpen);
  };

  const handleOverlayClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      <Button
        className="h-12 w-12 rounded-full bg-white shadow-md dark:bg-neutral-900"
        isIconOnly
        variant="outline"
        onPress={handleMenuClick}
        aria-label={isOpen ? t('close') : t('open')}
      >
        <MenuIcon isOpen={isOpen} />
      </Button>
      <button
        type="button"
        className={`fixed top-0 left-0 w-screen h-screen bg-zinc-500/50 z-20 transition-opacity duration-500 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleOverlayClick}
        aria-label={t('close')}
      />
      <div
        className={`w-auto max-w-md min-w-96 h-[86vh] bg-white rounded-2xl dark:bg-neutral-800 fixed top-[calc(7vh+32px)] ${
          mode === 'single' ? 'right-1/4' : ' right-[10%]'
        } z-30 transition-opacity duration-500 transform ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } shadow-md`}
      >
        <div className="flex px-6 pt-8 pb-4 z-50">
          {coverUrl && (
            <Image
              className="shadow-md rounded-md"
              src={coverUrl}
              alt="Book Cover"
              width={80}
              height={120}
              style={{ objectFit: 'cover', height: 'auto' }}
            />
          )}
          <div className="w-4/6 mx-4">
            <Tooltip>
              <TooltipTrigger>
                <h2 className="font-bold truncate w-[90%] text-lg font-lxgw">{bookInfo.name}</h2>
              </TooltipTrigger>
              <TooltipContent>{bookInfo.name}</TooltipContent>
            </Tooltip>

            <p className="text-slate-500 dark:text-white">{bookInfo.creator}</p>
          </div>
        </div>
        <div>
          <ScrollArea className="h-[68vh] w-full z-50">
            <div>
              {bookInfo.toc.map((_item, index) => {
                const isCurrent = currentChapter === index;

                return (
                  <button
                    key={index}
                    ref={isCurrent ? currentChapterRef : undefined}
                    type="button"
                    aria-current={isCurrent ? 'location' : undefined}
                    onClick={() => {
                      handleOverlayClick();
                      setCurrentChapter(index);
                      setCurrentPageIndex(1);
                    }}
                    className={`flex min-h-11 w-full items-center gap-3 px-6 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 dark:focus-visible:ring-brand-300 ${
                      isCurrent
                        ? 'bg-brand-100/90 font-semibold text-brand-900 dark:bg-brand-900/60 dark:text-brand-100'
                        : `${
                            theme === 'dark'
                              ? 'text-slate-300 hover:bg-neutral-600 hover:text-white'
                              : 'text-slate-600 hover:bg-brand-50 hover:text-slate-900'
                          }`
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-5 w-1 shrink-0 rounded-full ${
                        isCurrent ? 'bg-brand-600 dark:bg-brand-300' : 'bg-transparent'
                      }`}
                    />
                    <span className="min-w-0 flex-1 leading-5">{_item.text}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
};

export default Menu;
