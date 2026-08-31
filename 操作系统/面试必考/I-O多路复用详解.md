# I/O 多路复用详解：select、poll、epoll 原理与区别

## 什么是 I/O 多路复用

网络读操作在内核里分两个阶段：**等数据就绪** 和 **把数据从内核缓冲区拷贝到用户缓冲区**。传统的"一个连接一个线程"模型，问题就卡在第一阶段——线程死等某个连接的数据，白白浪费。

I/O 多路复用的思路：把一堆文件描述符（fd）一起交给内核统一监听，**谁的数据就绪了就去处理谁**。可以类比成一个服务员管十张桌子，不是死守着一桌干等，而是来回巡视，哪桌客人举手示意了就过去服务哪桌。

![网络读取中的两个阶段](https://oss.javaguide.cn/github/javaguide/cs-basics/operating-system/io-multiplexing-io-two-phases.png)

要注意一点：多路复用本身依然属于**同步 I/O**。内核只负责告诉你"哪些 fd 就绪了"，真正把数据从内核拷到用户空间，还是要应用自己调用 `read`/`recv` 去完成。

## 五种 I/O 模型里的位置

Unix I/O 大致可以分成五类：阻塞、非阻塞、I/O 多路复用、信号驱动、异步 I/O。区分标准在于：**"内核态到用户态的数据搬运"这一步是谁完成的**。前四种都是应用自己主动调用完成拷贝，所以都算同步；只有异步 I/O 把这一步也交给内核代劳。

![五种 I/O 模型对比](https://oss.javaguide.cn/github/javaguide/cs-basics/operating-system/io-multiplexing-five-io-models.png)

## select

函数签名：

```c
int select(int nfds, fd_set *readfds, fd_set *writefds, fd_set *exceptfds, struct timeval *timeout);
```

核心数据结构 `fd_set` 本质是个位图，配合 `FD_ZERO`、`FD_SET`、`FD_CLR`、`FD_ISSET` 四个宏来操作。

select 有四个比较硬的缺陷：

1. fd 数量受 glibc 里 `FD_SETSIZE`（默认 1024）限制，超了就用不了
2. 每次调用都要把整个位图从用户态拷贝到内核态，fd 一多这个拷贝成本就很明显
3. 位图是"传入即传出"的参数，内核处理完会把没就绪的位清掉，下一轮调用前必须重新构建整个位图
4. select 返回后，应用还得自己 `O(N)` 遍历一遍所有 fd，才能知道到底是哪几个就绪了

## poll

poll 改用 `pollfd` 结构体数组，把 `events`（关心哪些事件）和 `revents`（实际发生了哪些事件）拆开存，不用像 select 那样"传入传出复用同一份数据"。好处是不再受 1024 个 fd 的硬限制，而且不用每轮重新构建"我关心哪些 fd"这份列表。

但 poll 依然没解决 select 剩下的两个性能问题：**每次调用还是要把全量 fd 集合从用户态拷进内核态**，返回后**依然要线性扫描**才能找出就绪的 fd。

## epoll

epoll 是 Linux 专有的方案，拆成三个独立的系统调用：

- `epoll_create1`：创建一个 epoll 实例
- `epoll_ctl`：往这个实例里添加/删除/修改要监听的 fd
- `epoll_wait`：等待事件发生，返回就绪的 fd 列表

内核内部维护一棵**红黑树**（存所有注册进来的 fd）和一条**就绪链表**。每个 fd 就绪时，通过回调机制被挂到就绪链表上；`epoll_wait` 只需要看一眼就绪链表，不用像 select/poll 那样遍历全量 fd。

![epoll 内部架构](https://oss.javaguide.cn/github/javaguide/cs-basics/operating-system/io-multiplexing-epoll-architecture.png)

这里要澄清一个常见的误解：**"epoll 快是因为用了 mmap"这个说法是不对的**。`epoll_wait` 返回事件时，实际走的是 `__put_user` 把就绪事件拷给用户态，并没有用 mmap 共享内存区。epoll 真正省下来的开销，是**不用每次都重复传一遍全量 fd 列表**，而不是省了拷贝本身。

## LT 与 ET 触发模式

- **水平触发（LT，Level Triggered）**：默认模式。只要 fd 里的数据还没读完，就会一直通知你
- **边缘触发（ET，Edge Triggered）**：只在状态发生变化的那一瞬间通知一次。必须配合非阻塞 fd，并且要在一次通知里循环读到返回 `EAGAIN` 为止，否则数据会漏读

![水平触发和边缘触发对比](https://oss.javaguide.cn/github/javaguide/cs-basics/operating-system/io-multiplexing-lt-vs-et.png)

要强调的是：ET 模式踩坑，本质是**正确性问题**而不是性能问题。漏读 `EAGAIN` 导致某个连接的数据卡住不再处理，是这类代码里最常见的 bug。

## epoll 的局限

epoll 不是万能药，有几个边界情况要清楚：

1. 连接数很少、但每个连接都非常活跃的场景下，epoll 未必比 select/poll 快
2. epoll 是 Linux 专有的，对应到 macOS/BSD 是 `kqueue`，Windows 是 `IOCP`，不能跨平台直接搬
3. 存在"惊群"问题（多个进程/线程同时被同一个事件唤醒），可以用 `EPOLLEXCLUSIVE` 缓解
4. ET 模式对编程的严谨性要求更高，容易踩坑

## select、poll、epoll 对比

![select、poll、epoll 对比](https://oss.javaguide.cn/github/javaguide/cs-basics/operating-system/io-multiplexing-select-poll-epoll.png)

## 实际应用场景

- **Redis**：单线程事件循环模型，6.0 之后只把网络 I/O 这部分做成了多线程，核心命令处理依然是单线程
- **Nginx**：多进程 + epoll 的 ET 模式
- **Java NIO 的 `Selector`**：在 Linux 平台下底层走的就是 epoll
- **Netty**：提供了原生 epoll transport，需要注意 4.0 和 4.2 版本之间 `EpollMode` 的行为有差异

![文件事件处理器](https://oss.javaguide.cn/github/javaguide/database/redis/redis-event-handler.png)

![Selector 选择器工作示意图](https://oss.javaguide.cn/github/javaguide/java/nio/selector-channel-selectionkey.png)
