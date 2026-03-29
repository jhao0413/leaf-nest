'use client';

import { Card, CardFooter } from '@heroui/card';
import { useEffect, useRef, useState } from 'react';
import { Image } from '@heroui/image';
import { Info, BookDown, Pencil, Trash2, X } from 'lucide-react';
import { BookBasicInfoType, useBookInfoListStore } from '@/store/bookInfoStore';
import { useRouter } from '@/navigation';
import { BookInfoModal } from '@/components/BookInfoModal';
import { useDisclosure } from '@heroui/modal';
import { useManageModeStore, useSelectedBookIdsStore } from '@/store/manageModeStore';
import { Checkbox } from '@heroui/checkbox';
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
  const { isOpen, onOpen, onClose } = useDisclosure();
  const openBookinfoModal = (book: BookBasicInfoType) => {
    setModalBookInfo(book);
    onOpen();
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
              isFooterBlurred
              radius="lg"
              key={book.id || index}
              className="w-[160px] h-[240px] border-none bg-transparent shadow-none hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 ease-out group"
            >
              <div className="relative w-full h-full rounded-[14px] overflow-hidden shadow-md group-hover:shadow-2xl group-hover:shadow-blue-500/20 transition-all duration-300 ring-1 ring-black/5 dark:ring-white/10">
                <button
                  type="button"
                  className="w-full h-full"
                  onClick={() => !manageMode && router.push(`/reader/${book.id}`)}
                  disabled={manageMode}
                  aria-label={`Open ${book.name}`}
                >
                  {book.coverUrl ? (
                    <Image
                      removeWrapper
                      alt={book.name}
                      className="z-0 w-full h-full object-cover"
                      src={book.coverUrl}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                      <span className="text-gray-400 font-lxgw p-4 text-center text-sm">
                        {book.name}
                      </span>
                    </div>
                  )}
                </button>
              </div>

              <CardFooter className="justify-between h-10 before:bg-white/70 border-white/20 border overflow-hidden py-1 absolute before:rounded-xl rounded-b-[14px] bottom-0 w-[calc(100%)] shadow-small z-50">
                <div className="w-[calc(100%-24px)]">
                  <p className="text-black/80 dark:text-gray-800 font-bold text-xs overflow-hidden whitespace-nowrap text-ellipsis font-lxgw">
                    {book.name}
                  </p>
                </div>

                {manageMode ? (
                  <Checkbox
                    size="sm"
                    radius="sm"
                    color="danger"
                    classNames={{ wrapper: 'mr-0' }}
                    onValueChange={(isSelected) => onSelectBook(book.id, isSelected)}
                  />
                ) : (
                  <button
                    type="button"
                    className="text-black/60 hover:text-black dark:text-gray-700 dark:hover:text-black"
                    onClick={() => openBookinfoModal(book)}
                    aria-label={`Open details for ${book.name}`}
                    title={book.name}
                  >
                    <Info size={16} />
                  </button>
                )}
              </CardFooter>
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
          <BookInfoModal isOpen={isOpen} onClose={onClose} bookInfo={modalBookInfo} />
        )}
      </div>
    </>
  );
}
