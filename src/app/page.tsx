"use client";

import { Card, CardFooter } from "@heroui/card";
import { useMemo, useEffect, useRef } from "react";
import { Image } from "@heroui/image";
import { Info, BookDown, Pencil, Trash2, X } from "lucide-react";
import { BookBasicInfoType, useBookInfoListStore } from "@/store/bookInfoStore";
import { useRouter } from "next/navigation";
import { BookInfoModal } from "@/components/BookInfoModal";
import { useDisclosure } from "@heroui/modal";
import { useManageModeStore, useSelectedBookIdsStore } from "@/store/manageModeStore";
import { Checkbox } from "@heroui/checkbox";
import epubStructureParser from "@/utils/epubStructureParser";
import { getFileBinary } from "@/utils/utils";
import { Input } from "@heroui/input";

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Stores
  const bookInfoList = useBookInfoListStore((state) => state.bookInfoList);
  const setBookInfoList = useBookInfoListStore((state) => state.setBookInfoList);
  const manageMode = useManageModeStore((state) => state.manageMode);
  const setManageMode = useManageModeStore((state) => state.setManageMode);
  const selectedBookIds = useSelectedBookIdsStore((state) => state.selectedBookIds);
  const setSelectedBookIds = useSelectedBookIdsStore((state) => state.setSelectedBookIds);
  
  // Worker Initialization
  const worker = useMemo<Worker | null>(() => {
    if (typeof window !== "undefined") {
      return new Worker(new URL("@/utils/handleWorker.ts", import.meta.url));
    }
    return null;
  }, []);

  // Worker Query on Mount
  useEffect(() => {
    if (worker) {
      worker.postMessage({ action: "query" });
    }
  }, [worker]);

  // Worker Message Handler
  if (worker) {
    worker.onmessage = (event) => {
      if (
        event.data.success &&
        (event.data.action === "addBook" || event.data.action === "deleteBook")
      ) {
        // Refresh list after add/delete
        worker.postMessage({ action: "query" });
        setSelectedBookIds([]);
        setManageMode(false);
      } else if (event.data.success && event.data.action === "query") {
        // Update store with query results
        event.data.data.map((item: BookBasicInfoType) => {
          if (!item.coverBlob) return;
          item.coverUrl = URL.createObjectURL(new Blob([item.coverBlob], { type: "image/jpeg" }));
        });
        setBookInfoList(event.data.data);
      }
    };
  }

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
    // Reset input so same file can be selected again if needed
    event.target.value = "";
  };

  // Delete Handler
  const handleDelete = () => {
    if (selectedBookIds.length === 0) return;

    worker?.postMessage({
      action: "deleteBook",
      data: selectedBookIds,
    });
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

  return (
    <div className="flex flex-col h-full">
      {/* Top Toolbar */}
      <div className="flex justify-between items-center mb-6 px-2 pt-2">
        <h2 className="text-2xl font-bold font-lxgw text-gray-800 dark:text-gray-200">
          My Books
        </h2>
        <div className="flex gap-3">
           {/* Import / Delete Button */}
           <div
              className={`
                group flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all duration-300
                border border-white/20 shadow-sm backdrop-blur-md
                ${manageMode 
                  ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400" 
                  : "bg-white/40 text-gray-700 hover:bg-white/60 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                }
              `}
              onClick={manageMode ? handleDelete : handleButtonClick}
            >
              {manageMode ? <Trash2 size={18} /> : <BookDown size={18} />}
              <span className="font-lxgw text-sm font-medium">
                {manageMode ? "Delete" : "Import"}
              </span>
              {!manageMode && (
                <Input
                  id="picture"
                  type="file"
                  accept=".epub"
                  ref={inputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
              )}
            </div>

            {/* Manage / Cancel Button */}
            <div
              className="group flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all duration-300 bg-white/40 text-gray-700 hover:bg-white/60 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 border border-white/20 shadow-sm backdrop-blur-md"
              onClick={() => {
                setManageMode(!manageMode);
                if (manageMode) setSelectedBookIds([]); // Clear selection when cancelling
              }}
            >
              {manageMode ? <X size={18} /> : <Pencil size={18} />}
              <span className="font-lxgw text-sm font-medium">
                {manageMode ? "Cancel" : "Manage"}
              </span>
            </div>
        </div>
      </div>

      {/* Book Grid */}
      <div className="flex flex-wrap content-start gap-6">
        {bookInfoList.map((book, index) => (
          <Card 
            isFooterBlurred 
            radius="lg" 
            key={book.id || index} 
            className="w-[160px] h-[240px] border-none bg-transparent shadow-none hover:scale-105 transition-transform duration-300 group"
          >
             <div className="relative w-full h-full rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-shadow">
                {book.coverUrl ? (
                  <Image
                    removeWrapper
                    alt={book.name}
                    className="z-0 w-full h-full object-cover"
                    src={book.coverUrl}
                    onClick={() => !manageMode && router.push(`/reader/${book.id}`)}
                  />
                ) : (
                  <div 
                    className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center cursor-pointer"
                    onClick={() => !manageMode && router.push(`/reader/${book.id}`)}
                  >
                     <span className="text-gray-400 font-lxgw p-4 text-center text-sm">{book.name}</span>
                  </div>
                )}
             </div>
            
            <CardFooter className="justify-between h-10 before:bg-white/70 border-white/20 border overflow-hidden py-1 absolute before:rounded-xl rounded-b-large bottom-0 w-[calc(100%)] shadow-small z-50">
              <div className="w-[calc(100%-24px)]">
                <p className="text-black/80 font-bold text-xs overflow-hidden whitespace-nowrap text-ellipsis font-lxgw">
                  {book.name}
                </p>
              </div>

              {manageMode ? (
                <Checkbox
                  size="sm"
                  radius="sm"
                  color="danger"
                  classNames={{ wrapper: "mr-0" }}
                  onValueChange={(isSelected) => onSelectBook(book.id, isSelected)}
                />
              ) : (
                <Info size={16} className="text-black/60 cursor-pointer hover:text-black" onClick={() => openBookinfoModal(book)} />
              )}
            </CardFooter>
          </Card>
        ))}
        
        {bookInfoList.length === 0 && (
           <div className="w-full h-[50vh] flex flex-col items-center justify-center text-gray-400 font-lxgw">
              <BookDown size={48} className="mb-4 opacity-50"/>
              <p>暂无书籍，点击右上角导入</p>
           </div>
        )}
      </div>

      <BookInfoModal isOpen={isOpen} onClose={onClose} bookInfo={bookInfoRef.current} />
    </div>
  );
}