import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';

const fakeAuth = {
  handler: async () => new Response(null, { status: 204 }),
  api: {
    getSession: async ({ headers }: { headers: Headers }) => {
      if (headers.get('x-test-auth') !== 'yes') {
        return null;
      }

      return {
        user: {
          id: 'user_123',
          email: 'reader@example.com'
        },
        session: {
          id: 'session_123'
        }
      };
    }
  }
};

describe('GET /api/books', () => {
  it('returns the authenticated user book list', async () => {
    const app = createApp(fakeAuth, {
      books: {
        createBook: async () => {
          throw new Error('should not be called');
        },
        getBook: async () => null,
        getBookAccessUrl: async () => null,
        deleteBook: async () => false,
        listBooks: async (userId) => [
          {
            id: 'book_123',
            ownerId: userId,
            title: 'Leaf Nest Handbook',
            creator: 'Jhao',
            publisher: 'Leaf Nest',
            identifier: 'isbn-001',
            language: 'zh-CN',
            coverUrl: 'https://example.com/covers/book_123.jpg?sig=123',
            coverObjectKey: 'covers/book_123.jpg',
            sizeBytes: 4096,
            createdAt: '2026-03-28T00:00:00.000Z',
            updatedAt: '2026-03-28T00:00:00.000Z',
            progress: {
              currentChapter: 2,
              currentPage: 12,
              percentage: 24.5,
              textAnchor: 'chapter-2-anchor',
              lastReadAt: '2026-03-28T00:00:00.000Z'
            }
          }
        ]
      }
    });

    const response = await app.request('/api/books', {
      headers: new Headers({
        'x-test-auth': 'yes'
      })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          id: 'book_123',
          ownerId: 'user_123',
          title: 'Leaf Nest Handbook',
          creator: 'Jhao',
          publisher: 'Leaf Nest',
          identifier: 'isbn-001',
          language: 'zh-CN',
          coverUrl: 'https://example.com/covers/book_123.jpg?sig=123',
          coverObjectKey: 'covers/book_123.jpg',
          sizeBytes: 4096,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
          progress: {
            currentChapter: 2,
            currentPage: 12,
            percentage: 24.5,
            textAnchor: 'chapter-2-anchor',
            lastReadAt: '2026-03-28T00:00:00.000Z'
          }
        }
      ]
    });
  });

  it('returns the authenticated user book detail with a download url', async () => {
    const app = createApp(fakeAuth, {
      books: {
        listBooks: async () => [],
        createBook: async () => {
          throw new Error('should not be called');
        },
        getBookAccessUrl: async () => null,
        deleteBook: async () => false,
        getBook: async () => ({
          id: 'book_123',
          ownerId: 'user_123',
          title: 'Leaf Nest Handbook',
          creator: 'Jhao',
          publisher: 'Leaf Nest',
          identifier: 'isbn-001',
          publicationDate: '2026-03-28',
          language: 'zh-CN',
          coverUrl: 'https://example.com/covers/book_123.jpg?sig=123',
          coverObjectKey: 'covers/book_123.jpg',
          sizeBytes: 4096,
          toc: [
            {
              text: 'Chapter 1',
              path: 'chapter-1.xhtml',
              file: 'chapter-1.xhtml'
            }
          ],
          file: {
            originalFilename: 'book.epub',
            mimeType: 'application/epub+zip',
            byteSize: 4096,
            downloadUrl: 'https://example.com/book.epub?sig=123'
          },
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
          progress: {
            currentChapter: 2,
            currentPage: 12,
            percentage: 24.5,
            textAnchor: 'chapter-2-anchor',
            lastReadAt: '2026-03-28T00:00:00.000Z'
          }
        })
      }
    });

    const response = await app.request('/api/books/book_123', {
      headers: new Headers({
        'x-test-auth': 'yes'
      })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      item: {
        id: 'book_123',
        ownerId: 'user_123',
        title: 'Leaf Nest Handbook',
        creator: 'Jhao',
        publisher: 'Leaf Nest',
        identifier: 'isbn-001',
        publicationDate: '2026-03-28',
        language: 'zh-CN',
        coverUrl: 'https://example.com/covers/book_123.jpg?sig=123',
        coverObjectKey: 'covers/book_123.jpg',
        sizeBytes: 4096,
        toc: [
          {
            text: 'Chapter 1',
            path: 'chapter-1.xhtml',
            file: 'chapter-1.xhtml'
          }
        ],
        file: {
          originalFilename: 'book.epub',
          mimeType: 'application/epub+zip',
          byteSize: 4096,
          downloadUrl: 'https://example.com/book.epub?sig=123'
        },
        createdAt: '2026-03-28T00:00:00.000Z',
        updatedAt: '2026-03-28T00:00:00.000Z',
        progress: {
          currentChapter: 2,
          currentPage: 12,
          percentage: 24.5,
          textAnchor: 'chapter-2-anchor',
          lastReadAt: '2026-03-28T00:00:00.000Z'
        }
      }
    });
  });
});

describe('POST /api/books', () => {
  it('creates a book from multipart form data', async () => {
    const app = createApp(fakeAuth, {
      books: {
        listBooks: async () => [],
        createBook: async (userId, input) => ({
          id: 'book_999',
          ownerId: userId,
          title: input.title,
          creator: input.creator,
          publisher: input.publisher,
          identifier: input.identifier,
          language: input.language,
          coverUrl: 'https://example.com/covers/book_999.jpg?sig=123',
          coverObjectKey: 'covers/book_999-cover.jpg',
          sizeBytes: input.file.byteSize,
          createdAt: '2026-03-28T05:00:00.000Z',
          updatedAt: '2026-03-28T05:00:00.000Z',
          progress: null
        }),
        getBook: async () => null,
        getBookAccessUrl: async () => null,
        deleteBook: async () => false
      }
    });

    const formData = new FormData();
    formData.set('title', 'Uploaded EPUB');
    formData.set('creator', 'Leaf Nest');
    formData.set('publisher', 'Leaf Nest Press');
    formData.set('identifier', 'book-999');
    formData.set('publicationDate', '2026-03-28');
    formData.set('language', 'zh-CN');
    formData.set(
      'toc',
      JSON.stringify([
        {
          text: 'Chapter 1',
          path: 'chapter-1.xhtml',
          file: 'chapter-1.xhtml'
        }
      ])
    );
    formData.set(
      'file',
      new File(['epub-content'], 'uploaded.epub', { type: 'application/epub+zip' })
    );
    formData.set('cover', new File(['cover-bytes'], 'cover.jpg', { type: 'image/jpeg' }));

    const response = await app.request('/api/books', {
      method: 'POST',
      headers: new Headers({
        'x-test-auth': 'yes'
      }),
      body: formData
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      item: {
        id: 'book_999',
        ownerId: 'user_123',
        title: 'Uploaded EPUB',
        creator: 'Leaf Nest',
        publisher: 'Leaf Nest Press',
        identifier: 'book-999',
        language: 'zh-CN',
        coverUrl: 'https://example.com/covers/book_999.jpg?sig=123',
        coverObjectKey: 'covers/book_999-cover.jpg',
        sizeBytes: 12,
        createdAt: '2026-03-28T05:00:00.000Z',
        updatedAt: '2026-03-28T05:00:00.000Z',
        progress: null
      }
    });
  });

  it('falls back to the epub filename when the submitted title is blank', async () => {
    const app = createApp(fakeAuth, {
      books: {
        listBooks: async () => [],
        createBook: async (userId, input) => ({
          id: 'book_1000',
          ownerId: userId,
          title: input.title,
          creator: input.creator,
          publisher: input.publisher,
          identifier: input.identifier,
          language: input.language,
          coverUrl: null,
          coverObjectKey: null,
          sizeBytes: input.file.byteSize,
          createdAt: '2026-03-28T05:00:00.000Z',
          updatedAt: '2026-03-28T05:00:00.000Z',
          progress: null
        }),
        getBook: async () => null,
        getBookAccessUrl: async () => null,
        deleteBook: async () => false
      }
    });

    const formData = new FormData();
    formData.set('title', '   ');
    formData.set('toc', '[]');
    formData.set(
      'file',
      new File(['epub-content'], 'fallback-title.epub', { type: 'application/epub+zip' })
    );

    const response = await app.request('/api/books', {
      method: 'POST',
      headers: new Headers({
        'x-test-auth': 'yes'
      }),
      body: formData
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      item: {
        id: 'book_1000',
        ownerId: 'user_123',
        title: 'fallback-title',
        creator: null,
        publisher: null,
        identifier: null,
        language: null,
        coverUrl: null,
        coverObjectKey: null,
        sizeBytes: 12,
        createdAt: '2026-03-28T05:00:00.000Z',
        updatedAt: '2026-03-28T05:00:00.000Z',
        progress: null
      }
    });
  });

  it('rejects uploads without an epub file', async () => {
    const app = createApp(fakeAuth, {
      books: {
        listBooks: async () => [],
        createBook: async () => {
          throw new Error('should not be called');
        },
        getBook: async () => null,
        getBookAccessUrl: async () => null,
        deleteBook: async () => false
      }
    });

    const formData = new FormData();
    formData.set('title', 'Invalid upload');
    formData.set('toc', '[]');

    const response = await app.request('/api/books', {
      method: 'POST',
      headers: new Headers({
        'x-test-auth': 'yes'
      }),
      body: formData
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'EPUB file is required'
    });
  });

  it('surfaces storage connectivity failures as service unavailable', async () => {
    const app = createApp(fakeAuth, {
      books: {
        listBooks: async () => [],
        createBook: async () => {
          throw new Error('connect ECONNREFUSED 127.0.0.1:9000');
        },
        getBook: async () => null,
        getBookAccessUrl: async () => null,
        deleteBook: async () => false
      }
    });

    const formData = new FormData();
    formData.set('title', 'Uploaded EPUB');
    formData.set('toc', '[]');
    formData.set(
      'file',
      new File(['epub-content'], 'uploaded.epub', { type: 'application/epub+zip' })
    );

    const response = await app.request('/api/books', {
      method: 'POST',
      headers: new Headers({
        'x-test-auth': 'yes'
      }),
      body: formData
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Object storage is unavailable'
    });
  });

  it('surfaces object storage authentication failures as service unavailable', async () => {
    const app = createApp(fakeAuth, {
      books: {
        listBooks: async () => [],
        createBook: async () => {
          const error = new Error('UnknownError');
          Object.assign(error, {
            $metadata: {
              httpStatusCode: 401
            }
          });
          throw error;
        },
        getBook: async () => null,
        getBookAccessUrl: async () => null,
        deleteBook: async () => false
      }
    });

    const formData = new FormData();
    formData.set('title', 'Uploaded EPUB');
    formData.set('toc', '[]');
    formData.set(
      'file',
      new File(['epub-content'], 'uploaded.epub', { type: 'application/epub+zip' })
    );

    const response = await app.request('/api/books', {
      method: 'POST',
      headers: new Headers({
        'x-test-auth': 'yes'
      }),
      body: formData
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Object storage is unavailable'
    });
  });
});

describe('book file access and deletion', () => {
  it('returns a signed access url for a stored book file', async () => {
    const app = createApp(fakeAuth, {
      books: {
        listBooks: async () => [],
        createBook: async () => {
          throw new Error('should not be called');
        },
        getBook: async () => null,
        getBookAccessUrl: async () => ({
          downloadUrl: 'https://example.com/book.epub?sig=456'
        }),
        deleteBook: async () => false
      }
    });

    const response = await app.request('/api/books/book_123/access-url', {
      method: 'POST',
      headers: new Headers({
        'x-test-auth': 'yes'
      })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      item: {
        downloadUrl: 'https://example.com/book.epub?sig=456'
      }
    });
  });

  it('deletes a book owned by the current user', async () => {
    const app = createApp(fakeAuth, {
      books: {
        listBooks: async () => [],
        createBook: async () => {
          throw new Error('should not be called');
        },
        getBook: async () => null,
        getBookAccessUrl: async () => null,
        deleteBook: async () => true
      }
    });

    const response = await app.request('/api/books/book_123', {
      method: 'DELETE',
      headers: new Headers({
        'x-test-auth': 'yes'
      })
    });

    expect(response.status).toBe(204);
  });
});
