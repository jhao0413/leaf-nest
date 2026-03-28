import { createAuthClient } from 'better-auth/react';

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:8787';
}

export const authClient = createAuthClient({
  baseURL: getBaseUrl()
});

export type AuthSession = typeof authClient.$Infer.Session;
