<script setup lang="ts">
import { ref, watch } from 'vue'
import { renderMarkdown } from '../utils/markdown'
import { extractToc, type TocItem } from '../utils/toc'
import Toc from './Toc.vue'

const props = defineProps<{ filePath: string }>()

const html = ref('')
const toc = ref<TocItem[]>([])
const error = ref<string | null>(null)

async function load(filePath: string) {
  error.value = null
  try {
    const res = await fetch('/' + filePath.split('/').map(encodeURIComponent).join('/'))
    if (!res.ok) throw new Error(`文件不存在: ${filePath}`)
    const source = await res.text()
    toc.value = extractToc(source)
    html.value = await renderMarkdown(source)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

watch(() => props.filePath, load, { immediate: true })
</script>

<template>
  <div class="markdown-page">
    <article v-if="!error" class="content" v-html="html" />
    <p v-else class="error">{{ error }}</p>
    <Toc :items="toc" />
  </div>
</template>

<style scoped>
.markdown-page { display: flex; gap: 24px; align-items: flex-start; }
.content { flex: 1; min-width: 0; }
.error { color: #d32f2f; }
</style>
