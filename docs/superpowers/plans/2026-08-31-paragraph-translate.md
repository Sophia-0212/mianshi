# 段落即时翻译按钮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 notes-app 每个段落（p/li/blockquote）末尾加一个小翻译按钮，点击后实时调用百度内部 Ducc 网关（OpenAI 兼容接口，模型 gpt-5.5）把该段中文翻成英文并插入到段落下方，再次点击隐藏；结果按段落内容 hash 缓存到 localStorage。

**Architecture:** `translate.ts` 封装对 `/api/translate` 的调用；vite 插件在开发服务器内加一个中间件，接收 `/api/translate` 请求，服务端用 `OPENAI_API_KEY` 环境变量转发给 Ducc 网关做翻译（Key 不下发到浏览器）；`markdown.ts` 渲染阶段给 p/li/blockquote 打上稳定序号并注入按钮标记，同时把每段的纯文本抽出来一起返回；`MarkdownView.vue` 用事件代理监听按钮点击，查 localStorage 缓存 → 未命中调 `translateText` → 直接操作真实 DOM 插入/切换英文译文。

**Tech Stack:** Vue 3 + TypeScript, markdown-it, vitest, Vite dev server middleware, OpenAI 兼容 Chat Completions API (Ducc 网关)

---

## Task 1: Vite 中间件转发翻译请求到 Ducc 网关

**Files:**
- Modify: `notes-app/vite.config.ts`
- Create: `notes-app/.env`（不提交 git）
- Modify: `notes-app/.gitignore`

- [ ] **Step 1: 确认 `.env` 已被忽略，创建 `.env`**

Read `notes-app/.gitignore`，若没有 `.env` 规则，用 Edit 在文件末尾追加一行：

```
.env
```

创建 `notes-app/.env`（此文件不会被提交，仅本机使用）：

```
OPENAI_API_KEY=sk-d4gFnBnLNhhCmxHf5f2d5cF54dB34cF5AdD85c2f59E04e74
```

- [ ] **Step 2: 在 `vite.config.ts` 里新增翻译中间件插件**

Read `notes-app/vite.config.ts` 当前完整内容。在 `serveRepoMdFiles` 函数定义之后（`export default defineConfig` 之前）新增一个函数：

```ts
function translateProxy(): Plugin {
  return {
    name: 'translate-proxy',
    configureServer(server) {
      server.middlewares.use('/api/translate', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          void handleTranslateRequest(body, res)
        })
      })
    },
  }
}

async function handleTranslateRequest(rawBody: string, res: import('node:http').ServerResponse) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: '服务端未配置 OPENAI_API_KEY' }))
    return
  }

  let text: string
  try {
    const parsed = JSON.parse(rawBody) as { text?: unknown }
    if (typeof parsed.text !== 'string' || !parsed.text.trim()) {
      throw new Error('empty text')
    }
    text = parsed.text
  } catch {
    res.statusCode = 400
    res.end(JSON.stringify({ error: '请求体需为 { text: string }' }))
    return
  }

  try {
    const upstream = await fetch('https://oneapi-comate.baidu-int.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.5',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: '你是专业翻译。把用户输入的中文段落直译成英文，只输出英文译文本身，不要加任何解释、引号或前缀。',
          },
          { role: 'user', content: text },
        ],
      }),
    })

    if (!upstream.ok) {
      res.statusCode = 502
      res.end(JSON.stringify({ error: `上游网关返回 HTTP ${upstream.status}` }))
      return
    }

    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const translation = data.choices?.[0]?.message?.content?.trim()
    if (!translation) {
      res.statusCode = 502
      res.end(JSON.stringify({ error: '上游网关返回内容为空' }))
      return
    }

    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ translation }))
  } catch (err) {
    res.statusCode = 502
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
  }
}
```

然后把 `plugins` 数组：

```ts
  plugins: [vue(), mdTreePlugin(), serveRepoMdFiles()],
```

改成：

```ts
  plugins: [vue(), mdTreePlugin(), serveRepoMdFiles(), translateProxy()],
```

- [ ] **Step 3: 手动验证中间件生效**

Run: `cd notes-app && npm run dev`

另开终端执行：

```bash
curl -s -X POST 'http://localhost:5173/api/translate' \
  -H 'Content-Type: application/json' \
  -d '{"text":"你好，世界"}'
```

Expected: 返回 `{"translation":"..."}`，英文内容大意为 "Hello, world"。如果返回 500/502 或 `error` 字段，先检查 `.env` 里的 `OPENAI_API_KEY` 是否正确加载（Vite 需要重启才能读取新写入的 `.env`），再检查网络能否访问 `oneapi-comate.baidu-int.com`（该网关是百度内网地址，需在可访问该内网的环境下运行）。如果确认排查后仍失败，停下来告知用户，不要继续凑合往下实现。

停掉 dev server。

- [ ] **Step 4: Commit**

```bash
cd /Users/lixiaofei05/Desktop/ms
git add notes-app/vite.config.ts notes-app/.gitignore
git commit -m "feat: 新增翻译请求转发中间件，接入Ducc网关"
```

（`.env` 本身不会被 `git add` 提交，因为已加入 `.gitignore`。）

## Task 2: `translate.ts` — 翻译服务封装

**Files:**
- Create: `notes-app/src/utils/translate.ts`
- Test: `notes-app/src/utils/translate.test.ts`

- [ ] **Step 1: 写失败测试 — 成功路径解析网关响应**

`/api/translate` 中间件返回形如：

```json
{"translation":"Hello, world"}
```

创建 `notes-app/src/utils/translate.test.ts`：

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { translateText } from './translate'

describe('translateText', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('成功时返回译文', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translation: 'Hello, world' }),
    }) as unknown as typeof fetch

    const result = await translateText('你好，世界')
    expect(result).toBe('Hello, world')
  })

  it('HTTP 响应非 ok 时抛出错误', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: '服务端未配置 OPENAI_API_KEY' }),
    }) as unknown as typeof fetch

    await expect(translateText('你好')).rejects.toThrow()
  })

  it('响应体缺少 translation 字段时抛出错误', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch

    await expect(translateText('你好')).rejects.toThrow()
  })

  it('translation 为空字符串时抛出错误', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translation: '' }),
    }) as unknown as typeof fetch

    await expect(translateText('你好')).rejects.toThrow()
  })

  it('请求体里包含待翻译文本，走POST + JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translation: 'Test' }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    await translateText('测试')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/translate')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({ text: '测试' })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd notes-app && npx vitest run src/utils/translate.test.ts`
Expected: FAIL，报错 `Failed to resolve import "./translate"` 或类似（模块不存在）

- [ ] **Step 3: 实现 `translate.ts`**

创建 `notes-app/src/utils/translate.ts`：

```ts
interface TranslateResponse {
  translation?: string
  error?: string
}

export async function translateText(text: string): Promise<string> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  const data = (await res.json()) as TranslateResponse

  if (!res.ok) {
    throw new Error(data.error ?? `翻译请求失败: HTTP ${res.status}`)
  }

  if (!data.translation) {
    throw new Error('翻译接口返回内容为空')
  }

  return data.translation
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd notes-app && npx vitest run src/utils/translate.test.ts`
Expected: 5 个测试全部 PASS

- [ ] **Step 5: 真实调用验证一次（手动，非自动化测试）**

Run: `cd notes-app && npm run dev`，浏览器打开页面，在浏览器 console 里执行：

```js
fetch('/api/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: '你好，世界' }),
}).then(r => r.json()).then(console.log)
```

Expected: 返回 `{ translation: "Hello, world" }` 之类的正确译文（措辞可能与示例不完全一致，只要语义正确即可）。如果报错，停下来告知用户，不要继续凑合往下实现。

停掉 dev server。

- [ ] **Step 6: Commit**

```bash
cd /Users/lixiaofei05/Desktop/ms
git add notes-app/src/utils/translate.ts notes-app/src/utils/translate.test.ts
git commit -m "feat: 新增翻译服务封装(调用Ducc网关)"
```

## Task 3: `markdown.ts` — 注入段落翻译按钮与文本提取

**Files:**
- Modify: `notes-app/src/utils/markdown.ts`
- Modify: `notes-app/src/utils/markdown.test.ts`

- [ ] **Step 1: 写失败测试 — 返回值结构变化 + 段落按钮注入**

在 `notes-app/src/utils/markdown.test.ts` 现有 `describe('renderMarkdown', ...)` 块内，把所有 `const html = await renderMarkdown(...)` 改成 `const { html } = await renderMarkdown(...)`（因为返回值要从 `string` 变成 `{ html, paraTexts }`）。具体逐条修改：

```ts
  it('渲染标题为对应 heading 标签', async () => {
    const { html } = await renderMarkdown('# 标题\n\n正文内容')
    expect(html).toContain('<h1')
    expect(html).toContain('标题')
    expect(html).toContain('正文内容')
  })

  it('代码块被 shiki 处理为带语法高亮的 pre/code', async () => {
    const { html } = await renderMarkdown('```js\nconst a = 1\n```')
    expect(html).toContain('<pre')
    expect(html).toContain('shiki')
  })

  it('空字符串输入不报错，且不残留 shiki 占位符', async () => {
    const { html } = await renderMarkdown('')
    expect(html).not.toContain('shiki-placeholder')
  })

  it('不含代码块的纯文本渲染正常，不受占位符逻辑影响', async () => {
    const { html } = await renderMarkdown('这是一段纯文本，没有代码块。')
    expect(html).toContain('这是一段纯文本，没有代码块。')
    expect(html).not.toContain('shiki-placeholder')
    expect(html).not.toContain('<pre')
  })
```

第 5 个测试（多代码块）和第 6 个测试（未知语言降级）同理，把 `const html = await renderMarkdown(source)` 和 `const html = await renderMarkdown('```notalang\nfoo\n```')` 都换成 `const { html } = await renderMarkdown(...)`。

最后一个标题 id 测试：

```ts
  it('h1~h3 标题被注入与 extractToc 一致的 id', async () => {
    const { html } = await renderMarkdown('# 标题A\n\n## 标题B')
    expect(html).toContain('<h1 id="heading-0">')
    expect(html).toContain('<h2 id="heading-1">')
  })
```

在文件末尾追加新的 `describe` 块，测试段落翻译按钮注入：

```ts
describe('renderMarkdown 段落翻译按钮', () => {
  it('为每个 p 标签注入翻译按钮，序号从0递增', async () => {
    const { html } = await renderMarkdown('第一段。\n\n第二段。')
    expect(html).toContain('data-para-index="0"')
    expect(html).toContain('data-para-index="1"')
  })

  it('paraTexts 按序号对应各段纯文本，且不包含按钮标记', async () => {
    const { paraTexts } = await renderMarkdown('第一段。\n\n第二段。')
    expect(paraTexts[0]).toBe('第一段。')
    expect(paraTexts[1]).toBe('第二段。')
  })

  it('li 和 blockquote 也会被注入翻译按钮', async () => {
    const { html, paraTexts } = await renderMarkdown('- 列表项一\n- 列表项二\n\n> 引用内容')
    expect(html).toContain('data-para-index="0"')
    expect(html).toContain('data-para-index="1"')
    expect(html).toContain('data-para-index="2"')
    expect(paraTexts).toEqual(['列表项一', '列表项二', '引用内容'])
  })

  it('标题不会被注入翻译按钮', async () => {
    const { html } = await renderMarkdown('# 标题\n\n正文段落')
    const h1Match = /<h1[^>]*>.*?<\/h1>/s.exec(html)
    expect(h1Match).not.toBeNull()
    expect(h1Match![0]).not.toContain('translate-btn')
  })

  it('代码块不会被注入翻译按钮', async () => {
    const { html } = await renderMarkdown('```js\nconst a = 1\n```')
    expect(html).not.toContain('translate-btn')
  })

  it('空文档 paraTexts 为空数组', async () => {
    const { paraTexts } = await renderMarkdown('')
    expect(paraTexts).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd notes-app && npx vitest run src/utils/markdown.test.ts`
Expected: FAIL —— 旧测试因为 `html` 现在是对象而不是字符串导致 `expect(html).toContain(...)` 报类型/断言失败；新增的 `describe('renderMarkdown 段落翻译按钮', ...)` 测试因为没有 `paraTexts`/按钮标记而失败。

- [ ] **Step 3: 实现段落按钮注入逻辑**

修改 `notes-app/src/utils/markdown.ts`。当前文件结构（Read 过）是：函数体内先处理代码块占位符渲染，然后处理标题 id 注入，最后 `return html`。在标题 id 注入这段代码**之后**、`return` **之前**插入新逻辑，并把返回值类型和签名改掉。

完整替换后的文件内容：

```ts
import MarkdownIt from 'markdown-it'
import { codeToHtml } from 'shiki'
import { extractToc } from './toc'

const md = new MarkdownIt({ html: false, linkify: true })

export interface RenderedMarkdown {
  html: string
  paraTexts: string[]
}

export async function renderMarkdown(source: string): Promise<RenderedMarkdown> {
  // per-call 本地状态：避免并发/重入调用（如快速切换笔记文件）互相清空或串位彼此的代码块占位符数据
  let placeholderCounter = 0
  const pendingBlocks = new Map<string, { code: string; lang: string }>()

  // 每次调用都重新绑定 fence 规则，使其读写当前调用闭包内的局部变量；
  // 由于赋值发生在 md.render(source) 之前，不需要在调用结束后还原
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]
    const key = `__SHIKI_PLACEHOLDER_${placeholderCounter++}__`
    pendingBlocks.set(key, { code: token.content, lang: token.info.trim() || 'text' })
    return `<div class="shiki-placeholder" data-key="${key}"></div>`
  }

  let html = md.render(source)

  for (const [key, block] of pendingBlocks) {
    let highlighted: string
    try {
      highlighted = await codeToHtml(block.code, {
        lang: block.lang,
        theme: 'github-light',
      })
    } catch (err) {
      // 未知语言标识符时降级为纯文本，保证渲染不整体失败
      console.warn(
        `[markdown] shiki 无法高亮语言 "${block.lang}"，降级为 text。原始错误：`,
        err,
      )
      highlighted = await codeToHtml(block.code, {
        lang: 'text',
        theme: 'github-light',
      })
    }
    html = html.replace(`<div class="shiki-placeholder" data-key="${key}"></div>`, highlighted)
  }

  // per-call 本地状态：与 extractToc 的序号方案对齐，按出现顺序给 h1~h3 标签注入锚点 id
  const toc = extractToc(source)
  let headingCursor = 0
  html = html.replace(/<(h[1-3])>/g, (full, tag) => {
    const item = toc[headingCursor]
    headingCursor++
    return item ? `<${tag} id="${item.id}">` : full
  })

  const { html: htmlWithButtons, paraTexts } = injectTranslateButtons(html)

  return { html: htmlWithButtons, paraTexts }
}

// 只给 p / li / blockquote 的最外层标签注入翻译按钮：用正则匹配这三种标签的
// 开始到对应结束标签之间的内容（非贪婪、不跨标签嵌套问题——markdown-it 渲染出的
// p/li/blockquote 内部不会再嵌套同类型标签，li 内的嵌套列表会被包在单独的 ul/ol
// 里，不影响这里的匹配）。按出现顺序编号，序号与 paraTexts 数组下标一一对应。
function injectTranslateButtons(html: string): { html: string; paraTexts: string[] } {
  const paraTexts: string[] = []
  let index = 0

  const withButtons = html.replace(
    /<(p|li|blockquote)>([\s\S]*?)<\/\1>/g,
    (full, tag: string, inner: string) => {
      const text = stripTags(inner).trim()
      if (!text) return full

      const paraIndex = index++
      paraTexts.push(text)

      const button = `<button class="translate-btn" type="button" data-para-index="${paraIndex}" aria-label="翻译">🌐</button>`
      return `<${tag}>${inner}${button}</${tag}>`
    },
  )

  return { html: withButtons, paraTexts }
}

function stripTags(fragment: string): string {
  return fragment.replace(/<[^>]*>/g, '')
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd notes-app && npx vitest run src/utils/markdown.test.ts`
Expected: 全部测试 PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/lixiaofei05/Desktop/ms
git add notes-app/src/utils/markdown.ts notes-app/src/utils/markdown.test.ts
git commit -m "feat: markdown渲染注入段落翻译按钮并抽取段落纯文本"
```

## Task 4: `MarkdownView.vue` — 缓存 + 点击交互 + 样式

**Files:**
- Modify: `notes-app/src/components/MarkdownView.vue`

- [ ] **Step 1: 修改 `<script setup>` 部分**

`renderMarkdown` 返回值已变为对象，`load()` 函数需要同步适配，并新增点击事件代理逻辑、localStorage 缓存逻辑。把 `notes-app/src/components/MarkdownView.vue` 的 `<script setup>` 块整体替换为：

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { renderMarkdown } from '../utils/markdown'
import { extractToc, type TocItem } from '../utils/toc'
import { translateText } from '../utils/translate'
import Toc from './Toc.vue'
import MobileToc from './MobileToc.vue'

const props = defineProps<{ filePath: string }>()

const html = ref('')
const toc = ref<TocItem[]>([])
const error = ref<string | null>(null)
const contentRef = ref<HTMLElement | null>(null)

let paraTexts: string[] = []
let currentFilePath = ''

async function load(filePath: string) {
  error.value = null
  currentFilePath = filePath
  try {
    const res = await fetch('/' + filePath.split('/').map(encodeURIComponent).join('/'), {
      headers: { 'X-Notes-Fetch': '1' },
    })
    if (!res.ok) throw new Error(`文件不存在: ${filePath}`)
    const source = await res.text()
    toc.value = extractToc(source)
    const rendered = await renderMarkdown(source)
    html.value = rendered.html
    paraTexts = rendered.paraTexts
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

watch(() => props.filePath, load, { immediate: true })

// 简单字符串 hash（djb2），用于在笔记内容修改后让旧缓存自然失效，
// 不需要额外维护"缓存版本号"之类的机制
function hashText(text: string): string {
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

function cacheKey(paraIndex: number, text: string): string {
  return `translate:${currentFilePath}:${paraIndex}:${hashText(text)}`
}

function findParaElement(button: HTMLElement): HTMLElement | null {
  return button.closest('p, li, blockquote')
}

async function handleContentClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const button = target.closest('.translate-btn') as HTMLButtonElement | null
  if (!button) return

  const paraIndexAttr = button.dataset.paraIndex
  if (paraIndexAttr === undefined) return
  const paraIndex = Number(paraIndexAttr)
  const text = paraTexts[paraIndex]
  if (!text) return

  const paraEl = findParaElement(button)
  if (!paraEl) return

  const existing = paraEl.nextElementSibling
  if (existing?.classList.contains('translate-result') && existing.getAttribute('data-para-index') === paraIndexAttr) {
    existing.classList.toggle('hidden')
    return
  }

  button.classList.remove('translate-error')
  button.classList.add('translate-loading')

  try {
    const key = cacheKey(paraIndex, text)
    let translated = localStorage.getItem(key)
    if (!translated) {
      translated = await translateText(text)
      localStorage.setItem(key, translated)
    }

    const resultEl = document.createElement('div')
    resultEl.className = 'translate-result'
    resultEl.setAttribute('data-para-index', paraIndexAttr)
    resultEl.textContent = translated
    paraEl.insertAdjacentElement('afterend', resultEl)
  } catch (e) {
    button.classList.add('translate-error')
    console.warn('[translate] 段落翻译失败:', e)
  } finally {
    button.classList.remove('translate-loading')
  }
}
</script>
```

- [ ] **Step 2: 修改 `<template>` 部分，绑定点击事件和 ref**

把 `<template>` 块中的这一行：

```html
    <article v-if="!error" class="content" v-html="html" />
```

改成：

```html
    <article v-if="!error" ref="contentRef" class="content" v-html="html" @click="handleContentClick" />
```

- [ ] **Step 3: 在 `<style scoped>` 末尾追加翻译按钮和译文的样式**

在 `notes-app/src/components/MarkdownView.vue` 现有 `<style scoped>` 块的最后一个规则（`@media (max-width: 768px) { ... }`）之后，追加：

```css
.content :deep(.translate-btn) {
  margin-left: 6px;
  padding: 0 4px;
  border: none;
  background: none;
  font-size: 0.85em;
  opacity: 0.35;
  cursor: pointer;
  vertical-align: middle;
  line-height: 1;
}
.content :deep(.translate-btn:hover) {
  opacity: 0.9;
}
.content :deep(.translate-btn.translate-loading) {
  opacity: 0.6;
  animation: translate-pulse 1s ease-in-out infinite;
}
.content :deep(.translate-btn.translate-error) {
  opacity: 1;
  filter: hue-rotate(-40deg) saturate(3);
}
@keyframes translate-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
.content :deep(.translate-result) {
  margin: -8px 0 14px;
  padding: 6px 12px;
  border-left: 3px solid var(--accent);
  background: var(--sidebar-hover);
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.92em;
  line-height: 1.6;
  border-radius: 0 4px 4px 0;
}
.content :deep(.translate-result.hidden) {
  display: none;
}
```

- [ ] **Step 4: 手动验证功能**

Run: `cd notes-app && npm run dev`，浏览器打开开发服务器地址，进入任意一篇笔记页面。

验证:
1. 每个段落末尾出现小的 🌐 图标，默认低透明度
2. 点击图标 → 短暂显示加载态 → 该段下方出现斜体英文译文
3. 再次点击同一图标 → 译文隐藏；再点一次 → 重新显示（不应该看到网络请求，直接从内存/DOM 切换）
4. 刷新页面后再点击同一段的按钮 → 应该直接显示（走 localStorage 缓存，可在浏览器 Network 面板确认没有新的 `/api/translate` 请求）
5. 标题、代码块旁没有翻译按钮

停掉 dev server。

- [ ] **Step 5: Commit**

```bash
cd /Users/lixiaofei05/Desktop/ms
git add notes-app/src/components/MarkdownView.vue
git commit -m "feat: 段落翻译按钮点击交互、localStorage缓存与样式"
```

## Task 5: 全量测试与构建验证

**Files:**
- 无新增/修改文件（纯验证步骤）

- [ ] **Step 1: 运行全量单测**

Run: `cd notes-app && npm test`
Expected: 所有测试套件（`markdown.test.ts`、`translate.test.ts`、`toc.test.ts`、`search.test.ts`、`md-tree.test.ts`）全部 PASS，无失败用例

- [ ] **Step 2: 运行构建**

Run: `cd notes-app && npm run build`
Expected: `vue-tsc -b` 类型检查通过，`vite build` 成功产出 `dist/`，无 TypeScript 报错（尤其检查 `renderMarkdown` 调用处的类型是否都已同步更新为解构 `{ html, paraTexts }`）

- [ ] **Step 3: 若构建失败，逐一修复类型错误后回到 Step 1 重跑**

（本步骤本身不含代码，只是失败后的处理流程说明——不是占位符，是因为具体错误内容未发生前无法预先给出修复代码）

## 生产环境部署代理（不在本次范围内）

设计文档中已明确：生产环境如何转发 `/api/translate` 请求（因为纯前端 SPA 没有 Vite dev server）留到实际部署时再设计，本计划不包含该任务。
