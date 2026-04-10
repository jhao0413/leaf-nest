import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/i18n';
import HomePage from '@/app/page';
import { useBookInfoListStore } from '@/store/bookInfoStore';
import { useManageModeStore, useSelectedBookIdsStore } from '@/store/manageModeStore';
import { useSessionStore } from '@/lib/auth/sessionStore';
import { createAuthenticatedSession } from '@/test/createAuthSession';

const { mockListBooks, mockUploadBook, mockDeleteBook } = vi.hoisted(() => ({
  mockListBooks: vi.fn(),
  mockUploadBook: vi.fn(),
  mockDeleteBook: vi.fn()
}));

vi.mock('@/components/AuthGate', () => ({
  AuthGate: ({ children }: { children: React.ReactNode }) => <>{children}</>
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
    listBooks: mockListBooks,
    uploadBook: mockUploadBook,
    deleteBook: mockDeleteBook
  }
}));

vi.mock('@/utils/epubStructureParser', () => ({
  default: vi.fn().mockResolvedValue({
    name: 'Uploaded Book',
    creator: 'Uploader',
    publisher: 'Leaf Nest',
    identifier: 'upload-1',
    pubdate: '2026-03-28',
    coverPath: 'cover.jpg',
    coverBlob: new TextEncoder().encode('cover').buffer,
    toc: [],
    language: 'zh'
  })
}));

describe('HomePage library flow', () => {
  beforeEach(() => {
    useBookInfoListStore.setState({ bookInfoList: [] });
    useManageModeStore.setState({ manageMode: false });
    useSelectedBookIdsStore.setState({ selectedBookIds: [] });
    useSessionStore.setState({
      status: 'authenticated',
      session: createAuthenticatedSession(),
      errorMessage: null,
      refetchSession: undefined
    });

    mockListBooks.mockReset();
    mockUploadBook.mockReset();
    mockDeleteBook.mockReset();
  });

  it('renders the remote bookshelf items loaded from the repository', async () => {
    mockListBooks.mockResolvedValue([
      {
        id: 'book-1',
        name: 'Remote Book',
        creator: 'Ada',
        publisher: 'Leaf',
        identifier: 'isbn-1',
        pubdate: '',
        coverPath: 'covers/book-1.jpg',
        coverUrl: 'https://example.com/cover.jpg',
        toc: [],
        language: 'zh',
        percentage: 12,
        currentChapter: 1,
        currentPage: 2
      }
    ]);

    render(
      <I18nProvider>
        <HomePage />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(mockListBooks).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Remote Book')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Remote Book' })).toHaveClass('cursor-pointer');
  });

  it('deletes selected books through the repository', async () => {
    mockListBooks.mockResolvedValue([
      {
        id: 'book-1',
        name: 'Remote Book',
        creator: 'Ada',
        publisher: 'Leaf',
        identifier: 'isbn-1',
        pubdate: '',
        coverPath: 'covers/book-1.jpg',
        coverUrl: 'https://example.com/cover.jpg',
        toc: [],
        language: 'zh',
        percentage: 12,
        currentChapter: 1,
        currentPage: 2
      }
    ]);

    render(
      <I18nProvider>
        <HomePage />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(mockListBooks).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /manage/i }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockDeleteBook).toHaveBeenCalledWith('book-1');
    });
  });

  it('uploads a selected epub file through the repository', async () => {
    mockListBooks.mockResolvedValue([]);
    mockUploadBook.mockResolvedValue({
      id: 'book-2',
      name: 'Uploaded Book',
      creator: 'Uploader',
      publisher: 'Leaf Nest',
      identifier: 'upload-1',
      pubdate: '2026-03-28',
      coverPath: 'cover.jpg',
      coverUrl: 'https://example.com/uploaded-cover.jpg',
      toc: [],
      language: 'zh'
    });

    render(
      <I18nProvider>
        <HomePage />
      </I18nProvider>
    );

    const input = screen.getByLabelText('Upload EPUB') as HTMLInputElement;
    const file = new File(['epub-content'], 'uploaded.epub', { type: 'application/epub+zip' });

    fireEvent.change(input, {
      target: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(mockUploadBook).toHaveBeenCalledTimes(1);
    });
    expect(mockUploadBook).toHaveBeenCalledWith(
      expect.objectContaining({
        file
      })
    );
  });
});
