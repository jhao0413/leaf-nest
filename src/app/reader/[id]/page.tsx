"use client";

import JSZip from "jszip";
import DoubleColumnRenderer from "@/components/Renderer/DoubleColumnRenderer";
import SingleColumnRenderer from "@/components/Renderer/SingleColumnRenderer";
import { useRendererModeStore } from "@/store/rendererModeStore";
import { useBookInfoStore } from "@/store/bookInfoStore";
import { useBookZipStore } from "@/store/bookZipStore";
import { useFullBookSearchStore } from "@/store/fullBookSearchStore";
import { useReaderStateStore } from "@/store/readerStateStore";
import { loadZip } from "@/utils/zipUtils";
import { useEffect } from "react";
import React from "react";
import { useBreakpoints } from "@/hooks/useBreakpoints";

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const rendererMode = useRendererModeStore((state) => state.rendererMode);
  const bookInfo = useBookInfoStore((state) => state.bookInfo);
  const setBookInfo = useBookInfoStore((state) => state.setBookInfo);
  const setBookZip = useBookZipStore((state) => state.setBookZip);
  const setWorker = useFullBookSearchStore((state) => state.setWorker);

  useEffect(() => {
    const worker = new Worker(new URL("@/utils/handleWorker.ts", import.meta.url));

    // Set worker for full book search indexer
    setWorker(worker);

    // Clear old book data first to prevent loading stale content
    setBookZip(new JSZip());

    worker.postMessage({ action: "getBookById", data: { id } });
    worker.onmessage = async (event) => {
      if (event.data.success && event.data.action === "getBookById") {
        const bookData = event.data.data;

        // Process cover and TOC
        bookData.coverUrl = URL.createObjectURL(
          new Blob([bookData.coverBlob], { type: "image/jpeg" })
        );
        bookData.toc = JSON.parse(bookData.toc);

        // Set book info
        setBookInfo(bookData);

        // Restore reading state if available
        if (bookData.currentChapter !== undefined && bookData.currentChapter !== null) {
          const { setReaderState } = useReaderStateStore.getState();
          setReaderState(
            bookData.currentChapter,
            bookData.currentPage || 1
          );
        }

        // Load book ZIP
        setBookZip(await loadZip(bookData.fileBlob));
      }
    };
    return () => worker.terminate();
  }, [id, setBookInfo, setBookZip, setWorker]);

  const { isMobile } = useBreakpoints();

  const isSingleMode = isMobile || rendererMode === "single";

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
