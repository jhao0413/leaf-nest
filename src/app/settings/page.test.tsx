import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@/i18n';
import SettingsPage from '@/app/settings/page';

describe('SettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows an about section with a link to the project GitHub repository', () => {
    window.localStorage.setItem('leaf-nest-locale', 'zh');

    render(
      <I18nProvider>
        <SettingsPage />
      </I18nProvider>
    );

    expect(screen.getByRole('heading', { name: '关于' })).toBeInTheDocument();

    const githubLink = screen.getByRole('link', { name: 'GitHub' });

    expect(githubLink).toHaveAttribute('href', 'https://github.com/jhao0413/leaf-nest');
    expect(githubLink).toHaveAttribute('target', '_blank');
  });
});
