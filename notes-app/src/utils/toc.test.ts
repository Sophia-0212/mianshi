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

  it('忽略围栏代码块内看起来像标题的行', () => {
    const source = [
      '# 真实标题一',
      '',
      '```markdown',
      '# 代码块里的假标题',
      '## 也是假标题',
      '```',
      '',
      '## 真实标题二',
    ].join('\n')
    const toc = extractToc(source)
    expect(toc).toEqual([
      { level: 1, text: '真实标题一', id: 'heading-0' },
      { level: 2, text: '真实标题二', id: 'heading-1' },
    ])
  })

  it('忽略 ~~~ 围栏代码块内看起来像标题的行', () => {
    const source = ['# 真实标题', '', '~~~', '# 假标题', '~~~'].join('\n')
    const toc = extractToc(source)
    expect(toc).toEqual([{ level: 1, text: '真实标题', id: 'heading-0' }])
  })
})
