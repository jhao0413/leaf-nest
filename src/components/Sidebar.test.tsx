import { fireEvent, render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/Sidebar';
import { I18nProvider } from '@/i18n';
import { useSessionStore } from '@/lib/auth/sessionStore';
import { createAuthenticatedSession } from '@/test/createAuthSession';

const { mockPush, mockSignOut } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSignOut: vi.fn()
}));

vi.mock('@/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn()
  })
}));

vi.mock('@/lib/auth/AuthClientProvider', () => ({
  useAuthApiBaseUrl: () => 'http://localhost:8787',
  useAuthClient: () => ({
    signOut: mockSignOut
  })
}));

describe('Sidebar', () => {
  beforeEach(() => {
    window.localStorage.setItem('leaf-nest-locale', 'en');
    mockPush.mockReset();
    mockSignOut.mockReset();
    useSessionStore.setState({
      status: 'authenticated',
      session: createAuthenticatedSession(),
      errorMessage: null,
      refetchSession: undefined
    });
  });

  it('collapses and expands the desktop navigation', () => {
    render(
      <I18nProvider>
        <Sidebar />
      </I18nProvider>
    );

    expect(screen.getByRole('heading', { name: 'LeafNest' })).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByRole('heading', { name: 'LeafNest' })).not.toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));

    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
