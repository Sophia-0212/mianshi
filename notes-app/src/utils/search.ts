import { Document } from 'flexsearch'
import type { EnrichedDocumentSearchResults } from 'flexsearch'

export interface SearchDoc {
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
