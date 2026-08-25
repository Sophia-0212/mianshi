import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

export interface MdTreeNode {
  type: 'dir' | 'file'
  name: string
  path: string
  sortKey: string
  children?: MdTreeNode[]
}

const IGNORE_DIRS = new Set(['node_modules', '.git', 'notes-app'])

export function naturalCompare(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g
  const aParts = a.match(re) ?? []
  const bParts = b.match(re) ?? []
  const len = Math.max(aParts.length, bParts.length)
  for (let i = 0; i < len; i++) {
    const ap = aParts[i] ?? ''
    const bp = bParts[i] ?? ''
    const aNum = Number(ap)
    const bNum = Number(bp)
    const bothNumeric = !Number.isNaN(aNum) && !Number.isNaN(bNum) && ap !== '' && bp !== ''
    if (bothNumeric) {
      if (aNum !== bNum) return aNum - bNum
    } else if (ap !== bp) {
      return ap < bp ? -1 : 1
    }
  }
  return 0
}

function stripDisplayName(fileOrDirName: string, isFile: boolean): string {
  const withoutExt = isFile ? fileOrDirName.replace(/\.md$/i, '') : fileOrDirName
  return withoutExt.replace(/^\d+\./, '')
}

export function buildTree(rootDir: string): MdTreeNode[] {
  return scanDir(rootDir, rootDir)
}

function scanDir(absDir: string, rootDir: string): MdTreeNode[] {
  const entries = fs.readdirSync(absDir, { withFileTypes: true })
  const nodes: MdTreeNode[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue
      const children = scanDir(path.join(absDir, entry.name), rootDir)
      if (children.length === 0) continue
      nodes.push({
        type: 'dir',
        name: stripDisplayName(entry.name, false),
        path: path.relative(rootDir, path.join(absDir, entry.name)),
        sortKey: entry.name,
        children,
      })
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      nodes.push({
        type: 'file',
        name: stripDisplayName(entry.name, true),
        path: path.relative(rootDir, path.join(absDir, entry.name)),
        sortKey: entry.name,
      })
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return naturalCompare(a.sortKey, b.sortKey)
  })

  return nodes
}

export function flattenFiles(nodes: MdTreeNode[]): { path: string; name: string }[] {
  const out: { path: string; name: string }[] = []
  for (const node of nodes) {
    if (node.type === 'file') {
      out.push({ path: node.path, name: node.name })
    } else if (node.children) {
      out.push(...flattenFiles(node.children))
    }
  }
  return out
}

const VIRTUAL_ID = 'virtual:md-tree'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID

// package.json has "type": "module", so vite.config.ts runs as ESM and
// __dirname is not defined — derive the current directory from import.meta.url.
const currentDir = path.dirname(fileURLToPath(import.meta.url))

export function mdTreePlugin(): Plugin {
  // md-tree.ts lives at notes-app/src/plugins/, so three levels up is the repo root:
  // notes-app/src/plugins -> notes-app/src -> notes-app -> ms (repo root)
  const rootDir = path.resolve(currentDir, '../../..')

  return {
    name: 'md-tree',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        const tree = buildTree(rootDir)
        const files = flattenFiles(tree)
        return `export default ${JSON.stringify(tree)};\nexport const files = ${JSON.stringify(files)};`
      }
    },
    configureServer(server) {
      server.watcher.on('all', (_event, changedPath) => {
        if (changedPath.endsWith('.md')) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID)
          if (mod) {
            server.moduleGraph.invalidateModule(mod)
            server.ws.send({ type: 'full-reload' })
          }
        }
      })
    },
  }
}
