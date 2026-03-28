import { and, desc, eq } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import { bookFiles, books, readingProgress } from '../db/schema/index.js';
import { getDb } from './db.js';
import { getStorageService, StorageService } from './storage.js';

export interface BookProgressSummary {
  currentChapter: number;
  currentPage: number;
  percentage: number;
  textAnchor: string | null;
  lastReadAt: string;
}

export interface BookListItem {
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
  progress: BookProgressSummary | null;
}

export interface BookTocItem {
  text: string;
  path: string;
  file: string;
}

export interface BookFileItem {
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  downloadUrl: string;
}

export interface BookDetailItem extends BookListItem {
  publicationDate: string | null;
  toc: BookTocItem[];
  file: BookFileItem;
}

export interface BookAccessItem {
  downloadUrl: string;
}

export interface BookUploadPart {
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  content: Uint8Array;
}

export interface BookCreateInput {
  title: string;
  creator: string | null;
  publisher: string | null;
  identifier: string | null;
  publicationDate: string | null;
  language: string | null;
  toc: BookTocItem[];
  file: BookUploadPart;
  cover: BookUploadPart | null;
}

export interface BooksService {
  listBooks: (userId: string) => Promise<BookListItem[]>;
  createBook: (userId: string, input: BookCreateInput) => Promise<BookListItem>;
  getBook: (userId: string, bookId: string) => Promise<BookDetailItem | null>;
  getBookAccessUrl: (userId: string, bookId: string) => Promise<BookAccessItem | null>;
  deleteBook: (userId: string, bookId: string) => Promise<boolean>;
}

function toIsoString(value: Date) {
  return value.toISOString();
}

function getExtension(filename: string) {
  const normalized = filename.trim();
  const lastDot = normalized.lastIndexOf('.');

  if (lastDot === -1) {
    return '';
  }

  return normalized.slice(lastDot);
}

function checksumSha256(content: Uint8Array) {
  return createHash('sha256').update(content).digest('hex');
}

function mapProgressSummary(progress: typeof readingProgress.$inferSelect | null) {
  return progress
    ? {
        currentChapter: progress.currentChapter,
        currentPage: progress.currentPage,
        percentage: progress.percentage,
        textAnchor: progress.textAnchor ?? null,
        lastReadAt: toIsoString(progress.lastReadAt)
      }
    : null;
}

function createBooksService(storage: StorageService): BooksService {
  const db = getDb();

  return {
    async listBooks(userId) {
      const rows = await db
        .select({
          book: books,
          progress: readingProgress
        })
        .from(books)
        .leftJoin(
          readingProgress,
          and(eq(readingProgress.bookId, books.id), eq(readingProgress.userId, userId))
        )
        .where(eq(books.ownerId, userId))
        .orderBy(desc(books.updatedAt));

      return Promise.all(
        rows.map(async ({ book, progress }) => ({
          id: book.id,
          ownerId: book.ownerId,
          title: book.title,
          creator: book.creator,
          publisher: book.publisher,
          identifier: book.identifier,
          language: book.language,
          coverUrl: book.coverObjectKey ? await storage.getObjectUrl(book.coverObjectKey) : null,
          coverObjectKey: book.coverObjectKey,
          sizeBytes: book.sizeBytes ?? null,
          createdAt: toIsoString(book.createdAt),
          updatedAt: toIsoString(book.updatedAt),
          progress: mapProgressSummary(progress)
        }))
      );
    },

    async createBook(userId, input) {
      const bookId = randomUUID();
      const now = new Date();
      const fileObjectKey = `epubs/${userId}/${bookId}${getExtension(input.file.originalFilename) || '.epub'}`;
      const coverObjectKey = input.cover
        ? `covers/${userId}/${bookId}${getExtension(input.cover.originalFilename) || '.bin'}`
        : null;

      await storage.putObject({
        key: fileObjectKey,
        body: input.file.content,
        contentType: input.file.mimeType
      });

      if (input.cover && coverObjectKey) {
        await storage.putObject({
          key: coverObjectKey,
          body: input.cover.content,
          contentType: input.cover.mimeType
        });
      }

      await db.transaction(async (tx) => {
        await tx.insert(books).values({
          id: bookId,
          ownerId: userId,
          title: input.title,
          creator: input.creator,
          publisher: input.publisher,
          identifier: input.identifier,
          publicationDate: input.publicationDate,
          language: input.language,
          coverObjectKey,
          toc: input.toc,
          sizeBytes: input.file.byteSize,
          createdAt: now,
          updatedAt: now
        });

        await tx.insert(bookFiles).values({
          id: randomUUID(),
          bookId,
          objectKey: fileObjectKey,
          originalFilename: input.file.originalFilename,
          mimeType: input.file.mimeType,
          byteSize: input.file.byteSize,
          checksumSha256: checksumSha256(input.file.content),
          createdAt: now,
          updatedAt: now
        });
      });

      return {
        id: bookId,
        ownerId: userId,
        title: input.title,
        creator: input.creator,
        publisher: input.publisher,
        identifier: input.identifier,
        language: input.language,
        coverUrl: coverObjectKey ? await storage.getObjectUrl(coverObjectKey) : null,
        coverObjectKey,
        sizeBytes: input.file.byteSize,
        createdAt: toIsoString(now),
        updatedAt: toIsoString(now),
        progress: null
      };
    },

    async getBook(userId, bookId) {
      const rows = await db
        .select({
          book: books,
          file: bookFiles,
          progress: readingProgress
        })
        .from(books)
        .innerJoin(bookFiles, eq(bookFiles.bookId, books.id))
        .leftJoin(
          readingProgress,
          and(eq(readingProgress.bookId, books.id), eq(readingProgress.userId, userId))
        )
        .where(and(eq(books.ownerId, userId), eq(books.id, bookId)))
        .limit(1);

      const row = rows[0];

      if (!row) {
        return null;
      }

      const downloadUrl = await storage.getObjectUrl(row.file.objectKey);
      const coverUrl = row.book.coverObjectKey ? await storage.getObjectUrl(row.book.coverObjectKey) : null;

      return {
        id: row.book.id,
        ownerId: row.book.ownerId,
        title: row.book.title,
        creator: row.book.creator,
        publisher: row.book.publisher,
        identifier: row.book.identifier,
        publicationDate: row.book.publicationDate,
        language: row.book.language,
        coverUrl,
        coverObjectKey: row.book.coverObjectKey,
        sizeBytes: row.book.sizeBytes ?? null,
        toc: row.book.toc,
        file: {
          originalFilename: row.file.originalFilename,
          mimeType: row.file.mimeType,
          byteSize: row.file.byteSize,
          downloadUrl
        },
        createdAt: toIsoString(row.book.createdAt),
        updatedAt: toIsoString(row.book.updatedAt),
        progress: mapProgressSummary(row.progress)
      };
    },

    async getBookAccessUrl(userId, bookId) {
      const rows = await db
        .select({
          objectKey: bookFiles.objectKey
        })
        .from(bookFiles)
        .innerJoin(books, eq(books.id, bookFiles.bookId))
        .where(and(eq(books.ownerId, userId), eq(books.id, bookId)))
        .limit(1);

      const item = rows[0];

      if (!item) {
        return null;
      }

      return {
        downloadUrl: await storage.getObjectUrl(item.objectKey)
      };
    },

    async deleteBook(userId, bookId) {
      const rows = await db
        .select({
          fileObjectKey: bookFiles.objectKey,
          coverObjectKey: books.coverObjectKey
        })
        .from(books)
        .innerJoin(bookFiles, eq(bookFiles.bookId, books.id))
        .where(and(eq(books.ownerId, userId), eq(books.id, bookId)))
        .limit(1);

      const item = rows[0];

      if (!item) {
        return false;
      }

      await db.delete(books).where(and(eq(books.ownerId, userId), eq(books.id, bookId)));
      await storage.deleteObject(item.fileObjectKey);

      if (item.coverObjectKey) {
        await storage.deleteObject(item.coverObjectKey);
      }

      return true;
    }
  };
}

let booksService: BooksService | undefined;

export function getBooksService() {
  if (!booksService) {
    booksService = createBooksService(getStorageService());
  }

  return booksService;
}
