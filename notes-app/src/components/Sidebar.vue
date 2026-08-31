<script setup lang="ts">
import tree from 'virtual:md-tree'
import TreeNode from './TreeNode.vue'
</script>

<template>
  <nav class="sidebar" aria-label="笔记目录">
    <div class="sidebar-title">笔记</div>
    <div class="sidebar-tree">
      <TreeNode v-for="node in tree" :key="node.path" :node="node" />
    </div>
  </nav>
</template>

<style scoped>
.sidebar {
  width: 272px;
  flex-shrink: 0;
  height: 100%;
  overflow-y: auto;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  padding: 12px 6px 24px;
  -webkit-overflow-scrolling: touch;
}

.sidebar-title {
  padding: 4px 14px 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sidebar-icon-muted);
}

.sidebar-tree {
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .sidebar {
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
    padding-top: max(12px, env(safe-area-inset-top));
    padding-bottom: max(24px, env(safe-area-inset-bottom));
  }
}
</style>
