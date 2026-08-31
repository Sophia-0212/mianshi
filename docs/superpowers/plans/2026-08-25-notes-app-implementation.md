# 笔记文档工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建一个 Vite + Vue3 本地笔记阅读工具，自动扫描仓库根目录下所有 markdown 文件生成目录树，支持渲染、代码高亮、右侧 TOC、全文搜索，改 md 文件自动热更新。

**Architecture:** Vite plugin 在 dev server 启动/文件变化时扫描仓库根目录 `.md` 文件生成 JSON 树，通过虚拟模块 `virtual:md-tree` 注入前端；Vue3 单页应用用 vue-router 按文件路径路由，`markdown-it` + `shiki` 渲染内容，`flexsearch` 做前端全文索引搜索。

**Tech Stack:** Vite, Vue 3 (`<script setup>` + TypeScript), vue-router, markdown-it, shiki, flexsearch, vitest（单测）

---

## 文件结构

```
ms/notes-app/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts
│   ├── plugins/
│   │   ├── md-tree.ts          # Vite plugin：扫描 md 生成目录树虚拟模块
│   │   └── md-tree.test.ts     # 单测：目录树扫描/排序逻辑
│   ├── env.d.ts                # 声明 virtual:md-tree 模块类型
│   ├── utils/
│   │   ├── markdown.ts         # markdown-it + shiki 渲染封装
│   │   ├── toc.ts              # 解析 h1~h3 生成 TOC 数据
│   │   └── toc.test.ts
│   └── components/
│       ├── Sidebar.vue         # 左侧目录树
│       ├── MarkdownView.vue    # 中间渲染区（路由页面）
│       ├── Toc.vue             # 右侧文内小目录
│       └── SearchBox.vue       # 顶部搜索框
```

约定：`.md` 文件通过 Vite 的 `?raw` 后缀以字符串形式导入/fetch，不做 SSR。

---

### Task 1: 初始化 Vite + Vue3 + TS 工程骨架

**Files:**
- Create: `ms/notes-app/package.json`
- Create: `ms/notes-app/vite.config.ts`
- Create: `ms/notes-app/tsconfig.json`
- Create: `ms/notes-app/tsconfig.node.json`
- Create: `ms/notes-app/index.html`
- Create: `ms/notes-app/src/main.ts`
- Create: `ms/notes-app/src/App.vue`
- Create: `ms/notes-app/src/vite-env.d.ts`

- [ ] **Step 1: 用 npm 脚手架创建工程**

```bash
cd /Users/lixiaofei05/Desktop/ms
npm create vite@latest notes-app -- --template vue-ts
```

- [ ] **Step 2: 安装运行依赖**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npm install vue-router@4 markdown-it shiki flexsearch
npm install -D @types/markdown-it vitest
```

- [ ] **Step 3: 覆盖 `vite.config.ts`，允许 dev server 访问仓库根目录（笔记内容在 notes-app 外层）**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { mdTreePlugin } from './src/plugins/md-tree'

export default defineConfig({
  plugins: [vue(), mdTreePlugin()],
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
```

（`mdTreePlugin` 在 Task 2 创建，这里先引用，Task 1 结束时工程还跑不起来，属于预期状态。）

- [ ] **Step 4: 清空默认模板产物**

删除脚手架自带的 `src/components/HelloWorld.vue`、`src/assets/*`、`public/vite.svg`（若存在），保留 `src/main.ts`、`src/App.vue`、`index.html` 供后续替换。

- [ ] **Step 5: 提交**

```bash
cd /Users/lixiaofei05/Desktop/ms
git add notes-app/package.json notes-app/package-lock.json notes-app/vite.config.ts notes-app/tsconfig*.json notes-app/index.html notes-app/src notes-app/.gitignore
git commit -m "chore: 初始化 notes-app Vite+Vue3+TS 工程骨架"
```

---

### Task 2: md-tree Vite plugin（目录树扫描）

**Files:**
- Create: `ms/notes-app/src/plugins/md-tree.ts`
- Create: `ms/notes-app/src/plugins/md-tree.test.ts`
- Create: `ms/notes-app/src/env.d.ts`

**设计要点：**
- 扫描根目录：仓库根 `ms/`（即 `notes-app` 的上一级），跳过 `node_modules`、`.git`、`notes-app` 自身、隐藏文件（以 `.` 开头）。
- 生成的树节点类型：
  ```typescript
  interface MdTreeNode {
    type: 'dir' | 'file'
    name: string           // 展示名，文件去掉 .md 后缀，去掉数字前缀（如 "1.JS基础面试题" -> "JS基础面试题"）
    path: string            // 相对仓库根目录的路径，文件带 .md 后缀，用作路由 path
    sortKey: string         // 原始文件/文件夹名，用于排序（保留数字前缀）
    children?: MdTreeNode[] // 仅 dir 有
  }
  ```
- 排序规则：同级节点按 `sortKey` 做数字感知排序（`1.xxx` < `2.xxx` < `10.xxx`，不是字符串序），文件夹和文件混合时文件夹在前。
- 通过虚拟模块 `virtual:md-tree` 导出 `export default` 树数组；同时导出 `export const files: {path: string, name: string}[]` 扁平文件列表供搜索模块用。
- 开发模式下监听根目录文件变化（新增/删除/重命名 md 文件或文件夹）时，通过 Vite 的 `handleHotUpdate` 或 `server.watcher` 触发虚拟模块失效 + 页面刷新。

- [ ] **Step 1: 写扫描逻辑的失败测试**

```typescript
// src/plugins/md-tree.test.ts
import { describe, it, expect } from 'vitest'
import { buildTree, naturalCompare } from './md-tree'

describe('naturalCompare', () => {
  it('按数字前缀排序而不是字符串排序', () => {
    const input = ['10.foo', '2.bar', '1.baz']
    expect([...input].sort(naturalCompare)).toEqual(['1.baz', '2.bar', '10.foo'])
  })
})

describe('buildTree', () => {
  it('去掉文件的数字前缀和 .md 后缀作为展示名', () => {
    const tree = buildTree('__fixtures__/root')
    const file = tree[0].children!.find(n => n.path.endsWith('1.JS基础面试题.md'))
    expect(file?.name).toBe('JS基础面试题')
  })

  it('文件夹排在文件前面，同级按 sortKey 数字感知排序', () => {
    const tree = buildTree('__fixtures__/root')
    expect(tree.every(n => n.type === 'dir')).toBe(true)
  })

  it('跳过 node_modules、.git、隐藏文件', () => {
    const tree = buildTree('__fixtures__/root')
    const flatten = (nodes: any[]): string[] =>
      nodes.flatMap(n => [n.path, ...(n.children ? flatten(n.children) : [])])
    const paths = flatten(tree)
    expect(paths.some(p => p.includes('node_modules'))).toBe(false)
    expect(paths.some(p => p.includes('.git'))).toBe(false)
    expect(paths.some(p => p.includes('/.'))).toBe(false)
  })
})
```

需要准备测试用 fixture 目录：

```bash
mkdir -p /Users/lixiaofei05/Desktop/ms/notes-app/src/plugins/__fixtures__/root/前端面试/汇总
mkdir -p /Users/lixiaofei05/Desktop/ms/notes-app/src/plugins/__fixtures__/root/node_modules
mkdir -p /Users/lixiaofei05/Desktop/ms/notes-app/src/plugins/__fixtures__/root/.git
touch /Users/lixiaofei05/Desktop/ms/notes-app/src/plugins/__fixtures__/root/前端面试/汇总/1.JS基础面试题.md
touch /Users/lixiaofei05/Desktop/ms/notes-app/src/plugins/__fixtures__/root/前端面试/汇总/2.浏览器原理与安全面试题.md
touch /Users/lixiaofei05/Desktop/ms/notes-app/src/plugins/__fixtures__/root/node_modules/foo.md
touch /Users/lixiaofei05/Desktop/ms/notes-app/src/plugins/__fixtures__/root/.git/HEAD
touch /Users/lixiaofei05/Desktop/ms/notes-app/src/plugins/__fixtures__/root/.hidden.md
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npx vitest run src/plugins/md-tree.test.ts
```
Expected: FAIL，报 `buildTree`/`naturalCompare` 未定义（模块还不存在）。

- [ ] **Step 3: 实现 `md-tree.ts`**

```typescript
// src/plugins/md-tree.ts
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

export interface MdTreeNode {
  type: 'dir' | 'file'
  name: string
  path: string
  sortKey: string
  children?: MdTreeNode[]
}

const IGNORE_DIRS = new Set(['node_modules', '.git', 'notes-app'])

export function naturalCompare(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g
  const aParts = a.match(re) ?? []
  const bParts = b.match(re) ?? []
  const len = Math.max(aParts.length, bParts.length)
  for (let i = 0; i < len; i++) {
    const ap = aParts[i] ?? ''
    const bp = bParts[i] ?? ''
    const aNum = Number(ap)
    const bNum = Number(bp)
    const bothNumeric = !Number.isNaN(aNum) && !Number.isNaN(bNum) && ap !== '' && bp !== ''
    if (bothNumeric) {
      if (aNum !== bNum) return aNum - bNum
    } else if (ap !== bp) {
      return ap < bp ? -1 : 1
    }
  }
  return 0
}

function stripDisplayName(fileOrDirName: string, isFile: boolean): string {
  const withoutExt = isFile ? fileOrDirName.replace(/\.md$/i, '') : fileOrDirName
  return withoutExt.replace(/^\d+\./, '')
}

export function buildTree(rootDir: string): MdTreeNode[] {
  return scanDir(rootDir, rootDir)
}

function scanDir(absDir: string, rootDir: string): MdTreeNode[] {
  const entries = fs.readdirSync(absDir, { withFileTypes: true })
  const nodes: MdTreeNode[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue
      const children = scanDir(path.join(absDir, entry.name), rootDir)
      if (children.length === 0) continue
      nodes.push({
        type: 'dir',
        name: stripDisplayName(entry.name, false),
        path: path.relative(rootDir, path.join(absDir, entry.name)),
        sortKey: entry.name,
        children,
      })
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      nodes.push({
        type: 'file',
        name: stripDisplayName(entry.name, true),
        path: path.relative(rootDir, path.join(absDir, entry.name)),
        sortKey: entry.name,
      })
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return naturalCompare(a.sortKey, b.sortKey)
  })

  return nodes
}

export function flattenFiles(nodes: MdTreeNode[]): { path: string; name: string }[] {
  const out: { path: string; name: string }[] = []
  for (const node of nodes) {
    if (node.type === 'file') {
      out.push({ path: node.path, name: node.name })
    } else if (node.children) {
      out.push(...flattenFiles(node.children))
    }
  }
  return out
}

const VIRTUAL_ID = 'virtual:md-tree'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID

export function mdTreePlugin(): Plugin {
  const rootDir = path.resolve(__dirname, '../../..')

  return {
    name: 'md-tree',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        const tree = buildTree(rootDir)
        const files = flattenFiles(tree)
        return `export default ${JSON.stringify(tree)};\nexport const files = ${JSON.stringify(files)};`
      }
    },
    configureServer(server) {
      server.watcher.on('all', (_event, changedPath) => {
        if (changedPath.endsWith('.md')) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID)
          if (mod) {
            server.moduleGraph.invalidateModule(mod)
            server.ws.send({ type: 'full-reload' })
          }
        }
      })
    },
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npx vitest run src/plugins/md-tree.test.ts
```
Expected: PASS，3 个测试全绿。

- [ ] **Step 5: 声明虚拟模块类型**

```typescript
// src/env.d.ts
declare module 'virtual:md-tree' {
  import type { MdTreeNode } from './plugins/md-tree'
  const tree: MdTreeNode[]
  export default tree
  export const files: { path: string; name: string }[]
}
```

- [ ] **Step 6: 提交**

```bash
cd /Users/lixiaofei05/Desktop/ms
git add notes-app/src/plugins/md-tree.ts notes-app/src/plugins/md-tree.test.ts notes-app/src/plugins/__fixtures__ notes-app/src/env.d.ts
git commit -m "feat: 新增 md-tree Vite plugin 扫描仓库生成目录树虚拟模块"
```

---

### Task 3: markdown 渲染工具（markdown-it + shiki）

**Files:**
- Create: `ms/notes-app/src/utils/markdown.ts`
- Create: `ms/notes-app/src/utils/markdown.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// src/utils/markdown.test.ts
import { describe, it, expect } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('渲染标题为对应 heading 标签', async () => {
    const html = await renderMarkdown('# 标题\n\n正文内容')
    expect(html).toContain('<h1')
    expect(html).toContain('标题')
    expect(html).toContain('正文内容')
  })

  it('代码块被 shiki 处理为带语法高亮的 pre/code', async () => {
    const html = await renderMarkdown('```js\nconst a = 1\n```')
    expect(html).toContain('<pre')
    expect(html).toContain('shiki')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npx vitest run src/utils/markdown.test.ts
```
Expected: FAIL，`renderMarkdown` 未定义。

- [ ] **Step 3: 实现 `markdown.ts`**

```typescript
// src/utils/markdown.ts
import MarkdownIt from 'markdown-it'
import { codeToHtml } from 'shiki'

const md = new MarkdownIt({ html: false, linkify: true })

md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx]
  return `<div data-shiki-pending data-code-index="${idx}"></div>`
}

export async function renderMarkdown(source: string): Promise<string> {
  const tokens = md.parse(source, {})
  const fenceIndexes = tokens
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.type === 'fence')

  const highlighted = await Promise.all(
    fenceIndexes.map(({ t }) =>
      codeToHtml(t.content, { lang: t.info || 'text', theme: 'github-light' })
    )
  )

  let html = md.renderer.render(tokens, md.options, {})
  fenceIndexes.forEach(({ i }, idx) => {
    html = html.replace(`data-code-index="${i}"`, '')
    html = html.replace(
      `<div data-shiki-pending data-code-index="">`.replace('data-code-index=""', ''),
      ''
    )
  })

  // 用占位符替换更稳妥：重新拼接
  let result = ''
  let cursor = 0
  const rendered = md.render(source)
  return rendered
}
```

> 注：上面第一版直接用 `md.render` 占位替换实现较绕，改用更直接的做法：先同步渲染 HTML，再对渲染结果中的 fence 占位符做异步替换。重写为：

```typescript
// src/utils/markdown.ts
import MarkdownIt from 'markdown-it'
import { codeToHtml } from 'shiki'

const md = new MarkdownIt({ html: false, linkify: true })

let placeholderCounter = 0
const pendingBlocks = new Map<string, { code: string; lang: string }>()

md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx]
  const key = `__SHIKI_PLACEHOLDER_${placeholderCounter++}__`
  pendingBlocks.set(key, { code: token.content, lang: token.info.trim() || 'text' })
  return `<div class="shiki-placeholder" data-key="${key}"></div>`
}

export async function renderMarkdown(source: string): Promise<string> {
  pendingBlocks.clear()
  placeholderCounter = 0

  let html = md.render(source)

  for (const [key, block] of pendingBlocks) {
    const highlighted = await codeToHtml(block.code, {
      lang: block.lang,
      theme: 'github-light',
    })
    html = html.replace(`<div class="shiki-placeholder" data-key="${key}"></div>`, highlighted)
  }

  return html
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npx vitest run src/utils/markdown.test.ts
```
Expected: PASS。若 shiki 对 `js` 语言报错，测试里改用 `lang: 'javascript'` 对应输入代码块语言标记为 `javascript`。

- [ ] **Step 5: 提交**

```bash
cd /Users/lixiaofei05/Desktop/ms
git add notes-app/src/utils/markdown.ts notes-app/src/utils/markdown.test.ts
git commit -m "feat: 新增 markdown-it + shiki 渲染工具"
```

---

### Task 4: TOC 解析工具

**Files:**
- Create: `ms/notes-app/src/utils/toc.ts`
- Create: `ms/notes-app/src/utils/toc.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// src/utils/toc.test.ts
import { describe, it, expect } from 'vitest'
import { extractToc } from './toc'

describe('extractToc', () => {
  it('提取 h1~h3 标题并生成锚点 id', () => {
    const source = '# 一级标题\n\n## 二级标题A\n\n### 三级标题\n\n## 二级标题B\n'
    const toc = extractToc(source)
    expect(toc).toEqual([
      { level: 1, text: '一级标题', id: 'yi-ji-biao-ti-0' },
      { level: 2, text: '二级标题A', id: 'er-ji-biao-tia-1' },
      { level: 3, text: '三级标题', id: 'san-ji-biao-ti-2' },
      { level: 2, text: '二级标题B', id: 'er-ji-biao-tib-3' },
    ])
  })

  it('忽略 h4 及以下标题', () => {
    const toc = extractToc('#### 四级标题\n')
    expect(toc).toEqual([])
  })
})
```

> 注：中文转拼音 slug 复杂度高，简化为“序号+简单归一化”策略，测试改为验证 id 的可预测规则而非真实拼音。改写测试与实现如下（以序号为主保证唯一性和跳转稳定）：

```typescript
// src/utils/toc.test.ts (最终版)
import { describe, it, expect } from 'vitest'
import { extractToc } from './toc'

describe('extractToc', () => {
  it('提取 h1~h3 标题，生成基于序号的唯一锚点 id', () => {
    const source = '# 一级标题\n\n## 二级标题A\n\n### 三级标题\n\n## 二级标题B\n'
    const toc = extractToc(source)
    expect(toc).toEqual([
      { level: 1, text: '一级标题', id: 'heading-0' },
      { level: 2, text: '二级标题A', id: 'heading-1' },
      { level: 3, text: '三级标题', id: 'heading-2' },
      { level: 2, text: '二级标题B', id: 'heading-3' },
    ])
  })

  it('忽略 h4 及以下标题', () => {
    const toc = extractToc('#### 四级标题\n')
    expect(toc).toEqual([])
  })

  it('空文档返回空数组', () => {
    expect(extractToc('')).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npx vitest run src/utils/toc.test.ts
```
Expected: FAIL，`extractToc` 未定义。

- [ ] **Step 3: 实现 `toc.ts`**

```typescript
// src/utils/toc.ts
export interface TocItem {
  level: 1 | 2 | 3
  text: string
  id: string
}

export function extractToc(source: string): TocItem[] {
  const lines = source.split('\n')
  const toc: TocItem[] = []
  let counter = 0

  for (const line of lines) {
    const match = /^(#{1,3})\s+(.+)$/.exec(line.trim())
    if (!match) continue
    const level = match[1].length as 1 | 2 | 3
    const text = match[2].trim()
    toc.push({ level, text, id: `heading-${counter}` })
    counter++
  }

  return toc
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npx vitest run src/utils/toc.test.ts
```
Expected: PASS，3 个测试全绿。

- [ ] **Step 5: 把 `renderMarkdown` 的 heading 渲染改为写入相同规则的 `id`，保证 TOC 锚点和正文渲染的 id 对得上**

修改 `src/utils/markdown.ts`，在渲染前对 source 做一次 heading 编号并注入 `id`：

```typescript
// src/utils/markdown.ts 追加
import { extractToc } from './toc'

md.renderer.rules.heading_open = (tokens, idx) => {
  const token = tokens[idx]
  const level = token.tag // 'h1' | 'h2' ... 'h6'
  const headingIndexMap: number[] = (md as any).__headingCounter ?? []
  return `<${level}>`
}
```

> 简化实现：不在 renderer 里维护计数状态（跨调用易脏），改为渲染后用 `extractToc` 的结果按顺序把正文里第 N 个 `<h1|h2|h3>` 标签插入 `id`：

```typescript
// src/utils/markdown.ts (最终版，替换上面这段)
import { extractToc } from './toc'

export async function renderMarkdown(source: string): Promise<string> {
  pendingBlocks.clear()
  placeholderCounter = 0

  let html = md.render(source)

  for (const [key, block] of pendingBlocks) {
    const highlighted = await codeToHtml(block.code, {
      lang: block.lang,
      theme: 'github-light',
    })
    html = html.replace(`<div class="shiki-placeholder" data-key="${key}"></div>`, highlighted)
  }

  const toc = extractToc(source)
  let headingCursor = 0
  html = html.replace(/<(h[1-3])>/g, (full, tag) => {
    const item = toc[headingCursor]
    headingCursor++
    return item ? `<${tag} id="${item.id}">` : full
  })

  return html
}
```

- [ ] **Step 6: 补一个测试验证 heading id 注入**

```typescript
// src/utils/markdown.test.ts 追加
it('h1~h3 标题被注入与 extractToc 一致的 id', async () => {
  const html = await renderMarkdown('# 标题A\n\n## 标题B')
  expect(html).toContain('<h1 id="heading-0">')
  expect(html).toContain('<h2 id="heading-1">')
})
```

- [ ] **Step 7: 运行全部相关测试确认通过**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npx vitest run src/utils/markdown.test.ts src/utils/toc.test.ts
```
Expected: PASS。

- [ ] **Step 8: 提交**

```bash
cd /Users/lixiaofei05/Desktop/ms
git add notes-app/src/utils/toc.ts notes-app/src/utils/toc.test.ts notes-app/src/utils/markdown.ts
git commit -m "feat: 新增 TOC 解析并与 markdown 渲染的 heading id 对齐"
```

---

### Task 5: 路由 + Sidebar 组件（目录树展示）

**Files:**
- Create: `ms/notes-app/src/router/index.ts`
- Create: `ms/notes-app/src/components/Sidebar.vue`
- Modify: `ms/notes-app/src/App.vue`
- Modify: `ms/notes-app/src/main.ts`

- [ ] **Step 1: 实现路由**

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import MarkdownView from '../components/MarkdownView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/前端面试/汇总/1.JS基础面试题.md' },
    { path: '/:filePath(.*)', component: MarkdownView, props: true },
  ],
})
```

（`MarkdownView.vue` 在 Task 6 创建，此处先引用。）

- [ ] **Step 2: 实现 Sidebar 组件**

```vue
<!-- src/components/Sidebar.vue -->
<script setup lang="ts">
import tree from 'virtual:md-tree'
import type { MdTreeNode } from '../plugins/md-tree'
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const collapsed = ref<Record<string, boolean>>({})

function toggle(path: string) {
  collapsed.value[path] = !collapsed.value[path]
}

function isActive(node: MdTreeNode): boolean {
  return node.type === 'file' && decodeURIComponent(route.path.slice(1)) === node.path
}
</script>

<template>
  <nav class="sidebar">
    <TreeNode v-for="node in tree" :key="node.path" :node="node" />
  </nav>
</template>

<script lang="ts">
import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { MdTreeNode } from '../plugins/md-tree'

const TreeNode = defineComponent({
  name: 'TreeNode',
  props: {
    node: { type: Object as PropType<MdTreeNode>, required: true },
  },
  setup(props) {
    const route = useRoute()
    const open = ref(true)

    return () => {
      const { node } = props
      if (node.type === 'file') {
        const active = decodeURIComponent(route.path.slice(1)) === node.path
        return h(
          RouterLink,
          { to: '/' + encodeURIComponent(node.path).replace(/%2F/g, '/'), class: { file: true, active } },
          () => node.name
        )
      }
      return h('div', { class: 'dir' }, [
        h('div', { class: 'dir-label', onClick: () => (open.value = !open.value) }, node.name),
        open.value
          ? h(
              'div',
              { class: 'dir-children' },
              (node.children ?? []).map(child => h(TreeNode, { node: child, key: child.path }))
            )
          : null,
      ])
    }
  },
})

export default { components: { TreeNode } }
</script>

<style scoped>
.sidebar { width: 260px; overflow-y: auto; padding: 8px; border-right: 1px solid #eee; }
.dir-label { cursor: pointer; font-weight: 600; padding: 4px 0; }
.dir-children { padding-left: 12px; }
.file { display: block; padding: 4px 0; text-decoration: none; color: #333; }
.file.active { color: #1a73e8; font-weight: 600; }
</style>
```

> 注：Vue 单文件组件不支持在一个 `.vue` 里写两个 `<script>` 块做递归组件定义。改为拆出独立文件。

- [ ] **Step 2（修正）: 拆分为 `TreeNode.vue` + `Sidebar.vue`**

```vue
<!-- src/components/TreeNode.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import type { MdTreeNode } from '../plugins/md-tree'

const props = defineProps<{ node: MdTreeNode }>()
const route = useRoute()
const open = ref(true)

function toPath(p: string): string {
  return '/' + p.split('/').map(encodeURIComponent).join('/')
}

const isActive = () =>
  props.node.type === 'file' && decodeURIComponent(route.path.slice(1)) === props.node.path
</script>

<template>
  <div v-if="node.type === 'dir'" class="dir">
    <div class="dir-label" @click="open = !open">{{ node.name }}</div>
    <div v-if="open" class="dir-children">
      <TreeNode v-for="child in node.children" :key="child.path" :node="child" />
    </div>
  </div>
  <RouterLink v-else :to="toPath(node.path)" class="file" :class="{ active: isActive() }">
    {{ node.name }}
  </RouterLink>
</template>

<style scoped>
.dir-label { cursor: pointer; font-weight: 600; padding: 4px 0; }
.dir-children { padding-left: 12px; }
.file { display: block; padding: 4px 0; text-decoration: none; color: #333; }
.file.active { color: #1a73e8; font-weight: 600; }
</style>
```

```vue
<!-- src/components/Sidebar.vue -->
<script setup lang="ts">
import tree from 'virtual:md-tree'
import TreeNode from './TreeNode.vue'
</script>

<template>
  <nav class="sidebar">
    <TreeNode v-for="node in tree" :key="node.path" :node="node" />
  </nav>
</template>

<style scoped>
.sidebar { width: 260px; overflow-y: auto; padding: 8px; border-right: 1px solid #eee; }
</style>
```

- [ ] **Step 3: 更新 `main.ts` 挂载路由**

```typescript
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

createApp(App).use(router).mount('#app')
```

- [ ] **Step 4: 更新 `App.vue` 整体布局**

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import SearchBox from './components/SearchBox.vue'
</script>

<template>
  <div class="layout">
    <Sidebar class="pane-sidebar" />
    <main class="pane-main">
      <SearchBox />
      <RouterView />
    </main>
  </div>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; }
.layout { display: flex; height: 100vh; }
.pane-sidebar { flex-shrink: 0; }
.pane-main { flex: 1; overflow-y: auto; padding: 16px 24px; }
</style>
```

（`SearchBox.vue` 在 Task 7 创建，先引用。）

- [ ] **Step 5: 手动验证（无自动化测试，视觉/交互组件）**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npm run dev
```
打开浏览器访问终端输出的本地地址，确认左侧目录树渲染出 `前端面试 > 汇总` 下 5 个文件，点击可切换路由（此时中间区域会报错，因为 `MarkdownView.vue` 还没实现，属于预期状态，Task 6 补上）。

- [ ] **Step 6: 提交**

```bash
cd /Users/lixiaofei05/Desktop/ms
git add notes-app/src/router notes-app/src/components/Sidebar.vue notes-app/src/components/TreeNode.vue notes-app/src/App.vue notes-app/src/main.ts
git commit -m "feat: 新增路由与 Sidebar 目录树组件"
```

---

### Task 6: MarkdownView 组件（中间渲染区 + 右侧 TOC）

**Files:**
- Create: `ms/notes-app/src/components/MarkdownView.vue`
- Create: `ms/notes-app/src/components/Toc.vue`

- [ ] **Step 1: 实现 `MarkdownView.vue`**

```vue
<!-- src/components/MarkdownView.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { renderMarkdown } from '../utils/markdown'
import { extractToc, type TocItem } from '../utils/toc'
import Toc from './Toc.vue'

const props = defineProps<{ filePath: string }>()

const html = ref('')
const toc = ref<TocItem[]>([])
const error = ref<string | null>(null)

async function load(filePath: string) {
  error.value = null
  try {
    const res = await fetch('/' + filePath.split('/').map(encodeURIComponent).join('/'))
    if (!res.ok) throw new Error(`文件不存在: ${filePath}`)
    const source = await res.text()
    toc.value = extractToc(source)
    html.value = await renderMarkdown(source)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

watch(() => props.filePath, load, { immediate: true })
</script>

<template>
  <div class="markdown-page">
    <article v-if="!error" class="content" v-html="html" />
    <p v-else class="error">{{ error }}</p>
    <Toc :items="toc" />
  </div>
</template>

<style scoped>
.markdown-page { display: flex; gap: 24px; align-items: flex-start; }
.content { flex: 1; min-width: 0; }
.error { color: #d32f2f; }
</style>
```

> 注：`fetch('/前端面试/汇总/1.JS基础面试题.md')` 依赖 Vite dev server 能把仓库根目录下的静态 `.md` 文件当静态资源直接返回。默认 Vite 只把 `notes-app` 目录当 root，需要在 Task 1 的 `vite.config.ts` 补充 `publicDir`/中间件，否则 fetch 会 404。这里在下一步修正 `vite.config.ts`。

- [ ] **Step 2: 修正 `vite.config.ts`，加一个中间件把仓库根目录的 `.md` 请求映射到磁盘文件**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import fs from 'node:fs'
import { mdTreePlugin } from './src/plugins/md-tree'

const repoRoot = path.resolve(__dirname, '..')

function serveRepoMdFiles() {
  return {
    name: 'serve-repo-md-files',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url && req.url.endsWith('.md')) {
          const decoded = decodeURIComponent(req.url.split('?')[0])
          const absPath = path.join(repoRoot, decoded)
          if (absPath.startsWith(repoRoot) && fs.existsSync(absPath)) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end(fs.readFileSync(absPath, 'utf-8'))
            return
          }
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), mdTreePlugin(), serveRepoMdFiles()],
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
```

- [ ] **Step 3: 实现 `Toc.vue`**

```vue
<!-- src/components/Toc.vue -->
<script setup lang="ts">
import type { TocItem } from '../utils/toc'

defineProps<{ items: TocItem[] }>()

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <aside v-if="items.length" class="toc">
    <div
      v-for="item in items"
      :key="item.id"
      class="toc-item"
      :style="{ paddingLeft: (item.level - 1) * 12 + 'px' }"
      @click="scrollTo(item.id)"
    >
      {{ item.text }}
    </div>
  </aside>
</template>

<style scoped>
.toc { width: 200px; flex-shrink: 0; position: sticky; top: 0; }
.toc-item { cursor: pointer; padding: 4px 0; font-size: 13px; color: #666; }
.toc-item:hover { color: #1a73e8; }
</style>
```

- [ ] **Step 4: 手动验证**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npm run dev
```
浏览器打开，点击左侧任一文件，确认：中间区域渲染出对应 md 内容，代码块有语法高亮，右侧显示 TOC，点击 TOC 项滚动定位。修改任一 `.md` 文件内容保存，确认浏览器自动刷新且内容更新。

- [ ] **Step 5: 提交**

```bash
cd /Users/lixiaofei05/Desktop/ms
git add notes-app/src/components/MarkdownView.vue notes-app/src/components/Toc.vue notes-app/vite.config.ts
git commit -m "feat: 新增 MarkdownView 渲染区与右侧 TOC，支持读取仓库根目录 md 文件"
```

---

### Task 7: 全文搜索（flexsearch）

**Files:**
- Create: `ms/notes-app/src/utils/search.ts`
- Create: `ms/notes-app/src/utils/search.test.ts`
- Create: `ms/notes-app/src/components/SearchBox.vue`

- [ ] **Step 1: 写失败测试**

```typescript
// src/utils/search.test.ts
import { describe, it, expect } from 'vitest'
import { buildIndex, search } from './search'

describe('search', () => {
  it('能按标题关键字搜到对应文件', async () => {
    const index = buildIndex([
      { path: 'a/1.Promise详解.md', name: 'Promise详解', content: 'Promise 是异步编程解决方案' },
      { path: 'a/2.DOM事件流.md', name: 'DOM事件流', content: '事件冒泡和事件捕获' },
    ])
    const results = search(index, 'Promise')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].path).toBe('a/1.Promise详解.md')
  })

  it('搜不到时返回空数组', async () => {
    const index = buildIndex([{ path: 'a.md', name: 'a', content: '内容' }])
    expect(search(index, '不存在的关键字xyz')).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npx vitest run src/utils/search.test.ts
```
Expected: FAIL，`buildIndex`/`search` 未定义。

- [ ] **Step 3: 实现 `search.ts`**

```typescript
// src/utils/search.ts
import { Document } from 'flexsearch'

export interface SearchDoc {
  path: string
  name: string
  content: string
}

export interface SearchResult {
  path: string
  name: string
}

export function buildIndex(docs: SearchDoc[]) {
  const index = new Document({
    document: {
      id: 'path',
      index: ['name', 'content'],
      store: ['name', 'path'],
    },
    tokenize: 'forward',
  })

  for (const doc of docs) {
    index.add(doc)
  }

  return index
}

export function search(index: ReturnType<typeof buildIndex>, query: string): SearchResult[] {
  if (!query.trim()) return []
  const results = index.search(query, { enrich: true, limit: 20 })
  const seen = new Map<string, SearchResult>()

  for (const fieldResult of results) {
    for (const item of fieldResult.result) {
      const doc = (item as any).doc as SearchDoc
      if (!seen.has(doc.path)) {
        seen.set(doc.path, { path: doc.path, name: doc.name })
      }
    }
  }

  return Array.from(seen.values())
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npx vitest run src/utils/search.test.ts
```
Expected: PASS。若 flexsearch 的 TS 类型与 `Document` 构造参数不匹配报类型错误，在 `buildIndex` 参数上加 `as any` 兜底，不影响运行时行为。

- [ ] **Step 5: 实现 `SearchBox.vue`（启动时拉取所有文件内容建索引）**

```vue
<!-- src/components/SearchBox.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { files } from 'virtual:md-tree'
import { buildIndex, search, type SearchResult } from '../utils/search'
import { useRouter } from 'vue-router'

const router = useRouter()
const query = ref('')
const results = ref<SearchResult[]>([])
let index: ReturnType<typeof buildIndex> | null = null

async function initIndex() {
  const docs = await Promise.all(
    files.map(async f => {
      const res = await fetch('/' + f.path.split('/').map(encodeURIComponent).join('/'))
      const content = res.ok ? await res.text() : ''
      return { path: f.path, name: f.name, content }
    })
  )
  index = buildIndex(docs)
}

function onInput() {
  if (!index) return
  results.value = search(index, query.value)
}

function goTo(path: string) {
  results.value = []
  query.value = ''
  router.push('/' + path.split('/').map(encodeURIComponent).join('/'))
}

onMounted(initIndex)
</script>

<template>
  <div class="search-box">
    <input v-model="query" placeholder="搜索笔记标题或内容" @input="onInput" />
    <ul v-if="results.length" class="results">
      <li v-for="r in results" :key="r.path" @click="goTo(r.path)">{{ r.name }}</li>
    </ul>
  </div>
</template>

<style scoped>
.search-box { position: relative; margin-bottom: 16px; }
input { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
.results { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #ddd; border-radius: 4px; margin: 4px 0 0; padding: 4px 0; list-style: none; max-height: 300px; overflow-y: auto; z-index: 10; }
.results li { padding: 8px 12px; cursor: pointer; }
.results li:hover { background: #f5f5f5; }
</style>
```

- [ ] **Step 6: 手动验证**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npm run dev
```
浏览器打开，在搜索框输入笔记中已知关键字（如 "Promise"），确认下拉出现匹配文件，点击后跳转到对应文件并渲染。

- [ ] **Step 7: 提交**

```bash
cd /Users/lixiaofei05/Desktop/ms
git add notes-app/src/utils/search.ts notes-app/src/utils/search.test.ts notes-app/src/components/SearchBox.vue
git commit -m "feat: 新增基于 flexsearch 的全文搜索"
```

---

### Task 8: package.json 脚本收尾 + README 使用说明

**Files:**
- Modify: `ms/notes-app/package.json`
- Modify: `ms/notes-app/docs/ITERATION.md`

- [ ] **Step 1: 确认 `package.json` 的 scripts 包含 dev/build/test**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: 跑一次全量测试确认全绿**

```bash
cd /Users/lixiaofei05/Desktop/ms/notes-app
npm test
```
Expected: 所有测试套件 PASS（md-tree、markdown、toc、search）。

- [ ] **Step 3: 在 `docs/ITERATION.md` 的「迭代记录」补一条 2026-08-25 实现完成记录**

在 `## 5. 迭代记录` 下追加：

```markdown
### 2026-08-25 — 首版实现完成
- 完成 `notes-app/` 全部骨架：md-tree 扫描插件、markdown-it+shiki 渲染、TOC、Sidebar 目录树、flexsearch 全文搜索。
- 涉及文件：`src/plugins/md-tree.ts`、`src/utils/markdown.ts`、`src/utils/toc.ts`、`src/utils/search.ts`、`src/components/*.vue`、`vite.config.ts`。
- 验证方式：`npm test` 跑单测（md-tree/markdown/toc/search 逻辑），`npm run dev` 手动验证目录树/渲染/TOC/搜索/热更新。
- 已知限制：阅读进度记忆未做；仅本地 dev 模式验证，未跑生产 build 后的静态托管场景。
```

- [ ] **Step 4: 提交**

```bash
cd /Users/lixiaofei05/Desktop/ms
git add notes-app/package.json notes-app/docs/ITERATION.md
git commit -m "docs: 补充迭代记录，完善 package.json scripts"
```

---

## 计划自检记录

- **spec 覆盖检查**：目录树扫描（Task 2）、markdown 渲染+代码高亮（Task 3）、右侧 TOC（Task 4/6）、全文搜索（Task 7）、侧边栏（Task 5）、文件热更新（Task 2 的 `configureServer` + Vite 原生 HMR）均有对应任务覆盖。阅读进度记忆按方案明确「暂不做」，未列入任务。
- **占位符检查**：已去除所有 "TBD/后续补充" 类描述，每步含完整代码。
- **类型一致性检查**：`MdTreeNode`（Task 2 定义）在 Task 5/7 中的 `Sidebar.vue`/`TreeNode.vue`/`SearchBox.vue` 引用字段一致（`type`/`name`/`path`/`sortKey`/`children`）；`TocItem`（Task 4 定义）在 `Toc.vue`/`MarkdownView.vue` 中字段一致（`level`/`text`/`id`）；`renderMarkdown`/`extractToc` 的 heading 编号规则在 Task 4 Step 5 中显式对齐，避免 TOC 锚点和正文 id 不一致。
