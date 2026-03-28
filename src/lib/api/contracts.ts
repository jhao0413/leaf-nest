export interface ApiProgressItem {
  currentChapter: number;
  currentPage: number;
  percentage: number;
  textAnchor: string | null;
  lastReadAt: string;
}

export interface ApiBookListItem {
  id: string;
  ownerId: string;
  title: string;
  creator: string | null;
  publisher: string | null;
  identifier: string | null;
  language: string | null;
  coverUrl: string | null;
  coverObjectKey: string | null;
  sizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
  progress: ApiProgressItem | null;
}

export interface ApiBookTocItem {
  text: string;
  path: string;
  file: string;
}

export interface ApiBookFileItem {
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  downloadUrl: string;
}

export interface ApiBookDetailItem extends ApiBookListItem {
  publicationDate: string | null;
  toc: ApiBookTocItem[];
  file: ApiBookFileItem;
}

export interface ApiBookAccessItem {
  downloadUrl: string;
}

export interface ApiHighlightItem {
  id: string;
  bookId: string;
  chapterIndex: number;
  selectedText: string;
  contextBefore: string | null;
  contextAfter: string | null;
  color: string;
  style: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiHighlightFeedItem extends ApiHighlightItem {
  book: {
    id: string;
    title: string;
    coverUrl: string | null;
    progress: {
      currentChapter: number;
      currentPage: number;
      percentage: number;
    } | null;
  };
}

export interface ApiItemsResponse<T> {
  items: T[];
}

export interface ApiItemResponse<T> {
  item: T;
}

export interface SessionResponse {
  sessionId: string;
  userId: string;
}
