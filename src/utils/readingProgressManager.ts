import { BookBasicInfoType } from "@/store/bookInfoStore";

export interface ReadingProgressData {
  bookId: string;
  currentChapter: number;
  currentPage: number;
  textAnchor: string;
  percentage: number;
}

export class ReadingProgressManager {
  private worker: Worker | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(worker: Worker) {
    this.worker = worker;
  }

  /**
   * Extract text anchor from iframe
   * Extracts first 50 characters of visible text IN CURRENT VIEWPORT
   */
  extractTextAnchor(iframeWindow: Window): string {
    try {
      const doc = iframeWindow.document;
      const walker = doc.createTreeWalker(
        doc.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let textContent = '';
      let node;
      const viewportWidth = iframeWindow.innerWidth;

      // Traverse text nodes and extract visible text from current viewport
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          const element = node.parentElement;
          if (element) {
            const style = iframeWindow.getComputedStyle(element);
            // Check if element is visible and in current viewport
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              const rect = element.getBoundingClientRect();
              // Element must be in horizontal viewport (for multi-column layout)
              if (rect.left >= 0 && rect.left < viewportWidth) {
                textContent += text + ' ';
                if (textContent.length >= 100) break;
              }
            }
          }
        }
      }

      // Take first 50 characters
      return textContent.substring(0, 50).trim();
    } catch (error) {
      console.error("Error extracting text anchor:", error);
      return '';
    }
  }

  /**
   * Calculate reading percentage
   * Double column mode: (currentChapter * avgPagesPerChapter + currentPage) / totalPages
   * Single column mode: currentChapter / totalChapters
   */
  calculatePercentage(
    currentChapter: number,
    currentPage: number,
    totalChapters: number,
    mode: 'single' | 'double'
  ): number {
    if (totalChapters === 0) return 0;

    if (mode === 'single') {
      // Single column mode based on chapters
      return Math.round((currentChapter / totalChapters) * 100);
    } else {
      // Double column mode more precise, considering current chapter's page number
      // Simplified calculation: assume average 10 pages per chapter
      const estimatedTotalPages = totalChapters * 10;
      const estimatedCurrentPosition = currentChapter * 10 + currentPage;
      return Math.min(100, Math.round((estimatedCurrentPosition / estimatedTotalPages) * 100));
    }
  }

  /**
   * Save reading progress (with debounce)
   * @param bookId Book ID
   * @param chapter Current chapter
   * @param page Current page number
   * @param iframeWindow iframe window reference
   * @param bookInfo Book information
   * @param mode Rendering mode
   * @param debounceMs Debounce delay (default 3000ms)
   * @param immediate Whether to save immediately (used for chapter switching)
   */
  saveProgress(
    bookId: string,
    chapter: number,
    page: number,
    iframeWindow: Window | null,
    bookInfo: BookBasicInfoType,
    mode: 'single' | 'double',
    debounceMs: number = 3000,
    immediate: boolean = false
  ) {
    // Clear previous timer
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    const doSave = () => {
      if (!this.worker || !iframeWindow) return;

      const textAnchor = this.extractTextAnchor(iframeWindow);
      const percentage = this.calculatePercentage(
        chapter,
        page,
        bookInfo.toc.length,
        mode
      );

      this.worker.postMessage({
        action: "updateReadingProgress",
        data: {
          bookId,
          currentChapter: chapter,
          currentPage: page,
          textAnchor,
          percentage
        }
      });

      console.log(`[Progress] Saved: Chapter ${chapter}, Page ${page}, Anchor: "${textAnchor.substring(0, 20)}...", ${percentage}%`);
    };

    if (immediate) {
      doSave();
    } else {
      this.saveTimeout = setTimeout(doSave, debounceMs);
    }
  }

  /**
   * Restore reading position
   * Prioritize text anchor positioning, fall back to page number
   */
  async restorePosition(
    bookInfo: BookBasicInfoType,
    iframeWindow: Window,
    mode: 'single' | 'double',
    pageWidth: number,
    columnGap: number
  ): Promise<{ chapter: number; page: number } | null> {
    const { currentChapter = 0, currentPage = 1, textAnchor } = bookInfo;

    // If no saved progress, return default position
    if (currentChapter === 0 && currentPage === 1 && !textAnchor) {
      return null;
    }

    // Double column mode: try to use text anchor
    if (mode === 'double' && textAnchor) {
      const targetPage = this.findPageByTextAnchor(
        iframeWindow,
        textAnchor,
        pageWidth,
        columnGap
      );

      if (targetPage) {
        // Scroll to target page
        iframeWindow.scrollTo({
          left: (targetPage - 1) * pageWidth,
          behavior: 'auto'
        });
        console.log(`[Progress] Restored using text anchor: Page ${targetPage}`);
        return { chapter: currentChapter, page: targetPage };
      }
    }

    // Fall back to page number (double column mode) or chapter (single column mode)
    if (mode === 'double') {
      iframeWindow.scrollTo({
        left: (currentPage - 1) * pageWidth,
        behavior: 'auto'
      });
      console.log(`[Progress] Restored using page number: Page ${currentPage}`);
    } else {
      console.log(`[Progress] Restored to chapter: ${currentChapter}`);
    }

    return { chapter: currentChapter, page: currentPage };
  }

  /**
   * Find page number by text anchor
   */
  private findPageByTextAnchor(
    iframeWindow: Window,
    anchor: string,
    pageWidth: number,
    columnGap: number
  ): number | null {
    try {
      const doc = iframeWindow.document;
      const walker = doc.createTreeWalker(
        doc.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      // Use first 20 characters for matching
      const searchText = anchor.substring(0, 20);
      console.log(searchText)

      while (node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text && text.includes(searchText)) {
          // Found matching text node
          const element = node.parentElement;
          if (element) {
            const rect = element.getBoundingClientRect();
            const pageIndex = Math.floor(rect.left / (pageWidth + columnGap)) + 2;
            return pageIndex;
          }
        }
      }

      console.log(`[Progress] Text anchor not found, falling back to page number`);
      return null;
    } catch (error) {
      console.error("Error finding page by text anchor:", error);
      return null;
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  }
}
