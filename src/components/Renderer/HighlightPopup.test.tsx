import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@/i18n';
import { CreateHighlightPopup, EditHighlightPopup } from './HighlightPopup';
import type { Highlight } from '@/store/highlightStore';

describe('HighlightPopup', () => {
  it('shares the current text selection from the create popup', () => {
    const onShare = vi.fn();

    render(
      <I18nProvider>
        <CreateHighlightPopup
          position={{ x: 120, y: 120 }}
          onCreateHighlight={vi.fn()}
          onShare={onShare}
          onClose={vi.fn()}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('shares an existing highlight from the edit popup', () => {
    const onShare = vi.fn();
    const highlight: Highlight = {
      id: 'highlight-1',
      bookId: 'book-1',
      chapterIndex: 1,
      selectedText: 'Selected text',
      contextBefore: 'before',
      contextAfter: 'after',
      color: 'yellow',
      style: 'underline',
      note: 'Interesting',
      createdAt: '2026-03-28T00:00:00.000Z'
    };

    render(
      <I18nProvider>
        <EditHighlightPopup
          position={{ x: 120, y: 120 }}
          highlight={highlight}
          onUpdateNote={vi.fn()}
          onUpdateColor={vi.fn()}
          onDelete={vi.fn()}
          onShare={onShare}
          onClose={vi.fn()}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    expect(onShare).toHaveBeenCalledTimes(1);
  });
});
