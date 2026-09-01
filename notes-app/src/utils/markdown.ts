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
    const lang = token.info.trim() || 'text'
    if (lang === 'mermaid') {
      return `<div class="mermaid">${md.utils.escapeHtml(token.content)}</div>`
    }
    const key = `__SHIKI_PLACEHOLDER_${placeholderCounter++}__`
    pendingBlocks.set(key, { code: token.content, lang })
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
