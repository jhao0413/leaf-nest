import { ApiItemResponse, ApiProgressItem } from '@/lib/api/contracts';
import { apiClient } from '@/lib/api/client';

export interface SaveProgressInput {
  bookId: string;
  currentChapter: number;
  currentPage: number;
  percentage: number;
  textAnchor: string;
}

function mapProgress(item: ApiProgressItem | null) {
  if (!item) {
    return null;
  }

  return {
    currentChapter: item.currentChapter,
    currentPage: item.currentPage,
    percentage: item.percentage,
    textAnchor: item.textAnchor ?? '',
    lastReadAt: item.lastReadAt
  };
}

export const readingRepository = {
  async getProgress(bookId: string) {
    const response = await apiClient.get<ApiItemResponse<ApiProgressItem | null>>(
      `/api/books/${bookId}/progress`
    );

    return mapProgress(response.item);
  },

  async saveProgress(input: SaveProgressInput) {
    const response = await apiClient.put<ApiItemResponse<ApiProgressItem>>(
      `/api/books/${input.bookId}/progress`,
      {
        currentChapter: input.currentChapter,
        currentPage: input.currentPage,
        percentage: input.percentage,
        textAnchor: input.textAnchor
      }
    );

    return mapProgress(response.item);
  }
};
