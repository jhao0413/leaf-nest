"use client";

import { BookBasicInfoType, useBookInfoListStore } from "@/store/bookInfoStore";
import { useManageModeStore, useSelectedBookIdsStore } from "@/store/manageModeStore";
import epubStructureParser from "@/utils/epubStructureParser";
import { getFileBinary } from "@/utils/utils";
import { Input } from "@heroui/input";
import { BookDown, Github, Pencil, Trash2, X } from "lucide-react";
import { useMemo, useRef } from "react";

export const Navbar: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const setBookInfoList = useBookInfoListStore((state) => state.setBookInfoList);
  const manageMode = useManageModeStore((state) => state.manageMode);
  const setManageMode = useManageModeStore((state) => state.setManageMode);
  const selectedBookIds = useSelectedBookIdsStore((state) => state.selectedBookIds);
  const setSelectedBookIds = useSelectedBookIdsStore((state) => state.setSelectedBookIds);
  const worker = useMemo(() => {
    if (typeof window !== "undefined") {
      return new Worker(new URL("@/utils/handleWorker.ts", import.meta.url));
    }
    return null;
  }, []);

  if (worker) {
    worker.onmessage = (event) => {
      console.log(event.data.data);
      if (
        event.data.success &&
        (event.data.action === "addBook" || event.data.action === "deleteBook")
      ) {
        worker.postMessage({
          action: "query",
        });
        setSelectedBookIds([]);
        setManageMode(false);
      } else if (event.data.success && event.data.action === "query") {
        event.data.data.map((item: BookBasicInfoType) => {
          if (!item.coverBlob) return;
          item.coverUrl = URL.createObjectURL(new Blob([item.coverBlob], { type: "image/jpeg" }));
        });
        setBookInfoList(event.data.data);
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
      const fileSizeInBytes = file.size;
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
      const fileBlob = await getFileBinary(file);
      const bookParserInfo = await epubStructureParser(file);

      worker.postMessage({
        action: "addBook",
        data: {
          ...bookParserInfo,
          blob: fileBlob,
          size: `${parseFloat(fileSizeInMB)} MB`,
        },
      });
    }
  };

  const handleDelete = () => {
    if (selectedBookIds.length === 0) return;

    worker?.postMessage({
      action: "deleteBook",
      data: selectedBookIds,
    });
  };
  return (
    <>
      <div className="flex justify-between items-center">
        <div className="w-full h-16 border-none dark:bg-default-100/50 flex items-center font-bold p-4 text-2xl">
          Books
        </div>
        <div className="flex">
          <div className="rounded-full flex items-center cursor-pointer px-2 mr-4 bg-white/30 backdrop-blur backdrop-saturate-150 justify-between h-10 border-2 border-white/20 overflow-hidden py-1">
            <div
              className="pl-4 flex w-28 items-center"
              onClick={() => window.open("https://github.com/jhao0413/leaf-nest", "_blank")}
            >
              <Github size={20} className="mr-2" />
              <span>Github</span>
            </div>
          </div>
          <div
            className={`rounded-full flex items-center cursor-pointer px-2 mr-4 bg-white/30 backdrop-blur backdrop-saturate-150 justify-between h-10 border-2 border-white/20 overflow-hidden py-1 ${
              manageMode ? "border-red-500 text-red-500" : ""
            }`}
          >
            {manageMode ? (
              <>
                <div className={`pl-4 flex w-28 items-center `} onClick={handleDelete}>
                  <Trash2 size={20} className="mr-2" />
                  <span>Delete</span>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
          <div className="rounded-full flex items-center cursor-pointer px-2 mr-4 bg-white/30 backdrop-blur backdrop-saturate-150 justify-between h-10 border-2 border-white/20 overflow-hidden py-1">
            <div className="pl-4 flex w-28 items-center" onClick={() => setManageMode(!manageMode)}>
              {manageMode ? (
                <>
                  <X size={20} className="mr-2" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Pencil size={20} className="mr-2" />
                  <span>Manage</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
