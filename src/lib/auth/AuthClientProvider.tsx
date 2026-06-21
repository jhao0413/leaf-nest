'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl, subscribeApiBaseUrlChange } from '@/lib/api/baseUrl';
import { createLeafNestAuthClient } from '@/lib/auth/client';
import { useSessionStore } from '@/lib/auth/sessionStore';

type LeafNestAuthClient = ReturnType<typeof createLeafNestAuthClient>;

interface AuthClientContextValue {
  authClient: LeafNestAuthClient;
  apiBaseUrl: string;
}

const AuthClientContext = createContext<AuthClientContextValue | null>(null);

export function AuthClientProvider({ children }: { children: React.ReactNode }) {
  const [apiBaseUrl, setApiBaseUrl] = useState(() => getApiBaseUrl());
  const clearSession = useSessionStore((state) => state.clearSession);

  useEffect(
    () =>
      subscribeApiBaseUrlChange(() => {
        setApiBaseUrl(getApiBaseUrl());
        clearSession();
      }),
    [clearSession]
  );

  const value = useMemo(
    () => ({
      authClient: createLeafNestAuthClient(apiBaseUrl),
      apiBaseUrl
    }),
    [apiBaseUrl]
  );

  return <AuthClientContext.Provider value={value}>{children}</AuthClientContext.Provider>;
}

export function useAuthClient() {
  const context = useContext(AuthClientContext);

  if (!context) {
    throw new Error('AuthClientProvider is missing');
  }

  return context.authClient;
}

export function useAuthApiBaseUrl() {
  const context = useContext(AuthClientContext);

  if (!context) {
    throw new Error('AuthClientProvider is missing');
  }

  return context.apiBaseUrl;
}
