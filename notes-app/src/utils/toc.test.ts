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
