# 笔记文档工具 — 迭代文档

记录设计方案、技术栈、目录结构、每次迭代改了什么、怎么改的。后续升级前先看此文档。

## 1. 项目定位

- 用途：渲染仓库内 markdown 笔记（如 `前端面试/汇总/*.md`），提供目录树 + 阅读 + 搜索。
- 运行方式：本地 dev server，浏览器打开，改 md 文件自动刷新。不部署上线，不做登录/多用户。
- 代码位置：`ms/notes-app/`，与笔记内容仓库同级，不混在笔记目录里。

## 2. 技术栈

| 用途 | 选型 | 说明 |
|------|------|------|
| 构建工具 | Vite | dev server + HMR，文件监听免额外配置 |
| 前端框架 | Vue 3 (`<script setup>` + Composition API) | 遵循 vue-frontend-standards |
| 路由 | vue-router | 路由路径对应笔记文件路径 |
| markdown 渲染 | markdown-it | 转 HTML |
| 代码高亮 | shiki（或 highlight.js，视集成成本定） | 渲染 md 内代码块 |
| 全文搜索 | flexsearch | 前端本地建索引，无需后端 |
| 目录树生成 | 自定义 Vite plugin（虚拟模块） | 启动时扫描仓库根目录 `.md` 文件生成 JSON 树 |

不引入后端 server、不引入数据库、不做用户系统。

## 3. 目录结构（预期）

```
ms/
├── 前端面试/                  # 笔记内容仓库（保持不变）
│   └── 汇总/*.md
└── notes-app/                 # 本工具代码
    ├── docs/
    │   └── ITERATION.md        # 本文档
    ├── src/
    │   ├── main.ts
    │   ├── App.vue
    │   ├── router/
    │   ├── components/
    │   │   ├── Sidebar.vue     # 左侧目录树
    │   │   ├── MarkdownView.vue # 中间渲染区
    │   │   ├── Toc.vue          # 右侧文内小目录
    │   │   └── SearchBox.vue    # 顶部搜索框
    │   └── plugins/
    │       └── md-tree.ts       # Vite plugin：扫描 md 生成目录树虚拟模块
    ├── vite.config.ts
    ├── package.json
    └── tsconfig.json
```

## 4. 核心功能与实现方式

### 4.1 目录树（侧边栏）
- Vite plugin 在构建/dev 启动时递归扫描仓库根目录（`ms/` 下所有子目录）的 `.md` 文件。
- 按文件夹层级 + 文件名（含数字前缀，如 `1.JS基础面试题.md`）排序，生成 JSON 树，通过虚拟模块（如 `virtual:md-tree`）注入前端。
- 新增文件/文件夹自动出现在树里，无需手动维护配置。
- `Sidebar.vue` 递归渲染树节点，当前打开文件高亮，支持折叠。

### 4.2 Markdown 渲染（中间区）
- 路由参数拿到文件相对路径 → fetch 对应 md 原始内容 → `markdown-it` 转 HTML。
- 代码块通过 shiki/highlight.js 高亮渲染。

### 4.3 右侧 TOC（文内小目录）
- 渲染时同步解析当前文档的 `h1~h3` 标题，生成锚点列表。
- 滚动时高亮当前所在章节对应的 TOC 项，点击 TOC 项跳转锚点。

### 4.4 全文搜索
- 启动时用 flexsearch 对所有 md 的标题 + 正文建索引（前端内存索引，非后端）。
- 搜索框输入关键字模糊匹配，展示命中文件 + 命中片段，点击跳转到对应文件及锚点位置。

### 4.5 文件热更新
- 依赖 Vite 原生 HMR：md 文件变化时 dev server 检测到变化，自动重新扫描目录树/重新渲染当前内容，浏览器自动刷新，无需额外实现监听逻辑。

### 4.6 暂不做（后续可选）
- 阅读进度记忆（可后续用 localStorage 记录每篇文档的滚动位置）
- 部署上线 / 多用户 / 登录

## 5. 迭代记录

> 每次改动补一条：日期、改了什么、涉及文件、为什么这么改。

### 2026-08-25 — 初始设计
- 完成方案设计与本文档，尚未开始代码实现。
- 下一步：`writing-plans` 生成实现计划，按计划分步实现 `notes-app/` 骨架。

### 2026-08-25 — 实现完成（Task1-8）

按计划分 8 个 task 完成了本工具的首个可用版本，逐条 commit + 双审通过。

**完成的模块：**
- 工程骨架：Vite + Vue3（`<script setup>` + Composition API）+ TypeScript，vitest 单测环境。
- `md-tree.ts`（Vite plugin）：dev/build 启动时递归扫描仓库根目录 `.md` 文件，生成目录树 JSON，通过 `virtual:md-tree` 虚拟模块注入前端；文件夹/文件名去掉数字前缀作展示名，同级按数字感知排序（`naturalCompare`）。
- markdown 渲染：`markdown-it` 转 HTML + `shiki` 做代码块语法高亮，修复过并发重入导致代码块串位的问题。
- TOC 解析：从渲染后的 HTML 提取 `h1~h3` 标题生成锚点列表，与 markdown 渲染生成的 heading id 对齐。
- 路由 + Sidebar + TreeNode：`vue-router` 路由路径对应笔记文件相对路径，`Sidebar.vue` 递归渲染目录树，当前文件高亮。
- `MarkdownView.vue` 中间渲染区：读取仓库根目录 md 原始内容（通过 vite dev server 中间件 `serveRepoMdFiles`）并渲染；中间件内置路径穿越防护（对解码后的路径做 `path.resolve` 归一化 + `path.relative` 校验，拒绝越界访问仓库根目录之外的文件，同时正确处理单层 URL 编码，拒绝畸形编码请求）。
- 全文搜索：基于 `flexsearch` 前端内存索引，对所有笔记标题+正文建索引，支持模糊匹配、命中片段展示、点击跳转到对应文件锚点；修复过搜索模块类型约束、`initIndex` 容错、排序行为等问题。

**验证方式：**
- `npm test`（vitest run）：4 个测试文件、17 个测试用例全部通过（md-tree 扫描逻辑、markdown 渲染并发安全、TOC 解析、search 模块）。
- `npx vue-tsc --noEmit -p tsconfig.app.json`：零类型错误。
- `npm run build`（`vue-tsc -b && vite build`）：构建成功产出 `dist/`（shiki 语言包较多导致产物体积偏大，属已知的可优化项，非功能缺陷）。
- 部分交互（侧边栏浏览、markdown 渲染效果、搜索跳转等）在此前各 task 中已用 ego-browser 手动打开真实页面验证过。

**本次（Task8）额外修复的技术债：**
1. **`docs/` 目录被误扫描进笔记树**：`md-tree.ts` 的 `IGNORE_DIRS` 之前只排除了 `node_modules`、`.git`、`notes-app`，没有排除仓库根目录下的 `docs/`，导致开发过程中的实施计划文档（`docs/superpowers/plans/*.md`）被当作笔记内容展示给用户。修复：把 `'docs'` 加入 `IGNORE_DIRS`；在 `md-tree.test.ts` 里补充了 fixture（`docs/superpowers/plans/task8.md`）并加强了现有"跳过 node_modules、.git、隐藏文件"的断言，一并验证 `docs` 目录也被跳过。`npx vitest run src/plugins/md-tree.test.ts` 验证通过（4 个测试用例全绿）。
2. **HMR 不监听仓库根目录下 notes-app 之外的 `.md` 文件变化**：Vite 默认 watcher 的监听范围锚定在 dev server 的 `root`（即 `notes-app/`），不会覆盖仓库根目录下如 `前端面试/` 这样的目录，导致编辑笔记后浏览器不会自动刷新（手动刷新能拿到最新内容，因为 `serveRepoMdFiles` 中间件读盘是实时的，只是 watcher 没触发自动刷新）。修复：在 `mdTreePlugin` 的 `configureServer` 钩子里显式调用 `server.watcher.add(rootDir)`，把仓库根目录纳入 watcher 监听范围。**已实测验证**：用 Node 脚本调用 Vite 的 `createServer` API 启动一个真实 dev server 实例，确认 `server.watcher.getWatched()` 中包含仓库根目录；随后向 `前端面试/汇总/1.JS基础面试题.md` 追加一行内容，watcher 的 `all` 事件确实被触发（`changedPath` 命中该文件），且插件里 `moduleGraph.invalidateModule` 与 `server.ws.send({ type: 'full-reload' })` 均被调用——验证了修复方案有效。验证脚本使用后已删除，测试期间对该笔记文件的临时改动已还原（`git diff` 确认无残留改动）。

**已知限制/技术债（尚未解决）：**
- 无阅读进度记忆（滚动位置未持久化到 localStorage）。
- 生产构建产物较大（shiki 内置了大量语言/主题包，`npm run build` 时有 chunk size 警告），可后续按需裁剪 shiki 语言集或做代码分割优化，暂不影响本地开发工具的可用性。
- 不做部署上线、多用户、登录，符合最初设计范围，非遗留问题。
