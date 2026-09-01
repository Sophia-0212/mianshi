import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
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

function translateProxy(apiKey: string | undefined): Plugin {
  return {
    name: 'translate-proxy',
    configureServer(server) {
      server.middlewares.use('/api/translate', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          void handleTranslateRequest(body, apiKey, res)
        })
      })
    },
  }
}

async function handleTranslateRequest(
  rawBody: string,
  apiKey: string | undefined,
  res: import('node:http').ServerResponse,
) {
  if (!apiKey) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: '服务端未配置 OPENAI_API_KEY' }))
    return
  }

  let text: string
  try {
    const parsed = JSON.parse(rawBody) as { text?: unknown }
    if (typeof parsed.text !== 'string' || !parsed.text.trim()) {
      throw new Error('empty text')
    }
    text = parsed.text
  } catch {
    res.statusCode = 400
    res.end(JSON.stringify({ error: '请求体需为 { text: string }' }))
    return
  }

  try {
    const upstream = await fetch('https://oneapi-comate.baidu-int.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.5',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: '你是专业翻译。把用户输入的中文段落直译成英文，只输出英文译文本身，不要加任何解释、引号或前缀。',
          },
          { role: 'user', content: text },
        ],
      }),
    })

    if (!upstream.ok) {
      res.statusCode = 502
      res.end(JSON.stringify({ error: `上游网关返回 HTTP ${upstream.status}` }))
      return
    }

    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const translation = data.choices?.[0]?.message?.content?.trim()
    if (!translation) {
      res.statusCode = 502
      res.end(JSON.stringify({ error: '上游网关返回内容为空' }))
      return
    }

    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ translation }))
  } catch (err) {
    res.statusCode = 502
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, currentDir, '')
  return {
    plugins: [vue(), mdTreePlugin(), serveRepoMdFiles(), translateProxy(env.OPENAI_API_KEY)],
    server: {
      fs: {
        allow: ['..'],
      },
    },
  }
})
