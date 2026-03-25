import { render, screen } from '@testing-library/react';
import { I18nProvider, useLocale, useTranslations } from '@/i18n';

function Probe() {
  const locale = useLocale();
  const tNotes = useTranslations('NotesPage');
  const tSearch = useTranslations('SearchModal');

  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="notes">{tNotes('noteCount', { count: 3 })}</span>
      <span data-testid="search">
        {tSearch('chapterFormat', { chapterNumber: 4, chapterTitle: 'Intro' })}
      </span>
    </div>
  );
}

describe('I18nProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses the saved locale and interpolates message variables', () => {
    window.localStorage.setItem('leaf-nest-locale', 'zh');

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    expect(screen.getByTestId('locale')).toHaveTextContent('zh');
    expect(screen.getByTestId('notes')).toHaveTextContent('3 条笔记');
    expect(screen.getByTestId('search')).toHaveTextContent('第 4 章: Intro');
  });

  it('falls back to english when there is no saved locale', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(screen.getByTestId('notes')).toHaveTextContent('3 notes');
  });
});
