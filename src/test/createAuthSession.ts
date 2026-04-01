import type { AuthSession } from '@/lib/auth/client';

const AUTH_SESSION_TIMESTAMP = '2026-03-28T00:00:00.000Z';

export const createAuthenticatedSession = (): AuthSession => ({
  user: {
    id: 'user-1',
    email: 'reader@example.com',
    name: 'Reader',
    createdAt: new Date(AUTH_SESSION_TIMESTAMP),
    updatedAt: new Date(AUTH_SESSION_TIMESTAMP),
    emailVerified: false
  },
  session: {
    id: 'session-1',
    userId: 'user-1',
    expiresAt: new Date(AUTH_SESSION_TIMESTAMP)
  } as AuthSession['session']
});
