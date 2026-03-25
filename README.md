# Leaf Nest

Leaf Nest is a browser-based EPUB reader and note-taking app, designed for private reading workflows with local-first storage.

English | [简体中文](README.zh-CN.md)

## Screenshots

![Screenshot](https://jhao413.oss-cn-beijing.aliyuncs.com/leaf-nest.png)

## Features

- 📚 **EPUB import + library management**: Import `.epub` files in the browser, show covers + metadata, and support batch delete with manage mode.
- 📖 **Two reading layouts**: Automatic mobile single-column mode and desktop double-column mode, switchable at runtime.
- 📑 **Chapter navigation + progress persistence**: Restore exact chapter/page and text anchor from SQLite-stored state.
- 🎨 **Reading customization**: Font size, font family, line-height/formatting, theme (light/dark), and layout mode controls.
- 🔍 **In-book full-text search**: Build per-book text index, cache it locally, and jump to match positions.
- 🖊️ **Notes & highlights**: Highlight or underline selected text and attach notes; edit note content and color; delete entries.
- 📚 **Reading Notes view**: Central notes list with per-book grouping and quick jump back to reader.
- 🌍 **Bilingual UI**: English / 简体中文 with persistence.
- 🎮 **Reader ergonomics**: Keyboard shortcuts for navigation (arrows/space) and search shortcut (`Ctrl/Cmd + K`).
- 🧵 **Performance-first architecture**: SQLite WASM + OPFS + Web Worker to avoid main-thread blocking.
- 📱 **Responsive interface**: Sidebar reader pages and toolbar adapt to desktop/mobile usage.

## Tech Stack

- **Framework**: Vite+ + React Router + React 19
- **Database**: SQLite WASM (OPFS) for client-side storage
- **State Management**: Zustand
- **Styling**: Tailwind CSS 4.x + HeroUI
- **Code Quality**: Oxlint + Oxfmt via Vite+
- **Internationalization**: Client-side i18n provider
- **Theme**: Custom client-side theme provider
- **Package Manager**: pnpm 9.0.0
- **Core Libraries**: JSZip, lucide-react, framer-motion/motion, lodash, uuid

## Getting Started

### Prerequisites

- Node.js 22.12+
- pnpm 9.0.0

### Installation

```bash
# Clone the repository
git clone git@github.com:jhao0413/leaf-nest.git
cd leaf-nest

# Install dependencies
pnpm install
```

### Development

```bash
pnpm dev
```

Open the local URL printed by `vp dev` (by default [http://localhost:5173](http://localhost:5173)) in your browser.

### Build for Production

```bash
pnpm build
pnpm preview
```

### Code Quality

```bash
pnpm lint
pnpm fmt
pnpm check
pnpm test
```

## Project Structure

```
leaf-nest/
├── src/
│   ├── main.tsx             # Vite+ entrypoint
│   ├── App.tsx              # BrowserRouter + route shell
│   ├── app/                 # Route components consumed by React Router
│   │   ├── reader/[id]/     # Reader page
│   │   ├── notes/           # Notes list and per-book notes pages
│   │   └── settings/        # Language and global settings
│   ├── components/          # React components
│   │   ├── Renderer/        # EPUB renderers (single/double column)
│   │   │   ├── SearchModal.tsx       # Full-book search modal
│   │   │   ├── Toolbar/              # Reader toolbar controls
│   │   │   └── HighlightPopup.tsx     # Highlight create/edit overlays
│   │   └── ui/              # UI components
│   ├── hooks/               # Custom React hooks
│   ├── i18n/                # Client-side i18n provider + locale config
│   ├── store/               # Zustand stores
│   ├── utils/               # Utility functions
│   │   ├── handleWorker.ts  # Web Worker for SQLite operations
│   │   ├── chapterLoader.ts # Chapter content loading
│   │   ├── fullBookTextIndexer.ts # Full-book full-text indexer
│   │   ├── readingProgressManager.ts # Debounced progress persistence
│   │   └── highlightRenderer.ts       # Render highlights into reader iframe
│   └── messages/            # Translation files (en, zh)
├── public/                  # Static assets
├── public/_headers          # Cross-origin isolation headers for static hosts that support it
└── vite.config.ts           # Vite+ / Vite shared configuration
```

## Deployment Notes

- Production hosting must rewrite application routes such as `/notes/123` and `/reader/abc` back to `index.html`.
- The app requires `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`, and `Cross-Origin-Resource-Policy` for the SQLite WASM/OPFS workflow.
- `vite.config.ts` applies these headers in dev and preview.
- `public/_headers` is included for static hosts that support header files. If your host does not, configure equivalent response headers at the platform layer.

## Implementation Notes

### Database & Storage

The app runs SQLite WASM against Origin Private File System (OPFS) so books, progress, highlights, and search indexes remain in-browser:

- **books**: Book metadata, file blobs, covers, table of contents, and reading progress
- **book_text_index**: Full-text search cache (chapter-level text index)
- **highlights**: Color/position/notes for selected text

Database reads/writes are processed in a dedicated Web Worker.

### EPUB Rendering

- SingleColumnRenderer and DoubleColumnRenderer are both iframe-based and support responsive behavior.
- Double-column mode pre-renders page width/position data for horizontal page navigation.
- A lightweight chapter-to-chapter render pipeline handles parsing, font/theme application, and image-ready pagination.
- Menu + TOC panel supports quick chapter jump.

### Reading Progress

The ReadingProgressManager automatically saves:

- Current chapter index
- Current page number
- Text anchor for precise position restoration
- Reading percentage
- Last read timestamp

### Notes

- Highlights can be created with color and style variants and can be edited/deleted.
- Notes are synchronized per chapter in the same local DB and shown in a dedicated notes center.
- Deleting a book also deletes its related highlights and index data.

### Full-text Search

- Reader can trigger full-book indexing (background) and query across all indexed chapters.
- Search results show surrounding context and jump directly to the matched chapter/page.

### Shortcuts

- Arrow keys and space bar for navigation in reader.
- `Ctrl/Cmd + K` opens search on supporting platforms.
