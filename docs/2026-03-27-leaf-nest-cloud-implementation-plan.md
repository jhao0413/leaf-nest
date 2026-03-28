# Leaf Nest 云端基础改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前仅依赖浏览器 SQLite 的阅读器改造成 `Hono + Postgres + MinIO + Better Auth` 的云端版本，完成 Web 在线阅读闭环，并为后续安卓打包与离线能力预留清晰接口。

**Architecture:** 保留当前 Vite+ 前端在 `src/` 下，新增同仓库 `server/` 作为 Node.js Hono API 服务。生产环境中由一个 Node 服务同时提供 `/api` 和构建后的 SPA，`postgres` 与 `minio` 通过 Docker Compose 编排。当前 Web 端通过仓储接口访问后端 API，不再实现浏览器离线数据层；后续安卓端如需离线，再在同一仓储边界下补充本地文件与同步实现。

**Tech Stack:** Vite+ React 19、Hono、Better Auth、Drizzle ORM、drizzle-kit、PostgreSQL、MinIO/S3、AWS SDK v3、JSZip、Vitest、Testing Library

---

## Reference

- 架构方案：`docs/2026-03-27-leaf-nest-cloud-architecture-plan.md`

## File Structure

- 在仓库根目录新增 `server/`，不要把当前项目改造成 monorepo。
- 保留现有前端在 `src/` 下，只新增 `src/lib/` 级别的 API / 仓储抽象。
- 在删除 SQLite worker 之前，先把页面和渲染器改到仓储接口上。
- 当前阶段不引入 `Dexie`、`IndexedDB`、`Service Worker` 或浏览器离线缓存层。
- 为未来安卓端预留 `BookBinarySource` 之类的二进制访问接口，但当前只实现 Web 版远程读取。

### 计划中的后端目录

- `server/src/index.ts`
- `server/src/app.ts`
- `server/src/env.ts`
- `server/src/lib/db.ts`
- `server/src/lib/auth.ts`
- `server/src/lib/storage.ts`
- `server/src/middleware/require-session.ts`
- `server/src/db/schema/auth.ts`
- `server/src/db/schema/books.ts`
- `server/src/db/schema/reading.ts`
- `server/src/routes/health.ts`
- `server/src/modules/books/*`
- `server/src/modules/reading/*`

### 计划中的前端目录

- `src/lib/api/*`
- `src/lib/auth/*`
- `src/lib/repositories/*`
- `src/lib/binary/*`
- `src/components/AuthCard.tsx`
- `src/components/AuthGate.tsx`
- `src/components/BookAccessButton.tsx`

## 已锁定的实现决策

- 保持现有 SPA 结构，不将前端迁移到 `apps/web`。
- 后端新增为 `server/`，使用独立的 `tsconfig.server.json` 和后端测试配置。
- Web 端只做在线能力，不做断网书籍缓存、离线队列或浏览器本地全文索引持久化。
- 服务端始终是唯一真相源，Web 端的阅读进度和高亮直接通过 API 持久化。
- 批注继续内嵌在 `highlights.note` 字段中，v1 不拆单独 `notes` 表。
- 书籍模型按 `ownerId` 归属单个用户，不做共享书库。
- EPUB 元数据提取继续复用现有前端解析逻辑，前端解析后上传元数据和文件。
- Web 在线阅读通过 API 获取短时文件访问地址并拉取 EPUB 到内存解析，不把文件持久化到浏览器本地数据库。
- 为未来安卓端保留 `BookBinarySource` 和仓储边界，但当前不实现移动端本地文件存储。

### Task 1: 启动 Node API 运行时

**Files:**
- Create: `server/src/index.ts`
- Create: `server/src/app.ts`
- Create: `server/src/routes/health.ts`
- Create: `server/src/routes/health.test.ts`
- Create: `tsconfig.server.json`
- Create: `vitest.server.config.ts`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: 添加后端依赖和脚本**

新增运行时依赖：`hono`、`@hono/node-server`、`better-auth`、`drizzle-orm`、`pg`、`zod`、`@aws-sdk/client-s3`、`@aws-sdk/s3-request-presigner`、`dotenv`。新增开发依赖：`drizzle-kit`、`tsx`、`concurrently`、缺失的 Node 类型定义。

在 `package.json` 中增加脚本：

```json
{
  "dev:web": "vp dev",
  "dev:api": "tsx watch server/src/index.ts",
  "dev": "concurrently -n web,api \"pnpm dev:web\" \"pnpm dev:api\"",
  "build:web": "vp build",
  "build:api": "tsc -p tsconfig.server.json",
  "build": "pnpm build:web && pnpm build:api",
  "test:web": "vp test",
  "test:api": "vitest run --config vitest.server.config.ts",
  "test": "pnpm test:web && pnpm test:api"
}
```

- [ ] **Step 2: 增加独立的后端 TypeScript 配置**

创建 `tsconfig.server.json`，使用 `moduleResolution: "NodeNext"`、`module: "NodeNext"`、`outDir: "dist-server"`，并包含 `server/src/**/*.ts`。不要复用前端的 `bundler` 配置。

- [ ] **Step 3: 先写失败的健康检查测试**

在 `server/src/routes/health.test.ts` 里断言 `GET /api/health` 返回 `200` 和 `{ ok: true }`。

Run: `pnpm test:api -- server/src/routes/health.test.ts`

Expected: FAIL，因为后端入口和路由尚未存在。

- [ ] **Step 4: 实现最小 Hono 应用骨架**

创建 `server/src/app.ts` 和 `server/src/index.ts`，挂载 `GET /api/health`，先不接入认证、数据库和对象存储。

- [ ] **Step 5: 配置前端开发代理**

在 `vite.config.ts` 中为 `/api` 增加指向 Hono 端口的代理，并在 `.gitignore` 中忽略 `dist-server/`。

- [ ] **Step 6: 重新运行测试并保持通过**

Run: `pnpm test:api -- server/src/routes/health.test.ts`

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.server.json vitest.server.config.ts vite.config.ts .gitignore server/src
git commit -m "feat: bootstrap hono api runtime"
```

### Task 2: 补齐自部署基础设施和环境配置

**Files:**
- Create: `.env.example`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `drizzle.config.ts`
- Create: `server/src/env.ts`
- Create: `server/src/env.test.ts`
- Modify: `README.md`
- Modify: `README.zh-CN.md`

- [ ] **Step 1: 先写失败的环境变量测试**

在 `server/src/env.test.ts` 中验证：

```ts
- 缺失必要变量时抛错
- 提供完整配置时能得到类型正确的结果
```

Run: `pnpm test:api -- server/src/env.test.ts`

Expected: FAIL，因为 `server/src/env.ts` 还不存在。

- [ ] **Step 2: 实现环境变量解析**

创建 `server/src/env.ts`，解析并导出：

```ts
APP_URL
API_PORT
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
S3_ENDPOINT
S3_REGION
S3_BUCKET
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_FORCE_PATH_STYLE
```

- [ ] **Step 3: 增加 Docker 与 Compose**

创建 `docker-compose.yml`，包含 `app`、`postgres`、`minio` 三个服务，并使用命名 volume 保存数据库和对象存储数据。创建多阶段 `Dockerfile`，同时构建前端和后端。

- [ ] **Step 4: 增加 Drizzle 配置**

创建 `drizzle.config.ts`，schema 指向 `server/src/db/schema/*.ts`，migration 输出目录为 `drizzle/`。

- [ ] **Step 5: 更新部署文档**

在 `README.md` 和 `README.zh-CN.md` 中补充本地开发、环境变量、Compose 启动方式和自部署说明。

- [ ] **Step 6: 验证环境测试和 Compose 配置**

Run: `pnpm test:api -- server/src/env.test.ts`

Expected: PASS。

Run: `docker compose config`

Expected: Compose 能正常渲染，没有 schema 错误。

- [ ] **Step 7: Commit**

```bash
git add .env.example Dockerfile docker-compose.yml drizzle.config.ts server/src/env.ts server/src/env.test.ts README.md README.zh-CN.md
git commit -m "feat: add self-hosted infrastructure config"
```

### Task 3: 实现 Drizzle schema、Better Auth 和对象存储客户端

**Files:**
- Create: `server/src/lib/db.ts`
- Create: `server/src/lib/auth.ts`
- Create: `server/src/lib/storage.ts`
- Create: `server/src/middleware/require-session.ts`
- Create: `server/src/db/schema/auth.ts`
- Create: `server/src/db/schema/books.ts`
- Create: `server/src/db/schema/reading.ts`
- Create: `server/src/lib/auth.test.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: 先写失败的认证集成测试**

在 `server/src/lib/auth.test.ts` 中验证：

```ts
- Better Auth 已挂载在 /api/auth/*
- 未登录访问受保护接口返回 401
- 已登录时能解析出 user id
```

Run: `pnpm test:api -- server/src/lib/auth.test.ts`

Expected: FAIL。

- [ ] **Step 2: 定义 Drizzle schema**

至少创建这些表：

```ts
users
sessions
accounts
verifications
books
book_files
reading_progress
highlights
```

要求：

```ts
- books 通过 ownerId 归属用户
- reading_progress 对 ownerId + bookId 唯一
- highlights 预留 deletedAt，便于后续移动端同步删除
```

- [ ] **Step 3: 实现数据库和对象存储客户端**

在 `server/src/lib/db.ts` 中创建 Postgres 连接池和 Drizzle 实例；在 `server/src/lib/storage.ts` 中封装 MinIO/S3 客户端，提供 `putObject`、`getSignedReadUrl`、`deleteObject`。

- [ ] **Step 4: 配置 Better Auth**

在 `server/src/lib/auth.ts` 中使用 Drizzle 适配器，挂载到 `server/src/app.ts`。在 `server/src/middleware/require-session.ts` 中统一解析受保护接口的会话和 `userId`。

- [ ] **Step 5: 生成首个 migration**

Run: `pnpm exec drizzle-kit generate`

Expected: `drizzle/` 下生成 SQL migration。

- [ ] **Step 6: 重新运行认证测试**

Run: `pnpm test:api -- server/src/lib/auth.test.ts`

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add drizzle.config.ts drizzle server/src/lib server/src/middleware server/src/db/schema server/src/app.ts
git commit -m "feat: add drizzle schema and better auth"
```

### Task 4: 实现书籍上传、列表、详情、删除和内容访问 API

**Files:**
- Create: `server/src/modules/books/contracts.ts`
- Create: `server/src/modules/books/service.ts`
- Create: `server/src/modules/books/routes.ts`
- Create: `server/src/modules/books/routes.test.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/db/schema/books.ts`

- [ ] **Step 1: 先写失败的书籍接口测试**

在 `server/src/modules/books/routes.test.ts` 中覆盖：

```ts
- 未登录时 list/upload/delete 被拒绝
- 已登录上传后返回 book id
- list 只返回当前用户自己的书
- delete 同时删除数据库记录和对象存储对象
- 内容访问接口返回短时签名地址
```

Run: `pnpm test:api -- server/src/modules/books/routes.test.ts`

Expected: FAIL。

- [ ] **Step 2: 锁定 v1 上传契约**

`POST /api/books` 接收 `multipart/form-data`：

```ts
file: File
cover: File | undefined
metadata: JSON string {
  name,
  creator,
  publisher,
  identifier,
  pubdate,
  toc,
  language,
  size
}
```

v1 不在服务端重新解析 EPUB 元数据。

- [ ] **Step 3: 实现书籍服务**

书籍元数据写入 Postgres，EPUB 和封面写入 MinIO，`book_files` 保存 object key、mime type、size、hash 等信息。列表和详情返回可直接渲染的书籍信息，并附带短时 `coverUrl`。

- [ ] **Step 4: 实现书籍路由**

挂载：

```ts
GET    /api/books
POST   /api/books
GET    /api/books/:bookId
DELETE /api/books/:bookId
POST   /api/books/:bookId/access-url
```

其中 `access-url` 用于 Web 在线阅读，也为后续安卓下载复用。

- [ ] **Step 5: 运行书籍路由测试**

Run: `pnpm test:api -- server/src/modules/books/routes.test.ts`

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/books server/src/app.ts server/src/db/schema/books.ts
git commit -m "feat: add books api"
```

### Task 5: 实现阅读进度和高亮批注 API

**Files:**
- Create: `server/src/modules/reading/contracts.ts`
- Create: `server/src/modules/reading/service.ts`
- Create: `server/src/modules/reading/routes.ts`
- Create: `server/src/modules/reading/routes.test.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/db/schema/reading.ts`

- [ ] **Step 1: 先写失败的阅读数据接口测试**

在 `server/src/modules/reading/routes.test.ts` 中覆盖：

```ts
- upsert 阅读进度
- 按书查询 highlights
- 创建 highlight
- 更新 highlight note/color
- 删除 highlight
```

Run: `pnpm test:api -- server/src/modules/reading/routes.test.ts`

Expected: FAIL。

- [ ] **Step 2: 锁定阅读数据契约**

要求：

```ts
- reading_progress 按 ownerId + bookId 唯一
- highlights 使用客户端生成 id 或服务端生成 id 二选一，但接口返回统一结构
- 删除接口首版可先做软删除，避免以后移动端同步时重构接口
```

- [ ] **Step 3: 实现阅读数据服务**

在 service 中封装进度读写、高亮列表、高亮创建、更新 note/color、删除逻辑，并统一做 ownerId 校验。

- [ ] **Step 4: 实现阅读数据路由**

挂载：

```ts
GET    /api/books/:bookId/progress
PUT    /api/books/:bookId/progress
GET    /api/books/:bookId/highlights
POST   /api/books/:bookId/highlights
PATCH  /api/highlights/:highlightId
DELETE /api/highlights/:highlightId
```

- [ ] **Step 5: 运行测试**

Run: `pnpm test:api -- server/src/modules/reading/routes.test.ts`

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/reading server/src/app.ts server/src/db/schema/reading.ts
git commit -m "feat: add reading apis"
```

### Task 6: 增加前端认证状态、API Client 和访问保护壳层

**Files:**
- Create: `src/lib/api/contracts.ts`
- Create: `src/lib/api/client.ts`
- Create: `src/lib/auth/client.ts`
- Create: `src/lib/auth/sessionStore.ts`
- Create: `src/components/AuthCard.tsx`
- Create: `src/components/AuthGate.tsx`
- Create: `src/components/AuthGate.test.tsx`
- Create: `src/app/page.test.tsx`
- Modify: `src/app/providers.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/ClientLayout.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/zh.json`

- [ ] **Step 1: 先写失败的认证壳层测试**

覆盖：

```ts
- 未登录时首页显示 AuthCard
- 已登录时首页显示书库壳层
- 会话失效时会回到登录态
```

Run: `pnpm test:web -- src/components/AuthGate.test.tsx src/app/page.test.tsx`

Expected: FAIL。

- [ ] **Step 2: 实现 API Client 和 Better Auth Client**

在 `src/lib/api/client.ts` 中封装类型化 `/api` 请求；在 `src/lib/auth/client.ts` 中创建 Better Auth 客户端；在 `src/lib/auth/sessionStore.ts` 中存放当前会话和少量本地偏好。

- [ ] **Step 3: 实现认证 UI 与壳层**

新增 `AuthCard.tsx` 处理注册/登录表单，新增 `AuthGate.tsx` 负责：

```ts
- 会话加载中
- 已登录
- 未登录
```

然后在 `src/app/providers.tsx` 中注入会话初始化逻辑。

- [ ] **Step 4: 首页接入认证壳层**

修改 `src/app/page.tsx`，先经过 `AuthGate`，再渲染书库页面。

- [ ] **Step 5: 运行测试**

Run: `pnpm test:web -- src/components/AuthGate.test.tsx src/app/page.test.tsx`

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add src/lib/api src/lib/auth src/components/AuthCard.tsx src/components/AuthGate.tsx src/components/AuthGate.test.tsx src/app/providers.tsx src/app/page.tsx src/app/page.test.tsx src/components/ClientLayout.tsx src/messages/en.json src/messages/zh.json
git commit -m "feat: add auth and api client shell"
```

### Task 7: 建立仓储层和二进制访问抽象

**Files:**
- Create: `src/lib/repositories/booksRepository.ts`
- Create: `src/lib/repositories/readingRepository.ts`
- Create: `src/lib/repositories/highlightsRepository.ts`
- Create: `src/lib/binary/bookBinarySource.ts`
- Create: `src/lib/binary/remoteBookBinarySource.ts`
- Create: `src/lib/repositories/repositories.test.ts`
- Modify: `src/utils/fullBookTextIndexer.ts`
- Modify: `src/utils/readingProgressManager.ts`
- Modify: `src/store/bookInfoStore.ts`

- [ ] **Step 1: 先写失败的仓储层测试**

覆盖：

```ts
- booksRepository 从 API 拉取书单
- readingRepository 能读写进度
- highlightsRepository 能读写高亮和批注
- bookBinarySource 能按 bookId 拉取远程 EPUB 二进制
```

Run: `pnpm test:web -- src/lib/repositories/repositories.test.ts`

Expected: FAIL。

- [ ] **Step 2: 实现远程仓储**

在三个 repository 中统一封装：

```ts
- 书籍列表/详情/上传/删除
- 阅读进度读取与保存
- 高亮和批注的增删改查
```

页面和组件不得直接写 `fetch`。

- [ ] **Step 3: 实现二进制访问抽象**

创建 `BookBinarySource` 接口和 `remoteBookBinarySource` 实现，通过 `POST /api/books/:bookId/access-url` 获取地址，再读取 EPUB 文件。后续安卓端可以新增 `mobileBookBinarySource` 而不影响页面层。

- [ ] **Step 4: 重构辅助工具**

修改 `src/utils/fullBookTextIndexer.ts`，让整书搜索索引只保存在内存实例中，不再尝试写 SQLite。修改 `src/utils/readingProgressManager.ts`，通过 `readingRepository.saveProgress` 持久化进度。

- [ ] **Step 5: 调整书籍类型**

修改 `src/store/bookInfoStore.ts`，让书籍主类型偏向 API 返回的数据结构，减少对 `blob` / `coverBlob` 的长期依赖；仅在上传链路和当前会话内解析时使用临时二进制字段。

- [ ] **Step 6: 运行测试**

Run: `pnpm test:web -- src/lib/repositories/repositories.test.ts`

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add src/lib/repositories src/lib/binary src/utils/fullBookTextIndexer.ts src/utils/readingProgressManager.ts src/store/bookInfoStore.ts
git commit -m "feat: add repositories and binary source abstraction"
```

### Task 8: 将书库页迁移到云端 API

**Files:**
- Create: `src/components/BookAccessButton.tsx`
- Create: `src/app/page.library.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/BookInfoModal.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/zh.json`
- Modify: `src/store/bookInfoStore.ts`

- [ ] **Step 1: 先写失败的书库页测试**

覆盖：

```ts
- 上传时调用 /api/books
- 远程书单能渲染到页面
- 删除书籍时走 API
- 书籍卡片能进入在线阅读链路
```

Run: `pnpm test:web -- src/app/page.library.test.tsx`

Expected: FAIL。

- [ ] **Step 2: 替换 worker 驱动的书库加载**

修改 `src/app/page.tsx`，通过 `booksRepository.listBooks()` 获取书单，移除该页面上的 `createHandleWorker()`。

- [ ] **Step 3: 复用现有 EPUB 解析逻辑完成上传**

继续使用 `epubStructureParser(file)` 在前端解析元数据，然后把 `file`、可选封面和元数据一起提交给 `POST /api/books`。

- [ ] **Step 4: 增加统一的内容访问入口**

新增 `BookAccessButton.tsx`，负责根据当前书籍进入阅读流程。当前 Web 端只做在线访问，不显示“下载离线”相关状态。

- [ ] **Step 5: 运行测试**

Run: `pnpm test:web -- src/app/page.library.test.tsx`

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/page.library.test.tsx src/components/BookAccessButton.tsx src/components/BookInfoModal.tsx src/messages/en.json src/messages/zh.json src/store/bookInfoStore.ts
git commit -m "feat: migrate library page to api"
```

### Task 9: 将阅读页、笔记页和高亮链路迁移到仓储层

**Files:**
- Modify: `src/app/reader/[id]/page.tsx`
- Modify: `src/app/notes/page.tsx`
- Modify: `src/app/notes/[bookId]/page.tsx`
- Modify: `src/components/Renderer/SingleColumnRenderer.tsx`
- Modify: `src/components/Renderer/DoubleColumnRenderer.tsx`
- Modify: `src/components/Renderer/SearchModal.tsx`
- Modify: `src/components/Renderer/HighlightPopup.tsx`
- Modify: `src/store/fullBookSearchStore.ts`
- Modify: `src/store/readerStateStore.ts`
- Create: `src/app/reader/reader-flow.test.tsx`

- [ ] **Step 1: 先写失败的阅读链路测试**

覆盖：

```ts
- reader 通过 remoteBookBinarySource 加载 EPUB
- 阅读进度通过 repository 保存
- 创建/编辑/删除高亮走 highlightsRepository
- notes 页面通过 repository 拉取分组数据
```

Run: `pnpm test:web -- src/app/reader/reader-flow.test.tsx`

Expected: FAIL。

- [ ] **Step 2: 替换 reader 页的 worker 初始化**

修改 `src/app/reader/[id]/page.tsx`，通过 `booksRepository.getBook()` 获取元数据，再通过 `remoteBookBinarySource` 拉取 EPUB 二进制并交给现有解析流程。

- [ ] **Step 3: 替换 renderer 中的高亮操作**

修改 `SingleColumnRenderer.tsx` 和 `DoubleColumnRenderer.tsx`，让高亮读取、创建、删除、修改 note/color 都通过 `highlightsRepository` 完成，不再在渲染器内部创建 worker。

- [ ] **Step 4: 迁移 notes 页面**

修改 `src/app/notes/page.tsx` 和 `src/app/notes/[bookId]/page.tsx`，通过仓储层拉取聚合后的高亮数据，并通过 API 删除高亮。

- [ ] **Step 5: 调整整书搜索行为**

修改 `SearchModal.tsx` 和 `fullBookSearchStore`，让全文索引只在当前阅读会话内构建和使用，不再依赖 SQLite 持久化缓存。

- [ ] **Step 6: 运行测试**

Run: `pnpm test:web -- src/app/reader/reader-flow.test.tsx`

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add src/app/reader/[id]/page.tsx src/app/notes/page.tsx src/app/notes/[bookId]/page.tsx src/components/Renderer/SingleColumnRenderer.tsx src/components/Renderer/DoubleColumnRenderer.tsx src/components/Renderer/SearchModal.tsx src/components/Renderer/HighlightPopup.tsx src/store/fullBookSearchStore.ts src/store/readerStateStore.ts src/app/reader/reader-flow.test.tsx
git commit -m "feat: migrate reader and notes to api repositories"
```

### Task 10: 删除 SQLite WASM 和 worker 持久化层

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Delete: `src/utils/handleWorker.ts`
- Delete: `src/utils/createHandleWorker.ts`
- Delete: `src/vite-regression.test.ts`

- [ ] **Step 1: 先确认所有页面已经不再引用 worker**

Run: `rg -n "createHandleWorker|handleWorker|sqlite-wasm" src`

Expected: 只剩待删除文件或测试中的引用。

- [ ] **Step 2: 删除 SQLite 依赖和文件**

从 `package.json` 中移除 `@sqlite.org/sqlite-wasm`，删除 `src/utils/handleWorker.ts`、`src/utils/createHandleWorker.ts` 和 `src/vite-regression.test.ts`。

- [ ] **Step 3: 清理 Vite 配置和文档**

从 `vite.config.ts` 中移除 SQLite 专用的 `optimizeDeps.exclude` 配置。更新中英文 README，明确当前架构已改为云端 API，不再依赖浏览器 SQLite。

- [ ] **Step 4: Commit**

```bash
git add package.json vite.config.ts README.md README.zh-CN.md
git rm src/utils/handleWorker.ts src/utils/createHandleWorker.ts src/vite-regression.test.ts
git commit -m "refactor: remove sqlite wasm worker layer"
```

### Task 11: 完整验证云端版 Web 流程

**Files:**
- Verify only; no planned code changes unless a failure is found

- [ ] **Step 1: 运行前端测试**

Run: `pnpm test:web`

Expected: PASS。

- [ ] **Step 2: 运行后端测试**

Run: `pnpm test:api`

Expected: PASS。

- [ ] **Step 3: 运行类型和检查**

Run: `pnpm check`

Expected: PASS。

- [ ] **Step 4: 运行构建**

Run: `pnpm build`

Expected: 前后端都能成功构建。

- [ ] **Step 5: 验证 Compose**

Run: `docker compose up -d postgres minio`

Expected: 基础设施容器正常启动。

- [ ] **Step 6: 执行 migration 并启动应用**

Run: `pnpm exec drizzle-kit migrate`

Expected: migration 能成功应用到 Postgres。

Run: `docker compose up -d app`

Expected: 应用启动后能同时访问 `/api/health` 和前端页面。

- [ ] **Step 7: 手工验收核心流程**

验证以下闭环：

```text
1. 使用邮箱密码注册并登录。
2. 上传 EPUB，确认书籍出现在书库中。
3. 点击书籍进入在线阅读，确认目录、翻页和渲染正常。
4. 刷新页面后重新进入同一本书，确认阅读进度已恢复。
5. 创建高亮和批注，确认笔记页能看到分组结果。
6. 删除高亮，确认阅读页和笔记页状态一致。
7. 重启 Docker Compose 后再次登录，确认书籍、进度和批注仍然存在。
```

- [ ] **Step 8: 如果验证过程中产生修复，再补最终提交**

```bash
git status
git add -A
git commit -m "chore: finalize cloud web migration"
```

## Acceptance Criteria

- 前端运行时不再依赖 `sqlite-wasm`。
- 书库、阅读页、笔记页和高亮链路全部通过仓储层和 API，而不是 worker 消息。
- 后端能以 Node 方式本地运行，也能通过 Docker Compose 与 Postgres、MinIO 一起启动。
- 认证使用 Better Auth，首版只支持邮箱密码。
- Web 端可以在线上传、阅读、保存进度、创建高亮和批注。
- 代码中已经为未来安卓端预留二进制访问和仓储边界，但当前 Web 版本不实现离线阅读。
- 生产构建后的 Node 容器可以同时提供 SPA 和 API。

## Assumptions

- 旧的本地 SQLite / OPFS 数据直接废弃，不做迁移。
- v1 仍然是个人书库模型，不做跨用户共享。
- EPUB 元数据提取继续由前端完成，服务端只负责接收、存储和返回数据。
- 当前实施计划不包含安卓打包本身，也不包含安卓离线能力实现；这些属于下一阶段。
- 删除 worker 持久化层之前，必须先让阅读页和笔记页完全切到 API 仓储层。
