<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { files } from 'virtual:md-tree'
import { buildIndex, search, type SearchResult } from '../utils/search'
import { splitIntoChunks } from '../utils/chunk'
import { useRouter } from 'vue-router'

const props = defineProps<{ autofocus?: boolean }>()
const emit = defineEmits<{ navigated: [] }>()

const router = useRouter()
const query = ref('')
const results = ref<SearchResult[]>([])
const inputEl = ref<HTMLInputElement | null>(null)
let index: ReturnType<typeof buildIndex> | null = null

async function initIndex() {
  const settled = await Promise.allSettled(
    files.map(async f => {
      const res = await fetch('/' + f.path.split('/').map(encodeURIComponent).join('/'), {
        headers: { 'X-Notes-Fetch': '1' },
      })
      const content = res.ok ? await res.text() : ''
      return { path: f.path, name: f.name, content }
    })
  )

  // 用 allSettled 而不是 all：任意文件 fetch 因网络问题抛异常时，
  // 不能让其他已成功的文件也被整体丢弃，否则 index 永远是 null，搜索会静默失效。
  // fetch 失败的文件降级为空 content（仍可通过标题搜到），并打日志方便排查。
  const docs = settled.flatMap((result, i) => {
    const f = files[i]
    if (result.status === 'fulfilled') {
      return splitIntoChunks(result.value.path, result.value.name, result.value.content)
    }
    console.warn(`[SearchBox] 拉取文件失败，已降级为空内容: ${f.path}`, result.reason)
    return splitIntoChunks(f.path, f.name, '')
  })

  index = buildIndex(docs)
}

function onInput() {
  if (!index) return
  results.value = search(index, query.value)
}

function goTo(path: string) {
  results.value = []
  query.value = ''
  router.push('/' + path.split('/').map(encodeURIComponent).join('/'))
  emit('navigated')
}

onMounted(() => {
  // 兜底：allSettled 本身不会 reject，但 buildIndex 或其他同步逻辑仍可能抛错，
  // 不加 .catch 的话会变成 unhandled rejection。
  initIndex().catch(err => {
    console.error('[SearchBox] 初始化搜索索引失败', err)
  })

  if (props.autofocus) {
    nextTick(() => inputEl.value?.focus())
  }
})
</script>

<template>
  <div class="search-box">
    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    </svg>
    <input ref="inputEl" v-model="query" type="text" placeholder="搜索笔记标题或内容" @input="onInput" />
    <ul v-if="results.length" class="results">
      <li v-for="(r, i) in results" :key="r.path + '::' + r.heading + i" @click="goTo(r.path)">
        <svg class="result-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 2.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 20V4A1.5 1.5 0 0 1 5.5 2.5H6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
        <div class="result-body">
          <span class="result-name">{{ r.name }}<span v-if="r.heading" class="result-heading"> · {{ r.heading }}</span></span>
          <span v-if="r.snippet" class="result-snippet">{{ r.snippet }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.search-box {
  position: relative;
  margin-bottom: 20px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

input {
  width: 100%;
  padding: 9px 12px 9px 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text);
  background: var(--sidebar-bg);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
input::placeholder {
  color: var(--text-secondary);
}
input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin: 0;
  padding: 6px;
  list-style: none;
  max-height: 320px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.results li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13.5px;
  color: var(--text);
}
.results li:hover {
  background: var(--sidebar-hover);
}
.result-icon {
  flex-shrink: 0;
  color: var(--sidebar-icon-muted);
}
.result-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.result-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-heading {
  color: var(--text-secondary);
  font-weight: 400;
}
.result-snippet {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
