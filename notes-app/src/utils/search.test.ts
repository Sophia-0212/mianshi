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
})
