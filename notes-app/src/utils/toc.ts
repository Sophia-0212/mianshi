export interface TocItem {
  level: 1 | 2 | 3
  text: string
  id: string
}

export function extractToc(source: string): TocItem[] {
  const lines = source.split('\n')
  const toc: TocItem[] = []
  let counter = 0

  for (const line of lines) {
    const match = /^(#{1,3})\s+(.+)$/.exec(line.trim())
    if (!match) continue
    const level = match[1].length as 1 | 2 | 3
    const text = match[2].trim()
    toc.push({ level, text, id: `heading-${counter}` })
    counter++
  }

  return toc
}
