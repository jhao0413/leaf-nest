import { relations } from 'drizzle-orm';
import {
  bigint,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';

export const books = pgTable(
  'books',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    creator: text('creator'),
    publisher: text('publisher'),
    identifier: text('identifier'),
    publicationDate: date('publication_date'),
    language: text('language'),
    coverObjectKey: text('cover_object_key'),
    toc: jsonb('toc').$type<Array<{ text: string; path: string; file: string }>>().notNull().default([]),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    ownerIdx: index('books_owner_id_idx').on(table.ownerId),
    identifierIdx: index('books_identifier_idx').on(table.identifier)
  })
);

export const bookFiles = pgTable(
  'book_files',
  {
    id: text('id').primaryKey(),
    bookId: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    objectKey: text('object_key').notNull().unique(),
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(),
    byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
    checksumSha256: text('checksum_sha256'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    bookUniqueIdx: uniqueIndex('book_files_book_id_unique').on(table.bookId)
  })
);

export const readingProgress = pgTable(
  'reading_progress',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookId: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    currentChapter: integer('current_chapter').notNull().default(0),
    currentPage: integer('current_page').notNull().default(1),
    percentage: doublePrecision('percentage').notNull().default(0),
    textAnchor: text('text_anchor'),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userBookUniqueIdx: uniqueIndex('reading_progress_user_book_unique').on(table.userId, table.bookId),
    userIdx: index('reading_progress_user_id_idx').on(table.userId),
    bookIdx: index('reading_progress_book_id_idx').on(table.bookId)
  })
);

export const highlights = pgTable(
  'highlights',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookId: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    chapterIndex: integer('chapter_index').notNull(),
    selectedText: text('selected_text').notNull(),
    contextBefore: text('context_before'),
    contextAfter: text('context_after'),
    color: text('color').notNull().default('yellow'),
    style: text('style').notNull().default('highlight'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdx: index('highlights_user_id_idx').on(table.userId),
    bookChapterIdx: index('highlights_book_chapter_idx').on(table.bookId, table.chapterIndex),
    createdAtIdx: index('highlights_created_at_idx').on(table.createdAt)
  })
);

export const booksRelations = relations(books, ({ one, many }) => ({
  owner: one(users, {
    fields: [books.ownerId],
    references: [users.id]
  }),
  file: one(bookFiles, {
    fields: [books.id],
    references: [bookFiles.bookId]
  }),
  progressEntries: many(readingProgress),
  highlightEntries: many(highlights)
}));

export const bookFilesRelations = relations(bookFiles, ({ one }) => ({
  book: one(books, {
    fields: [bookFiles.bookId],
    references: [books.id]
  })
}));

export const readingProgressRelations = relations(readingProgress, ({ one }) => ({
  user: one(users, {
    fields: [readingProgress.userId],
    references: [users.id]
  }),
  book: one(books, {
    fields: [readingProgress.bookId],
    references: [books.id]
  })
}));

export const highlightsRelations = relations(highlights, ({ one }) => ({
  user: one(users, {
    fields: [highlights.userId],
    references: [users.id]
  }),
  book: one(books, {
    fields: [highlights.bookId],
    references: [books.id]
  })
}));
