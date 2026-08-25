import { describe, it, expect } from 'vitest'
import { buildIndex, search } from './search'

describe('search', () => {
  it('能按标题关键字搜到对应文件', async () => {
    const index = buildIndex([
      { path: 'a/1.Promise详解.md', name: 'Promise详解', content: 'Promise 是异步编程解决方案' },
      { path: 'a/2.DOM事件流.md', name: 'DOM事件流', content: '事件冒泡和事件捕获' },
    ])
    const results = search(index, 'Promise')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].path).toBe('a/1.Promise详解.md')
  })

  it('搜不到时返回空数组', async () => {
    const index = buildIndex([{ path: 'a.md', name: 'a', content: '内容' }])
    expect(search(index, '不存在的关键字xyz')).toEqual([])
  })

  it('标题命中优先于正文命中：即使正文命中次数更多，标题命中的文档仍排在前面', async () => {
    const index = buildIndex([
      // 文档A：仅在 content 里多次出现关键字（正文强命中，标题不含关键字）
      { path: 'a/weak-title.md', name: '异步编程指南', content: 'Vue Vue Vue Vue Vue 组件化开发实践' },
      // 文档B：关键字只在 name 里出现一次（标题弱命中，正文完全不含关键字）
      { path: 'b/vue-basics.md', name: 'Vue入门', content: '响应式系统与组件通信机制' },
    ])
    const results = search(index, 'Vue')
    expect(results.map(r => r.path)).toEqual(['b/vue-basics.md', 'a/weak-title.md'])
  })
})
