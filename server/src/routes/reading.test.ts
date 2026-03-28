import { describe, expect, it, vi } from 'vitest';
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

describe('reading routes', () => {
  it('returns the saved progress for a book', async () => {
    const reading = {
      getProgress: vi.fn(async () => ({
        currentChapter: 3,
        currentPage: 18,
        percentage: 42,
        textAnchor: 'anchor-text',
        lastReadAt: '2026-03-28T00:00:00.000Z'
      })),
      upsertProgress: vi.fn(),
      listHighlights: vi.fn(),
      listAllHighlights: vi.fn(),
      createHighlight: vi.fn(),
      updateHighlight: vi.fn(),
      deleteHighlight: vi.fn()
    };

    const app = createApp(fakeAuth, { reading });

    const response = await app.request('/api/books/book_123/progress', {
      headers: new Headers({
        'x-test-auth': 'yes'
      })
    });

    expect(response.status).toBe(200);
    expect(reading.getProgress).toHaveBeenCalledWith('user_123', 'book_123');
    await expect(response.json()).resolves.toEqual({
      item: {
        currentChapter: 3,
        currentPage: 18,
        percentage: 42,
        textAnchor: 'anchor-text',
        lastReadAt: '2026-03-28T00:00:00.000Z'
      }
    });
  });

  it('upserts reading progress for the authenticated user', async () => {
    const reading = {
      getProgress: vi.fn(),
      upsertProgress: vi.fn(async (_userId, _bookId, input) => ({
        ...input,
        lastReadAt: '2026-03-28T01:00:00.000Z'
      })),
      listHighlights: vi.fn(),
      listAllHighlights: vi.fn(),
      createHighlight: vi.fn(),
      updateHighlight: vi.fn(),
      deleteHighlight: vi.fn()
    };

    const app = createApp(fakeAuth, { reading });

    const response = await app.request('/api/books/book_123/progress', {
      method: 'PUT',
      headers: new Headers({
        'content-type': 'application/json',
        'x-test-auth': 'yes'
      }),
      body: JSON.stringify({
        currentChapter: 4,
        currentPage: 11,
        percentage: 53,
        textAnchor: 'updated-anchor'
      })
    });

    expect(response.status).toBe(200);
    expect(reading.upsertProgress).toHaveBeenCalledWith('user_123', 'book_123', {
      currentChapter: 4,
      currentPage: 11,
      percentage: 53,
      textAnchor: 'updated-anchor'
    });
    await expect(response.json()).resolves.toEqual({
      item: {
        currentChapter: 4,
        currentPage: 11,
        percentage: 53,
        textAnchor: 'updated-anchor',
        lastReadAt: '2026-03-28T01:00:00.000Z'
      }
    });
  });

  it('rejects invalid reading progress payloads with a client error', async () => {
    const reading = {
      getProgress: vi.fn(),
      upsertProgress: vi.fn(),
      listHighlights: vi.fn(),
      listAllHighlights: vi.fn(),
      createHighlight: vi.fn(),
      updateHighlight: vi.fn(),
      deleteHighlight: vi.fn()
    };

    const app = createApp(fakeAuth, { reading });

    const response = await app.request('/api/books/book_123/progress', {
      method: 'PUT',
      headers: new Headers({
        'content-type': 'application/json',
        'x-test-auth': 'yes'
      }),
      body: JSON.stringify({
        currentChapter: 'invalid',
        currentPage: 11,
        percentage: 53,
        textAnchor: 'updated-anchor'
      })
    });

    expect(response.status).toBe(400);
    expect(reading.upsertProgress).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid reading progress payload'
    });
  });

  it('creates and lists highlights for a book', async () => {
    const reading = {
      getProgress: vi.fn(),
      upsertProgress: vi.fn(),
      listHighlights: vi.fn(async () => [
        {
          id: 'highlight_123',
          bookId: 'book_123',
          chapterIndex: 2,
          selectedText: 'Selected text',
          contextBefore: 'Before',
          contextAfter: 'After',
          color: 'yellow',
          style: 'highlight',
          note: 'remember this',
          createdAt: '2026-03-28T02:00:00.000Z',
          updatedAt: '2026-03-28T02:00:00.000Z'
        }
      ]),
      listAllHighlights: vi.fn(),
      createHighlight: vi.fn(async (_userId, bookId, input) => ({
        id: 'highlight_123',
        bookId,
        ...input,
        note: input.note ?? null,
        createdAt: '2026-03-28T02:00:00.000Z',
        updatedAt: '2026-03-28T02:00:00.000Z'
      })),
      updateHighlight: vi.fn(),
      deleteHighlight: vi.fn()
    };

    const app = createApp(fakeAuth, { reading });

    const createResponse = await app.request('/api/books/book_123/highlights', {
      method: 'POST',
      headers: new Headers({
        'content-type': 'application/json',
        'x-test-auth': 'yes'
      }),
      body: JSON.stringify({
        chapterIndex: 2,
        selectedText: 'Selected text',
        contextBefore: 'Before',
        contextAfter: 'After',
        color: 'yellow',
        style: 'highlight',
        note: 'remember this'
      })
    });

    expect(createResponse.status).toBe(201);

    const listResponse = await app.request('/api/books/book_123/highlights', {
      headers: new Headers({
        'x-test-auth': 'yes'
      })
    });

    expect(listResponse.status).toBe(200);
    expect(reading.listHighlights).toHaveBeenCalledWith('user_123', 'book_123', {
      chapterIndex: undefined
    });
    await expect(listResponse.json()).resolves.toEqual({
      items: [
        {
          id: 'highlight_123',
          bookId: 'book_123',
          chapterIndex: 2,
          selectedText: 'Selected text',
          contextBefore: 'Before',
          contextAfter: 'After',
          color: 'yellow',
          style: 'highlight',
          note: 'remember this',
          createdAt: '2026-03-28T02:00:00.000Z',
          updatedAt: '2026-03-28T02:00:00.000Z'
        }
      ]
    });
  });

  it('updates and deletes an existing highlight', async () => {
    const reading = {
      getProgress: vi.fn(),
      upsertProgress: vi.fn(),
      listHighlights: vi.fn(),
      listAllHighlights: vi.fn(),
      createHighlight: vi.fn(),
      updateHighlight: vi.fn(async (_userId, highlightId, input) => ({
        id: highlightId,
        bookId: 'book_123',
        chapterIndex: 2,
        selectedText: 'Selected text',
        contextBefore: 'Before',
        contextAfter: 'After',
        color: input.color ?? 'yellow',
        style: 'highlight',
        note: input.note ?? null,
        createdAt: '2026-03-28T02:00:00.000Z',
        updatedAt: '2026-03-28T03:00:00.000Z'
      })),
      deleteHighlight: vi.fn(async () => true)
    };

    const app = createApp(fakeAuth, { reading });

    const updateResponse = await app.request('/api/highlights/highlight_123', {
      method: 'PATCH',
      headers: new Headers({
        'content-type': 'application/json',
        'x-test-auth': 'yes'
      }),
      body: JSON.stringify({
        color: 'green',
        note: 'updated'
      })
    });

    expect(updateResponse.status).toBe(200);
    expect(reading.updateHighlight).toHaveBeenCalledWith('user_123', 'highlight_123', {
      color: 'green',
      note: 'updated'
    });

    const deleteResponse = await app.request('/api/highlights/highlight_123', {
      method: 'DELETE',
      headers: new Headers({
        'x-test-auth': 'yes'
      })
    });

    expect(deleteResponse.status).toBe(204);
    expect(reading.deleteHighlight).toHaveBeenCalledWith('user_123', 'highlight_123');
  });

  it('rejects invalid highlight updates with a client error', async () => {
    const reading = {
      getProgress: vi.fn(),
      upsertProgress: vi.fn(),
      listHighlights: vi.fn(),
      listAllHighlights: vi.fn(),
      createHighlight: vi.fn(),
      updateHighlight: vi.fn(),
      deleteHighlight: vi.fn()
    };

    const app = createApp(fakeAuth, { reading });

    const response = await app.request('/api/highlights/highlight_123', {
      method: 'PATCH',
      headers: new Headers({
        'content-type': 'application/json',
        'x-test-auth': 'yes'
      }),
      body: JSON.stringify({})
    });

    expect(response.status).toBe(400);
    expect(reading.updateHighlight).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid highlight update payload'
    });
  });

  it('filters highlights by chapter when chapterIndex is provided', async () => {
    const reading = {
      getProgress: vi.fn(),
      upsertProgress: vi.fn(),
      listHighlights: vi.fn(async () => []),
      listAllHighlights: vi.fn(),
      createHighlight: vi.fn(),
      updateHighlight: vi.fn(),
      deleteHighlight: vi.fn()
    };

    const app = createApp(fakeAuth, { reading });

    const response = await app.request('/api/books/book_123/highlights?chapterIndex=5', {
      headers: new Headers({
        'x-test-auth': 'yes'
      })
    });

    expect(response.status).toBe(200);
    expect(reading.listHighlights).toHaveBeenCalledWith('user_123', 'book_123', {
      chapterIndex: 5
    });
  });

  it('returns all highlights with book context for the notes overview', async () => {
    const reading = {
      getProgress: vi.fn(),
      upsertProgress: vi.fn(),
      listHighlights: vi.fn(),
      listAllHighlights: vi.fn(async () => [
        {
          id: 'highlight_123',
          bookId: 'book_123',
          chapterIndex: 2,
          selectedText: 'Selected text',
          contextBefore: 'Before',
          contextAfter: 'After',
          color: 'yellow',
          style: 'highlight',
          note: 'remember this',
          createdAt: '2026-03-28T02:00:00.000Z',
          updatedAt: '2026-03-28T02:00:00.000Z',
          book: {
            id: 'book_123',
            title: 'Leaf Nest Handbook',
            coverUrl: 'https://example.com/covers/book_123.jpg?sig=123',
            progress: {
              currentChapter: 2,
              currentPage: 12,
              percentage: 24.5
            }
          }
        }
      ]),
      createHighlight: vi.fn(),
      updateHighlight: vi.fn(),
      deleteHighlight: vi.fn()
    };

    const app = createApp(fakeAuth, { reading });

    const response = await app.request('/api/highlights', {
      headers: new Headers({
        'x-test-auth': 'yes'
      })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          id: 'highlight_123',
          bookId: 'book_123',
          chapterIndex: 2,
          selectedText: 'Selected text',
          contextBefore: 'Before',
          contextAfter: 'After',
          color: 'yellow',
          style: 'highlight',
          note: 'remember this',
          createdAt: '2026-03-28T02:00:00.000Z',
          updatedAt: '2026-03-28T02:00:00.000Z',
          book: {
            id: 'book_123',
            title: 'Leaf Nest Handbook',
            coverUrl: 'https://example.com/covers/book_123.jpg?sig=123',
            progress: {
              currentChapter: 2,
              currentPage: 12,
              percentage: 24.5
            }
          }
        }
      ]
    });
  });
});
