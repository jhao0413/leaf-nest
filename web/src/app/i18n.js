// src/app/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonEn from '../public/locales/en/login.json';
import commonDe from '../public/locales/zh/login.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
      },
      de: {
        common: commonDe,
      },
    },
    fallbackLng: 'en',
    lng: 'en', // 默认语言
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;