'use client';

import { HeroUIProvider } from '@heroui/system';
import { I18nProvider } from '@/i18n';
import { ThemeProvider } from '@/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <HeroUIProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </HeroUIProvider>
    </I18nProvider>
  );
}
