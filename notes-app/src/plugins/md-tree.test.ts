import fs from 'node:fs'
import path from 'node:path'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { buildTree, naturalCompare } from './md-tree'

const FIXTURES_DIR = path.join(__dirname, '__fixtures__')
const FIXTURE_ROOT = path.join(FIXTURES_DIR, 'root')

beforeAll(() => {
  fs.mkdirSync(path.join(FIXTURE_ROOT, '前端面试', '汇总'), { recursive: true })
  fs.mkdirSync(path.join(FIXTURE_ROOT, 'node_modules'), { recursive: true })
  fs.mkdirSync(path.join(FIXTURE_ROOT, '.git'), { recursive: true })
  fs.mkdirSync(path.join(FIXTURE_ROOT, 'docs', 'superpowers', 'plans'), { recursive: true })

  fs.writeFileSync(path.join(FIXTURE_ROOT, '前端面试', '汇总', '1.JS基础面试题.md'), '')
  fs.writeFileSync(path.join(FIXTURE_ROOT, '前端面试', '汇总', '2.浏览器原理与安全面试题.md'), '')
  fs.writeFileSync(path.join(FIXTURE_ROOT, 'node_modules', 'foo.md'), '')
  fs.writeFileSync(path.join(FIXTURE_ROOT, '.git', 'HEAD'), '')
  fs.writeFileSync(path.join(FIXTURE_ROOT, '.hidden.md'), '')
  fs.writeFileSync(path.join(FIXTURE_ROOT, 'docs', 'superpowers', 'plans', 'task8.md'), '')
})

afterAll(() => {
  fs.rmSync(FIXTURES_DIR, { recursive: true, force: true })
})

describe('naturalCompare', () => {
  it('按数字前缀排序而不是字符串排序', () => {
    const input = ['10.foo', '2.bar', '1.baz']
    expect([...input].sort(naturalCompare)).toEqual(['1.baz', '2.bar', '10.foo'])
  })
})

describe('buildTree', () => {
  it('去掉文件的数字前缀和 .md 后缀作为展示名', () => {
    const tree = buildTree(FIXTURE_ROOT)
    const flatten = (nodes: any[]): any[] =>
      nodes.flatMap(n => [n, ...(n.children ? flatten(n.children) : [])])
    const all = flatten(tree)
    const file = all.find(n => n.path.endsWith('1.JS基础面试题.md'))
    expect(file?.name).toBe('JS基础面试题')
  })

  it('文件夹排在文件前面，同级按 sortKey 数字感知排序', () => {
    const tree = buildTree(FIXTURE_ROOT)
    expect(tree.every(n => n.type === 'dir')).toBe(true)
  })

  it('跳过 node_modules、.git、隐藏文件、docs', () => {
    const tree = buildTree(FIXTURE_ROOT)
    const flatten = (nodes: any[]): string[] =>
      nodes.flatMap(n => [n.path, ...(n.children ? flatten(n.children) : [])])
    const paths = flatten(tree)
    expect(paths.some(p => p.includes('node_modules'))).toBe(false)
    expect(paths.some(p => p.includes('.git'))).toBe(false)
    expect(paths.some(p => p.includes('/.'))).toBe(false)
    expect(paths.some(p => p.includes('docs'))).toBe(false)
  })
})
