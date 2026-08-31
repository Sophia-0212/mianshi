import { describe, it, expect } from 'vitest'
import { buildIndex, search } from './search'
import { splitIntoChunks } from './chunk'

function indexOfContent(path: string, name: string, content: string) {
  return buildIndex(splitIntoChunks(path, name, content))
}

describe('search', () => {
  it('能按标题关键字搜到对应文件', async () => {
    const index = buildIndex([
      ...splitIntoChunks('a/1.Promise详解.md', 'Promise详解', 'Promise 是异步编程解决方案'),
      ...splitIntoChunks('a/2.DOM事件流.md', 'DOM事件流', '事件冒泡和事件捕获'),
    ])
    const results = search(index, 'Promise')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].path).toBe('a/1.Promise详解.md')
  })

  it('搜不到时返回空数组', async () => {
    const index = indexOfContent('a.md', 'a', '内容')
    expect(search(index, '不存在的关键字xyz')).toEqual([])
  })

  it('标题命中优先于正文命中：即使正文命中次数更多，标题命中的文档仍排在前面', async () => {
    const index = buildIndex([
      // 文档A：仅在正文里多次出现关键字（正文强命中，标题不含关键字）
      ...splitIntoChunks('a/weak-title.md', '异步编程指南', 'Vue Vue Vue Vue Vue 组件化开发实践'),
      // 文档B：关键字只在 name 里出现一次（标题弱命中，正文完全不含关键字）
      ...splitIntoChunks('b/vue-basics.md', 'Vue入门', '响应式系统与组件通信机制'),
    ])
    const results = search(index, 'Vue')
    expect(results.map(r => r.path)).toEqual(['b/vue-basics.md', 'a/weak-title.md'])
  })

  it('能搜到具体段落，并返回所属标题和内容摘要', async () => {
    const content = [
      '# Promise详解',
      '',
      'Promise 是异步编程的一种解决方案。',
      '',
      '## 链式调用',
      '',
      'then 方法可以进行链式调用，避免回调地狱。',
    ].join('\n')

    const index = indexOfContent('a/1.md', 'Promise详解', content)
    const results = search(index, 'then')

    expect(results.length).toBe(1)
    expect(results[0].path).toBe('a/1.md')
    expect(results[0].heading).toBe('链式调用')
    expect(results[0].snippet).toContain('回调地狱')
  })

  it('同一文件不同段落命中同一关键字时，各段落分别作为独立结果返回', async () => {
    const content = [
      '# Event详解',
      '',
      '## Bubble冒泡',
      '',
      'Event 冒泡是指事件从子元素向父元素传播。',
      '',
      '## Capture捕获',
      '',
      'Event 捕获是指事件从父元素向子元素传播。',
    ].join('\n')

    const index = indexOfContent('a/event.md', 'Event详解', content)
    const results = search(index, 'Event')

    const headings = results.filter(r => r.path === 'a/event.md').map(r => r.heading)
    expect(headings).toContain('Bubble冒泡')
    expect(headings).toContain('Capture捕获')
  })

  it('同为正文命中时，关键词出现次数多的段落排在前面', async () => {
    const content = [
      '# Test文档',
      '',
      '## 少量出现',
      '',
      'Vue 是一个框架。',
      '',
      '## 大量出现',
      '',
      'Vue Vue Vue 组件化开发，Vue 生态丰富，学习 Vue 很有必要。',
    ].join('\n')

    const index = indexOfContent('a/test.md', 'Test文档', content)
    const results = search(index, 'Vue')

    expect(results.map(r => r.heading)).toEqual(['大量出现', '少量出现'])
  })

  it('标题命中永远排在正文命中前面，不受正文出现次数影响', async () => {
    const content = [
      '# Vue入门',
      '',
      '## 概述',
      '',
      'Vue Vue Vue Vue Vue Vue 出现很多次但标题也含关键字。',
    ].join('\n')
    const noTitle = [
      '# 前端框架',
      '',
      '## Vue专题',
      '',
      'Vue 只出现一次。',
    ].join('\n')

    const index = buildIndex([
      ...splitIntoChunks('a/with-title.md', 'Vue入门', content),
      ...splitIntoChunks('b/no-title.md', '前端框架', noTitle),
    ])
    const results = search(index, 'Vue')

    expect(results[0].path).toBe('a/with-title.md')
    expect(results[1].path).toBe('b/no-title.md')
  })
})
