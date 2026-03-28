import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { buildAdapterSchema, buildTrustedOrigins } from './auth.js';

const fakeAuth = {
  handler: async () => new Response(JSON.stringify({ mounted: true }), { status: 200 }),
  api: {
    getSession: async ({ headers }: { headers: Headers }) => {
      if (headers.get('x-test-auth') !== 'yes') {
        return null;
      }

      return {
        user: {
          id: 'user_123',
          email: 'reader@example.com'
        },
        session: {
          id: 'session_123'
        }
      };
    }
  }
};

describe('auth integration', () => {
  it('includes the app origin in better auth trusted origins', () => {
    expect(
      buildTrustedOrigins({
        APP_URL: 'http://localhost:5173',
        BETTER_AUTH_URL: 'http://localhost:8787'
      })
    ).toEqual(['http://localhost:5173', 'http://localhost:8787']);
  });

  it('maps the drizzle auth tables to better auth schema keys', () => {
    const adapterSchema = buildAdapterSchema();

    expect(adapterSchema).toMatchObject({
      user: expect.any(Object),
      session: expect.any(Object),
      account: expect.any(Object),
      verification: expect.any(Object)
    });
  });

  it('mounts the auth handler under /api/auth/*', async () => {
    const app = createApp(fakeAuth);

    const response = await app.request('/api/auth/test');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ mounted: true });
  });

  it('rejects unauthenticated protected requests', async () => {
    const app = createApp(fakeAuth);

    const response = await app.request('/api/session');

    expect(response.status).toBe(401);
  });

  it('exposes the authenticated user id on protected routes', async () => {
    const app = createApp(fakeAuth);

    const response = await app.request('/api/session', {
      headers: new Headers({
        'x-test-auth': 'yes'
      })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sessionId: 'session_123',
      userId: 'user_123'
    });
  });
});
