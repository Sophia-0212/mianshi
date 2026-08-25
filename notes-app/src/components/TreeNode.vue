<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import type { MdTreeNode } from '../plugins/md-tree'

defineOptions({ name: 'TreeNode' })

const props = defineProps<{ node: MdTreeNode }>()
const route = useRoute()
const open = ref(true)

function toPath(p: string): string {
  return '/' + p.split('/').map(encodeURIComponent).join('/')
}

function isActive(): boolean {
  return props.node.type === 'file' && decodeURIComponent(route.path.slice(1)) === props.node.path
}
</script>

<template>
  <div v-if="node.type === 'dir'" class="dir">
    <div class="dir-label" @click="open = !open">{{ node.name }}</div>
    <div v-if="open" class="dir-children">
      <TreeNode v-for="child in node.children" :key="child.path" :node="child" />
    </div>
  </div>
  <RouterLink v-else :to="toPath(node.path)" class="file" :class="{ active: isActive() }">
    {{ node.name }}
  </RouterLink>
</template>

<style scoped>
.dir-label { cursor: pointer; font-weight: 600; padding: 4px 0; }
.dir-children { padding-left: 12px; }
.file { display: block; padding: 4px 0; text-decoration: none; color: #333; }
.file.active { color: #1a73e8; font-weight: 600; }
</style>
