# 段落即时翻译按钮 — 设计文档

## 背景 / 目标

notes-app 中的笔记（.md 文件）目前只有中文。目标：不新增/维护任何英文版 md 文件，而是在阅读时按需**实时翻译**——每个段落（`p` / `li` / `blockquote`）结尾放一个小翻译图标按钮，点击后在该段落下方插入英文翻译；再次点击隐藏。

## 范围

- 翻译粒度：段级（`p`、`li`、`blockquote`），不含标题（h1-h3）、代码块、表格
- 翻译方向：中文 → 英文（固定，不做语言检测/切换 UI）
- 翻译结果持久化缓存到 `localStorage`，避免重复请求同一段落
- 不维护英文 md 文件，不做整篇一键翻译

## 架构

### 1. 翻译服务抽象层 — `src/utils/translate.ts`

```ts
export async function translateText(text: string): Promise<string>
```

- 内部实现调用有道翻译网页版接口（`fanyi.youdao.com/translate_o`，免费、无需 key，国内网络直连稳定）
- 该接口为非官方逆向接口，未来可能失效或增加签名校验。因此把所有请求细节（URL、参数、签名、响应解析）封装在这一个函数内部，其余代码只依赖 `translateText` 这一签名。换源（自建代理转发到其他翻译服务）只需改这一个文件。
- 浏览器端不能直接跨域请求该接口，需要经过代理：
  - **开发环境**：`vite.config.ts` 增加 `server.proxy`，把 `/api/translate` 转发到 `https://fanyi.youdao.com/translate_o`
  - **生产环境**：需要一个轻量后端/边缘函数转发（因为是纯前端 SPA 部署，生产环境没有 Vite dev server）。本迭代先支持 dev 环境；生产部署方式（Vercel/Netlify serverless function 或自建反代）留到实际需要部署时再定，不在本次实现范围内阻塞。

### 2. Markdown 渲染阶段注入按钮标记 — `src/utils/markdown.ts`

- `renderMarkdown` 渲染完 HTML 后，对 `<p>`、`<li>`、`<blockquote>` 标签做后处理：
  - 按文档内出现顺序生成稳定的段落序号 `paraIndex`（类似现有 `extractToc` 对标题编号的做法）
  - 在每个匹配标签的**内部末尾**插入一个翻译按钮：
    ```html
    <button class="translate-btn" data-para-index="3" aria-label="翻译">🌐</button>
    ```
  - 段落原始文本（去除按钮和内部标签）在渲染时一并记录到一个 `paraTexts: string[]` 数组中（按 `paraIndex` 对应），随渲染结果一起返回给组件层，避免重复从 DOM 里提取纯文本
- `renderMarkdown` 返回值从 `Promise<string>` 变为 `Promise<{ html: string; paraTexts: string[] }>`（相应调整 `MarkdownView.vue` 和已有测试）

### 3. 组件层交互 — `MarkdownView.vue`

- 用**事件代理**（在 `.content` 容器上挂一个 `@click`），点击时判断 `event.target` 是否命中 `.translate-btn`，避免为每个段落单独创建 Vue 组件/监听器
- 点击按钮后：
  1. 根据 `data-para-index` 取出 `paraTexts[index]`
  2. 计算缓存 key：`translate:{filePath}:{paraIndex}:{simpleHash(text)}`（hash 用于文件内容变化后自动失效旧缓存，避免手改笔记后展示过期翻译）
  3. 查 `localStorage`：命中则直接展示；未命中调用 `translateText`，成功后写入 `localStorage` 并展示
  4. 展示方式：在该段落 DOM 节点后面用 `insertAdjacentHTML` 插入一个 `<div class="translate-result">英文内容</div>`（不整合进 Vue 的响应式渲染流程，因为内容是通过 `v-html` 渲染的静态 HTML，直接操作真实 DOM 更简单可靠）
  5. 再次点击同一按钮：如果该段落下方已存在 `.translate-result`，直接切换其 `display`（不重新请求接口）
  6. 请求失败：按钮短暂变红/显示 ⚠️，可再次点击重试；不影响其他段落的翻译按钮

### 4. 样式

- 按钮默认极小、低透明度（不干扰阅读），hover 时高亮
- 翻译结果 `.translate-result` 用不同底色/斜体，与原文区分

## 数据流

```
用户点击按钮
  → 事件代理捕获 data-para-index
  → 查 localStorage 缓存
      → 命中: 直接插入/切换显示
      → 未命中: translateText(paraTexts[index])
                  → 走 vite proxy → 有道接口
                  → 成功: 写缓存 + 插入显示
                  → 失败: 按钮显示错误态，允许重试
```

## 错误处理

- 网络失败/接口非 200/响应格式不符预期：`translateText` 抛出错误，组件层捕获后仅将对应按钮标红，不影响页面其他部分
- 有道接口若返回签名校验失败等（接口本身可能变化），同样归为翻译失败，不做特殊探测逻辑（YAGNI，等真的出问题再针对性处理）

## 测试

- `src/utils/markdown.test.ts` 补充用例：验证 p/li/blockquote 被正确注入 `data-para-index` 递增序号按钮，且 `paraTexts` 与按钮序号一一对应
- `src/utils/translate.ts` 补充单测：mock fetch，验证请求参数拼装、成功/失败路径的返回值和抛错行为
- 不做端到端测试真实调用有道接口（网络依赖，不稳定）

## 不做的事

- 不维护任何英文 md 文件
- 不做整篇翻译切换
- 不给 h1-h3、代码块、表格加翻译按钮
- 不做语言自动检测或多语言切换 UI（固定中→英）
- 生产环境部署代理方案不在本次实现范围内
