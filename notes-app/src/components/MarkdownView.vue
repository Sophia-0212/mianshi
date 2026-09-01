<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import mermaid from 'mermaid'
import { renderMarkdown } from '../utils/markdown'
import { extractToc, type TocItem } from '../utils/toc'
import { translateText } from '../utils/translate'
import Toc from './Toc.vue'
import MobileToc from './MobileToc.vue'

mermaid.initialize({ startOnLoad: false })

const props = defineProps<{ filePath: string }>()

const html = ref('')
const toc = ref<TocItem[]>([])
const error = ref<string | null>(null)
const content = ref<HTMLElement | null>(null)

// 仅由点击处理函数以命令式方式读取，不参与渲染，故不使用 ref
let paraTexts: string[] = []
let currentFilePath = ''

async function load(filePath: string) {
  error.value = null
  currentFilePath = filePath
  try {
    const res = await fetch('/' + filePath.split('/').map(encodeURIComponent).join('/'), {
      headers: { 'X-Notes-Fetch': '1' },
    })
    if (!res.ok) throw new Error(`文件不存在: ${filePath}`)
    const source = await res.text()
    toc.value = extractToc(source)
    const rendered = await renderMarkdown(source)
    html.value = rendered.html
    paraTexts = rendered.paraTexts
    await nextTick()
    if (content.value) {
      const blocks = content.value.querySelectorAll<HTMLElement>('.mermaid')
      if (blocks.length) await mermaid.run({ nodes: blocks })
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

watch(() => props.filePath, load, { immediate: true })

// djb2 风格哈希：用于笔记内容修改后让旧缓存自然失效
function hashText(text: string): string {
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

function cacheKey(filePath: string, paraIndex: number, text: string): string {
  return `translate:${filePath}:${paraIndex}:${hashText(text)}`
}

function findParaElement(button: HTMLElement): HTMLElement | null {
  return button.closest('p, li, blockquote')
}

async function handleContentClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const button = target.closest('.translate-btn') as HTMLButtonElement | null
  if (!button) return

  const paraIndexAttr = button.dataset.paraIndex
  if (paraIndexAttr === undefined) return
  const paraIndex = Number(paraIndexAttr)
  const text = paraTexts[paraIndex]
  if (!text) return

  const paraEl = findParaElement(button)
  if (!paraEl) return

  const existing = paraEl.nextElementSibling
  if (existing?.classList.contains('translate-result') && existing.getAttribute('data-para-index') === paraIndexAttr) {
    existing.classList.toggle('hidden')
    return
  }

  button.classList.remove('translate-error')
  button.classList.add('translate-loading')

  try {
    const key = cacheKey(currentFilePath, paraIndex, text)
    let translated = localStorage.getItem(key)
    if (!translated) {
      translated = await translateText(text)
      localStorage.setItem(key, translated)
    }

    const resultEl = document.createElement('div')
    resultEl.className = 'translate-result'
    resultEl.setAttribute('data-para-index', paraIndexAttr)
    resultEl.textContent = translated
    paraEl.insertAdjacentElement('afterend', resultEl)
  } catch (e) {
    button.classList.add('translate-error')
    console.warn('[translate] 段落翻译失败:', e)
  } finally {
    button.classList.remove('translate-loading')
  }
}
</script>

<template>
  <div class="markdown-page">
    <article v-if="!error" ref="content" class="content" v-html="html" @click="handleContentClick" />
    <p v-else class="error">{{ error }}</p>
    <Toc :items="toc" />
    <MobileToc :items="toc" />
  </div>
</template>

<style scoped>
.markdown-page {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}
.content {
  flex: 1;
  min-width: 0;
}
.error {
  color: #ff6b6b;
}

.content :deep(h1),
.content :deep(h2),
.content :deep(h3) {
  scroll-margin-top: 20px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--text);
}
.content :deep(h1) {
  font-size: 28px;
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.content :deep(h2) {
  font-size: 21px;
  margin: 32px 0 12px;
}
.content :deep(h3) {
  font-size: 17px;
  margin: 24px 0 10px;
}
.content :deep(p) {
  margin: 0 0 14px;
  line-height: 1.75;
  color: var(--text);
}
.content :deep(ul),
.content :deep(ol) {
  margin: 0 0 14px;
  padding-left: 24px;
  line-height: 1.75;
}
.content :deep(li) {
  margin-bottom: 4px;
}
.content :deep(a) {
  color: var(--accent);
}
.content :deep(blockquote) {
  margin: 0 0 14px;
  padding: 4px 14px;
  border-left: 3px solid var(--border);
  color: var(--text-secondary);
}
.content :deep(pre) {
  margin: 0 0 16px;
  padding: 14px 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
}
.content :deep(code) {
  font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
  font-size: 0.9em;
}
.content :deep(p code) {
  padding: 2px 5px;
  border-radius: 4px;
  background: var(--sidebar-hover);
}
.content :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto 16px;
}
.content :deep(table) {
  border-collapse: collapse;
  margin: 0 0 16px;
  width: 100%;
  font-size: 14px;
}
.content :deep(th),
.content :deep(td) {
  border: 1px solid var(--border);
  padding: 6px 12px;
  text-align: left;
}
.content :deep(th) {
  background: var(--sidebar-bg);
}

@media (max-width: 768px) {
  .content :deep(h1) {
    font-size: 23px;
  }
  .content :deep(h2) {
    font-size: 19px;
    margin: 26px 0 10px;
  }
  .content :deep(h3) {
    font-size: 16px;
    margin: 20px 0 8px;
  }
  .content :deep(p),
  .content :deep(ul),
  .content :deep(ol) {
    line-height: 1.65;
  }
  .content :deep(pre) {
    font-size: 12.5px;
    margin: 0 -18px 16px;
    border-radius: 0;
    padding: 14px 18px;
  }
  .content :deep(table) {
    font-size: 13px;
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}

.content :deep(.translate-btn) {
  margin-left: 6px;
  padding: 0 4px;
  border: none;
  background: none;
  font-size: 0.85em;
  opacity: 0.35;
  cursor: pointer;
  vertical-align: middle;
  line-height: 1;
}
.content :deep(.translate-btn:hover) {
  opacity: 0.9;
}
.content :deep(.translate-btn.translate-loading) {
  opacity: 0.6;
  animation: translate-pulse 1s ease-in-out infinite;
}
.content :deep(.translate-btn.translate-error) {
  opacity: 1;
  filter: hue-rotate(-40deg) saturate(3);
}
@keyframes translate-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
.content :deep(.translate-result) {
  margin: -8px 0 14px;
  padding: 6px 12px;
  border-left: 3px solid var(--accent);
  background: var(--sidebar-hover);
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.92em;
  line-height: 1.6;
  border-radius: 0 4px 4px 0;
}
.content :deep(.translate-result.hidden) {
  display: none;
}
</style>
