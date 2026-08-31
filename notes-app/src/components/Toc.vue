<script setup lang="ts">
import type { TocItem } from '../utils/toc'

defineProps<{ items: TocItem[] }>()

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <aside v-if="items.length" class="toc" aria-label="文内目录">
    <div class="toc-title">目录</div>
    <div
      v-for="item in items"
      :key="item.id"
      class="toc-item"
      :class="`level-${item.level}`"
      @click="scrollTo(item.id)"
    >
      {{ item.text }}
    </div>
  </aside>
</template>

<style scoped>
.toc {
  width: 200px;
  flex-shrink: 0;
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding-left: 4px;
  border-left: 1px solid var(--border);
}

.toc-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  padding: 0 0 8px 12px;
}

.toc-item {
  cursor: pointer;
  padding: 5px 0 5px 12px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-secondary);
  border-radius: 4px;
  transition: color 120ms ease, background-color 120ms ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toc-item:hover {
  color: var(--accent);
  background: var(--sidebar-hover);
}
.toc-item.level-2 {
  padding-left: 22px;
}
.toc-item.level-3 {
  padding-left: 32px;
  font-size: 12.5px;
}

@media (max-width: 768px) {
  .toc {
    display: none;
  }
}
</style>
