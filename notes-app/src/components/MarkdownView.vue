<script setup lang="ts">
import { ref, watch } from 'vue'
import { renderMarkdown } from '../utils/markdown'
import { extractToc, type TocItem } from '../utils/toc'
import Toc from './Toc.vue'
import MobileToc from './MobileToc.vue'

const props = defineProps<{ filePath: string }>()

const html = ref('')
const toc = ref<TocItem[]>([])
const error = ref<string | null>(null)

async function load(filePath: string) {
  error.value = null
  try {
    const res = await fetch('/' + filePath.split('/').map(encodeURIComponent).join('/'), {
      headers: { 'X-Notes-Fetch': '1' },
    })
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
</style>
