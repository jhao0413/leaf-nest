import {
  ApiBookDetailItem,
  ApiBookListItem,
  ApiItemResponse,
  ApiItemsResponse
} from '@/lib/api/contracts';
import { apiClient } from '@/lib/api/client';
import { BookBasicInfoType } from '@/store/bookInfoStore';

export interface UploadBookInput {
  file: File;
  cover?: File | null;
  metadata: Pick<
    BookBasicInfoType,
    'name' | 'creator' | 'publisher' | 'identifier' | 'pubdate' | 'toc' | 'language'
  >;
}

function formatSize(sizeBytes: number | null | undefined) {
  if (!sizeBytes) {
    return '';
  }

  const mb = sizeBytes / (1024 * 1024);
  return `${parseFloat(mb.toFixed(2))} MB`;
}

function mapBook(item: ApiBookListItem): BookBasicInfoType {
  return {
    id: item.id,
    name: item.title,
    creator: item.creator ?? '',
    publisher: item.publisher ?? '',
    identifier: item.identifier ?? '',
    pubdate: '',
    coverPath: item.coverObjectKey ?? '',
    coverUrl: item.coverUrl ?? undefined,
    toc: [],
    language: item.language ?? '',
    size: formatSize(item.sizeBytes),
    percentage: item.progress?.percentage ?? 0,
    currentChapter: item.progress?.currentChapter ?? 0,
    currentPage: item.progress?.currentPage ?? 1,
    textAnchor: item.progress?.textAnchor ?? '',
    lastReadAt: item.progress?.lastReadAt
  };
}

function mapBookDetail(item: ApiBookDetailItem): BookBasicInfoType {
  const base = mapBook(item);

  return {
    ...base,
    pubdate: item.publicationDate ?? '',
    toc: item.toc
  };
}

export const booksRepository = {
  async listBooks() {
    const response = await apiClient.get<ApiItemsResponse<ApiBookListItem>>('/api/books');
    return response.items.map(mapBook);
  },

  async getBook(bookId: string) {
    const response = await apiClient.get<ApiItemResponse<ApiBookDetailItem>>(
      `/api/books/${bookId}`
    );
    return mapBookDetail(response.item);
  },

  async uploadBook(input: UploadBookInput) {
    const formData = new FormData();

    formData.set('file', input.file);
    formData.set('title', input.metadata.name);
    formData.set('creator', input.metadata.creator);
    formData.set('publisher', input.metadata.publisher);
    formData.set('identifier', input.metadata.identifier);
    formData.set('publicationDate', input.metadata.pubdate);
    formData.set('language', input.metadata.language);
    formData.set('toc', JSON.stringify(input.metadata.toc));

    if (input.cover) {
      formData.set('cover', input.cover);
    }

    const response = await apiClient.postForm<ApiItemResponse<ApiBookListItem>>(
      '/api/books',
      formData
    );
    return mapBook(response.item);
  },

  async deleteBook(bookId: string) {
    await apiClient.delete(`/api/books/${bookId}`);
  }
};
