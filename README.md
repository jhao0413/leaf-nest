# Leaf Nest

> **Notice**: This app reads locally imported EPUB files only — no URLs, web links, online catalogs, or remote sources of any kind are supported or fetched. The author does not condone any use that violates the rights of authors, publishers, or other rights holders. Built for personal learning; not for commercial use or profit.

Leaf Nest is a browser-based EPUB reader and note-taking app, designed for private reading workflows with local-first storage.

English | [简体中文](README.zh-CN.md)

## Screenshots

![Screenshot](https://jhao413.oss-cn-beijing.aliyuncs.com/leaf-nest.png)

## Features

- 📚 **EPUB import + library management**: Import `.epub` files in the browser, show covers + metadata, and support batch delete with manage mode.
- 📖 **Two reading layouts**: Automatic mobile single-column mode and desktop double-column mode, switchable at runtime.
- 📑 **Chapter navigation + progress persistence**: Restore chapter/page and text anchor from the synced reading state.
- 🎨 **Reading customization**: Font size, font family, line-height/formatting, theme (light/dark), and layout mode controls.
- 🔍 **In-book full-text search**: Build per-book text index, cache it locally, and jump to match positions.
- 🖊️ **Notes & highlights**: Highlight or underline selected text and attach notes; edit note content and color; delete entries.
- 📚 **Reading Notes view**: Central notes list with per-book grouping and quick jump back to reader.
- 🌍 **Bilingual UI**: English / 简体中文 with persistence.
- 🎮 **Reader ergonomics**: Keyboard shortcuts for navigation (arrows/space) and search shortcut (`Ctrl/Cmd + K`).
- ☁️ **Service-backed architecture**: Hono API + PostgreSQL + S3-compatible object storage with web-first reading flows.
- 📱 **Responsive interface**: Sidebar reader pages and toolbar adapt to desktop/mobile usage.

## Tech Stack

- **Framework**: Vite+ + React Router + React 19
- **Backend**: Hono + Better Auth + Drizzle ORM
- **Database**: PostgreSQL
- **Object Storage**: S3-compatible storage / MinIO / RustFS
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

# Create local environment file
cp .env.example .env
```

### Development

```bash
pnpm dev
```

This starts:

- Web app on the local URL printed by `vp dev` (by default [http://localhost:5173](http://localhost:5173))
- Hono API on [http://localhost:8787](http://localhost:8787)

You can verify the backend bootstrap with [http://localhost:8787/api/health](http://localhost:8787/api/health)

### Self-hosted Deployment

Current production deployment is self-hosting with the provided Docker image and Compose stack. Static-only hosting such as Vercel is not supported for the current architecture because the app depends on the bundled Hono API, Better Auth callbacks, PostgreSQL, and S3-compatible object storage.

1. Copy `.env.example` to `.env`.
2. For local single-host deployment, the default Compose values are ready to use.
3. For a remote deployment, set the optional `SELF_HOST_*` variables in `.env` before starting the stack:
   - `SELF_HOST_APP_URL`
   - `SELF_HOST_BETTER_AUTH_URL`
   - `SELF_HOST_S3_PUBLIC_ENDPOINT`
   - `SELF_HOST_S3_ENDPOINT` only if the app should reach object storage through a non-default internal address
4. Start the backing services:

```bash
docker compose up -d postgres minio
```

5. Apply database migrations against the target PostgreSQL instance:

```bash
pnpm db:migrate
```

6. Start the application container:

```bash
docker compose up -d app
```

The container serves both the SPA and the API on the configured app origin. With the default local values, that is [http://localhost:8787](http://localhost:8787).

Default local service ports:

- PostgreSQL: `5432`
- App: `8787`
- MinIO API: `9000`
- MinIO Console: `9001`

### Database Workflow

```bash
pnpm db:generate
pnpm db:migrate
```

- `pnpm db:generate`: generate SQL migrations from the Drizzle schema in `server/src/db/schema`
- `pnpm db:migrate`: apply generated migrations to the configured PostgreSQL database

### Local Production Build

```bash
pnpm build
pnpm preview
```

### Environment Variables

The backend bootstrap currently expects these variables in `.env`:

- `APP_URL`
- `API_PORT`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `S3_ENDPOINT`
- `S3_PUBLIC_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE`

For Docker Compose deployments, the `app` container maps optional `SELF_HOST_*` variables to its runtime `APP_URL`, `BETTER_AUTH_URL`, and S3 endpoints. This keeps local development defaults intact while allowing remote self-host deployments to use a public app domain and a browser-reachable object-storage endpoint.

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
└── vite.config.ts           # Vite+ / Vite shared configuration
```

## Deployment Notes

- The bundled Node server already falls back to `dist/index.html` for SPA routes such as `/notes/123` and `/reader/abc`.
- Signed object URLs are generated from `S3_PUBLIC_ENDPOINT`, so that endpoint must be reachable from browsers.
- Remote object assets such as covers are expected to load cross-origin, so the frontend no longer enables cross-origin isolation headers by default.

## Implementation Notes

### Database & Storage

The app stores primary data on the backend:

- **PostgreSQL**: users, books, reading progress, highlights, and related metadata
- **S3-compatible object storage**: EPUB binaries and remote cover objects
- **Browser state**: reader UI state and in-memory search helpers for the active session

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
- Notes are synchronized through the backend APIs and shown in a dedicated notes center.
- Deleting a book also deletes its related highlights and index data.

### Full-text Search

- Reader can trigger full-book indexing (background) and query across all indexed chapters.
- Search results show surrounding context and jump directly to the matched chapter/page.

### Shortcuts

- Arrow keys and space bar for navigation in reader.
- `Ctrl/Cmd + K` opens search on supporting platforms.
