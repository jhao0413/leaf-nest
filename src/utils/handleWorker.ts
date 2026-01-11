import { BookBasicInfoType } from "@/store/bookInfoStore";
import { convertKeysToCamelCase } from "@/utils/utils";
import { v4 as uuidv4 } from "uuid";
import sqlite3InitModule, { OpfsDatabase } from "@sqlite.org/sqlite-wasm";

onmessage = async (event) => {
  console.log("Received message from main thread:", event.data);

  const sqlite3 = await sqlite3InitModule({ print: console.log, printErr: console.error });
  let db = null;
  if ("opfs" in sqlite3) {
    db = new sqlite3.oo1.OpfsDb("/leaf-nest.sqlite3", "ct");
    // Create books table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id VARCHAR(40) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        creator VARCHAR(20),
        publisher VARCHAR(255),
        identifier VARCHAR(255),
        pubdate DATE,
        percentage NUMERIC NOT NULL,
        file_blob BLOB NOT NULL,
        cover_blob BLOB,
        toc TEXT,
        language VARCHAR(20),
        size VARCHAR(20)
      );
  `);

    // Create book_text_index table for storing full book text indexes
    // Each book has ONE record containing all chapter indexes as JSON
    db.exec(`
      CREATE TABLE IF NOT EXISTS book_text_index (
        book_id VARCHAR(40) PRIMARY KEY,
        index_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrate database to add reading progress fields
    migrateDatabase(db);
  } else {
    postMessage({ error: "sqlite3.opfs is not available." });
    return;
  }

  switch (event.data.action) {
    case "initialize":
      await initializeSQLite(db);
      break;
    case "query":
      await queryDatabase(db);
      break;
    case "addBook":
      await addBook(db, event.data.data);
      break;
    case "getBookById":
      await getBookById(db, event.data.data.id);
      break;
    case "deleteBook":
      await deleteBook(db, event.data.data);
      break;
    case "getBookIndex":
      await getBookIndex(db, event.data.data.bookId);
      break;
    case "saveBookIndex":
      await saveBookIndex(db, event.data.data);
      break;
    case "deleteBookIndex":
      await deleteBookIndex(db, event.data.data.bookId);
      break;
    case "updateReadingProgress":
      await updateReadingProgress(db, event.data.data);
      break;
    default:
      break;
  }
};

const migrateDatabase = (db: OpfsDatabase) => {
  try {
    // Get existing columns
    const columns: string[] = [];
    db.exec({
      sql: "PRAGMA table_info(books);",
      rowMode: "object",
      callback: (row) => {
        columns.push((row as { name: string }).name);
      },
    });

    // Check and add missing fields
    if (!columns.includes('current_chapter')) {
      db.exec("ALTER TABLE books ADD COLUMN current_chapter INTEGER DEFAULT 0;");
      console.log("Added column: current_chapter");
    }
    if (!columns.includes('current_page')) {
      db.exec("ALTER TABLE books ADD COLUMN current_page INTEGER DEFAULT 1;");
      console.log("Added column: current_page");
    }
    if (!columns.includes('text_anchor')) {
      db.exec("ALTER TABLE books ADD COLUMN text_anchor TEXT;");
      console.log("Added column: text_anchor");
    }
    if (!columns.includes('last_read_at')) {
      db.exec("ALTER TABLE books ADD COLUMN last_read_at DATETIME;");
      console.log("Added column: last_read_at");
    }
  } catch (err) {
    console.error("Error migrating database:", err);
  }
};

const initializeSQLite = async (db: OpfsDatabase) => {
  console.log(db);
};

const queryDatabase = async (db: OpfsDatabase) => {
  try {
    const books: object[] = [];
    db.exec({
      sql: "select * from books limit 10;",
      rowMode: "object",
      callback: (row) => {
        const camelCaseRow = convertKeysToCamelCase(row);
        for (const key in camelCaseRow) {
          if (key === "toc" && typeof camelCaseRow[key] === "string") {
            camelCaseRow[key] = JSON.parse(camelCaseRow[key]);
          }
        }
        books.push(camelCaseRow);
      },
    });
    postMessage({ success: true, action: "query", data: books });
  } catch (err) {
    console.error("Error querying database:", err);
    postMessage({ success: false, action: "query", error: err });
  }
};

const addBook = async (db: OpfsDatabase, book: BookBasicInfoType) => {
  try {
    if (!book.blob) throw new Error("Book blob is required.");

    if (!book.coverBlob) throw new Error("Book cover blob is required.");

    const id = await insertBook(db, book);
    postMessage({ success: true, action: "addBook", data: { ...book, id } });
  } catch (err) {
    console.error("Error adding book:", err);
    postMessage({ success: false, action: "addBook", error: err });
  }
};

const getBookById = async (db: OpfsDatabase, id: string) => {
  try {
    db.exec({
      sql: `select * from books where id = ?;`,
      bind: [id],
      rowMode: "object",
      callback: (row) => {
        const camelCaseRow = convertKeysToCamelCase(row);
        postMessage({ success: true, action: "getBookById", data: camelCaseRow });
      },
    });
  } catch (err) {
    console.error("Error getting book by id:", err);
    postMessage({ success: false, action: "getBookById", error: err });
  }
};

const deleteBook = async (db: OpfsDatabase, ids: string[]) => {
  try {
    console.log(ids);
    db.exec({
      sql: `delete from books where id in ('${ids.join("','")}');`,
    });
    postMessage({ success: true, action: "deleteBook" });
  } catch (err) {
    console.error("Error deleting book:", err);
    postMessage({ success: false, action: "deleteBook", error: err });
  }
};

async function insertBook(db: OpfsDatabase, bookInfo: BookBasicInfoType) {
  try {
    if (!bookInfo.blob) throw new Error("Book blob is required.");

    if (!bookInfo.coverBlob) throw new Error("Book cover blob is required.");

    const id = uuidv4();

    // Insert into database
    db.exec({
      sql: `
        INSERT INTO books (id, name, creator, publisher, identifier, pubdate, percentage, file_blob, cover_blob, toc, language, size) VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      bind: [
        id,
        bookInfo.name,
        bookInfo.creator,
        bookInfo.publisher,
        bookInfo.identifier,
        bookInfo.pubdate,
        0,
        bookInfo.blob,
        bookInfo.coverBlob,
        JSON.stringify(bookInfo.toc),
        bookInfo.language,
        bookInfo.size,
      ],
    });

    return id;
  } catch (error) {
    console.error("Error fetching or inserting book data:", error);
  }
}

const getBookIndex = async (db: OpfsDatabase, bookId: string) => {
  try {
    let indexData = null;
    db.exec({
      sql: `SELECT index_data FROM book_text_index WHERE book_id = ?;`,
      bind: [bookId],
      rowMode: "object",
      callback: (row) => {
        // Parse the JSON string back to array
        const typedRow = row as { index_data: string };
        indexData = JSON.parse(typedRow.index_data);
      },
    });
    
    postMessage({ success: true, action: "getBookIndex", data: indexData });
  } catch (err) {
    console.error("Error getting book index:", err);
    postMessage({ success: false, action: "getBookIndex", error: err });
  }
};

const saveBookIndex = async (db: OpfsDatabase, data: { bookId: string; indexes: unknown[] }) => {
  try {
    const { bookId, indexes } = data;
    
    // Serialize the entire index array to JSON
    const indexDataJson = JSON.stringify(indexes);
    
    // Use INSERT OR REPLACE to update if exists, insert if not
    db.exec({
      sql: `
        INSERT OR REPLACE INTO book_text_index (book_id, index_data, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP);
      `,
      bind: [bookId, indexDataJson],
    });
    
    console.log(`Saved index for book ${bookId}, total chapters: ${indexes.length}`);
    postMessage({ success: true, action: "saveBookIndex" });
  } catch (err) {
    console.error("Error saving book index:", err);
    postMessage({ success: false, action: "saveBookIndex", error: err });
  }
};

const deleteBookIndex = async (db: OpfsDatabase, bookId: string) => {
  try {
    db.exec({
      sql: `DELETE FROM book_text_index WHERE book_id = ?;`,
      bind: [bookId],
    });
    postMessage({ success: true, action: "deleteBookIndex" });
  } catch (err) {
    console.error("Error deleting book index:", err);
    postMessage({ success: false, action: "deleteBookIndex", error: err });
  }
};

const updateReadingProgress = async (
  db: OpfsDatabase,
  data: {
    bookId: string;
    currentChapter: number;
    currentPage: number;
    textAnchor: string;
    percentage: number;
  }
) => {
  try {
    db.exec({
      sql: `
        UPDATE books
        SET current_chapter = ?,
            current_page = ?,
            text_anchor = ?,
            percentage = ?,
            last_read_at = CURRENT_TIMESTAMP
        WHERE id = ?;
      `,
      bind: [
        data.currentChapter,
        data.currentPage,
        data.textAnchor,
        data.percentage,
        data.bookId
      ],
    });
    console.log(`Reading progress updated for book ${data.bookId}: chapter ${data.currentChapter}, page ${data.currentPage}, ${data.percentage}%`);
    postMessage({ success: true, action: "updateReadingProgress" });
  } catch (err) {
    console.error("Error updating reading progress:", err);
    postMessage({ success: false, action: "updateReadingProgress", error: err });
  }
};
