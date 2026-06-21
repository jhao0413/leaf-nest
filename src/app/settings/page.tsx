'use client';

import { useTranslations, useLocale } from '@/i18n';
import { FormEvent, useState, useTransition } from 'react';
import { setUserLocale } from '@/hooks/useLocale';
import { Locale } from '@/i18n/config';
import { ExternalLink, Globe, Info, Server } from 'lucide-react';
import { getServerApiBaseUrlInputValue, setServerApiBaseUrl } from '@/lib/api/baseUrl';

const PROJECT_GITHUB_URL = 'https://github.com/jhao0413/leaf-nest';

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const [, startTransition] = useTransition();
  const [serverUrl, setServerUrl] = useState(() => getServerApiBaseUrlInputValue());
  const [serverUrlMessage, setServerUrlMessage] = useState<string | null>(null);

  const languages = [
    { key: 'en', label: 'English' },
    { key: 'zh', label: '简体中文' }
  ];

  function onChangeLocale(value: string) {
    startTransition(() => {
      setUserLocale(value as Locale);
    });
  }

  function onSaveServerUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextServerUrl = serverUrl.trim();

    try {
      const parsedServerUrl = new URL(nextServerUrl);

      if (!['http:', 'https:'].includes(parsedServerUrl.protocol)) {
        setServerUrlMessage(t('serverUrlInvalid'));
        return;
      }
    } catch {
      setServerUrlMessage(t('serverUrlInvalid'));
      return;
    }

    setServerApiBaseUrl(nextServerUrl);
    setServerUrlMessage(t('serverUrlSaved'));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 px-2 pt-2">
        <h2 className="text-2xl font-bold font-lxgw text-gray-800 dark:text-gray-200">
          {t('title')}
        </h2>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-white/20 bg-white/40 dark:bg-white/5 backdrop-blur-md shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
              <Server size={18} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold font-lxgw text-gray-800 dark:text-gray-200">
                {t('serverUrl')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-lxgw">
                {t('serverUrlDesc')}
              </p>
            </div>
          </div>

          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onSaveServerUrl}>
            <input
              type="url"
              required
              value={serverUrl}
              onChange={(event) => {
                setServerUrl(event.target.value);
                setServerUrlMessage(null);
              }}
              placeholder={t('serverUrlPlaceholder')}
              className="min-w-0 flex-1 rounded-xl border border-white/30 bg-white/70 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-black/20 dark:text-gray-100"
            />
            <button
              type="submit"
              className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-800 transition hover:bg-cyan-100 dark:border-cyan-900/50 dark:bg-cyan-900/20 dark:text-cyan-200 dark:hover:bg-cyan-900/30"
            >
              {t('serverUrlSave')}
            </button>
          </form>

          {serverUrlMessage && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{serverUrlMessage}</p>
          )}
        </div>

        {/* Language Setting */}
        <div className="rounded-2xl border border-white/20 bg-white/40 dark:bg-white/5 backdrop-blur-md shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Globe size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold font-lxgw text-gray-800 dark:text-gray-200">
                {t('language')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-lxgw">
                {t('languageDesc')}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {languages.map((lang) => (
              <button
                key={lang.key}
                type="button"
                onClick={() => onChangeLocale(lang.key)}
                className={`
                  flex items-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300
                  border backdrop-blur-md
                  ${
                    locale === lang.key
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'border-white/20 bg-white/30 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10'
                  }
                `}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                    locale === lang.key ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {locale === lang.key && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
                <span className="font-lxgw text-sm font-medium">{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/40 dark:bg-white/5 backdrop-blur-md shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Info size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold font-lxgw text-gray-800 dark:text-gray-200">{t('about')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-lxgw">{t('aboutDesc')}</p>
            </div>
          </div>

          <a
            href={PROJECT_GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-white/20 bg-white/30 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-300"
          >
            <span className="font-lxgw text-sm font-medium">{t('github')}</span>
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
