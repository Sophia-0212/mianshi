import { describe, it, expect, vi, afterEach } from 'vitest'
import { translateText } from './translate'

describe('translateText', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('成功时返回译文', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translation: 'Hello, world' }),
    }) as unknown as typeof fetch

    const result = await translateText('你好，世界')
    expect(result).toBe('Hello, world')
  })

  it('HTTP 响应非 ok 时抛出错误', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: '服务端未配置 OPENAI_API_KEY' }),
    }) as unknown as typeof fetch

    await expect(translateText('你好')).rejects.toThrow()
  })

  it('响应体缺少 translation 字段时抛出错误', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch

    await expect(translateText('你好')).rejects.toThrow()
  })

  it('translation 为空字符串时抛出错误', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translation: '' }),
    }) as unknown as typeof fetch

    await expect(translateText('你好')).rejects.toThrow()
  })

  it('请求体里包含待翻译文本，走POST + JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translation: 'Test' }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    await translateText('测试')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/translate')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({ text: '测试' })
  })
})
