<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import SearchBox from './components/SearchBox.vue'

const route = useRoute()
const sidebarOpen = ref(false)
const mobileSearchOpen = ref(false)

watch(() => route.path, () => {
  sidebarOpen.value = false
  mobileSearchOpen.value = false
})
</script>

<template>
  <div class="layout">
    <button
      v-if="sidebarOpen"
      class="scrim"
      aria-label="关闭目录"
      @click="sidebarOpen = false"
    />

    <Sidebar class="pane-sidebar" :class="{ 'is-open': sidebarOpen }" />

    <div class="pane-content">
      <header class="mobile-header">
        <button
          type="button"
          class="icon-btn"
          aria-label="打开目录"
          @click="sidebarOpen = true"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
        <span class="mobile-title">笔记</span>
        <button
          type="button"
          class="icon-btn"
          aria-label="搜索"
          @click="mobileSearchOpen = true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </header>

      <div v-if="mobileSearchOpen" class="mobile-search-panel">
        <div class="mobile-search-bar">
          <SearchBox autofocus @navigated="mobileSearchOpen = false" />
          <button type="button" class="text-btn" @click="mobileSearchOpen = false">取消</button>
        </div>
      </div>

      <main class="pane-main">
        <div class="pane-main-inner">
          <SearchBox class="desktop-search" />
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<style>
:root {
  --bg: #000000;
  --surface: #0a0a0a;
  --sidebar-bg: #0a0a0a;
  --border: #2a2a2c;
  --text: #f5f5f7;
  --text-secondary: #86868b;
  --accent: #0a84ff;
  --accent-soft: rgba(10, 132, 255, 0.16);

  --sidebar-heading: #a1a1a6;
  --sidebar-text: #d2d2d7;
  --sidebar-text-hover: #ffffff;
  --sidebar-hover: rgba(255, 255, 255, 0.06);
  --sidebar-active-bg: var(--accent-soft);
  --sidebar-icon-muted: #6e6e73;
  --sidebar-icon-folder: #d9b768;

  --header-height: 52px;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
  color: var(--text);
  background: var(--bg);
  -webkit-tap-highlight-color: transparent;
}

#app {
  height: 100%;
}

.layout {
  display: flex;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.pane-sidebar {
  flex-shrink: 0;
}

.pane-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.pane-main {
  flex: 1;
  overflow-y: auto;
  background: var(--bg);
  -webkit-overflow-scrolling: touch;
}

.pane-main-inner {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px 32px 64px;
}

.mobile-header {
  display: none;
}

.mobile-search-panel {
  display: none;
}

.scrim {
  display: none;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  background: none;
  color: var(--text);
  cursor: pointer;
  border-radius: 10px;
}
.icon-btn:active {
  background: var(--sidebar-hover);
}

.text-btn {
  border: none;
  background: none;
  color: var(--accent);
  font-size: 15px;
  padding: 0 4px;
  cursor: pointer;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .layout {
    position: relative;
  }

  .pane-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 30;
    width: min(320px, 84vw);
    transform: translateX(-100%);
    transition: transform 220ms ease;
  }
  .pane-sidebar.is-open {
    transform: translateX(0);
  }

  .scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 20;
    padding: 0;
    border: none;
    background: rgba(0, 0, 0, 0.5);
  }

  .mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-height);
    padding: 0 6px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: saturate(180%) blur(14px);
    -webkit-backdrop-filter: saturate(180%) blur(14px);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .mobile-title {
    font-size: 15px;
    font-weight: 600;
  }

  .mobile-search-panel {
    display: block;
    position: sticky;
    top: var(--header-height);
    z-index: 9;
    padding: 8px 12px;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }
  .mobile-search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .mobile-search-bar :deep(.search-box) {
    flex: 1;
    margin-bottom: 0;
  }

  .desktop-search {
    display: none;
  }

  .pane-main-inner {
    padding: 16px 18px 96px;
  }
}
</style>
