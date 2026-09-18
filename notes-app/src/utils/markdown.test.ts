import { describe, it, expect } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('渲染标题为对应 heading 标签', async () => {
    const { html } = await renderMarkdown('# 标题\n\n正文内容')
    expect(html).toContain('<h1')
    expect(html).toContain('标题')
    expect(html).toContain('正文内容')
  })

  it('代码块被 shiki 处理为带语法高亮的 pre/code', async () => {
    const { html } = await renderMarkdown('```js\nconst a = 1\n```')
    expect(html).toContain('<pre')
    expect(html).toContain('shiki')
  })

  it('空字符串输入不报错，且不残留 shiki 占位符', async () => {
    const { html } = await renderMarkdown('')
    expect(html).not.toContain('shiki-placeholder')
  })

  it('不含代码块的纯文本渲染正常，不受占位符逻辑影响', async () => {
    const { html } = await renderMarkdown('这是一段纯文本，没有代码块。')
    expect(html).toContain('这是一段纯文本，没有代码块。')
    expect(html).not.toContain('shiki-placeholder')
    expect(html).not.toContain('<pre')
  })

  it('单次调用内多个代码块各自正确高亮，不互相串位', async () => {
    const source = [
      '```js',
      'const jsOnlyToken = 111',
      '```',
      '',
      '```python',
      'py_only_token = 222',
      '```',
    ].join('\n')

    const { html } = await renderMarkdown(source)

    expect(html).not.toContain('shiki-placeholder')

    // shiki 会把代码拆分成逐 token 的 <span>，所以不能整段字符串匹配，
    // 改为验证每段代码各自的关键字面量片段都出现，且顺序与源码一致（未被对方覆盖或错位）
    const jsIndex = html.indexOf('jsOnlyToken')
    const jsNumIndex = html.indexOf('111')
    const pyIndex = html.indexOf('py_only_token')
    const pyNumIndex = html.indexOf('222')

    expect(jsIndex).toBeGreaterThan(-1)
    expect(jsNumIndex).toBeGreaterThan(-1)
    expect(pyIndex).toBeGreaterThan(-1)
    expect(pyNumIndex).toBeGreaterThan(-1)

    // js 代码块的内容应整体出现在 python 代码块之前，证明两个占位符各自替换到了正确位置
    expect(jsIndex).toBeLessThan(pyIndex)
    expect(jsNumIndex).toBeLessThan(pyIndex)
    // 各代码块内部关键字面量不应串到对方代码块的高亮结果里
    expect(html.indexOf('jsOnlyToken', pyIndex)).toBe(-1)
    expect(pyIndex).toBeGreaterThan(jsNumIndex)
  })

  it('未知语言标识符触发降级路径，仍产出 <pre 而不抛错', async () => {
    const { html } = await renderMarkdown('```notalang\nfoo\n```')
    expect(html).toContain('<pre')
    expect(html).toContain('foo')
    expect(html).not.toContain('shiki-placeholder')
  })

  it('h1~h3 标题被注入与 extractToc 一致的 id', async () => {
    const { html } = await renderMarkdown('# 标题A\n\n## 标题B')
    expect(html).toContain('<h1 id="标题a">')
    expect(html).toContain('<h2 id="标题b">')
  })
})

describe('renderMarkdown 段落翻译按钮', () => {
  it('为每个 p 标签注入翻译按钮，序号从0递增', async () => {
    const { html } = await renderMarkdown('第一段。\n\n第二段。')
    expect(html).toContain('data-para-index="0"')
    expect(html).toContain('data-para-index="1"')
  })

  it('paraTexts 按序号对应各段纯文本，且不包含按钮标记', async () => {
    const { paraTexts } = await renderMarkdown('第一段。\n\n第二段。')
    expect(paraTexts[0]).toBe('第一段。')
    expect(paraTexts[1]).toBe('第二段。')
  })

  it('li 和 blockquote 也会被注入翻译按钮', async () => {
    const { html, paraTexts } = await renderMarkdown('- 列表项一\n- 列表项二\n\n> 引用内容')
    expect(html).toContain('data-para-index="0"')
    expect(html).toContain('data-para-index="1"')
    expect(html).toContain('data-para-index="2"')
    expect(paraTexts).toEqual(['列表项一', '列表项二', '引用内容'])
  })

  it('标题不会被注入翻译按钮', async () => {
    const { html } = await renderMarkdown('# 标题\n\n正文段落')
    const h1Match = /<h1[^>]*>.*?<\/h1>/s.exec(html)
    expect(h1Match).not.toBeNull()
    expect(h1Match![0]).not.toContain('translate-btn')
  })

  it('代码块不会被注入翻译按钮', async () => {
    const { html } = await renderMarkdown('```js\nconst a = 1\n```')
    expect(html).not.toContain('translate-btn')
  })

  it('空文档 paraTexts 为空数组', async () => {
    const { paraTexts } = await renderMarkdown('')
    expect(paraTexts).toEqual([])
  })
})


describe('正文标题锚点', () => {
  it('中文文内链接指向真实标题 id，重复标题和深层标题也有锚点', async () => {
    const { html } = await renderMarkdown('[缓存击穿](#缓存击穿)\n\n### 缓存击穿\n\n### 缓存击穿\n\n#### **SDS**')
    expect(html).toContain('href="#%E7%BC%93%E5%AD%98%E5%87%BB%E7%A9%BF"')
    expect(html).toContain('<h3 id="缓存击穿">缓存击穿</h3>')
    expect(html).toContain('<h3 id="缓存击穿-1">缓存击穿</h3>')
    expect(html).toContain('<h4 id="sds"><strong>SDS</strong></h4>')
  })
})
