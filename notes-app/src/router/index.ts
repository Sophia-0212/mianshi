import { createRouter, createWebHistory } from 'vue-router'
import MarkdownView from '../components/MarkdownView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/前端面试/汇总/1.JS基础面试题.md' },
    { path: '/:filePath(.*)', component: MarkdownView, props: true },
  ],
})
