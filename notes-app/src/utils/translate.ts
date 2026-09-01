interface TranslateResponse {
  translation?: string
  error?: string
}

export async function translateText(text: string): Promise<string> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  const data = (await res.json()) as TranslateResponse

  if (!res.ok) {
    throw new Error(data.error ?? `翻译请求失败: HTTP ${res.status}`)
  }

  if (!data.translation) {
    throw new Error('翻译接口返回内容为空')
  }

  return data.translation
}
