import './load-env.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { getEnv } from './env.js';
import { getAuth } from './lib/auth.js';
import { getBooksService } from './lib/books.js';
import { getReadingService } from './lib/reading.js';

const env = getEnv();
const frontendDistDir = path.resolve(process.cwd(), 'dist');
const app = createApp(
  getAuth(),
  {
    books: getBooksService(),
    reading: getReadingService()
  },
  {
    frontendDistDir: existsSync(frontendDistDir) ? frontendDistDir : undefined,
    trustedClientOrigins: [
      new URL(env.APP_URL).origin,
      new URL(env.BETTER_AUTH_URL).origin,
      ...env.TRUSTED_CLIENT_ORIGINS
    ]
  }
);

serve(
  {
    fetch: app.fetch,
    port: env.API_PORT
  },
  (info) => {
    console.log(`Hono API listening on http://localhost:${info.port}`);
  }
);
