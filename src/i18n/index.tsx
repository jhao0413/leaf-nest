import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import enMessages from '@/messages/en.json';
import zhMessages from '@/messages/zh.json';
import { Locale, defaultLocale, locales } from '@/i18n/config';

type MessageCatalog = typeof enMessages;
type TranslationValues = Record<string, string | number | undefined | null>;

const LOCALE_STORAGE_KEY = 'leaf-nest-locale';
const LOCALE_CHANGE_EVENT = 'leaf-nest-locale-change';

const catalog: Record<Locale, MessageCatalog> = {
  en: enMessages,
  zh: zhMessages
};

interface I18nContextValue {
  locale: Locale;
  messages: MessageCatalog;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(value: string | null | undefined): value is Locale {
  return !!value && locales.includes(value as Locale);
}

function getBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return defaultLocale;
  }

  const language = navigator.language.toLowerCase();

  if (language.startsWith('zh')) {
    return 'zh';
  }

  if (language.startsWith('en')) {
    return 'en';
  }

  return defaultLocale;
}

function formatMessage(template: string, values?: TranslationValues) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const value = values[key];

    if (value === null || value === undefined) {
      return `{${key}}`;
    }

    return String(value);
  });
}

export function getUserLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);

  if (isLocale(storedLocale)) {
    return storedLocale;
  }

  return getBrowserLocale();
}

export function setUserLocale(locale: Locale) {
  if (typeof window === 'undefined' || !isLocale(locale)) {
    return;
  }

  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  window.dispatchEvent(new CustomEvent<Locale>(LOCALE_CHANGE_EVENT, { detail: locale }));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => getUserLocale());

  useEffect(() => {
    document.documentElement.lang = locale;

    const handleLocaleChange = (event: Event) => {
      const detail = (event as CustomEvent<Locale>).detail;
      setLocale(isLocale(detail) ? detail : getUserLocale());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY) {
        setLocale(getUserLocale());
      }
    };

    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      messages: catalog[locale] ?? catalog[defaultLocale]
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18nContext() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('I18nProvider is missing');
  }

  return context;
}

export function useLocale() {
  return useI18nContext().locale;
}

export function useTranslations(namespace: keyof MessageCatalog & string) {
  const { messages } = useI18nContext();
  const namespaceMessages = messages[namespace] as Record<string, string> | undefined;

  return (key: string, values?: TranslationValues) => {
    const template = namespaceMessages?.[key];

    if (!template) {
      return key;
    }

    return formatMessage(template, values);
  };
}
