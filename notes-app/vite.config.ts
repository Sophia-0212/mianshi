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

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function serveRepoMdFiles(): Plugin {
  return {
    name: 'serve-repo-md-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) {
          next()
          return
        }
        const urlPath = req.url.split('?')[0]
        const ext = path.extname(urlPath).toLowerCase()
        const isMdFetch = req.headers['x-notes-fetch'] === '1' && ext === '.md'
        const isImage = ext in IMAGE_CONTENT_TYPES
        // 只处理两类请求：(a) 应用内部 fetch() 取 .md 源码（带自定义头，见下）；
        // (b) 渲染出的 <img src="img/xxx.png"> 请求图片。其余一律放行给 Vite
        // 的正常处理（含 SPA fallback）——浏览器直接刷新/打开一个 .md 结尾
        // 的路由（如 /前端面试/xxx.md）发出的是普通页面导航请求，没有自定义
        // 头，必须走 fallback，否则会把整个 index.html/JS/CSS 换成纯文本文件
        // 内容，导致刷新后页面看起来"样式全部消失"。
        if (!isMdFetch && !isImage) {
          next()
          return
        }

        // decodeURIComponent handles a single level of percent-encoding
        // (e.g. "..%2f" -> "../"); anything left encoded (double-encoding,
        // like "%252e%252e") stays as a literal, non-traversing string.
        let decoded: string
        try {
          decoded = decodeURIComponent(urlPath)
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

        if (!isInsideRepoRoot || !fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
          next()
          return
        }

        if (isImage) {
          res.setHeader('Content-Type', IMAGE_CONTENT_TYPES[ext])
          res.end(fs.readFileSync(absPath))
          return
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(fs.readFileSync(absPath, 'utf-8'))
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
    proxy: {
      '/api/translate': {
        target: 'https://fanyi.youdao.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/translate/, '/translate_o?smartresult=dict&smartresult=rule'),
        headers: {
          Referer: 'https://fanyi.youdao.com/',
        },
      },
    },
  },
})
