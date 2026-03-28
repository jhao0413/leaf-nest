import {
  ApiHighlightFeedItem,
  ApiHighlightItem,
  ApiItemResponse,
  ApiItemsResponse
} from '@/lib/api/contracts';
import { apiClient } from '@/lib/api/client';
import { Highlight } from '@/store/highlightStore';

interface ListByBookOptions {
  chapterIndex?: number;
}

export interface HighlightFeedEntry {
  id: string;
  bookId: string;
  chapterIndex: number;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  color: string;
  style: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  book: {
    id: string;
    name: string;
    coverUrl?: string;
    currentChapter?: number;
    currentPage?: number;
    percentage?: number;
  };
}

export interface CreateHighlightInput {
  bookId: string;
  chapterIndex: number;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  color: string;
  style: 'highlight' | 'underline' | 'note';
  note: string;
}

function mapHighlight(item: ApiHighlightItem): Highlight {
  return {
    id: item.id,
    bookId: item.bookId,
    chapterIndex: item.chapterIndex,
    selectedText: item.selectedText,
    contextBefore: item.contextBefore ?? '',
    contextAfter: item.contextAfter ?? '',
    color: item.color,
    style: item.style as Highlight['style'],
    note: item.note ?? '',
    createdAt: item.createdAt
  };
}

function mapHighlightFeedItem(item: ApiHighlightFeedItem): HighlightFeedEntry {
  return {
    ...mapHighlight(item),
    updatedAt: item.updatedAt,
    book: {
      id: item.book.id,
      name: item.book.title,
      coverUrl: item.book.coverUrl ?? undefined,
      currentChapter: item.book.progress?.currentChapter,
      currentPage: item.book.progress?.currentPage,
      percentage: item.book.progress?.percentage
    }
  };
}

export const highlightsRepository = {
  async listByBook(bookId: string, options: ListByBookOptions = {}) {
    const query = new URLSearchParams();

    if (typeof options.chapterIndex === 'number') {
      query.set('chapterIndex', String(options.chapterIndex));
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await apiClient.get<ApiItemsResponse<ApiHighlightItem>>(
      `/api/books/${bookId}/highlights${suffix}`
    );

    return response.items.map(mapHighlight);
  },

  async listAll() {
    const response = await apiClient.get<ApiItemsResponse<ApiHighlightFeedItem>>('/api/highlights');
    return response.items.map(mapHighlightFeedItem);
  },

  async create(input: CreateHighlightInput) {
    const response = await apiClient.post<ApiItemResponse<ApiHighlightItem>>(
      `/api/books/${input.bookId}/highlights`,
      {
        chapterIndex: input.chapterIndex,
        selectedText: input.selectedText,
        contextBefore: input.contextBefore,
        contextAfter: input.contextAfter,
        color: input.color,
        style: input.style,
        note: input.note
      }
    );

    return mapHighlight(response.item);
  },

  async update(highlightId: string, patch: { color?: string; note?: string | null }) {
    const response = await apiClient.patch<ApiItemResponse<ApiHighlightItem>>(
      `/api/highlights/${highlightId}`,
      patch
    );

    return mapHighlight(response.item);
  },

  async remove(highlightId: string) {
    await apiClient.delete(`/api/highlights/${highlightId}`);
  }
};
