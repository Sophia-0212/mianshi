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
  const docs = await Promise.all(
    files.map(async f => {
      const res = await fetch('/' + f.path.split('/').map(encodeURIComponent).join('/'))
      const content = res.ok ? await res.text() : ''
      return { path: f.path, name: f.name, content }
    })
  )
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

onMounted(initIndex)
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
