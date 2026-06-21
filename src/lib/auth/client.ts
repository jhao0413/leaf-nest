import { createAuthClient } from 'better-auth/react';
import {
  getApiBaseUrl,
  isServerApiBaseUrlConfigEnabled,
  normalizeApiBaseUrl
} from '@/lib/api/baseUrl';
import { getAuthSessionToken } from '@/lib/auth/sessionToken';

export function createLeafNestAuthClient(baseURL = getApiBaseUrl()) {
  const apiBaseUrl = normalizeApiBaseUrl(baseURL);
  const authSessionToken = isServerApiBaseUrlConfigEnabled()
    ? getAuthSessionToken(apiBaseUrl)
    : undefined;

  return createAuthClient({
    baseURL: apiBaseUrl || baseURL,
    ...(authSessionToken
      ? {
          fetchOptions: {
            auth: {
              type: 'Bearer' as const,
              token: authSessionToken
            }
          }
        }
      : {})
  });
}

export const authClient = createLeafNestAuthClient();

export type AuthSession = typeof authClient.$Infer.Session;
