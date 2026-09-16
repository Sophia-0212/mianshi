# Findings

## 当前已知

- 目标仓库：`/Users/lixiaofei05/Desktop/ms`
- 缓存算法至少包括 OPT、FIFO、LRU、LFU、Clock。
- 用户要求三种语言：Python、Go、C++；普通函数；覆盖正常、边界、异常或空输入。
- 用户要求 `缓存.md` 中的算法链接能被 `notes-app` 点击跳转。

## 待确认

- notes-app 支持的 Markdown 链接格式和路由规则。
- 链表、高频目录中哪些文档已具备三语言实现，哪些缺失。

## 盘点
- 高频目录原 41 题：18 题已有三语言示例，23 题待补全。另新增 622、3508、OPT/Clock 自编模拟。
- 链表目录 10 道算法题已存在三语言，理论基础与总结篇需补充示例或索引。
- notes-app MarkdownView 解析相对路径、decodeURIComponent 后交由 router.push，支持带空格中文路径的编码链接。
- 本轮初稿 LRU/LFU/622 存在占位、不完整接口，将完整替换并运行代码验证。
