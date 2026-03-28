import type { Hono } from 'hono';

export function registerHealthRoute(app: Hono) {
  app.get('/api/health', (c) => {
    return c.json({ ok: true });
  });
}
