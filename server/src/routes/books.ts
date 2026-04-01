import { Hono } from 'hono';
import { z } from 'zod';
import { AuthSession } from '../lib/auth-types.js';
import { BookCreateInput, BooksService } from '../lib/books.js';

type BooksRouteBindings = {
  Variables: {
    authSession: AuthSession;
  };
};

const tocSchema = z.array(
  z.object({
    text: z.string(),
    path: z.string(),
    file: z.string()
  })
);

function isStorageUnavailableError(error: Error) {
  const httpStatusCode = (error as Error & { $metadata?: { httpStatusCode?: number } }).$metadata
    ?.httpStatusCode;

  if (typeof httpStatusCode === 'number' && [401, 403, 404, 408, 429].includes(httpStatusCode)) {
    return true;
  }

  return /(ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|NoSuchBucket|UnknownEndpoint|InvalidAccessKeyId|SignatureDoesNotMatch)/i.test(
    error.message
  );
}

async function toUploadPart(file: File) {
  const content = new Uint8Array(await file.arrayBuffer());

  return {
    originalFilename: file.name,
    mimeType: file.type || 'application/octet-stream',
    byteSize: file.size,
    content
  };
}

function deriveTitleFromFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, '').trim();
}

async function parseCreateBookFormData(formData: FormData): Promise<BookCreateInput> {
  const file = formData.get('file');

  if (!(file instanceof File)) {
    throw new Error('EPUB file is required');
  }

  const coverEntry = formData.get('cover');
  const tocEntry = formData.get('toc');
  const title = formData.get('title');
  const normalizedTitle =
    typeof title === 'string' && title.trim() ? title.trim() : deriveTitleFromFilename(file.name);

  if (!normalizedTitle) {
    throw new Error('Book title is required');
  }

  const toc = tocSchema.parse(typeof tocEntry === 'string' ? JSON.parse(tocEntry) : []);

  return {
    title: normalizedTitle,
    creator:
      typeof formData.get('creator') === 'string' ? String(formData.get('creator')) || null : null,
    publisher:
      typeof formData.get('publisher') === 'string'
        ? String(formData.get('publisher')) || null
        : null,
    identifier:
      typeof formData.get('identifier') === 'string'
        ? String(formData.get('identifier')) || null
        : null,
    publicationDate:
      typeof formData.get('publicationDate') === 'string'
        ? String(formData.get('publicationDate')) || null
        : null,
    language:
      typeof formData.get('language') === 'string'
        ? String(formData.get('language')) || null
        : null,
    toc,
    file: await toUploadPart(file),
    cover: coverEntry instanceof File ? await toUploadPart(coverEntry) : null
  };
}

export function registerBookRoutes(app: Hono<BooksRouteBindings>, books: BooksService) {
  app.get('/api/books', async (c) => {
    const session = c.get('authSession');
    const items = await books.listBooks(session.user.id);

    return c.json({ items });
  });

  app.get('/api/books/:bookId', async (c) => {
    const session = c.get('authSession');
    const item = await books.getBook(session.user.id, c.req.param('bookId'));

    if (!item) {
      return c.json({ error: 'Book not found' }, 404);
    }

    return c.json({ item });
  });

  app.post('/api/books/:bookId/access-url', async (c) => {
    const session = c.get('authSession');
    const item = await books.getBookAccessUrl(session.user.id, c.req.param('bookId'));

    if (!item) {
      return c.json({ error: 'Book not found' }, 404);
    }

    return c.json({ item });
  });

  app.post('/api/books', async (c) => {
    try {
      const session = c.get('authSession');
      const formData = await c.req.raw.formData();
      const input = await parseCreateBookFormData(formData);
      const item = await books.createBook(session.user.id, input);

      return c.json({ item }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid table of contents payload' }, 400);
      }

      if (error instanceof Error) {
        if (isStorageUnavailableError(error)) {
          return c.json({ error: 'Object storage is unavailable' }, 503);
        }

        return c.json({ error: error.message }, 400);
      }

      throw error;
    }
  });

  app.delete('/api/books/:bookId', async (c) => {
    const session = c.get('authSession');
    const deleted = await books.deleteBook(session.user.id, c.req.param('bookId'));

    if (!deleted) {
      return c.json({ error: 'Book not found' }, 404);
    }

    return c.body(null, 204);
  });
}
