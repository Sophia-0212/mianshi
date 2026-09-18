import MarkdownIt from 'markdown-it'
import GithubSlugger from 'github-slugger'

export interface TocItem {
  level: 1 | 2 | 3
  text: string
  id: string
}

export interface HeadingItem {
  level: 1 | 2 | 3 | 4 | 5 | 6
  text: string
  id: string
}

const parser = new MarkdownIt({ html: false, linkify: true })
type Token = ReturnType<typeof parser.parse>[number]

function inlineText(tokens: Token[]): string {
  return tokens.map(token => {
    if (token.type === 'text' || token.type === 'code_inline') return token.content
    if (token.type === 'image') return inlineText(token.children ?? []) || token.content
    if (token.type === 'softbreak' || token.type === 'hardbreak') return ' '
    return ''
  }).join('')
}

// 与正文渲染共用同一批标题 token；代码块、加粗、链接和重复标题均按 Markdown 语义处理。
export function assignHeadingIds(tokens: Token[]): HeadingItem[] {
  const slugger = new GithubSlugger()
  const headings: HeadingItem[] = []
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token.type !== 'heading_open') continue
    const text = inlineText(tokens[index + 1]?.children ?? []).trim()
    const id = slugger.slug(text)
    token.attrSet('id', id)
    headings.push({ level: Number(token.tag.slice(1)) as HeadingItem['level'], text, id })
  }
  return headings
}

export function extractHeadings(source: string): HeadingItem[] {
  return assignHeadingIds(parser.parse(source, {}))
}

export function extractToc(source: string): TocItem[] {
  return extractHeadings(source).filter((item): item is TocItem => item.level <= 3)
}
