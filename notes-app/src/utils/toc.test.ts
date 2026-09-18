import { describe, it, expect } from 'vitest'
import { extractHeadings, extractToc } from './toc'

describe('extractToc', () => {
  it('提取 h1~h3 标题，生成基于标题文字的锚点 id', () => {
    const source = '# 一级标题\n\n## 二级标题A\n\n### 三级标题\n\n## 二级标题B\n'
    const toc = extractToc(source)
    expect(toc).toEqual([
      { level: 1, text: '一级标题', id: '一级标题' },
      { level: 2, text: '二级标题A', id: '二级标题a' },
      { level: 3, text: '三级标题', id: '三级标题' },
      { level: 2, text: '二级标题B', id: '二级标题b' },
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
      { level: 1, text: '真实标题一', id: '真实标题一' },
      { level: 2, text: '真实标题二', id: '真实标题二' },
    ])
  })

  it('忽略 ~~~ 围栏代码块内看起来像标题的行', () => {
    const source = ['# 真实标题', '', '~~~', '# 假标题', '~~~'].join('\n')
    const toc = extractToc(source)
    expect(toc).toEqual([{ level: 1, text: '真实标题', id: '真实标题' }])
  })
})


describe('标题链接兼容', () => {
  it('去掉格式标记、标点和链接地址，保留中文及可见文字', () => {
    expect(extractToc('## **缓存击穿**：`Redis` / [TTL](https://redis.io)？')[0])
      .toEqual({ level: 2, text: '缓存击穿：Redis / TTL？', id: '缓存击穿redis--ttl' })
  })

  it('重复标题及自然带编号的标题仍具有唯一 id', () => {
    const headings = extractHeadings('## 重复\n## 重复\n## 重复-1\n## 重复')
    expect(headings.map(h => h.id)).toEqual(['重复', '重复-1', '重复-1-1', '重复-2'])
  })

  it('插入其他标题不会改变原有标题锚点', () => {
    expect(extractToc('# 前言\n## 缓存击穿')[1].id)
      .toBe(extractToc('## 缓存击穿')[0].id)
  })

  it('支持 Setext、深层标题，并忽略缩进代码中的假标题', () => {
    const source = '标题\n====\n\n#### 深层标题\n\n    # 假标题'
    expect(extractHeadings(source).map(h => h.id)).toEqual(['标题', '深层标题'])
    expect(extractToc(source).map(h => h.id)).toEqual(['标题'])
  })
})
