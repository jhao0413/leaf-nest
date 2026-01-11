# Leaf Nest

A modern, browser-based EPUB reader application with local storage support.

## Screenshots

![Screenshot](https://jhao413.oss-cn-beijing.aliyuncs.com/leaf-nest.png)

## Features

- 📚 **Browser-based Storage**: All books stored locally using SQLite WASM with OPFS
- 🌍 **Bilingual Support**: English and Chinese interface
- 📖 **Multiple Reading Modes**: Single column and double column layouts
- 🎨 **Customizable Reading Experience**: Font size, family, line height, and theme settings
- 🔍 **Full-text Search**: Search across all chapters in your books
- 📍 **Reading Progress**: Automatic tracking and restoration of reading position
- 📱 **Responsive Design**: Optimized for both desktop and mobile devices
- 🌙 **Dark/Light Theme**: Built-in theme switching

## Tech Stack

- **Framework**: Next.js 15.0.7 (React 19 RC)
- **Database**: SQLite WASM (OPFS) for client-side storage
- **State Management**: Zustand
- **Styling**: Tailwind CSS 4.x + HeroUI
- **Internationalization**: next-intl
- **Theme**: next-themes
- **Package Manager**: pnpm 9.0.0

## Getting Started

### Prerequisites

- Node.js 18+ 
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

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
pnpm build
pnpm start
```

### Code Quality

```bash
pnpm lint
```

## Project Structure

```
leaf-nest/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── reader/[id]/     # Reader page
│   │   └── layout.tsx       # Root layout
│   ├── components/          # React components
│   │   ├── Renderer/        # EPUB renderers (single/double column)
│   │   └── ui/              # UI components
│   ├── store/               # Zustand stores
│   ├── utils/               # Utility functions
│   │   ├── handleWorker.ts  # Web Worker for database operations
│   │   ├── chapterLoader.ts # Chapter content loading
│   │   └── readingProgressManager.ts
│   ├── hooks/               # Custom React hooks
│   ├── i18n/                # Internationalization config
│   └── messages/            # Translation files (en, zh)
├── public/                  # Static assets
└── next.config.mjs          # Next.js configuration
```

## Key Features Explained

### Database & Storage

The application uses SQLite WASM with Origin Private File System (OPFS) for persistent browser storage:

- **books**: Book metadata, file blobs, covers, table of contents, and reading progress
- **book_text_index**: Full-text search indexes

All database operations run in Web Workers to prevent blocking the main thread.

### EPUB Rendering

- Two rendering modes: SingleColumnRenderer (mobile) and DoubleColumnRenderer (desktop)
- Iframe-based rendering with image loading optimization
- Automatic pagination and page calculation

### Reading Progress

The ReadingProgressManager automatically saves:
- Current chapter index
- Current page number
- Text anchor for precise position restoration
- Reading percentage
- Last read timestamp

## License

MIT

## Author

Jhao <jhao413@qq.com>
