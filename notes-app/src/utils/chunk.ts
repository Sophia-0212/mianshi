export interface Chunk {
  [key: string]: string
  id: string
  path: string
  name: string
  heading: string
  text: string
}

export function splitIntoChunks(path: string, name: string, content: string): Chunk[] {
  const lines = content.split('\n')
  const chunks: Chunk[] = []
  let heading = ''
  let buf: string[] = []
  let idx = 0

  const flush = () => {
    const text = buf.join('\n').trim()
    if (text) chunks.push({ id: `${path}#${idx++}`, path, name, heading, text })
    buf = []
  }

  for (const line of lines) {
    const match = /^(#{1,3})\s+(.+)$/.exec(line.trim())
    if (match) {
      flush()
      heading = match[2].trim()
      continue
    }
    if (line.trim() === '') {
      flush()
    } else {
      buf.push(line)
    }
  }
  flush()

  if (chunks.length === 0) {
    chunks.push({ id: `${path}#0`, path, name, heading: '', text: '' })
  }

  return chunks
}
