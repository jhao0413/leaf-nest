"use client";

import { Card, CardFooter } from "@heroui/card";
import { useMemo, useEffect, useRef } from "react";
import { Image } from "@heroui/image";
import { Info } from "lucide-react";
import { BookBasicInfoType, useBookInfoListStore } from "@/store/bookInfoStore";
import { useRouter } from "next/navigation";
import { BookInfoModal } from "@/components/BookInfoModal";
import { useDisclosure } from "@heroui/modal";
import { useManageModeStore, useSelectedBookIdsStore } from "@/store/manageModeStore";
import { Checkbox } from "@heroui/checkbox";

export default function Home() {
  const router = useRouter();
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
      event.data.data.map((item: BookBasicInfoType) => {
        if (!item.coverBlob) return;
        item.coverUrl = URL.createObjectURL(new Blob([item.coverBlob], { type: "image/jpeg" }));
      });
      setBookInfoList(event.data.data);
    };
  }

  const bookInfoRef = useRef<BookBasicInfoType>({
    name: "",
    creator: "",
    publisher: "",
    identifier: "",
    pubdate: "",
    coverPath: "",
    toc: [] as { text: string; path: string; file: string }[],
    language: "",
  });

  const { isOpen, onOpen, onClose } = useDisclosure();

  const openBookinfoModal = (book: BookBasicInfoType) => {
    bookInfoRef.current = book;
    onOpen();
  };

  const manageMode = useManageModeStore((state) => state.manageMode);

  const selectedBookIds = useSelectedBookIdsStore((state) => state.selectedBookIds);
  const setSelectedBookIds = useSelectedBookIdsStore((state) => state.setSelectedBookIds);

  const onSelectBook = (bookId: string | undefined, isSelected: boolean) => {
    if (!bookId) return;

    if (isSelected) {
      setSelectedBookIds([...selectedBookIds, bookId]);
    } else {
      setSelectedBookIds(selectedBookIds.filter((id) => id !== bookId));
    }
  };

  return (
    <div className="p-6 flex flex-wrap">
      {bookInfoList.map((book, index) => (
        <Card isFooterBlurred radius="lg" key={index} className="max-w-48 border-none mr-8 mb-8 ">
          {book.coverUrl && (
            <Image
              isBlurred
              isZoomed
              alt="Cover"
              className="object-cover hover:scale-110 cursor-pointer"
              src={book.coverUrl}
              width={200}
              height={280}
              onClick={() => router.push(`/reader/${book.id}`)}
            />
          )}
          <CardFooter className="justify-between h-10 before:bg-white/10 border-white/20 border-1 overflow-hidden py-1 absolute before:rounded-xl rounded-b-large bottom-0 w-[calc(100%)] shadow-small z-50">
            <div className="w-[calc(100%_-_20px)]">
              <p className="text-black/80 font-bold text-sm overflow-hidden whitespace-nowrap text-ellipsis font-XiaLuZhenKai">
                {book.name}
              </p>
            </div>

            {manageMode ? (
              <>
                <Checkbox
                  radius="sm"
                  color="danger"
                  onValueChange={(isSelected) => onSelectBook(book.id, isSelected)}
                />
              </>
            ) : (
              <Info size={18} className="cursor-pointer" onClick={() => openBookinfoModal(book)} />
            )}
          </CardFooter>
        </Card>
      ))}

      <BookInfoModal isOpen={isOpen} onClose={onClose} bookInfo={bookInfoRef.current} />
    </div>
  );
}
