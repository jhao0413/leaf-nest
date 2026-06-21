import { normalizeApiBaseUrl } from '@/lib/api/baseUrl';

const AUTH_SESSION_TOKEN_STORAGE_KEY = 'leaf-nest-auth-session-token';

interface StoredAuthSessionToken {
  apiBaseUrl: string;
  token: string;
}

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function readStoredAuthSessionToken(): StoredAuthSessionToken | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const value = storage.getItem(AUTH_SESSION_TOKEN_STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<StoredAuthSessionToken>;

    if (typeof parsed.apiBaseUrl !== 'string' || typeof parsed.token !== 'string') {
      return null;
    }

    return {
      apiBaseUrl: normalizeApiBaseUrl(parsed.apiBaseUrl),
      token: parsed.token
    };
  } catch {
    storage.removeItem(AUTH_SESSION_TOKEN_STORAGE_KEY);
    return null;
  }
}

export function getAuthSessionToken(apiBaseUrl: string) {
  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);

  if (!normalizedApiBaseUrl) {
    return undefined;
  }

  const stored = readStoredAuthSessionToken();

  if (!stored || stored.apiBaseUrl !== normalizedApiBaseUrl) {
    return undefined;
  }

  return stored.token || undefined;
}

export function setAuthSessionToken(apiBaseUrl: string, token: string) {
  const storage = getStorage();
  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  const normalizedToken = token.trim();

  if (!storage || !normalizedApiBaseUrl || !normalizedToken) {
    return;
  }

  storage.setItem(
    AUTH_SESSION_TOKEN_STORAGE_KEY,
    JSON.stringify({
      apiBaseUrl: normalizedApiBaseUrl,
      token: normalizedToken
    } satisfies StoredAuthSessionToken)
  );
}

export function clearAuthSessionToken(apiBaseUrl?: string) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  if (!apiBaseUrl) {
    storage.removeItem(AUTH_SESSION_TOKEN_STORAGE_KEY);
    return;
  }

  const stored = readStoredAuthSessionToken();

  if (stored?.apiBaseUrl === normalizeApiBaseUrl(apiBaseUrl)) {
    storage.removeItem(AUTH_SESSION_TOKEN_STORAGE_KEY);
  }
}
