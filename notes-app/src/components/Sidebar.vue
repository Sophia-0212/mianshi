<script setup lang="ts">
import tree from 'virtual:md-tree'
import TreeNode from './TreeNode.vue'
</script>

<template>
  <nav class="sidebar">
    <TreeNode v-for="node in tree" :key="node.path" :node="node" />
  </nav>
</template>

<style scoped>
.sidebar { width: 260px; overflow-y: auto; padding: 8px; border-right: 1px solid #eee; }
</style>
