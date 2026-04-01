import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { books, highlights, readingProgress } from '../db/schema/index.js';
import { getDb } from './db.js';
import { getStorageService, StorageService } from './storage.js';

export interface ReadingProgressInput {
  currentChapter: number;
  currentPage: number;
  percentage: number;
  textAnchor: string;
}

export interface ReadingProgressItem extends ReadingProgressInput {
  lastReadAt: string;
}

export interface HighlightInput {
  chapterIndex: number;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  color: string;
  style: string;
  note?: string | null;
}

export interface HighlightUpdateInput {
  color?: string;
  note?: string | null;
}

export interface HighlightItem {
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

export interface HighlightListOptions {
  chapterIndex?: number;
}

export interface HighlightFeedItem extends HighlightItem {
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

export interface ReadingService {
  getProgress: (userId: string, bookId: string) => Promise<ReadingProgressItem | null>;
  upsertProgress: (
    userId: string,
    bookId: string,
    input: ReadingProgressInput
  ) => Promise<ReadingProgressItem | null>;
  listHighlights: (
    userId: string,
    bookId: string,
    options?: HighlightListOptions
  ) => Promise<HighlightItem[]>;
  listAllHighlights: (userId: string) => Promise<HighlightFeedItem[]>;
  createHighlight: (
    userId: string,
    bookId: string,
    input: HighlightInput
  ) => Promise<HighlightItem | null>;
  updateHighlight: (
    userId: string,
    highlightId: string,
    input: HighlightUpdateInput
  ) => Promise<HighlightItem | null>;
  deleteHighlight: (userId: string, highlightId: string) => Promise<boolean>;
}

function toIsoString(value: Date) {
  return value.toISOString();
}

async function hasOwnedBook(userId: string, bookId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.ownerId, userId)))
    .limit(1);

  return rows.length > 0;
}

function createReadingService(storage: StorageService): ReadingService {
  const db = getDb();

  return {
    async getProgress(userId, bookId) {
      const rows = await db
        .select()
        .from(readingProgress)
        .where(and(eq(readingProgress.userId, userId), eq(readingProgress.bookId, bookId)))
        .limit(1);

      const item = rows[0];

      if (!item) {
        return null;
      }

      return {
        currentChapter: item.currentChapter,
        currentPage: item.currentPage,
        percentage: item.percentage,
        textAnchor: item.textAnchor ?? '',
        lastReadAt: toIsoString(item.lastReadAt)
      };
    },

    async upsertProgress(userId, bookId, input) {
      if (!(await hasOwnedBook(userId, bookId))) {
        return null;
      }

      const now = new Date();
      const rows = await db
        .insert(readingProgress)
        .values({
          id: randomUUID(),
          userId,
          bookId,
          currentChapter: input.currentChapter,
          currentPage: input.currentPage,
          percentage: input.percentage,
          textAnchor: input.textAnchor,
          lastReadAt: now,
          createdAt: now,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: [readingProgress.userId, readingProgress.bookId],
          set: {
            currentChapter: input.currentChapter,
            currentPage: input.currentPage,
            percentage: input.percentage,
            textAnchor: input.textAnchor,
            lastReadAt: now,
            updatedAt: now
          }
        })
        .returning();

      const item = rows[0];

      return {
        currentChapter: item.currentChapter,
        currentPage: item.currentPage,
        percentage: item.percentage,
        textAnchor: item.textAnchor ?? '',
        lastReadAt: toIsoString(item.lastReadAt)
      };
    },

    async listHighlights(userId, bookId, options = {}) {
      if (!(await hasOwnedBook(userId, bookId))) {
        return [];
      }

      const filters = [eq(highlights.userId, userId), eq(highlights.bookId, bookId)];

      if (typeof options.chapterIndex !== 'undefined') {
        filters.push(eq(highlights.chapterIndex, options.chapterIndex));
      }

      const rows = await db
        .select()
        .from(highlights)
        .where(and(...filters))
        .orderBy(desc(highlights.createdAt));

      return rows.map((item) => ({
        id: item.id,
        bookId: item.bookId,
        chapterIndex: item.chapterIndex,
        selectedText: item.selectedText,
        contextBefore: item.contextBefore ?? null,
        contextAfter: item.contextAfter ?? null,
        color: item.color,
        style: item.style,
        note: item.note ?? null,
        createdAt: toIsoString(item.createdAt),
        updatedAt: toIsoString(item.updatedAt)
      }));
    },

    async listAllHighlights(userId) {
      const rows = await db
        .select({
          highlight: highlights,
          book: books,
          progress: readingProgress
        })
        .from(highlights)
        .innerJoin(books, eq(books.id, highlights.bookId))
        .leftJoin(
          readingProgress,
          and(eq(readingProgress.bookId, books.id), eq(readingProgress.userId, userId))
        )
        .where(eq(highlights.userId, userId))
        .orderBy(desc(highlights.createdAt));

      return Promise.all(
        rows.map(async ({ highlight, book, progress }) => ({
          id: highlight.id,
          bookId: highlight.bookId,
          chapterIndex: highlight.chapterIndex,
          selectedText: highlight.selectedText,
          contextBefore: highlight.contextBefore ?? null,
          contextAfter: highlight.contextAfter ?? null,
          color: highlight.color,
          style: highlight.style,
          note: highlight.note ?? null,
          createdAt: toIsoString(highlight.createdAt),
          updatedAt: toIsoString(highlight.updatedAt),
          book: {
            id: book.id,
            title: book.title,
            coverUrl: book.coverObjectKey ? await storage.getObjectUrl(book.coverObjectKey) : null,
            progress: progress
              ? {
                  currentChapter: progress.currentChapter,
                  currentPage: progress.currentPage,
                  percentage: progress.percentage
                }
              : null
          }
        }))
      );
    },

    async createHighlight(userId, bookId, input) {
      if (!(await hasOwnedBook(userId, bookId))) {
        return null;
      }

      const now = new Date();
      const rows = await db
        .insert(highlights)
        .values({
          id: randomUUID(),
          userId,
          bookId,
          chapterIndex: input.chapterIndex,
          selectedText: input.selectedText,
          contextBefore: input.contextBefore,
          contextAfter: input.contextAfter,
          color: input.color,
          style: input.style,
          note: input.note ?? null,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      const item = rows[0];

      return {
        id: item.id,
        bookId: item.bookId,
        chapterIndex: item.chapterIndex,
        selectedText: item.selectedText,
        contextBefore: item.contextBefore ?? null,
        contextAfter: item.contextAfter ?? null,
        color: item.color,
        style: item.style,
        note: item.note ?? null,
        createdAt: toIsoString(item.createdAt),
        updatedAt: toIsoString(item.updatedAt)
      };
    },

    async updateHighlight(userId, highlightId, input) {
      const updateSet: Partial<typeof highlights.$inferInsert> = {
        updatedAt: new Date()
      };

      if (typeof input.color !== 'undefined') {
        updateSet.color = input.color;
      }

      if (typeof input.note !== 'undefined') {
        updateSet.note = input.note;
      }

      const rows = await db
        .update(highlights)
        .set(updateSet)
        .where(and(eq(highlights.id, highlightId), eq(highlights.userId, userId)))
        .returning();

      const item = rows[0];

      if (!item) {
        return null;
      }

      return {
        id: item.id,
        bookId: item.bookId,
        chapterIndex: item.chapterIndex,
        selectedText: item.selectedText,
        contextBefore: item.contextBefore ?? null,
        contextAfter: item.contextAfter ?? null,
        color: item.color,
        style: item.style,
        note: item.note ?? null,
        createdAt: toIsoString(item.createdAt),
        updatedAt: toIsoString(item.updatedAt)
      };
    },

    async deleteHighlight(userId, highlightId) {
      const rows = await db
        .delete(highlights)
        .where(and(eq(highlights.id, highlightId), eq(highlights.userId, userId)))
        .returning({ id: highlights.id });

      return rows.length > 0;
    }
  };
}

let readingService: ReadingService | undefined;

export function getReadingService() {
  if (!readingService) {
    readingService = createReadingService(getStorageService());
  }

  return readingService;
}
