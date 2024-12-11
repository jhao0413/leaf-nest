"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@nextui-org/button";
import { useBookInfoStore } from "@/store/bookInfoStore";
import { useCurrentChapterStore } from "@/store/currentChapterStore";
import { useRendererConfigStore } from "@/store/fontConfigStore";
import { BookOpen, House } from "lucide-react";
import { useTheme } from "next-themes";
import { Toolbar } from "@/components/Renderer/Toolbar/Index";
import { applyFontAndThemeStyles } from "@/utils/styleHandler";
import { useRendererModeStore } from "@/store/rendererModeStore";
import { loadChapterContent } from "@/utils/chapterLoader";
import { useBookZipStore } from "@/store/bookZipStore";
import { parseAndProcessChapter } from "@/utils/chapterParser";
import {
  waitForImagesAndCalculatePages,
  writeToIframe,
} from "@/utils/iframeHandler";
import { useTranslations } from "next-intl";
import { useDisclosure } from "@nextui-org/modal";
import _ from "lodash";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { useRouter } from "next/navigation";
import { BookInfoModal } from "@/components/BookInfoModal";
import { MoreButton } from "./Toolbar/MoreButton";

const EpubReader: React.FC = () => {
  const t = useTranslations("SingleColumnRenderer");
  const currentChapter = useCurrentChapterStore(
    (state) => state.currentChapter
  );
  const setCurrentChapter = useCurrentChapterStore(
    (state) => state.setCurrentChapter
  );
  const currentFontConfig = useRendererConfigStore(
    (state) => state.rendererConfig
  );
  const bookInfo = useBookInfoStore((state) => state.bookInfo);
  const { theme } = useTheme();
  const bookZip = useBookZipStore((state) => state.bookZip);
  const rendererMode = useRendererModeStore((state) => state.rendererMode);
  const router = useRouter();
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);

  useEffect(() => {
    const processChapter = async () => {
      const { chapterContent, basePath } = await loadChapterContent(
        bookZip,
        bookInfo,
        currentChapter
      );
      const updatedChapter = await parseAndProcessChapter(
        chapterContent,
        bookZip,
        basePath
      );
      const renderer = writeToIframe(
        updatedChapter,
        currentFontConfig,
        theme,
        rendererMode,
        0
      );
      const iframeDoc =
        renderer.contentDocument ||
        (renderer.contentWindow && renderer.contentWindow.document);
      if (iframeDoc) {
        waitForImagesAndCalculatePages(renderer, iframeDoc);
      } else {
        console.error("Iframe document not found");
      }

      return handleIframeLoad(renderer);
    };

    if (_.isEmpty(bookZip.files)) return;

    processChapter();
  }, [bookInfo, bookZip, currentChapter]);

  useEffect(() => {
    const renderer = document.getElementById(
      "epub-renderer"
    ) as HTMLIFrameElement;
    if (!renderer || !renderer.contentWindow) {
      throw new Error("Renderer not found");
    }

    applyFontAndThemeStyles(currentFontConfig, theme, rendererMode, 0);
  }, [currentFontConfig, theme, rendererMode]);

  const handleIframeLoad = (renderer: HTMLIFrameElement) => {
    renderer.style.visibility = "hidden";
    const handleLoad = () => {
      const iframeDoc = renderer.contentDocument;

      if (!iframeDoc || !renderer.contentWindow) {
        throw new Error("Iframe document not found");
      }

      renderer.style.height = `0px`;
      if (iframeDoc.body) {
        renderer.style.visibility = "visible";
        const body = iframeDoc.body;
        const html = iframeDoc.documentElement;
        const height = Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        );
        renderer.style.height = `${height + 40}px`;
        renderer.removeEventListener("load", handleLoad);
      }
    };

    renderer.addEventListener("load", handleLoad);
  };

  const handlePrevChapter = () => {
    setCurrentChapter(currentChapter - 1);
  };

  const handleNextChapter = () => {
    setCurrentChapter(currentChapter + 1);
  };

  useKeyboardNavigation({
    onPrevious: handlePrevChapter,
    onNext: handleNextChapter,
  });

  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <div className="w-full h-screen bg-gray-100 flex justify-center fixed z-0 dark:bg-neutral-800"></div>
      <div className="sm:w-1/2 h-14 bg-white border-b-2 flex fixed items-center pl-4 z-20 inset-x-0 m-auto dark:bg-neutral-900">
        <div className="flex w-full justify-between items-center pr-4">
          <div className="flex items-center cursor-pointer" onClick={onOpen}>
            <BookOpen size={20} />
            <p
              className={`font-bold text-lg font-XiaLuZhenKai ${
                bookInfo.language === "zh" ? "" : "italic"
              }`}
            >
              {bookInfo.language === "zh"
                ? `《${bookInfo.name}》`
                : bookInfo.name}
            </p>
          </div>
          <div className="flex items-center">
            <Button
              className="ml-4 bg-white dark:bg-neutral-900"
              isIconOnly
              variant="bordered"
              radius="sm"
              onClick={() => router.push("/")}
            >
              <House size={16} className="dark:bg-neutral-900" />
            </Button>
            
            <MoreButton />
          </div>
        </div>
      </div>
      <div className="sm:w-1/2 h-full min-h-[100vh] mx-auto bg-white relative pt-14 flex flex-col dark:bg-neutral-900">
        <iframe
          id="epub-renderer"
          className="w-full z-10 px-14 grow dark:bg-neutral-900"
        ></iframe>
        <div className="w-full z-10 h-20 flex justify-around items-start">
          <Button
            variant="bordered"
            className="text-base rounded-md w-40 dark:bg-neutral-900"
            onClick={handlePrevChapter}
          >
            {t("previous")}
          </Button>
          <Button
            variant="bordered"
            className="text-base rounded-md w-40 dark:bg-neutral-900"
            onClick={handleNextChapter}
          >
            {t("next")}
          </Button>
        </div>

        <div className="hidden sm:block fixed right-[20%] bottom-[40%] z-50">
          <Toolbar/>
        </div>
      </div>

      <BookInfoModal isOpen={isOpen} onClose={onClose} bookInfo={bookInfo} />
    </>
  );
};

export default EpubReader;
