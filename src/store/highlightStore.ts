import { create } from 'zustand';

export interface Highlight {
  id: string;
  bookId: string;
  chapterIndex: number;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  color: string;
  style: 'highlight' | 'underline' | 'note';
  note: string;
  createdAt: string;
}

interface ChapterHighlightStore {
  chapterHighlights: Highlight[];
  setChapterHighlights: (highlights: Highlight[]) => void;
  addChapterHighlight: (highlight: Highlight) => void;
  removeChapterHighlight: (id: string) => void;
  updateChapterHighlight: (id: string, patch: Partial<Pick<Highlight, 'color' | 'note' | 'style'>>) => void;
}

export const useChapterHighlightStore = create<ChapterHighlightStore>((set) => ({
  chapterHighlights: [],
  setChapterHighlights: (highlights) => set({ chapterHighlights: highlights }),
  addChapterHighlight: (highlight) =>
    set((state) => ({ chapterHighlights: [...state.chapterHighlights, highlight] })),
  removeChapterHighlight: (id) =>
    set((state) => ({
      chapterHighlights: state.chapterHighlights.filter((h) => h.id !== id)
    })),
  updateChapterHighlight: (id, patch) =>
    set((state) => ({
      chapterHighlights: state.chapterHighlights.map((h) => (h.id === id ? { ...h, ...patch } : h))
    }))
}));
