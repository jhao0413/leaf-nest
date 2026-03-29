'use client';

import JSZip from 'jszip';
import DoubleColumnRenderer from '@/components/Renderer/DoubleColumnRenderer';
import SingleColumnRenderer from '@/components/Renderer/SingleColumnRenderer';
import { useRendererModeStore } from '@/store/rendererModeStore';
import { useBookInfoStore } from '@/store/bookInfoStore';
import { useBookZipStore } from '@/store/bookZipStore';
import { useFullBookSearchStore } from '@/store/fullBookSearchStore';
import { useReaderStateStore } from '@/store/readerStateStore';
import { loadZip } from '@/utils/zipUtils';
import { useEffect } from 'react';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { useParams } from '@/navigation';
import { booksRepository } from '@/lib/repositories/booksRepository';
import { remoteBookBinarySource } from '@/lib/binary/remoteBookBinarySource';
import { useSessionStore } from '@/lib/auth/sessionStore';

const emptyBookInfo = {
  name: '',
  creator: '',
  publisher: '',
  identifier: '',
  pubdate: '',
  coverBlob: new ArrayBuffer(0),
  coverPath: '',
  coverUrl: '',
  toc: [],
  blob: new ArrayBuffer(0),
  language: '',
  size: ''
};

export default function ReaderPage() {
  const { id = '' } = useParams<{ id: string }>();
  const rendererMode = useRendererModeStore((state) => state.rendererMode);
  const bookInfo = useBookInfoStore((state) => state.bookInfo);
  const setBookInfo = useBookInfoStore((state) => state.setBookInfo);
  const setBookZip = useBookZipStore((state) => state.setBookZip);
  const clearIndex = useFullBookSearchStore((state) => state.clearIndex);
  const sessionStatus = useSessionStore((state) => state.status);

  useEffect(() => {
    clearIndex();
    setBookInfo(emptyBookInfo);
    setBookZip(new JSZip());

    if (sessionStatus !== 'authenticated') {
      const { setReaderState } = useReaderStateStore.getState();
      setReaderState(0, 1);
      return;
    }

    let isActive = true;

    const loadBook = async () => {
      const [bookData, bookBlob] = await Promise.all([
        booksRepository.getBook(id),
        remoteBookBinarySource.getBookBlob(id)
      ]);

      if (!isActive) {
        return;
      }

      setBookInfo(bookData);

      const { setReaderState } = useReaderStateStore.getState();
      setReaderState(bookData.currentChapter ?? 0, bookData.currentPage ?? 1);
      setBookZip(await loadZip(bookBlob));
    };

    void loadBook();

    return () => {
      isActive = false;
    };
  }, [clearIndex, id, sessionStatus, setBookInfo, setBookZip]);

  const { isMobile } = useBreakpoints();

  const isSingleMode = isMobile || rendererMode === 'single';

  return (
    <>
      {bookInfo.name ? (
        isSingleMode ? (
          <SingleColumnRenderer />
        ) : (
          <DoubleColumnRenderer />
        )
      ) : (
        <div className="h-full w-full bg-slate-50"></div>
      )}
    </>
  );
}
