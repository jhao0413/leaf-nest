import { booksRepository } from '@/lib/repositories/booksRepository';
import { readingRepository } from '@/lib/repositories/readingRepository';
import { highlightsRepository } from '@/lib/repositories/highlightsRepository';
import { remoteBookBinarySource } from '@/lib/binary/remoteBookBinarySource';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

describe('repositories', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('booksRepository loads books from the api and maps them to the bookshelf shape', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'book-1',
              ownerId: 'user-1',
              title: 'Example Book',
              creator: 'Ada',
              publisher: 'Leaf',
              identifier: 'isbn-1',
              language: 'zh',
              coverUrl: 'https://example.com/cover.jpg',
              coverObjectKey: 'covers/book-1.jpg',
              sizeBytes: 1024,
              createdAt: '2026-03-28T00:00:00.000Z',
              updatedAt: '2026-03-28T00:00:00.000Z',
              progress: {
                currentChapter: 2,
                currentPage: 5,
                percentage: 18,
                textAnchor: 'anchor',
                lastReadAt: '2026-03-28T00:00:00.000Z'
              }
            }
          ]
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    );

    const items = await booksRepository.listBooks();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/books',
      expect.objectContaining({
        credentials: 'include'
      })
    );
    expect(items).toEqual([
      expect.objectContaining({
        id: 'book-1',
        name: 'Example Book',
        creator: 'Ada',
        publisher: 'Leaf',
        identifier: 'isbn-1',
        language: 'zh',
        coverUrl: 'https://example.com/cover.jpg',
        coverPath: 'covers/book-1.jpg',
        percentage: 18,
        currentChapter: 2,
        currentPage: 5,
        textAnchor: 'anchor'
      })
    ]);
  });

  it('readingRepository saves reading progress through the api', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          item: {
            currentChapter: 3,
            currentPage: 9,
            percentage: 44,
            textAnchor: 'saved-anchor',
            lastReadAt: '2026-03-28T00:00:00.000Z'
          }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    );

    const item = await readingRepository.saveProgress({
      bookId: 'book-1',
      currentChapter: 3,
      currentPage: 9,
      percentage: 44,
      textAnchor: 'saved-anchor'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/books/book-1/progress',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify({
          currentChapter: 3,
          currentPage: 9,
          percentage: 44,
          textAnchor: 'saved-anchor'
        })
      })
    );
    expect(item).toEqual({
      currentChapter: 3,
      currentPage: 9,
      percentage: 44,
      textAnchor: 'saved-anchor',
      lastReadAt: '2026-03-28T00:00:00.000Z'
    });
  });

  it('highlightsRepository loads chapter highlights from the api', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'highlight-1',
              bookId: 'book-1',
              chapterIndex: 4,
              selectedText: 'Selected text',
              contextBefore: 'before',
              contextAfter: 'after',
              color: 'yellow',
              style: 'highlight',
              note: null,
              createdAt: '2026-03-28T00:00:00.000Z',
              updatedAt: '2026-03-28T00:00:00.000Z'
            }
          ]
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    );

    const items = await highlightsRepository.listByBook('book-1', { chapterIndex: 4 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/books/book-1/highlights?chapterIndex=4',
      expect.objectContaining({
        credentials: 'include'
      })
    );
    expect(items).toEqual([
      {
        id: 'highlight-1',
        bookId: 'book-1',
        chapterIndex: 4,
        selectedText: 'Selected text',
        contextBefore: 'before',
        contextAfter: 'after',
        color: 'yellow',
        style: 'highlight',
        note: '',
        createdAt: '2026-03-28T00:00:00.000Z'
      }
    ]);
  });

  it('remoteBookBinarySource fetches the epub blob through the signed access url flow', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            item: {
              downloadUrl: 'https://example.com/book.epub'
            }
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response('epub-binary', {
          status: 200
        })
      );

    const blob = await remoteBookBinarySource.getBookBlob('book-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/books/book-1/access-url',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include'
      })
    );
    expect(fetchMock.mock.calls[1]).toEqual(['https://example.com/book.epub']);
    expect(await blob.text()).toBe('epub-binary');
  });
});
