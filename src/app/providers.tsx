'use client';

import { useEffect } from 'react';
import { HeroUIProvider } from '@heroui/system';
import { I18nProvider } from '@/i18n';
import { ThemeProvider } from '@/theme';
import { authClient } from '@/lib/auth/client';
import { useSessionStore } from '@/lib/auth/sessionStore';

function AuthSessionBridge() {
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
      <HeroUIProvider>
        <ThemeProvider>
          <AuthSessionBridge />
          {children}
        </ThemeProvider>
      </HeroUIProvider>
    </I18nProvider>
  );
}
