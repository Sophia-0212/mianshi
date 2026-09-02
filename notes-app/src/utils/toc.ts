export interface TocItem {
  level: 1 | 2 | 3
  text: string
  id: string
}

export function extractToc(source: string): TocItem[] {
  const lines = source.split('\n')
  const toc: TocItem[] = []
  let counter = 0
  let inFence = false

  for (const line of lines) {
    const trimmed = line.trim()

    // 跳过 ``` 或 ~~~ 围栏代码块内的所有行，避免代码块里写的 markdown 示例
    // （比如 ```markdown 代码块内的 "# 标题"）被误判成真实标题
    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const match = /^(#{1,3})\s+(.+)$/.exec(trimmed)
    if (!match) continue
    const level = match[1].length as 1 | 2 | 3
    const text = match[2].trim()
    toc.push({ level, text, id: `heading-${counter}` })
    counter++
  }

  return toc
}
