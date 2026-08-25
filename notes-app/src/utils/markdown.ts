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
    let highlighted: string
    try {
      highlighted = await codeToHtml(block.code, {
        lang: block.lang,
        theme: 'github-light',
      })
    } catch {
      // 未知语言标识符时降级为纯文本，保证渲染不整体失败
      highlighted = await codeToHtml(block.code, {
        lang: 'text',
        theme: 'github-light',
      })
    }
    html = html.replace(`<div class="shiki-placeholder" data-key="${key}"></div>`, highlighted)
  }

  return html
}
