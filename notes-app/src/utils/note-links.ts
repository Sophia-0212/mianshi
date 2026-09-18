// 返回仓库根相对的浏览器路由，保留 query 和 hash；供普通点击与新标签页共用。
export function resolveNoteHref(filePath: string, href: string): string | null {
  if (!href || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return null
  try {
    const base = new URL('/' + filePath.split('/').map(encodeURIComponent).join('/'), 'https://notes.invalid')
    const target = new URL(href, base)
    const decodedPath = decodeURIComponent(target.pathname)
    if (!decodedPath.toLowerCase().endsWith('.md')) return null
    return target.pathname + target.search + target.hash
  } catch {
    return null
  }
}

export function decodeNoteHash(hash: string): string {
  try {
    return decodeURIComponent(hash.replace(/^#/, ''))
  } catch {
    return hash.replace(/^#/, '')
  }
}
