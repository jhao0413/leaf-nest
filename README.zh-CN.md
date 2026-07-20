# Leaf Nest

> **说明**：本应用仅读取本地导入的 EPUB 文件，不支持任何形式的 URL、在线书源或远程内容导入。它明确反对任何侵害作者、出版方及其他版权方合法权益的使用行为。本项目以学习为目的，不以此牟利，亦不用于任何商业场景。

Leaf Nest 是一款浏览器端 EPUB 阅读器与读书笔记应用，采用本地优先存储策略，面向隐私阅读场景。

[English](README.md) | 简体中文

## 截图

![Screenshot](https://jhao413.oss-cn-beijing.aliyuncs.com/leaf-nest.png)

## 功能特性

- 🔐 **用户认证**：基于 better-auth 的邮箱/密码注册与登录，Cookie 会话管理。
- 📚 **EPUB 导入与书库管理**：在页面导入 `.epub`，显示封面与元信息，支持多选批量删除。
- 📖 **双模式阅读**：移动端自动单栏，桌面支持单栏/双栏阅读模式切换。
- 📑 **章节跳转 + 进度恢复**：基于后端同步的阅读状态记录章节、页码、文本锚点，打开书籍可自动恢复上次阅读位置。
- 🎨 **阅读体验可调**：字体大小、字体族、布局、亮色/暗色主题、单/双栏模式均可设置。
- 🔍 **整书全文检索**：为单本书构建文本索引并本地缓存，支持上下文命中跳转。
- 🖊️ **高亮与笔记**：支持高亮/下划线，记录颜色、样式与批注，支持编辑和删除。
- 🧷 **阅读笔记中心**：按书籍分组展示全部标注，快速跳回原文位置。
- 🌍 **中英文界面**：支持英文与简体中文切换，配置持久化。
- 🎮 **键盘操作**：支持方向键/空格翻页，`Ctrl/Cmd + K` 打开搜索。
- ☁️ **服务端架构**：基于 Hono API + PostgreSQL + S3 兼容对象存储，面向在线书库与阅读流程。
- 📱 **响应式布局**：书库、阅读页、设置页、笔记页均支持桌面/移动端。

## 技术栈

- **框架**：Vite+ + React Router v7 + React 19
- **后端**：Hono + better-auth + Drizzle ORM
- **数据库**：PostgreSQL
- **对象存储**：S3 兼容存储 / RustFS
- **客户端壳层**：Tauri v2，用于 Android 与桌面打包
- **状态管理**：Zustand v5
- **样式**：Tailwind CSS 4.x + HeroUI + Radix UI
- **校验**：Zod
- **代码质量**：通过 Vite+ 使用 Oxlint + Oxfmt
- **国际化**：客户端 i18n Provider
- **主题**：自定义客户端主题 Provider
- **包管理器**：pnpm 10.34.3
- **核心库**：JSZip、lucide-react、framer-motion/motion、dayjs

## 快速开始

### 环境要求

- Node.js 22.12+
- pnpm 10.34.3
- Docker Desktop，或其他支持 Compose 的 Docker Engine

### 安装

```bash
# 克隆仓库
git clone git@github.com:jhao0413/leaf-nest.git
cd leaf-nest

# 安装依赖
pnpm install
```

### 开发

首次开发先执行一次初始化。它会创建 `.env` 和随机认证密钥，启动 PostgreSQL 与 RustFS，创建对象存储 bucket，并执行数据库迁移：

```bash
pnpm dev:setup
```

然后启动前端和 API：

```bash
pnpm dev
```

首次初始化完成后，日常开发只需一条命令。它会确保 PostgreSQL、RustFS 和 bucket 已启动，再以前后端热更新模式启动应用：

```bash
pnpm start
```

这会同时启动：

- Web 前端，默认是 `vp dev` 输出的 [http://localhost:5173](http://localhost:5173)
- Hono API，默认是 [http://localhost:8787](http://localhost:8787)

可以通过 [http://localhost:8787/api/health](http://localhost:8787/api/health) 检查后端基础运行状态

后续开发时 Docker Desktop 通常会自动恢复基础设施。`pnpm start` 会主动确保基础设施已启动，但不会重复初始化 `.env` 或执行数据库迁移；运行 `pnpm stop` 可以停止 PostgreSQL 和 RustFS，同时保留数据。

开发命令说明：

- `pnpm dev:setup`：可重复执行的首次初始化；保留已有 `.env` 密钥和已有数据。
- `pnpm start`：日常开发入口，启动开发基础设施，以及支持热更新的前端和后端。
- `pnpm dev:infra`：启动 PostgreSQL、RustFS 和 bucket 初始化任务。
- `pnpm dev:infra:stop`：停止 PostgreSQL 和 RustFS，但不删除数据卷。
- `pnpm db:migrate`：手动执行尚未应用的数据库迁移。
- `pnpm dev`：以 watch 模式启动 Vite 前端和 Hono API。

本地开发端口：

- 前端：`5173`
- API：`8787`
- PostgreSQL：`5432`
- RustFS S3 API：`9000`
- RustFS Console：`9001`

如果初始化提示 Docker 不可用，请先启动 Docker Desktop，再重新执行 `pnpm dev:setup`。如果提示端口被占用，需要先停止占用对应端口的本地服务。

### Self-host 部署

当前生产部署方式以自部署为准，使用已发布的 Docker 镜像和 Compose 编排。像 Vercel 这类纯静态托管不适用于现有架构，因为应用现在依赖内置的 Hono API、Better Auth 回调、PostgreSQL 和 S3 兼容对象存储。

1. 需要覆盖 Compose 本地默认值时，复制 `.env.example` 为 `.env`。
2. 在 `.env` 中设置公开部署地址和存储凭据：
   - `SELF_HOST_APP_URL`
   - `SELF_HOST_BETTER_AUTH_URL`
   - `SELF_HOST_S3_PUBLIC_ENDPOINT`
   - `SELF_HOST_S3_ENDPOINT` 仅在应用需要通过非默认内部地址访问对象存储时才需要设置
   - `RUSTFS_ACCESS_KEY`
   - `RUSTFS_SECRET_KEY`
3. 通过 `LEAF_NEST_TAG` 选择应用镜像版本，例如 `v0.3.1`。
4. 一条命令启动完整栈：

```bash
pnpm deploy:start
```

该命令会通过 Compose 拉取 `jhao0413/leaf-nest:${LEAF_NEST_TAG:-latest}` 及其依赖镜像，执行数据库迁移，按需创建 RustFS bucket，然后启动应用。无需自行查找或填写镜像名。应用容器会在配置的应用地址同时提供前端 SPA 和 API。

常用服务管理命令：

- `pnpm deploy:start`：拉取所选版本的镜像并在后台启动完整栈。
- `pnpm deploy:status`：查看容器状态。
- `pnpm deploy:logs`：持续查看应用日志。
- `pnpm deploy:stop`：停止并移除容器，保留数据卷。

单实例 Docker 部署可以不设置 `BETTER_AUTH_SECRET`。应用首次启动时会生成密码学安全的随机密钥，并保存到持久化的 `app-data` 卷；重建容器后会继续使用同一密钥。多实例部署或使用外部密钥管理时应显式设置 `BETTER_AUTH_SECRET`。删除 `app-data` 会生成新密钥，并使已有登录会话失效。

默认公开端口：

- App：`8787`
- RustFS S3 API：`9000`
- RustFS Console：`9001`

PostgreSQL 默认只在 Docker 内部网络中使用。如果需要发布自己的应用镜像，推送 `v0.3.1` 这类 Git tag 即可触发 GitHub Actions；workflow 会使用仓库 secrets `DOCKERHUB_USERNAME` 和 `DOCKERHUB_TOKEN` 发布 `jhao0413/leaf-nest:<tag>` 与 `jhao0413/leaf-nest:latest`。

### 数据库工作流

```bash
pnpm db:generate
pnpm db:migrate
```

- `pnpm db:generate`：根据 `server/src/db/schema` 中的 Drizzle schema 生成 SQL migration
- `pnpm db:migrate`：把已生成的 migration 应用到当前配置的 PostgreSQL 数据库

### 本地生产构建

```bash
pnpm build
pnpm preview
```

### Tauri Android 客户端

Android 客户端使用 Tauri v2，把现有 React 阅读器打包进原生 Android WebView 壳层，并继续连接已部署的 Leaf Nest API。

Android 构建环境要求：

- Windows 上使用 Rust stable MSVC toolchain
- Android Studio 已安装 Android SDK Platform、Platform-Tools、Build-Tools、Command-line Tools 和 NDK
- 当前 shell 已配置 `JAVA_HOME`、`ANDROID_HOME` 和 `NDK_HOME`

```bash
# 安装 Tauri 依赖
pnpm install

# 首次生成 Android 工程
pnpm tauri:android:init

# 在已连接设备或模拟器上运行
$env:VITE_API_BASE_URL='https://reader.example.com'; pnpm tauri:android:dev

# 构建 Android 包
$env:VITE_API_BASE_URL='https://reader.example.com'; pnpm tauri:android:build
```

给 Android 客户端连接的后端需要设置 `TRUSTED_CLIENT_ORIGINS=tauri://localhost`，并建议使用 HTTPS 的 `BETTER_AUTH_URL` 来承载跨源 credentials。

### 环境变量

源码开发时，后端会从 `.env` 中读取这些变量：

- `APP_URL`
- `API_PORT`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `TRUSTED_CLIENT_ORIGINS`
- `S3_ENDPOINT`
- `S3_PUBLIC_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE`

前端还会读取 `VITE_API_BASE_URL`。浏览器同源使用时保持为空；构建 Tauri Android 客户端时设置为已部署的 App/API 地址。

对于 Docker Compose 部署，`app` 容器会把可选的 `SELF_HOST_*` 变量映射成运行时的 `APP_URL`、`DATABASE_URL`、`BETTER_AUTH_URL` 与 S3 endpoint。这样本地开发默认值可以保留，而远程 self-host 时也能切到公开域名和浏览器可访问的对象存储地址。`TRUSTED_CLIENT_ORIGINS` 会透传给打包客户端使用。可以显式提供 `BETTER_AUTH_SECRET`；未提供时，容器会在 `app-data` 中持久化自动生成的值。

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
│   ├── navigation.ts        # react-router-dom 封装
│   ├── app/                 # 由 React Router 消费的页面组件
│   │   ├── page.tsx         # 首页（书库）
│   │   ├── reader/[id]/     # 阅读页
│   │   ├── notes/           # 全局笔记列表与按书籍笔记页
│   │   └── settings/        # 设置页（语言）
│   ├── components/          # React 组件
│   │   ├── AuthCard.tsx     # 登录 / 注册表单
│   │   ├── AuthGate.tsx     # 认证守卫
│   │   ├── ClientLayout.tsx # 侧边栏 + 主布局
│   │   ├── Sidebar.tsx      # 导航侧边栏
│   │   ├── Renderer/        # EPUB 渲染器（单栏/双栏）
│   │   │   ├── SearchModal.tsx        # 全书搜索弹窗
│   │   │   ├── Toolbar/               # 阅读器工具栏
│   │   │   └── HighlightPopup.tsx     # 标注创建/编辑弹窗
│   │   └── ui/              # 通用 UI 基础组件
│   ├── hooks/               # 自定义 Hooks
│   ├── i18n/                # 客户端国际化 Provider 与语言配置
│   ├── lib/                 # 客户端库
│   │   ├── api/             # API 客户端 + 类型契约
│   │   ├── auth/            # better-auth 客户端 + 会话存储
│   │   ├── binary/          # 书籍二进制数据源抽象（远程 S3）
│   │   └── repositories/    # 数据仓库（书籍、高亮、阅读进度）
│   ├── plugins/             # HeroUI 插件配置
│   ├── store/               # Zustand 状态仓库
│   ├── theme/               # 亮色/暗色主题 Provider
│   ├── utils/               # 工具函数
│   │   ├── chapterLoader.ts           # 章节加载
│   │   ├── chapterParser.ts           # 章节解析
│   │   ├── epubStructureParser.ts     # EPUB 元信息 + 目录解析
│   │   ├── fullBookTextIndexer.ts     # 全书全文索引
│   │   ├── readingProgressManager.ts  # 进度持久化
│   │   └── highlightRenderer.ts      # 标注渲染到 iframe
│   └── messages/            # 翻译文件（en, zh）
├── server/
│   └── src/
│       ├── index.ts         # 入口：加载环境变量、组装服务、启动 Hono
│       ├── app.ts           # Hono 应用工厂：路由、认证、静态文件服务
│       ├── env.ts           # Zod 校验的环境变量 schema
│       ├── db/schema/       # Drizzle schema（认证、书籍、文件、进度、标注）
│       ├── lib/             # 服务层（认证、书籍、阅读、存储、数据库）
│       └── routes/          # REST API 路由（书籍、阅读、健康检查）
├── public/                  # 静态资源
├── src-tauri/               # Tauri v2 壳层（Android 与桌面打包）
├── docker-compose.yml       # Docker 部署编排（app、postgres、RustFS）
├── Dockerfile               # 多阶段 Node.js 构建
└── vite.config.ts           # Vite+ / Vite 共用配置
```

## 部署说明

- 内置的 Node 服务已经会对 `/notes/123`、`/reader/abc` 这类 SPA 路由回退到 `dist/index.html`。
- 签名对象 URL 基于 `S3_PUBLIC_ENDPOINT` 生成，因此这个地址必须能被浏览器直接访问。
- 封面等对象资源默认按跨域远程文件加载，前端不再默认启用跨源隔离响应头。

## 功能说明

### 数据库与存储

项目的主数据现在保存在后端：

- `PostgreSQL`：用户、书籍、阅读进度、高亮和相关元数据
- `S3` 兼容对象存储：EPUB 原文件和远程封面
- 浏览器侧：当前会话的阅读 UI 状态和内存级搜索辅助数据

### 用户认证

- 基于 better-auth 实现邮箱/密码注册与登录，搭配 Drizzle 适配器。
- 会话通过 Cookie 在服务端管理。
- 除 `/api/health` 和 `/api/auth/*` 之外的所有 API 路由均需有效会话。
- 前端通过 `AuthGate` 组件拦截未登录用户，显示登录卡片。

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
- 笔记中心按书籍聚合展示，可从书名直接进入详情，数据通过后端接口同步。
