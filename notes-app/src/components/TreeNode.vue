<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import type { MdTreeNode } from '../plugins/md-tree'

defineOptions({ name: 'TreeNode' })

const props = defineProps<{ node: MdTreeNode; depth?: number }>()
const route = useRoute()
const open = ref(false)
const depth = computed(() => props.depth ?? 0)

function toPath(p: string): string {
  return '/' + p.split('/').map(encodeURIComponent).join('/')
}

const isActive = computed(
  () => props.node.type === 'file' && decodeURIComponent(route.path.slice(1)) === props.node.path
)
</script>

<template>
  <div v-if="node.type === 'dir'" class="dir">
    <button
      type="button"
      class="dir-label"
      :style="{ paddingLeft: depth * 14 + 8 + 'px' }"
      :aria-expanded="open"
      @click="open = !open"
    >
      <svg class="chevron" :class="{ open }" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <svg class="icon icon-folder" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 7a2 2 0 0 1 2-2h4.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
      </svg>
      <span class="label-text">{{ node.name }}</span>
    </button>
    <div v-show="open" class="dir-children">
      <TreeNode v-for="child in node.children" :key="child.path" :node="child" :depth="depth + 1" />
    </div>
  </div>
  <RouterLink
    v-else
    :to="toPath(node.path)"
    class="file"
    :class="{ active: isActive }"
    :style="{ paddingLeft: depth * 14 + 30 + 'px' }"
  >
    <svg class="icon icon-file" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 2.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 20V4A1.5 1.5 0 0 1 5.5 2.5H6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
      <path d="M14 2.5V7h4.2" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    </svg>
    <span class="label-text">{{ node.name }}</span>
  </RouterLink>
</template>

<style scoped>
.dir-label {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding-top: 7px;
  padding-bottom: 7px;
  padding-right: 8px;
  border: none;
  background: none;
  font: inherit;
  font-weight: 600;
  font-size: 13px;
  color: var(--sidebar-heading);
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 120ms ease;
}
.dir-label:hover {
  background-color: var(--sidebar-hover);
}
.dir-label:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.chevron {
  flex-shrink: 0;
  color: var(--sidebar-icon-muted);
  transition: transform 160ms ease;
}
.chevron.open {
  transform: rotate(90deg);
}

.icon {
  flex-shrink: 0;
}
.icon-folder {
  color: var(--sidebar-icon-folder);
}
.icon-file {
  color: var(--sidebar-icon-muted);
}

.label-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dir-children {
  position: relative;
}

.file {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  padding-top: 6px;
  padding-bottom: 6px;
  padding-right: 8px;
  text-decoration: none;
  font-size: 13px;
  color: var(--sidebar-text);
  border-radius: 6px;
  margin: 1px 6px 1px 0;
  transition: background-color 120ms ease, color 120ms ease;
}
.file:hover {
  background-color: var(--sidebar-hover);
  color: var(--sidebar-text-hover);
}
.file:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
.file.active {
  background-color: var(--sidebar-active-bg);
  color: var(--accent);
  font-weight: 600;
}
.file.active .icon-file {
  color: var(--accent);
}
.file.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 2px;
  border-radius: 2px;
  background: var(--accent);
}

@media (max-width: 768px) {
  .dir-label {
    padding-top: 11px;
    padding-bottom: 11px;
    font-size: 15px;
  }
  .file {
    padding-top: 10px;
    padding-bottom: 10px;
    font-size: 15px;
  }
  .icon-folder {
    width: 18px;
    height: 18px;
  }
  .icon-file {
    width: 17px;
    height: 17px;
  }
}
</style>
