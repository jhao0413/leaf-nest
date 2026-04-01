import React, { useEffect, useState } from 'react';
import { Button, InputGroup, InputGroupInput, InputGroupPrefix, Modal } from '@heroui/react';
import { Search, BookOpen, Loader2 } from 'lucide-react';
import { useTranslations } from '@/i18n';
import { useFullBookSearchStore } from '@/store/fullBookSearchStore';
import { SearchResult } from '@/utils/fullBookTextIndexer';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchResultClick: (result: SearchResult, query: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSearchResultClick
}) => {
  const t = useTranslations('SearchModal');
  const [searchText, setSearchText] = useState('');
  const {
    searchResults,
    isIndexing,
    searchText: searchFullBook,
    currentSearchQuery,
    clearSearch
  } = useFullBookSearchStore();

  const handleSearch = () => {
    if (!searchText.trim()) return;
    searchFullBook(searchText.trim());
  };

  const handleClose = () => {
    setSearchText('');
    clearSearch();
    onClose();
  };

  const handleSearchResultClick = (result: SearchResult) => {
    onSearchResultClick(result, currentSearchQuery);
    setTimeout(() => {
      handleClose();
    }, 500);
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchText('');
      clearSearch();
      return;
    }

    const focusInput = window.setTimeout(() => {
      const input = document.getElementById('search-modal-input') as HTMLInputElement | null;
      input?.focus();
    }, 0);

    return () => window.clearTimeout(focusInput);
  }, [clearSearch, isOpen]);

  const renderSearchResult = (result: SearchResult, index: number) => (
    <button
      key={index}
      type="button"
      onClick={() => handleSearchResultClick(result)}
      className="mb-2 w-full rounded-2xl border border-slate-200 bg-white/80 p-3 text-left transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <div className="mb-2 flex items-center gap-2">
        <BookOpen size={14} />
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {t('chapterFormat', {
            chapterNumber: result.chapterIndex + 1,
            chapterTitle: result.chapterTitle
          })}
        </span>
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-300">
        <span>{result.contextBefore}</span>
        <span className="rounded-sm bg-yellow-200 px-1 dark:bg-yellow-700">{result.matchText}</span>
        <span>{result.contextAfter}</span>
      </div>
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <Modal.Backdrop variant="blur">
        <Modal.Container size="lg" scroll="inside" placement="center">
          <Modal.Dialog className="border border-white/50 bg-white/95 shadow-2xl dark:border-white/10 dark:bg-neutral-900/95">
            <Modal.CloseTrigger />
            <Modal.Header className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Search size={20} className="text-slate-700 dark:text-slate-200" />
                <Modal.Heading>{t('title')}</Modal.Heading>
              </div>
            </Modal.Header>
            <Modal.Body className="pb-6 text-foreground">
              <div className="mb-4 flex gap-2 p-4">
                <InputGroup className="flex-1 [--focus:#111827] [--color-focus:#111827] [--color-field-focus:#ffffff] [--color-field-border:#e5e7eb] [--color-field-border-hover:#d1d5db] [--color-field-border-focus:#111827] dark:[--focus:#ffffff] dark:[--color-focus:#ffffff] dark:[--color-field-focus:#171717] dark:[--color-field-border:#3f3f46] dark:[--color-field-border-hover:#52525b] dark:[--color-field-border-focus:#ffffff]">
                  <InputGroupPrefix>
                    <Search size={16} className="text-gray-400" />
                  </InputGroupPrefix>
                  <InputGroupInput
                    id="search-modal-input"
                    placeholder={t('placeholder')}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch();
                    }}
                    disabled={isIndexing}
                  />
                </InputGroup>
                <Button
                  variant="primary"
                  onPress={handleSearch}
                  isDisabled={isIndexing || !searchText.trim()}
                  className="min-w-20 [--accent:#111827] [--accent-foreground:#ffffff] [--focus:#111827] [--color-accent:#111827] [--color-accent-hover:#000000] [--color-accent-foreground:#ffffff] [--color-focus:#111827] dark:[--accent:#ffffff] dark:[--accent-foreground:#171717] dark:[--focus:#ffffff] dark:[--color-accent:#ffffff] dark:[--color-accent-hover:#f5f5f5] dark:[--color-accent-foreground:#171717] dark:[--color-focus:#ffffff]"
                >
                  {isIndexing ? <Loader2 size={16} className="animate-spin" /> : t('searchButton')}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {t('resultsFound', { count: searchResults.length })}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      &ldquo;{currentSearchQuery}&rdquo;
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((result, index) => renderSearchResult(result, index))}
                  </div>
                </div>
              )}

              {currentSearchQuery && searchResults.length === 0 && !isIndexing && (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  <Search size={32} className="mx-auto mb-3 opacity-50" />
                  <div>{t('noResultsFound', { query: currentSearchQuery })}</div>
                  <div className="mt-1 text-sm opacity-75">{t('tryOtherKeywords')}</div>
                </div>
              )}

              {!currentSearchQuery && !isIndexing && (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  <Search size={32} className="mx-auto mb-3 opacity-50" />
                  <div className="text-sm">{t('searchInBook')}</div>
                </div>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
