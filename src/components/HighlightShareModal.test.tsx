import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/i18n';
import { HighlightShareModal } from './HighlightShareModal';

function createCanvasContextMock() {
  return {
    scale: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(),
    roundRect: vi.fn(),
    stroke: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    fillText: vi.fn(),
    save: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    restore: vi.fn(),
    set fillStyle(_value: string | CanvasGradient | CanvasPattern) {},
    set strokeStyle(_value: string | CanvasGradient | CanvasPattern) {},
    set lineWidth(_value: number) {},
    set shadowColor(_value: string) {},
    set shadowBlur(_value: number) {},
    set shadowOffsetY(_value: number) {},
    set font(_value: string) {},
    set textAlign(_value: CanvasTextAlign) {}
  };
}

describe('HighlightShareModal', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      createCanvasContextMock() as unknown as CanvasRenderingContext2D
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['image'], { type: 'image/png' }));
    });

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:share-preview')
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to copying text when image clipboard copy fails', async () => {
    const clipboardWrite = vi.fn().mockRejectedValue(new Error('image-copy-failed'));
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);

    const ClipboardItemMock = vi.fn(function ClipboardItem(items: Record<string, Blob>) {
      return items;
    });

    Object.defineProperty(window, 'ClipboardItem', {
      configurable: true,
      value: ClipboardItemMock
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        write: clipboardWrite,
        writeText: clipboardWriteText
      }
    });

    render(
      <I18nProvider>
        <HighlightShareModal
          item={{
            selectedText: 'Selected text',
            note: 'Interesting',
            chapterIndex: 1,
            createdAt: '2026-03-28T00:00:00.000Z'
          }}
          bookName="Remote Book"
          onClose={vi.fn()}
        />
      </I18nProvider>
    );

    await screen.findByAltText('Note Card');
    fireEvent.click(screen.getByRole('button', { name: 'Copy card' }));

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('Selected text'));
    });
    expect(clipboardWrite).toHaveBeenCalledTimes(1);
  });
});
