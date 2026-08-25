<script setup lang="ts">
import type { TocItem } from '../utils/toc'

defineProps<{ items: TocItem[] }>()

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <aside v-if="items.length" class="toc">
    <div
      v-for="item in items"
      :key="item.id"
      class="toc-item"
      :style="{ paddingLeft: (item.level - 1) * 12 + 'px' }"
      @click="scrollTo(item.id)"
    >
      {{ item.text }}
    </div>
  </aside>
</template>

<style scoped>
.toc { width: 200px; flex-shrink: 0; position: sticky; top: 0; }
.toc-item { cursor: pointer; padding: 4px 0; font-size: 13px; color: #666; }
.toc-item:hover { color: #1a73e8; }
</style>
