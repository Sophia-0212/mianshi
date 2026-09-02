# [object Object] 页面渲染问题排查记录

## 现象

打开笔记页面，正文区域显示字面文本 `[object Object]`，而不是渲染后的内容。

## 根因

`src/utils/markdown.ts` 里 `renderMarkdown()` 的返回值从字符串改成了对象：

```ts
// 改动前
export async function renderMarkdown(source: string): Promise<string>

// 改动后（新增段落翻译按钮功能时）
export interface RenderedMarkdown {
  html: string
  paraTexts: string[]
}
export async function renderMarkdown(source: string): Promise<RenderedMarkdown>
```

但调用方 `src/components/MarkdownView.vue` 没有同步更新：

```ts
// 仍然按旧签名使用，把整个对象塞进了 html ref
html.value = await renderMarkdown(source)
```

`html` 是一个 `ref<string>`，通过 `v-html="html"` 渲染。当赋值的是对象而不是字符串时，Vue/浏览器会对其调用 `String(obj)`，默认对象的 `toString()` 就是 `"[object Object]"`——所以页面显示的正是这个字面字符串，不是报错，是"成功"渲染了一个错误的值。

`src/utils/markdown.test.ts` 早就用了新签名（`const { html } = await renderMarkdown(...)`），说明改接口时同步改了测试，唯独漏改了真正的调用方 `MarkdownView.vue`。测试全绿但页面是坏的——**测试覆盖的是 `markdown.ts` 单元本身，没有覆盖“调用方是否跟着接口一起改”这条链路**。

## 修复

```diff
- html.value = await renderMarkdown(source)
+ html.value = (await renderMarkdown(source)).html
```

## 下次修改文档 / 代码时要注意什么

1. **改一个函数的返回值类型（尤其是从原始类型改成对象/数组）时，必须全局搜索所有调用点，逐个确认是否要跟着改。**
   - 用 `grep -rn "函数名" src/` 或 IDE 的“查找所有引用”，别只改一处就完事。
   - 这次的坑：只搜索/记得改了测试文件，没有搜索到 `.vue` 组件里的调用。

2. **`vue-tsc --noEmit`（或项目的类型检查命令）改完接口后必须跑一遍。**
   - 这次改动如果开了严格的 TS 检查本应能在编译期报错（`Type 'RenderedMarkdown' is not assignable to type 'string'`），但因为 `html.value` 背后的 ref 类型推断/宽松配置没有拦住，才漏到运行时才暴露成 `[object Object]`。
   - 以后改动 `.ts` 工具函数的签名后，习惯性跑一次类型检查再确认。

3. **`v-html` 绑定的字符串一旦显示成 `[object Object]`、`[object Array]`、`undefined`、`NaN` 这类"看起来像代码字面量"的文本，基本可以断定是"把非字符串值直接塞进了字符串渲染位置"，先去查最近改过的数据源函数的返回值类型，而不是去查模板或样式。**

4. **给项目加一条约定**：修改任何被多处引用的公共函数/工具函数签名时，本次改动的 commit/PR 里要么把所有调用点一起改完，要么在改动说明里明确列出"还未同步的调用点"，避免像本次一样被漏掉。
