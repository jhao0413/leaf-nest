"use client";

import { useBookInfoListStore } from "@/store/bookInfoStore";
import epubStructureParser from "@/utils/epubStructureParser";
import { getFileBinary } from "@/utils/utils";
import { Input } from "@nextui-org/input";
import { BookDown, BookUp, Pencil } from "lucide-react";
import { useMemo, useRef } from "react";

export const Navbar: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const bookInfoList = useBookInfoListStore((state) => state.bookInfoList);
  const setBookInfoList = useBookInfoListStore((state) => state.setBookInfoList);
  const worker = useMemo(() => {
    if (typeof window !== "undefined") {
      return new Worker(new URL("../utils/handleWorker.ts", import.meta.url));
    }
    return null;
  }, []);

  if (worker) {
    worker.onmessage = (event) => {
      if (event.data.success) {
        event.data.data.coverUrl = URL.createObjectURL(
          new Blob([event.data.data.coverBlob], { type: "image/jpeg" })
        );
        console.log(event.data.data);
        setBookInfoList([...bookInfoList, event.data.data]);
      }
    };
  }

  const handleButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const file = files[0];

    if (file && worker) {
      const fileBlob = await getFileBinary(file);
      const bookParserInfo = await epubStructureParser(file);

      worker.postMessage({
        action: "addBook",
        data: {
          ...bookParserInfo,
          fileBlob: fileBlob,
        },
      });
    }
  };
  return (
    <>
      <div className="flex justify-between items-center">
        <div className="w-full h-16 border-none dark:bg-default-100/50 flex items-center font-bold p-4 text-2xl">
          Books
        </div>
        <div className="flex">
          <div className="rounded-full flex items-center cursor-pointer px-2 mr-4 bg-white/30 backdrop-blur backdrop-saturate-150 justify-between h-10 border border-white/20 overflow-hidden py-1">
            <div className="pl-4 flex w-28 items-center" onClick={handleButtonClick}>
              <BookDown size={20} className="mr-2" />
              <span>Import</span>
              <Input
                id="picture"
                type="file"
                accept=".epub"
                ref={inputRef}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
          <div className="rounded-full flex items-center px-2 mr-4 bg-white/30 backdrop-blur backdrop-saturate-150 justify-between h-10 border border-white/20 overflow-hidden py-1">
            <div className="pl-4 flex w-28 items-center">
              <BookUp size={20} className="mr-2" />
              <span>Export</span>
            </div>
          </div>
          <div className="rounded-full flex items-center px-2 mr-4 bg-white/30 backdrop-blur backdrop-saturate-150 justify-between h-10 border border-white/20 overflow-hidden py-1">
            <div className="pl-4 flex w-28 items-center">
              <Pencil size={20} className="mr-2" />
              <span>Manage</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
