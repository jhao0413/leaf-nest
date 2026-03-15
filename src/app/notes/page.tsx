'use client';

import { useTranslations } from 'next-intl';

export default function NotesPage() {
  const t = useTranslations('NotesPage');

  return (
    <div className='flex flex-col items-center justify-center h-full text-center p-8'>
      <h1 className='text-3xl font-bold mb-4 font-lxgw'>{t('title')}</h1>
      <p className='text-gray-500 font-lxgw'>{t('placeholder')}</p>
    </div>
  );
}
