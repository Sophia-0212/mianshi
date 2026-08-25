<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { files } from 'virtual:md-tree'
import { buildIndex, search, type SearchResult } from '../utils/search'
import { useRouter } from 'vue-router'

const router = useRouter()
const query = ref('')
const results = ref<SearchResult[]>([])
let index: ReturnType<typeof buildIndex> | null = null

async function initIndex() {
  const settled = await Promise.allSettled(
    files.map(async f => {
      const res = await fetch('/' + f.path.split('/').map(encodeURIComponent).join('/'))
      const content = res.ok ? await res.text() : ''
      return { path: f.path, name: f.name, content }
    })
  )

  // 用 allSettled 而不是 all：任意文件 fetch 因网络问题抛异常时，
  // 不能让其他已成功的文件也被整体丢弃，否则 index 永远是 null，搜索会静默失效。
  // fetch 失败的文件降级为空 content（仍可通过标题搜到），并打日志方便排查。
  const docs = settled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    const f = files[i]
    console.warn(`[SearchBox] 拉取文件失败，已降级为空内容: ${f.path}`, result.reason)
    return { path: f.path, name: f.name, content: '' }
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
}

onMounted(() => {
  // 兜底：allSettled 本身不会 reject，但 buildIndex 或其他同步逻辑仍可能抛错，
  // 不加 .catch 的话会变成 unhandled rejection。
  initIndex().catch(err => {
    console.error('[SearchBox] 初始化搜索索引失败', err)
  })
})
</script>

<template>
  <div class="search-box">
    <input v-model="query" placeholder="搜索笔记标题或内容" @input="onInput" />
    <ul v-if="results.length" class="results">
      <li v-for="r in results" :key="r.path" @click="goTo(r.path)">{{ r.name }}</li>
    </ul>
  </div>
</template>

<style scoped>
.search-box { position: relative; margin-bottom: 16px; }
input { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
.results { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #ddd; border-radius: 4px; margin: 4px 0 0; padding: 4px 0; list-style: none; max-height: 300px; overflow-y: auto; z-index: 10; }
.results li { padding: 8px 12px; cursor: pointer; }
.results li:hover { background: #f5f5f5; }
</style>
