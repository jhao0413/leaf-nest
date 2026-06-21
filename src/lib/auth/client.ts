import { createAuthClient } from 'better-auth/react';
import { getApiBaseUrl } from '@/lib/api/baseUrl';

export function createLeafNestAuthClient(baseURL = getApiBaseUrl()) {
  return createAuthClient({
    baseURL
  });
}

export const authClient = createLeafNestAuthClient();

export type AuthSession = typeof authClient.$Infer.Session;
