import { useEffect, useMemo, useState } from 'react';
import Image from '@/components/AppImage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MenuIcon } from '@/components/ui/menu';
import { Tooltip } from '@heroui/tooltip';
import { useRendererModeStore } from '@/store/rendererModeStore';
import { useBookInfoStore } from '@/store/bookInfoStore';
import { useReaderStateStore } from '@/store/readerStateStore';
import { useTheme } from '@/theme';
import { createBlobUrlFromBinary } from '@/utils/blobUrl';

const Menu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const bookInfo = useBookInfoStore((state) => state.bookInfo);
  const coverUrl = useMemo(() => {
    if (!bookInfo.coverBlob) return null;
    return createBlobUrlFromBinary(bookInfo.coverBlob);
  }, [bookInfo.coverBlob]);
  const mode = useRendererModeStore((state) => state.rendererMode);
  const currentChapter = useReaderStateStore((state) => state.currentChapter);
  const setCurrentChapter = useReaderStateStore((state) => state.setCurrentChapter);
  const setCurrentPageIndex = useReaderStateStore((state) => state.setCurrentPageIndex);
  const { theme } = useTheme();

  useEffect(() => {
    if (coverUrl) {
      return () => {
        URL.revokeObjectURL(coverUrl);
      };
    }
  }, [coverUrl]);

  const handleMenuClick = () => {
    setIsOpen(!isOpen);
  };

  const handleOverlayClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer z-10 dark:bg-neutral-900"
        onClick={handleMenuClick}
        aria-label={isOpen ? 'Close table of contents' : 'Open table of contents'}
        title={isOpen ? 'Close table of contents' : 'Open table of contents'}
      >
        <MenuIcon isOpen={isOpen} />
      </button>
      <button
        type="button"
        className={`fixed top-0 left-0 w-screen h-screen bg-zinc-500/50 z-20 transition-opacity duration-500 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleOverlayClick}
        aria-label="Close table of contents"
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
            <Tooltip content={bookInfo.name}>
              <h2 className="font-bold truncate w-[90%] text-lg font-lxgw">{bookInfo.name}</h2>
            </Tooltip>

            <p className="text-slate-500 dark:text-white">{bookInfo.creator}</p>
          </div>
        </div>
        <div>
          <ScrollArea className="h-[68vh] w-full z-50">
            <div>
              {bookInfo.toc.map((_item, index) => (
                <div
                  key={index}
                  className={`py-4 px-8 ${
                    theme === 'dark' ? 'hover:bg-neutral-600' : 'hover:bg-blue-50'
                  } dark:text-white`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleOverlayClick();
                      setCurrentChapter(index);
                      setCurrentPageIndex(1);
                    }}
                    className={`block w-full text-left text-sm ${
                      currentChapter === index ? 'text-blue-500' : 'text-slate-500 dark:text-white'
                    }`}
                  >
                    {_item.text}
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
};

export default Menu;
