主要五点：

1. **响应式**：Vue2 用 `Object.defineProperty`，无法直接监听属性新增、删除及数组索引修改；Vue3 用 `Proxy`，支持这些操作及 `Map、Set`。
2. **逻辑组织**：Vue2 主要用 Options API；Vue3 支持 Composition API，方便逻辑复用，仍兼容 Options API。
3. **性能**：Vue3 通过静态提升、PatchFlag 等编译优化，减少更新开销；支持 Tree-shaking，按需打包。
4. **新能力**：Vue3 支持多根节点 Fragment、传送门 Teleport。
5. **TypeScript**：Vue3 用 TypeScript 重写，类型推导更完善。
