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
