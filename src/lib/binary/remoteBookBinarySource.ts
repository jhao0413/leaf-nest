import { ApiBookAccessItem, ApiItemResponse } from '@/lib/api/contracts';
import { apiClient } from '@/lib/api/client';
import { BookBinarySource } from '@/lib/binary/bookBinarySource';

export const remoteBookBinarySource: BookBinarySource = {
  async getBookBlob(bookId) {
    const response = await apiClient.post<ApiItemResponse<ApiBookAccessItem>>(
      `/api/books/${bookId}/access-url`
    );
    const fileResponse = await fetch(response.item.downloadUrl);

    if (!fileResponse.ok) {
      throw new Error('Failed to download book file');
    }

    return fileResponse.blob();
  }
};
