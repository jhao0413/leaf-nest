"use client";

import { Card, CardFooter } from "@nextui-org/card";
import { useMemo, useEffect } from "react";
import { Image } from "@nextui-org/image";
import { Info } from "lucide-react";
import { BookBasicInfoType, useBookInfoListStore } from "@/store/bookInfoStore";

export default function Home() {
  const worker = useMemo<Worker | null>(() => {
    if (typeof window !== "undefined") {
      return new Worker(new URL("@/utils/handleWorker.ts", import.meta.url));
    }
    return null;
  }, []);

  useEffect(() => {
    if (worker) {
      worker.postMessage({ action: "query" });
    }
  }, [worker]);

  const bookInfoList = useBookInfoListStore((state) => state.bookInfoList);
  const setBookInfoList = useBookInfoListStore((state) => state.setBookInfoList);

  if (worker) {
    worker.onmessage = (event) => {
      event.data.map((item: BookBasicInfoType) => {
        if (!item.coverBlob) return;
        item.coverUrl = URL.createObjectURL(new Blob([item.coverBlob], { type: "image/jpeg" }));
      });
      console.log(event.data);
      setBookInfoList(event.data);
    };
  }

  return (
    <div className="p-6 flex flex-wrap">
      {bookInfoList.map((book, index) => (
        <Card isFooterBlurred radius="lg" key={index} className="max-w-48 border-none mr-8 mb-8">
          {book.coverUrl && (
            <Image isBlurred isZoomed alt="Cover" src={book.coverUrl} width={200} />
          )}
          <CardFooter className="justify-between h-10 before:bg-white/10 border-white/20 border-1 overflow-hidden py-1 absolute before:rounded-xl rounded-large bottom-1 w-[calc(100%_-_8px)] shadow-small ml-1 z-10">
            <div className="w-[calc(100%_-_20px)]">
              <p className="text-black/80 font-bold text-sm overflow-hidden whitespace-nowrap text-ellipsis font-XiaLuZhenKai">
                {book.name}
              </p>
            </div>

            <Info size={18} className="cursor-pointer" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
