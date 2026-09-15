# Pinia 最常见 Top 5 面试题

## 1. Pinia 是什么？相比 Vuex 有什么优势？

**回答重点：**

- Pinia 是 Vue 官方推荐的状态管理库。
- 支持 Vue 3，也兼容 Vue 2。
- 没有 `mutations`，修改状态更直接。
- 原生支持 TypeScript，类型推导更好。
- 支持多个 Store，模块化更自然。
- 体积更小，API 更简单。

## 2. Pinia 的核心概念有哪些？

- `state`：存储状态。
- `getters`：派生状态，类似计算属性。
- `actions`：业务逻辑和异步操作。
- `defineStore`：定义 Store。
- `storeToRefs`：解构 Store 时保持响应式。

## 3. Pinia 中如何定义和使用 Store？

```ts
// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    token: ''
  }),

  getters: {
    isLogin: state => Boolean(state.token)
  },

  actions: {
    login(name: string, token: string) {
      this.name = name
      this.token = token
    }
  }
})
```

```ts
const userStore = useUserStore()

userStore.login('Tom', 'token')
console.log(userStore.isLogin)
```

**面试口述：**

我会使用 `defineStore` 定义一个 Store，并传入唯一标识。Store 通常由三部分组成：`state` 保存数据，`getters` 计算派生数据，`actions` 封装同步或异步业务逻辑。组件中调用 `useUserStore()` 获取 Store 实例，然后直接读取状态、调用 Getter 和 Action。Pinia 会自动提供响应式能力和 TypeScript 类型推导。

## 4. 为什么不能直接解构 Pinia Store？如何保持响应式？

直接解构可能丢失响应式：

```ts
const { name } = userStore
```

使用 `storeToRefs` 解构状态和 Getter：

```ts
const { name, isLogin } = storeToRefs(userStore)
const { login } = userStore
```

**原因：** Store 属性是响应式对象，普通解构只复制当前值；`storeToRefs` 会将属性转换为 `ref`。

## 5. Pinia 如何实现持久化？刷新页面后状态会丢失吗？

Pinia 默认只保存在内存中，刷新页面后会丢失。常见做法：

- 手动同步到 `localStorage` 或 `sessionStorage`。
- 使用 `pinia-plugin-persistedstate` 等持久化插件。
- 只持久化必要字段，例如 Token、用户偏好。

```ts
export const useUserStore = defineStore('user', {
  state: () => ({
    token: ''
  }),

  persist: true
})
```

面试补充：敏感信息不能无条件放入 `localStorage`，需要结合 XSS 防护和 Token 过期策略。
