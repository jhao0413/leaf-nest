"use client";

import DoubleColumnRenderer from "@/components/Renderer/DoubleColumnRenderer";
import SingleColumnRenderer from "@/components/Renderer/SingleColumnRenderer";
import { useRendererModeStore } from "@/store/rendererModeStore";
import { useBookInfoStore } from "@/store/bookInfoStore";
import { useBookZipStore } from "@/store/bookZipStore";
import { useFullBookSearchStore } from "@/store/fullBookSearchStore";
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
    
    worker.postMessage({ action: "getBookById", data: { id } });
    worker.onmessage = async (event) => {
      console.log("Received message from main thread:", event.data);
      if (event.data.success && event.data.action === "getBookById") {
        event.data.data.coverUrl = URL.createObjectURL(
          new Blob([event.data.data.coverBlob], { type: "image/jpeg" })
        );
        event.data.data.toc = JSON.parse(event.data.data.toc);
        setBookInfo(event.data.data);
        setBookZip(await loadZip(event.data.data.fileBlob));
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
