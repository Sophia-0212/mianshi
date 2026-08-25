import { Document } from 'flexsearch'
import type { EnrichedDocumentSearchResults } from 'flexsearch'

export interface SearchDoc {
  [key: string]: string
  path: string
  name: string
  content: string
}

export interface SearchResult {
  path: string
  name: string
}

type SearchIndex = Document<SearchDoc, false>

export function buildIndex(docs: SearchDoc[]): SearchIndex {
  const index = new Document<SearchDoc, false>({
    document: {
      id: 'path',
      index: ['name', 'content'],
      store: ['name', 'path'],
    },
    tokenize: 'forward',
  })

  for (const doc of docs) {
    index.add(doc)
  }

  return index
}

export function search(index: SearchIndex, query: string): SearchResult[] {
  if (!query.trim()) return []

  // 有意为之：不使用 merge:true，按字段声明顺序（index: ['name', 'content']）
  // 依次收集命中，即标题（name）命中的文档整体排在正文（content）命中的文档之前。
  // 对笔记搜索场景这是合理的默认排序——标题匹配通常比正文偶然出现关键字更相关。
  // 见 search.test.ts 中"标题命中排在正文命中之前"的用例，将此行为锁定为已验证行为。
  const results = index.search(query, {
    enrich: true,
    limit: 20,
  }) as EnrichedDocumentSearchResults<SearchDoc>

  const seen = new Map<string, SearchResult>()

  for (const fieldResult of results) {
    for (const item of fieldResult.result) {
      const doc = item.doc
      if (doc && !seen.has(doc.path)) {
        seen.set(doc.path, { path: doc.path, name: doc.name })
      }
    }
  }

  return Array.from(seen.values())
}
