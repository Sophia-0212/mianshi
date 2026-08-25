import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { mdTreePlugin } from './src/plugins/md-tree'

export default defineConfig({
  plugins: [vue(), mdTreePlugin()],
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
