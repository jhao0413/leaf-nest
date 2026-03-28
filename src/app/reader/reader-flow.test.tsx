import JSZip from 'jszip';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/i18n';
import ReaderPage from '@/app/reader/[id]/page';
import NotesPage from '@/app/notes/page';
import BookNotesPage from '@/app/notes/[bookId]/page';
import { useBookInfoStore } from '@/store/bookInfoStore';
import { useBookZipStore } from '@/store/bookZipStore';
import { useReaderStateStore } from '@/store/readerStateStore';
import { useChapterHighlightStore } from '@/store/highlightStore';
import { useSessionStore } from '@/lib/auth/sessionStore';

const {
  mockGetBook,
  mockGetBookBlob,
  mockListAllHighlights,
  mockListBookHighlights,
  mockRemoveHighlight,
  mockRouterPush,
  mockParams
} = vi.hoisted(() => ({
  mockGetBook: vi.fn(),
  mockGetBookBlob: vi.fn(),
  mockListAllHighlights: vi.fn(),
  mockListBookHighlights: vi.fn(),
  mockRemoveHighlight: vi.fn(),
  mockRouterPush: vi.fn(),
  mockParams: {
    id: 'book-1',
    bookId: 'book-1'
  }
}));

vi.mock('@/components/Renderer/DoubleColumnRenderer', () => ({
  default: () => <div data-testid="double-renderer">Double Renderer</div>
}));

vi.mock('@/components/Renderer/SingleColumnRenderer', () => ({
  default: () => <div data-testid="single-renderer">Single Renderer</div>
}));

vi.mock('@/components/AuthGate', async () => {
  const { useSessionStore } = await import('@/lib/auth/sessionStore');

  return {
    AuthGate: ({ children }: { children: React.ReactNode }) => {
      const status = useSessionStore((state) => state.status);
      return status === 'authenticated' ? <>{children}</> : <div>Auth Card</div>;
    }
  };
});

vi.mock('@/hooks/useBreakpoints', () => ({
  useBreakpoints: () => ({
    isMobile: false
  })
}));

vi.mock('@/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    back: vi.fn()
  }),
  useParams: () => mockParams
}));

vi.mock('@/utils/zipUtils', () => ({
  loadZip: vi.fn().mockResolvedValue(new JSZip())
}));

vi.mock('@/lib/repositories/booksRepository', () => ({
  booksRepository: {
    getBook: mockGetBook
  }
}));

vi.mock('@/lib/binary/remoteBookBinarySource', () => ({
  remoteBookBinarySource: {
    getBookBlob: mockGetBookBlob
  }
}));

vi.mock('@/lib/repositories/highlightsRepository', () => ({
  highlightsRepository: {
    listAll: mockListAllHighlights,
    listByBook: mockListBookHighlights,
    remove: mockRemoveHighlight
  }
}));

vi.mock('@/components/AppImage', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />
}));

describe('reader and notes flow', () => {
  beforeEach(() => {
    useBookInfoStore.setState({
      bookInfo: {
        name: '',
        creator: '',
        publisher: '',
        identifier: '',
        pubdate: '',
        coverBlob: new ArrayBuffer(0),
        coverPath: '',
        coverUrl: '',
        toc: [],
        blob: new ArrayBuffer(0),
        language: '',
        size: ''
      }
    });
    useBookZipStore.setState({ bookZip: new JSZip() });
    useReaderStateStore.setState({ currentChapter: 0, currentPageIndex: 1 });
    useChapterHighlightStore.setState({ chapterHighlights: [] });
    useSessionStore.setState({
      status: 'authenticated',
      session: {
        user: {
          id: 'user-1',
          email: 'reader@example.com',
          name: 'Reader'
        },
        session: {
          id: 'session-1',
          userId: 'user-1',
          expiresAt: new Date('2026-03-28T00:00:00.000Z').toISOString()
        }
      },
      errorMessage: null,
      refetchSession: undefined
    });

    mockGetBook.mockReset();
    mockGetBookBlob.mockReset();
    mockListAllHighlights.mockReset();
    mockListBookHighlights.mockReset();
    mockRemoveHighlight.mockReset();
    mockRouterPush.mockReset();

    mockParams.id = 'book-1';
    mockParams.bookId = 'book-1';
  });

  it('loads a book through the repository and remote binary source before rendering the reader', async () => {
    mockGetBook.mockResolvedValue({
      id: 'book-1',
      name: 'Remote Book',
      creator: 'Ada',
      publisher: 'Leaf',
      identifier: 'isbn-1',
      pubdate: '2026-03-28',
      coverPath: 'covers/book-1.jpg',
      coverUrl: 'https://example.com/cover.jpg',
      toc: [{ text: 'Chapter 1', path: 'OPS', file: 'chapter1.xhtml' }],
      language: 'zh',
      currentChapter: 1,
      currentPage: 3,
      percentage: 18,
      textAnchor: 'anchor'
    });
    mockGetBookBlob.mockResolvedValue(new Blob(['epub-binary']));

    render(<ReaderPage />);

    await waitFor(() => {
      expect(mockGetBook).toHaveBeenCalledWith('book-1');
    });
    await waitFor(() => {
      expect(mockGetBookBlob).toHaveBeenCalledWith('book-1');
    });
    expect(screen.getByTestId('double-renderer')).toBeInTheDocument();
  });

  it('blocks the reader page before authentication and skips data loading', async () => {
    useSessionStore.setState({
      status: 'anonymous',
      session: null,
      errorMessage: null,
      refetchSession: undefined
    });

    render(<ReaderPage />);

    await waitFor(() => {
      expect(screen.getByText('Auth Card')).toBeInTheDocument();
    });

    expect(mockGetBook).not.toHaveBeenCalled();
    expect(mockGetBookBlob).not.toHaveBeenCalled();
  });

  it('loads grouped note cards from the highlights repository', async () => {
    mockListAllHighlights.mockResolvedValue([
      {
        id: 'highlight-1',
        bookId: 'book-1',
        chapterIndex: 2,
        selectedText: 'Selected text',
        contextBefore: 'before',
        contextAfter: 'after',
        color: 'yellow',
        style: 'highlight',
        note: 'Interesting',
        createdAt: '2026-03-28T00:00:00.000Z',
        updatedAt: '2026-03-28T00:00:00.000Z',
        book: {
          id: 'book-1',
          name: 'Remote Book',
          coverUrl: 'https://example.com/cover.jpg',
          currentChapter: 2,
          currentPage: 5,
          percentage: 24
        }
      }
    ]);

    render(
      <I18nProvider>
        <NotesPage />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(mockListAllHighlights).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Remote Book')).toBeInTheDocument();
  });

  it('blocks the notes page before authentication and skips data loading', async () => {
    useSessionStore.setState({
      status: 'anonymous',
      session: null,
      errorMessage: null,
      refetchSession: undefined
    });

    render(
      <I18nProvider>
        <NotesPage />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Auth Card')).toBeInTheDocument();
    });

    expect(mockListAllHighlights).not.toHaveBeenCalled();
  });

  it('deletes a highlight from the book notes page through the repository', async () => {
    mockGetBook.mockResolvedValue({
      id: 'book-1',
      name: 'Remote Book',
      creator: 'Ada',
      publisher: 'Leaf',
      identifier: 'isbn-1',
      pubdate: '2026-03-28',
      coverPath: 'covers/book-1.jpg',
      coverUrl: 'https://example.com/cover.jpg',
      toc: [{ text: 'Chapter 1', path: 'OPS', file: 'chapter1.xhtml' }],
      language: 'zh',
      currentChapter: 1,
      currentPage: 3,
      percentage: 18
    });
    mockListBookHighlights.mockResolvedValue([
      {
        id: 'highlight-1',
        bookId: 'book-1',
        chapterIndex: 1,
        selectedText: 'Selected text',
        contextBefore: 'before',
        contextAfter: 'after',
        color: 'yellow',
        style: 'highlight',
        note: 'Interesting',
        createdAt: '2026-03-28T00:00:00.000Z'
      }
    ]);
    mockRemoveHighlight.mockResolvedValue(undefined);

    render(
      <I18nProvider>
        <BookNotesPage />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(mockListBookHighlights).toHaveBeenCalledWith('book-1');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockRemoveHighlight).toHaveBeenCalledWith('highlight-1');
    });
  });
});
