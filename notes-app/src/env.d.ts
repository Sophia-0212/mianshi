/// <reference types="vite/client" />

declare module 'virtual:md-tree' {
  import type { MdTreeNode } from './plugins/md-tree'
  const tree: MdTreeNode[]
  export default tree
  export const files: { path: string; name: string }[]
}
