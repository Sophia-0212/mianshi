<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import SearchBox from './components/SearchBox.vue'
</script>

<template>
  <div class="layout">
    <Sidebar class="pane-sidebar" />
    <main class="pane-main">
      <SearchBox />
      <RouterView />
    </main>
  </div>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; }
.layout { display: flex; height: 100vh; }
.pane-sidebar { flex-shrink: 0; }
.pane-main { flex: 1; overflow-y: auto; padding: 16px 24px; }
</style>
