import type { Hono } from 'hono';

export function registerHealthRoute(app: Hono<any>) {
  app.get('/api/health', (c) => {
    return c.json({ ok: true });
  });
}
