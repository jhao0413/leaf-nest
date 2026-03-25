'use client';

import { useTranslations, useLocale } from '@/i18n';
import { useTransition } from 'react';
import { setUserLocale } from '@/hooks/useLocale';
import { Locale } from '@/i18n/config';
import { Globe } from 'lucide-react';

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const [, startTransition] = useTransition();

  const languages = [
    { key: 'en', label: 'English' },
    { key: 'zh', label: '简体中文' }
  ];

  function onChangeLocale(value: string) {
    startTransition(() => {
      setUserLocale(value as Locale);
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 px-2 pt-2">
        <h2 className="text-2xl font-bold font-lxgw text-gray-800 dark:text-gray-200">
          {t('title')}
        </h2>
      </div>

      <div className="space-y-6">
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
      </div>
    </div>
  );
}
