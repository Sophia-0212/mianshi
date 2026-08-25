import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { mdTreePlugin } from './src/plugins/md-tree'

// package.json has "type": "module", so this file runs as ESM and
// __dirname is not defined — derive the current directory from import.meta.url,
// same approach already used in src/plugins/md-tree.ts.
const currentDir = path.dirname(fileURLToPath(import.meta.url))
// vite.config.ts lives at notes-app/, so one level up is the repo root.
const repoRoot = path.resolve(currentDir, '..')

function serveRepoMdFiles(): Plugin {
  return {
    name: 'serve-repo-md-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.split('?')[0].endsWith('.md')) {
          next()
          return
        }

        // decodeURIComponent handles a single level of percent-encoding
        // (e.g. "..%2f" -> "../"); anything left encoded (double-encoding,
        // like "%252e%252e") stays as a literal, non-traversing string.
        let decoded: string
        try {
          decoded = decodeURIComponent(req.url.split('?')[0])
        } catch {
          // Malformed percent-encoding: reject instead of crashing.
          res.statusCode = 400
          res.end('Bad Request')
          return
        }

        // path.resolve() fully normalizes the path, collapsing any "..".
        // We deliberately do NOT trust startsWith(repoRoot) as the sole guard:
        // if repoRoot is "/a/b", a resolved path of "/a/bc/x.md" would also
        // pass a naive startsWith("/a/b") check ("prefix collision") despite
        // being outside repoRoot. path.relative() gives an unambiguous answer:
        // it only stays traversal-free ("does not start with '..' and is not
        // an absolute path itself") when absPath is actually inside repoRoot.
        const absPath = path.resolve(repoRoot, '.' + decoded)
        const rel = path.relative(repoRoot, absPath)
        const isInsideRepoRoot = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)

        if (isInsideRepoRoot && fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(fs.readFileSync(absPath, 'utf-8'))
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), mdTreePlugin(), serveRepoMdFiles()],
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
