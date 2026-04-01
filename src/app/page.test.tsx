import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/i18n';
import HomePage from '@/app/page';
import { useBookInfoListStore } from '@/store/bookInfoStore';
import { useManageModeStore, useSelectedBookIdsStore } from '@/store/manageModeStore';
import { useSessionStore } from '@/lib/auth/sessionStore';
import { createAuthenticatedSession } from '@/test/createAuthSession';

const { mockListBooks } = vi.hoisted(() => ({
  mockListBooks: vi.fn()
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

  it('loads the empty library state when the session is authenticated', async () => {
    useSessionStore.setState({
      status: 'authenticated',
      session: createAuthenticatedSession(),
      errorMessage: null,
      refetchSession: undefined
    });

    render(
      <I18nProvider>
        <HomePage />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(mockListBooks).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('My Books')).toBeInTheDocument();
    expect(screen.getByText('No books yet, click Import to add')).toBeInTheDocument();
  });
});
