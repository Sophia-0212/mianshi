import { Document } from 'flexsearch'
import type { EnrichedDocumentSearchResults } from 'flexsearch'
import type { Chunk } from './chunk'

export type SearchDoc = Chunk

export interface SearchResult {
  path: string
  name: string
  heading: string
  snippet: string
}

type SearchIndex = Document<SearchDoc, false>

export function buildIndex(docs: SearchDoc[]): SearchIndex {
  const index = new Document<SearchDoc, false>({
    document: {
      id: 'id',
      index: ['name', 'heading', 'text'],
      store: ['name', 'path', 'heading', 'text'],
    },
    tokenize: 'forward',
  })

  for (const doc of docs) {
    index.add(doc)
  }

  return index
}

function makeSnippet(text: string, max = 60): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? flat.slice(0, max) + '…' : flat
}

function countOccurrences(text: string, query: string): number {
  const q = query.trim().toLowerCase()
  if (!q) return 0
  const t = text.toLowerCase()
  let count = 0
  let pos = 0
  while ((pos = t.indexOf(q, pos)) !== -1) {
    count++
    pos += q.length
  }
  return count
}

export function search(index: SearchIndex, query: string): SearchResult[] {
  if (!query.trim()) return []

  const results = index.search(query, {
    enrich: true,
    limit: 30,
  }) as EnrichedDocumentSearchResults<SearchDoc>

  // 去重键用 path+heading：同一文件的不同段落仍可分别出现在结果里，
  // 但同一段落（同 heading 下）多次命中只保留一条，避免结果列表被同段落刷屏。
  // 排序规则：标题（name）命中整体排在正文（text/heading）命中之前；
  // 同一优先级内，按关键词在该段落文本中出现的次数降序排列。
  const seen = new Map<string, { result: SearchResult; titleHit: boolean; count: number }>()

  for (const fieldResult of results) {
    const isTitleField = fieldResult.field === 'name'
    for (const item of fieldResult.result) {
      const doc = item.doc
      if (!doc) continue
      const key = doc.path + '::' + doc.heading
      const existing = seen.get(key)
      if (!existing) {
        const count = countOccurrences(doc.text, query) + countOccurrences(doc.name, query)
        seen.set(key, {
          result: { path: doc.path, name: doc.name, heading: doc.heading, snippet: makeSnippet(doc.text) },
          titleHit: isTitleField,
          count,
        })
      } else if (isTitleField) {
        existing.titleHit = true
      }
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => {
      if (a.titleHit !== b.titleHit) return a.titleHit ? -1 : 1
      return b.count - a.count
    })
    .slice(0, 20)
    .map(x => x.result)
}
