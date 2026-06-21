'use client';

import { useEffect } from 'react';
import { I18nProvider } from '@/i18n';
import { ThemeProvider } from '@/theme';
import { AuthClientProvider, useAuthClient } from '@/lib/auth/AuthClientProvider';
import { useSessionStore } from '@/lib/auth/sessionStore';

function AuthSessionBridge() {
  const authClient = useAuthClient();
  const { data, error, isPending, refetch } = authClient.useSession();
  const applySnapshot = useSessionStore((state) => state.applySnapshot);

  useEffect(() => {
    applySnapshot({
      data,
      error,
      isPending,
      refetch
    });
  }, [applySnapshot, data, error, isPending, refetch]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AuthClientProvider>
          <AuthSessionBridge />
          {children}
        </AuthClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
