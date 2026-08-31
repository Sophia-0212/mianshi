<script setup lang="ts">
import { ref } from 'vue'
import type { TocItem } from '../utils/toc'

defineProps<{ items: TocItem[] }>()
const open = ref(false)

function scrollTo(id: string) {
  open.value = false
  // 等弹层收起的过渡结束再滚动，避免 scrollIntoView 计算的目标位置
  // 被弹层收起前占用的空间（如果弹层影响了布局）干扰
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  })
}
</script>

<template>
  <div v-if="items.length" class="mobile-toc">
    <button
      type="button"
      class="fab"
      aria-label="打开文内目录"
      @click="open = true"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="open" class="sheet-scrim" @click="open = false" />
      <div v-if="open" class="sheet" role="dialog" aria-label="文内目录">
        <div class="sheet-handle" />
        <div class="sheet-title">目录</div>
        <div class="sheet-list">
          <button
            v-for="item in items"
            :key="item.id"
            type="button"
            class="sheet-item"
            :class="`level-${item.level}`"
            @click="scrollTo(item.id)"
          >
            {{ item.text }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fab {
  position: fixed;
  right: 18px;
  bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 15;
  width: 48px;
  height: 48px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
}
.fab:active {
  background: var(--sidebar-hover);
}

.sheet-scrim {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.5);
}

.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 41;
  max-height: 70vh;
  overflow-y: auto;
  background: var(--surface);
  border-top: 1px solid var(--border);
  border-radius: 16px 16px 0 0;
  padding: 8px 8px calc(16px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.5);
}

.sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  margin: 6px auto 12px;
}

.sheet-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  padding: 0 12px 8px;
}

.sheet-list {
  display: flex;
  flex-direction: column;
}

.sheet-item {
  text-align: left;
  border: none;
  background: none;
  color: var(--sidebar-text);
  font: inherit;
  font-size: 15px;
  padding: 12px 12px;
  border-radius: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sheet-item:active {
  background: var(--sidebar-hover);
}
.sheet-item.level-2 {
  padding-left: 26px;
}
.sheet-item.level-3 {
  padding-left: 40px;
  font-size: 14px;
  color: var(--text-secondary);
}

@media (min-width: 769px) {
  .mobile-toc {
    display: none;
  }
}
</style>
