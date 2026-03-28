import { Hono } from 'hono';
import { z } from 'zod';
import { AuthSession } from '../lib/auth-types.js';
import {
  HighlightInput,
  HighlightUpdateInput,
  ReadingProgressInput,
  ReadingService
} from '../lib/reading.js';

type ReadingRouteBindings = {
  Variables: {
    authSession: AuthSession;
  };
};

const progressSchema = z.object({
  currentChapter: z.number().int().min(0),
  currentPage: z.number().int().min(1),
  percentage: z.number().min(0).max(100),
  textAnchor: z.string()
});

const highlightSchema = z.object({
  chapterIndex: z.number().int().min(0),
  selectedText: z.string().min(1),
  contextBefore: z.string(),
  contextAfter: z.string(),
  color: z.string().min(1),
  style: z.string().min(1),
  note: z.string().optional()
});

const highlightUpdateSchema = z
  .object({
    color: z.string().min(1).optional(),
    note: z.string().nullable().optional()
  })
  .refine((value) => typeof value.color !== 'undefined' || typeof value.note !== 'undefined', {
    message: 'At least one highlight field must be provided'
  });

type ParsedJsonBody<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
    };

async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<ParsedJsonBody<T>> {
  try {
    const json = await request.json();

    return {
      success: true,
      data: schema.parse(json)
    };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      return {
        success: false
      };
    }

    throw error;
  }
}

export function registerReadingRoutes(app: Hono<ReadingRouteBindings>, reading: ReadingService) {
  app.get('/api/highlights', async (c) => {
    const session = c.get('authSession');
    const items = await reading.listAllHighlights(session.user.id);

    return c.json({ items });
  });

  app.get('/api/books/:bookId/progress', async (c) => {
    const session = c.get('authSession');
    const bookId = c.req.param('bookId');
    const item = await reading.getProgress(session.user.id, bookId);

    return c.json({ item });
  });

  app.put('/api/books/:bookId/progress', async (c) => {
    const session = c.get('authSession');
    const bookId = c.req.param('bookId');
    const parsedInput = await parseJsonBody<ReadingProgressInput>(c.req.raw, progressSchema);

    if (!parsedInput.success) {
      return c.json({ error: 'Invalid reading progress payload' }, 400);
    }

    const input = parsedInput.data;
    const item = await reading.upsertProgress(session.user.id, bookId, input);

    if (!item) {
      return c.json({ error: 'Book not found' }, 404);
    }

    return c.json({ item });
  });

  app.get('/api/books/:bookId/highlights', async (c) => {
    const session = c.get('authSession');
    const bookId = c.req.param('bookId');
    const chapterIndexQuery = c.req.query('chapterIndex');
    const chapterIndex =
      typeof chapterIndexQuery === 'string' && chapterIndexQuery.length > 0
        ? Number.parseInt(chapterIndexQuery, 10)
        : undefined;

    if (typeof chapterIndex !== 'undefined' && Number.isNaN(chapterIndex)) {
      return c.json({ error: 'Invalid chapterIndex query parameter' }, 400);
    }

    const items = await reading.listHighlights(session.user.id, bookId, {
      chapterIndex
    });

    return c.json({ items });
  });

  app.post('/api/books/:bookId/highlights', async (c) => {
    const session = c.get('authSession');
    const bookId = c.req.param('bookId');
    const parsedInput = await parseJsonBody<HighlightInput>(c.req.raw, highlightSchema);

    if (!parsedInput.success) {
      return c.json({ error: 'Invalid highlight payload' }, 400);
    }

    const input = parsedInput.data;
    const item = await reading.createHighlight(session.user.id, bookId, input);

    if (!item) {
      return c.json({ error: 'Book not found' }, 404);
    }

    return c.json({ item }, 201);
  });

  app.patch('/api/highlights/:highlightId', async (c) => {
    const session = c.get('authSession');
    const highlightId = c.req.param('highlightId');
    const parsedInput = await parseJsonBody<HighlightUpdateInput>(c.req.raw, highlightUpdateSchema);

    if (!parsedInput.success) {
      return c.json({ error: 'Invalid highlight update payload' }, 400);
    }

    const input = parsedInput.data;
    const item = await reading.updateHighlight(session.user.id, highlightId, input);

    if (!item) {
      return c.json({ error: 'Highlight not found' }, 404);
    }

    return c.json({ item });
  });

  app.delete('/api/highlights/:highlightId', async (c) => {
    const session = c.get('authSession');
    const highlightId = c.req.param('highlightId');
    const deleted = await reading.deleteHighlight(session.user.id, highlightId);

    if (!deleted) {
      return c.json({ error: 'Highlight not found' }, 404);
    }

    return c.body(null, 204);
  });
}
