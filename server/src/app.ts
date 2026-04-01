import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { Hono, MiddlewareHandler } from 'hono';
import { registerHealthRoute } from './routes/health.js';
import { AuthLike, AuthSession } from './lib/auth-types.js';
import { BooksService } from './lib/books.js';
import { ReadingService } from './lib/reading.js';
import { registerBookRoutes } from './routes/books.js';
import { registerReadingRoutes } from './routes/reading.js';

type AppBindings = {
  Variables: {
    authSession: AuthSession;
  };
};

interface AppServices {
  books?: BooksService;
  reading?: ReadingService;
}

interface FrontendAssetsOptions {
  frontendDistDir?: string;
}

const contentTypesByExtension: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function getContentType(filePath: string) {
  return (
    contentTypesByExtension[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  );
}

async function getStaticFileResponse(frontendDistDir: string, requestPath: string) {
  const resolvedDistDir = path.resolve(frontendDistDir);
  const resolvedFilePath = path.resolve(resolvedDistDir, `.${requestPath}`);

  if (
    resolvedFilePath !== resolvedDistDir &&
    !resolvedFilePath.startsWith(`${resolvedDistDir}${path.sep}`)
  ) {
    return null;
  }

  const fileStat = await stat(resolvedFilePath).catch(() => null);

  if (!fileStat?.isFile()) {
    return null;
  }

  const body = await readFile(resolvedFilePath);

  return new Response(body, {
    headers: {
      'Content-Type': getContentType(resolvedFilePath)
    }
  });
}

function registerFrontendRoutes(app: Hono<AppBindings>, options: FrontendAssetsOptions) {
  if (!options.frontendDistDir) {
    return;
  }

  app.get('*', async (c) => {
    const requestPath = c.req.path;

    if (requestPath.startsWith('/api/')) {
      return c.notFound();
    }

    const staticFileResponse = await getStaticFileResponse(options.frontendDistDir!, requestPath);

    if (staticFileResponse) {
      return staticFileResponse;
    }

    if (path.extname(requestPath)) {
      return c.notFound();
    }

    const indexFileResponse = await getStaticFileResponse(options.frontendDistDir!, '/index.html');
    return indexFileResponse ?? c.notFound();
  });
}

function createRequireSessionMiddleware(auth: AuthLike) {
  const requireSession: MiddlewareHandler<AppBindings> = async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    });

    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    c.set('authSession', session);
    await next();
  };

  return requireSession;
}

function registerAuthRoutes(
  app: Hono<AppBindings>,
  auth: AuthLike,
  requireSession: ReturnType<typeof createRequireSessionMiddleware>
) {
  app.all('/api/auth/*', async (c) => auth.handler(c.req.raw));

  app.use('/api/session', requireSession);

  app.get('/api/session', (c) => {
    const session = c.get('authSession');

    return c.json({
      sessionId: session.session.id,
      userId: session.user.id
    });
  });
}

export function createApp(
  auth?: AuthLike,
  services: AppServices = {},
  frontendOptions: FrontendAssetsOptions = {}
) {
  const app = new Hono<AppBindings>();

  registerHealthRoute(app);

  if (auth) {
    const requireSession = createRequireSessionMiddleware(auth);

    registerAuthRoutes(app, auth, requireSession);

    if (services.books) {
      app.use('/api/books', requireSession);
      app.use('/api/books/*', requireSession);
      registerBookRoutes(app, services.books);
    }

    if (services.reading) {
      app.use('/api/books/*', requireSession);
      app.use('/api/highlights/*', requireSession);
      registerReadingRoutes(app, services.reading);
    }
  }

  registerFrontendRoutes(app, frontendOptions);

  return app;
}

export const app = createApp();
