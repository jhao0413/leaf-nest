'use client';

import { Card, Checkbox, useOverlayState } from '@heroui/react';
import { useEffect, useRef, useState } from 'react';
import { Info, BookDown, Pencil, Trash2, X } from 'lucide-react';
import { BookBasicInfoType, useBookInfoListStore } from '@/store/bookInfoStore';
import { useRouter } from '@/navigation';
import { BookInfoModal } from '@/components/BookInfoModal';
import { useManageModeStore, useSelectedBookIdsStore } from '@/store/manageModeStore';
import epubStructureParser from '@/utils/epubStructureParser';
import { useTranslations } from '@/i18n';
import { booksRepository } from '@/lib/repositories/booksRepository';
import { useSessionStore } from '@/lib/auth/sessionStore';

function createCoverFile(bookInfo: BookBasicInfoType) {
  if (!bookInfo.coverBlob) {
    return null;
  }

  const filename = bookInfo.coverPath.split('/').pop() || 'cover.bin';

  return new File([bookInfo.coverBlob], filename, {
    type: 'application/octet-stream'
  });
}

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('HomePage');
  const sessionStatus = useSessionStore((state) => state.status);

  // Stores
  const bookInfoList = useBookInfoListStore((state) => state.bookInfoList);
  const setBookInfoList = useBookInfoListStore((state) => state.setBookInfoList);
  const manageMode = useManageModeStore((state) => state.manageMode);
  const setManageMode = useManageModeStore((state) => state.setManageMode);
  const selectedBookIds = useSelectedBookIdsStore((state) => state.selectedBookIds);
  const setSelectedBookIds = useSelectedBookIdsStore((state) => state.setSelectedBookIds);

  useEffect(() => {
    if (sessionStatus === 'anonymous') {
      setBookInfoList([]);
      return;
    }

    if (sessionStatus !== 'authenticated') {
      return;
    }

    let isActive = true;

    const loadBooks = async () => {
      const items = await booksRepository.listBooks();

      if (isActive) {
        setBookInfoList(items);
      }
    };

    void loadBooks();

    return () => {
      isActive = false;
    };
  }, [sessionStatus, setBookInfoList]);

  // File Import Handlers
  const handleButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const file = files[0];

    if (file) {
      const bookParserInfo = await epubStructureParser(file);
      const book = await booksRepository.uploadBook({
        file,
        cover: createCoverFile(bookParserInfo),
        metadata: bookParserInfo
      });

      setBookInfoList([book, ...bookInfoList]);
      setManageMode(false);
      setSelectedBookIds([]);
    }

    event.target.value = '';
  };

  // Delete Handler
  const handleDelete = async () => {
    if (selectedBookIds.length === 0) return;

    await Promise.all(selectedBookIds.map((bookId) => booksRepository.deleteBook(bookId)));
    setBookInfoList(bookInfoList.filter((book) => !book.id || !selectedBookIds.includes(book.id)));
    setSelectedBookIds([]);
    setManageMode(false);
  };

  // Selection Handler
  const onSelectBook = (bookId: string | undefined, isSelected: boolean) => {
    if (!bookId) return;
    if (isSelected) {
      setSelectedBookIds([...selectedBookIds, bookId]);
    } else {
      setSelectedBookIds(selectedBookIds.filter((id) => id !== bookId));
    }
  };

  // Book Info Modal
  const [modalBookInfo, setModalBookInfo] = useState<BookBasicInfoType | null>(null);
  const overlayState = useOverlayState();
  const openBookinfoModal = (book: BookBasicInfoType) => {
    setModalBookInfo(book);
    overlayState.open();
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Top Toolbar */}
        <div className="flex justify-between items-end mb-8 px-2 pt-4">
          <div>
            <h2 className="text-3xl font-bold font-lxgw bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              {t('myBooks')}
            </h2>
          </div>
          <div className="flex gap-3 relative z-10">
            {/* Import / Delete Button */}
            {!manageMode && (
              <input
                id="picture"
                type="file"
                accept=".epub"
                ref={inputRef}
                className="hidden"
                aria-label="Upload EPUB"
                onChange={handleFileChange}
              />
            )}
            <button
              type="button"
              className={`
                group flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300
                border border-white/20 shadow-sm backdrop-blur-md
                ${
                  manageMode
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-white/40 text-gray-700 hover:bg-white/60 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
                }
              `}
              onClick={manageMode ? handleDelete : handleButtonClick}
            >
              {manageMode ? <Trash2 size={18} /> : <BookDown size={18} />}
              <span className="font-lxgw text-sm font-medium">
                {manageMode ? t('delete') : t('import')}
              </span>
            </button>

            {/* Manage / Cancel Button */}
            <button
              type="button"
              className="group flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all duration-300 bg-white/40 text-gray-700 hover:bg-white/60 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 border border-white/20 shadow-sm backdrop-blur-md"
              onClick={() => {
                setManageMode(!manageMode);
                if (manageMode) setSelectedBookIds([]); // Clear selection when cancelling
              }}
            >
              {manageMode ? <X size={18} /> : <Pencil size={18} />}
              <span className="font-lxgw text-sm font-medium">
                {manageMode ? t('cancel') : t('manage')}
              </span>
            </button>
          </div>
        </div>

        {/* Book Grid */}
        <div className="flex flex-wrap content-start gap-4">
          {bookInfoList.map((book, index) => (
            <Card
              variant="transparent"
              key={book.id || index}
              className="relative w-[160px] h-[240px] overflow-hidden rounded-[14px] border-none bg-transparent p-0 shadow-md ring-1 ring-black/5 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20 group dark:ring-white/10"
            >
              <button
                type="button"
                className="h-full w-full cursor-pointer disabled:cursor-default"
                onClick={() => !manageMode && router.push(`/reader/${book.id}`)}
                disabled={manageMode}
                aria-label={`Open ${book.name}`}
              >
                {book.coverUrl ? (
                  <img
                    alt={book.name}
                    className="z-0 h-full w-full object-cover"
                    src={book.coverUrl}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                    <span className="p-4 text-center text-sm text-gray-400 font-lxgw">
                      {book.name}
                    </span>
                  </div>
                )}
              </button>

              <Card.Footer className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-2 rounded-b-[14px] border-t border-white/28 bg-white/40 px-3 py-2 backdrop-blur-lg backdrop-saturate-150 dark:border-white/10 dark:bg-black/45">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900 dark:text-white/90 font-lxgw">
                    {book.name}
                  </p>
                </div>

                {manageMode ? (
                  <Checkbox
                    className="mr-0"
                    onChange={(isSelected) => onSelectBook(book.id, isSelected)}
                  />
                ) : (
                  <button
                    type="button"
                    className="shrink-0 text-slate-600 transition-colors hover:text-slate-950 dark:text-white/70 dark:hover:text-white"
                    onClick={() => openBookinfoModal(book)}
                    aria-label={`Open details for ${book.name}`}
                    title={book.name}
                  >
                    <Info size={16} />
                  </button>
                )}
              </Card.Footer>
            </Card>
          ))}

          {bookInfoList.length === 0 && (
            <div className="w-full h-[50vh] flex flex-col items-center justify-center text-gray-400 font-lxgw">
              <BookDown size={48} className="mb-4 opacity-50" />
              <p>{t('emptyState')}</p>
            </div>
          )}
        </div>

        {modalBookInfo && (
          <BookInfoModal
            isOpen={overlayState.isOpen}
            onClose={overlayState.close}
            bookInfo={modalBookInfo}
          />
        )}
      </div>
    </>
  );
}
