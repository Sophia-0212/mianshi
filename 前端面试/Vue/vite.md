# Vite 面试高频 Top 5

## 一、Vite 线上线下构建

以普通 Vue 单页应用为例：

- **线下开发**：`npm run dev` 启动 Vite 开发服务器。利用浏览器原生 ESM，按需编译源代码，无需先打包整个应用；依赖预构建加速加载，代码修改通过 HMR 热更新。
- **线上生产**：`npm run build` 构建，执行 Tree-shaking、代码分割、压缩，生成 `dist`。部署到 Nginx 或 CDN，由浏览器加载静态资源。
- **本地预览**：`npm run preview` 检查构建产物，不能作为生产服务器。官方说明

## 二、Vite 是什么？为什么启动快？

### 回答重点

- Vite 是现代前端构建工具，基于原生 ESM。
- 开发环境不预先打包整个项目。
- 浏览器请求哪个模块，Vite 就按需编译哪个模块。
- 使用 esbuild 处理依赖预构建，速度很快。
- 生产环境使用 Rollup 打包。

## 三、Vite 和 Webpack 有什么区别？

| 对比 | Vite | Webpack |
|---|---|---|
| 开发启动 | 按需编译，启动快 | 先打包，项目大时启动慢 |
| 开发更新 | 原生 ESM + HMR | 重新构建依赖图 |
| 依赖预构建 | esbuild | 主要由自身处理 |
| 生产构建 | Rollup | Webpack |
| 生态成熟度 | 较新、配置简单 | 成熟、插件丰富 |

**面试总结：** Vite 重点优化开发体验，Webpack 更强调成熟的打包生态；二者生产环境都能生成优化后的静态资源。

## 四、Vite 的开发启动流程是什么？

```text
启动 Vite
  → 读取 vite.config.ts
  → 启动开发服务器
  → 预构建第三方依赖
  → 浏览器请求入口文件
  → Vite 按需转换并返回模块
  → 浏览器通过 ESM 加载依赖
```

### 面试口述

Vite 启动时先读取配置并启动开发服务器，然后使用 esbuild 预构建第三方依赖。浏览器访问入口文件后，Vite 根据请求按需转换模块，并以 ESM 形式返回。这样不需要等待整个项目打包完成，所以启动很快。

## 五、Vite 的 HMR 是如何实现的？

HMR（Hot Module Replacement）是模块热替换。

```text
文件变化
  → Vite 监听文件
  → 通过 WebSocket 通知浏览器
  → 浏览器请求更新模块
  → 只替换受影响模块
  → 页面状态尽量保留
```

### 回答重点

- Vite 开发服务器监听文件变化。
- 通过 WebSocket 通知客户端。
- 基于 ESM 精确定位受影响模块。
- 只更新局部模块，不刷新整个页面。
- Vue、React 通过插件实现组件状态保留。

## 六、Vite 的配置文件和常用配置有哪些？

常见配置文件：

```text
vite.config.js
vite.config.ts
```

常用配置：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': '/src'
    }
  },

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

### 面试重点

- `plugins`：加载框架和功能插件。
- `resolve.alias`：配置路径别名。
- `server.proxy`：解决开发环境跨域。
- `server.port`：配置开发端口。
- `build.outDir`：配置构建目录。
- `build.sourcemap`：生成 Source Map。

## 七、一句话总结

Vite 开发环境依赖原生 ESM 按需编译，依赖预构建使用 esbuild，生产环境使用 Rollup，并通过 HMR 提升开发体验。
