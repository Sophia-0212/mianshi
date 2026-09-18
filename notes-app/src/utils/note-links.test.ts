import { describe, expect, it } from 'vitest'
import { decodeNoteHash, resolveNoteHref } from './note-links'

const file = '中间件/Redis/1. Redis基础与核心直觉.md'

describe('文档链接解析', () => {
  it('保留跨文档的中文锚点、空格和查询参数', () => {
    const result = resolveNoteHref(file, '4.%20缓存生命周期与常见问题.md?from=intro#缓存击穿')
    expect(decodeURI(result!)).toBe('/中间件/Redis/4. 缓存生命周期与常见问题.md?from=intro#缓存击穿')
  })

  it('文内锚点解析为当前文件路径，支持新标签打开', () => {
    expect(decodeURI(resolveNoteHref(file, '#缓存击穿')!)).toBe('/' + file + '#缓存击穿')
  })

  it('正确处理上级目录及仓库根路径', () => {
    expect(decodeURI(resolveNoteHref(file, '../学习路线图.md#总目标')!))
      .toBe('/中间件/学习路线图.md#总目标')
    expect(decodeURI(resolveNoteHref(file, '/中间件/Redis/2. 数据类型与底层实现.md#sds')!))
      .toBe('/中间件/Redis/2. 数据类型与底层实现.md#sds')
  })

  it('不接管外链、资源下载或非法编码', () => {
    for (const href of ['https://example.com/a.md#x', '//example.com/a.md', 'mailto:a@b.com', 'a.pdf', '%ZZ.md']) {
      expect(resolveNoteHref(file, href)).toBeNull()
    }
  })

  it('中文 hash 只解码一次，非法百分号不抛错', () => {
    expect(decodeNoteHash('#%E7%BC%93%E5%AD%98%E5%87%BB%E7%A9%BF')).toBe('缓存击穿')
    expect(decodeNoteHash('#%2520')).toBe('%20')
    expect(decodeNoteHash('#%ZZ')).toBe('%ZZ')
  })
})
