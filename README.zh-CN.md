# Leaf Nest

Leaf Nest 是一款浏览器端 EPUB 阅读器与读书笔记应用，采用本地优先存储策略，面向隐私阅读场景。

[English](README.md) | 简体中文

## 截图

![Screenshot](https://jhao413.oss-cn-beijing.aliyuncs.com/leaf-nest.png)

## 功能特性

- 📚 **EPUB 导入与书库管理**：在页面导入 `.epub`，显示封面与元信息，支持多选批量删除。
- 📖 **双模式阅读**：移动端自动单栏，桌面支持单栏/双栏阅读模式切换。
- 📑 **章节跳转 + 进度恢复**：基于数据库记录章节、页码、文本锚点，打开书籍可自动恢复上次阅读位置。
- 🎨 **阅读体验可调**：字体大小、字体族、布局、亮色/暗色主题、单/双栏模式均可设置。
- 🔍 **整书全文检索**：为单本书构建文本索引并本地缓存，支持上下文命中跳转。
- 🖊️ **高亮与笔记**：支持高亮/下划线，记录颜色、样式与批注，支持编辑和删除。
- 🧷 **阅读笔记中心**：按书籍分组展示全部标注，快速跳回原文位置。
- 🌍 **中英文界面**：支持英文与简体中文切换，配置持久化。
- 🎮 **键盘操作**：支持方向键/空格翻页，`Ctrl/Cmd + K` 打开搜索。
- 🧵 **性能导向架构**：基于 SQLite WASM + OPFS + Web Worker，避免阻塞主线程。
- 📱 **响应式布局**：书库、阅读页、设置页、笔记页均支持桌面/移动端。

## 技术栈

- **框架**：Vite+ + React Router + React 19
- **数据库**：SQLite WASM（OPFS）本地存储
- **状态管理**：Zustand
- **样式**：Tailwind CSS 4.x + HeroUI
- **代码质量**：通过 Vite+ 使用 Oxlint + Oxfmt
- **国际化**：客户端 i18n Provider
- **主题**：自定义客户端主题 Provider
- **包管理器**：pnpm 9.0.0
- **核心库**：JSZip、lucide-react、framer-motion/motion、lodash、uuid

## 快速开始

### 环境要求

- Node.js 22.12+
- pnpm 9.0.0

### 安装

```bash
# 克隆仓库
git clone git@github.com:jhao0413/leaf-nest.git
cd leaf-nest

# 安装依赖
pnpm install
```

### 开发

```bash
pnpm dev
```

在浏览器打开 `vp dev` 输出的本地地址，默认是 [http://localhost:5173](http://localhost:5173)

### 构建并运行

```bash
pnpm build
pnpm preview
```

### 代码检查

```bash
pnpm lint
pnpm fmt
pnpm check
pnpm test
```

## 项目结构

```text
leaf-nest/
├── src/
│   ├── main.tsx             # Vite+ 入口
│   ├── App.tsx              # BrowserRouter 与路由壳层
│   ├── app/                 # 由 React Router 消费的页面组件
│   │   ├── reader/[id]/     # 阅读页
│   │   ├── notes/           # 全局笔记列表与按书籍笔记页
│   │   └── settings/        # 设置页（语言）
│   ├── components/          # React 组件
│   │   ├── Renderer/        # EPUB 渲染器（单栏/双栏）
│   │   │   ├── SearchModal.tsx        # 全书搜索弹窗
│   │   │   ├── Toolbar/               # 阅读器工具栏
│   │   │   └── HighlightPopup.tsx      # 标注创建/编辑弹窗
│   │   └── ui/              # 通用 UI 组件
│   ├── hooks/               # 自定义 Hooks
│   ├── i18n/                # 客户端国际化 Provider 与语言配置
│   ├── store/               # Zustand 状态仓库
│   ├── utils/               # 工具函数
│   │   ├── handleWorker.ts  # SQLite/Web Worker 操作层
│   │   ├── chapterLoader.ts # 章节加载
│   │   ├── fullBookTextIndexer.ts # 全书全文索引
│   │   ├── readingProgressManager.ts # 进度持久化
│   │   └── highlightRenderer.ts # 标注渲染到 iframe
│   └── messages/            # 翻译文件（en, zh）
├── public/                  # 静态资源
├── public/_headers          # 支持该格式的静态平台可直接应用隔离头
└── vite.config.ts           # Vite+ / Vite 共用配置
```

## 部署说明

- 生产环境需要把 `/notes/123`、`/reader/abc` 这类前端路由重写回 `index.html`，否则直接刷新会返回 404。
- 为了让 SQLite WASM + OPFS 正常工作，应用需要提供 `Cross-Origin-Opener-Policy`、`Cross-Origin-Embedder-Policy` 和 `Cross-Origin-Resource-Policy`。
- `vite.config.ts` 已在开发与预览模式下注入这些响应头。
- 仓库附带了 `public/_headers` 供支持该格式的静态托管平台直接使用；如果你的平台不支持，需要在平台层配置等价响应头。

## 功能说明

### 本地数据库与存储

项目使用 SQLite WASM + OPFS（浏览器私有文件系统）保存：

- `books`：书籍元数据、封面、章节目录、进度、最后阅读时间
- `book_text_index`：整书检索索引
- `highlights`：文本高亮、下划线与批注内容

数据库读写在独立 Web Worker 中执行，降低主线程压力。

### EPUB 渲染

- SingleColumnRenderer / DoubleColumnRenderer 基于 iframe 渲染；
- 双栏模式支持水平分页，并使用页面宽度映射实现跳转；
- 章节加载流程包含文本解析、样式注入、图片加载后分页与尺寸修正；
- 书签菜单可以快速按目录跳转。

### 阅读进度与状态

系统会自动记录并恢复：

- 当前章节
- 当前页码（双栏）
- 文本锚点（更高精度恢复）
- 阅读百分比
- 最后阅读时间

### 笔记与高亮

- 支持高亮/下划线和批注；
- 支持按章节加载当前书籍标注；
- 支持修改颜色、编辑文字、删除标注；
- 笔记中心按书籍聚合展示，可从书名直接进入详情。
