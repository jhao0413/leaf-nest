import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/i18n';
import HomePage from '@/app/page';
import { useBookInfoListStore } from '@/store/bookInfoStore';
import { useManageModeStore, useSelectedBookIdsStore } from '@/store/manageModeStore';
import { useSessionStore } from '@/lib/auth/sessionStore';

const { mockListBooks } = vi.hoisted(() => ({
  mockListBooks: vi.fn()
}));

vi.mock('@/components/AuthGate', () => ({
  AuthGate: () => <div>Auth Card</div>
}));

vi.mock('@/components/BookInfoModal', () => ({
  BookInfoModal: () => null
}));

vi.mock('@/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  })
}));

vi.mock('@/lib/repositories/booksRepository', () => ({
  booksRepository: {
    listBooks: mockListBooks
  }
}));

describe('HomePage', () => {
  beforeEach(() => {
    useBookInfoListStore.setState({ bookInfoList: [] });
    useManageModeStore.setState({ manageMode: false });
    useSelectedBookIdsStore.setState({ selectedBookIds: [] });
    useSessionStore.setState({
      status: 'anonymous',
      session: null,
      errorMessage: null,
      refetchSession: undefined
    });
    mockListBooks.mockReset();
    mockListBooks.mockResolvedValue([]);
  });

  it('shows the auth shell when the auth gate blocks access', async () => {
    render(
      <I18nProvider>
        <HomePage />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Auth Card')).toBeInTheDocument();
    });
    expect(screen.queryByText('我的书架')).not.toBeInTheDocument();
    expect(mockListBooks).not.toHaveBeenCalled();
  });
});
