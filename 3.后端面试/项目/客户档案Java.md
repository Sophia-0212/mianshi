# 客户档案项目

## 一、核心技术栈

**Java 8 + Spring Boot 2.0.7 + Spring Cloud + MyBatis + MySQL + Redis/BDRP + Elasticsearch**，同时接入百度内部网关、配置、调度和权限体系。

| 技术层次 | 使用技术 | 项目中的用途 |
| --- | --- | --- |
| 开发语言与构建 | Java 8、Maven 多模块 | 业务开发、依赖管理、构建打包 |
| Web 框架 | Spring Boot 2.0.7.RELEASE、Spring MVC | 提供客户档案、客保、审核等 HTTP 接口 |
| Web 容器 | Undertow | 主服务的嵌入式 HTTP 容器 |
| 微服务调用 | Spring Cloud Finchley.SR2、Feign/OpenFeign、Ribbon | 调用账号、商机、权限、审核等服务 |
| 数据访问 | MyBatis Starter 2.1.4、tk.mybatis、PageHelper、JdbcTemplate | SQL 映射、CRUD、分页和直接数据库查询 |
| 数据存储 | MySQL、多数据源、HikariCP；另有 Doris 数据源 | 保存客户、联系人、网站、客保和审核数据；Doris 用于数据看板相关查询 |
| 缓存与锁 | Redis，通过百度 BDRP 客户端接入 | 缓存、并发控制、分布式锁等 |
| 搜索 | Elasticsearch 7.4.2、内部 search starter | 检索与查询能力；另有 Lucene、mmseg4j 相关依赖 |
| 消息与事件 | Spring Cloud Stream、Kafka 相关集成、Spring 应用事件 | 数据同步、业务通知和事件处理 |
| 异步与定时任务 | ``@Async``、CompletableFuture、线程池、``@Scheduled``、百度 Higgs | 并行处理、补偿重试、同步和清理任务 |
| 事务与重试 | Spring Transaction、AOP、Spring Retry | 数据库事务、切面和失败重试 |
| 百度内部基础设施 | Polaris、Gravity Config、UC Auth、ACS | 网关接口注册、集中配置、身份与业务权限 |
| 对象转换与校验 | Lombok、MapStruct 1.3.1.Final、Fluent Validator | 简化实体代码、DTO 转换和参数校验 |
| JSON 与工具库 | Jackson、Gson、Fastjson、Guava、Hutool、Commons | 序列化、集合和通用工具处理 |
| HTTP 与流式响应 | OkHttp、WebClient、Reactor、SSE | 外部 HTTP 调用，以及部分 AI 流式响应 |
| 接口文档与 Excel | Swagger 2 / Springfox、EasyExcel | 接口文档和 Excel 导入导出 |
| 日志与追踪 | SLF4J、Logback 相关集成、SkyWalking Toolkit、内部 CRM 日志组件 | 日志、请求标识和调用链追踪 |
| 测试 | JUnit 4、Mockito、Spring Boot Test、AssertJ、H2 | 单元测试与测试环境支持 |



## 请你说说MyBatis

1. 定位：MyBatis 是持久层框架，封装 JDBC，负责参数绑定和结果映射，SQL 由开发者控制，适合复杂查询和精细优化。
2. 项目实践：我们用 XML 和注解编写 SQL，结合 tk.mybatis 简化 CRUD、PageHelper 分页，事务交给 Spring 管理。
3. 执行原理：Mapper 接口通过动态代理，将方法定位到 MappedStatement；再由 SqlSession、Executor 执行，通过 StatementHandler 操作 JDBC，最后映射结果。
4. 事务与缓存：集成 Spring 后，SqlSessionTemplate 负责会话管理，参与 Spring 事务。一级缓存属于 SqlSession，二级缓存按 namespace 组织；涉及跨 Mapper 更新时，要警惕缓存脏读。
5. 主要注意：#{} 绑定参数，${} 直接拼接；动态排序字段必须白名单校验。性能重点关注慢 SQL、N+1 查询、深分页和批量写入，结合执行计划定位问题。

### 口述表达

MyBatis 是我们项目的数据访问框架，主要封装 JDBC，处理参数绑定和结果映射，便于复杂查询和性能优化。

项目中用 XML 和注解写 SQL，结合 tk.mybatis 简化 CRUD、PageHelper 做分页，事务交给 Spring 管理。

底层通过动态代理实现 Mapper 接口，把方法调用关联到对应的 SQL 映射，再通过 SqlSession 和 Executor 执行 JDBC 操作，最后把结果映射成 Java 对象。

## 请你说说 Spring 和 Spring 系列

### 口述表达

我们项目主要用 Spring Framework、Spring Boot 和 Spring Cloud，我按各自职责讲一下。

Spring Framework 是基础，核心是 IoC 和 AOP。IoC 管理对象及其依赖，AOP 处理事务、日志等公共逻辑。

Spring Boot 主要简化应用搭建，通过 Starter 管理依赖组合，通过自动配置按条件装配组件。

Web 层主要用 Spring MVC 提供业务接口，局部用 WebClient 调用 AI 流式接口。

Spring Cloud 负责分布式组件集成。我们用 Feign 调用服务、Ribbon 做负载均衡、Stream 对接消息系统，配置和服务治理接入百度平台。




**3. 并发申领如何防止抢占和超额？**

需要三层控制：客户维度防重复抢占，岗位维度防配额超限，请求维度防重复执行。例如岗位只剩一个名额，同时申领两个不同客户，客户锁无法防超额。

当前 `CustProtectService` 使用数据库锁，但释放只按 key；未持锁也可能执行解锁。岗位锁失败、值同为 `AddCustProtect` 时仍放行，不能证明配额互斥。

改进：唯一 token 标识持有者，条件删除释放锁；岗位额度条件更新或原子预占，与提保落库保持一致；按业务唯一范围设置数据库约束。锁过期后旧执行者仍可能继续写，关键写入还需状态/版本校验。


----

可以删：


① 明确约束：究竟保护什么

  先读 CustProtectCmdDomainService (Desktop/workspace/baidu/in-crm/one-customer-archive/one-customer-archive-domain/src/main/java/com/baidu/incrm/cust/
  archive/domain/archiveprotect/service/custprotect/CustProtectCmdDomainService.java:163)。

  确认三个约束：

   维度    约束                            必须澄清
  ━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   客户    同一业务范围内不能重复占用      体系、产品线、共同保护如何影响唯一范围
  ──────  ──────────────────────────────  ────────────────────────────────────────
   岗位    普通申领不能突破容量            待审是否占额、掉保何时释放
  ──────  ──────────────────────────────  ────────────────────────────────────────
   请求    同一操作只能产生一次业务效果    请求标识、重复请求返回什么

  当前岗位计数按 pos_id、occupy_quota_flag=0 查询；forceProtect=true 可跳过容量检查。先界定例外，再写“不超额”的断言。

  产出：一张约束表，明确唯一范围、计数口径和例外。

  ② 复现竞争：理解“检查通过”为什么不可靠

  当前代码先查容量，再插入客保。假设容量 10、已用 9：

   时序    请求 A：申领客户甲    请求 B：申领客户乙
  ━━━━━━  ━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━
   1       查到已用 9
  ──────  ────────────────────  ────────────────────
   2                             查到已用 9
  ──────  ────────────────────  ────────────────────
   3       判断可申领            判断可申领
  ──────  ────────────────────  ────────────────────
   4       插入成功              插入成功
  ──────  ────────────────────  ────────────────────
   结果    实际占用 11

  核心知识：检查与写入之间存在竞争窗口；客户锁不能约束同岗位的不同客户。

  练习：用 CountDownLatch 控制两个请求都完成查询，再同时写入。先稳定复现，再修复；不要依赖 sleep 碰运气。

  ③ 学锁：互斥、所有权、租期是三个问题

  读 CustProtectService (Desktop/workspace/baidu/in-crm/one-customer-archive/one-customer-archive-application/src/main/java/com/baidu/incrm/cust/archive/
  application/archiveprotect/service/custprotect/CustProtectService.java:286) 与 DBCacheRepositoryImpl (Desktop/workspace/baidu/in-crm/one-customer-archive/
  one-customer-archive-infrastructure/src/main/java/com/baidu/incrm/cust/archive/infrastructure/repository/dbcache/DBCacheRepositoryImpl.java:28)。

  注意：定向申领外围还有 Redis 锁；这里的客保服务使用数据库锁。

  重点掌握：

  - 互斥：数据库插入锁记录，需要唯一约束支撑；必须核对真实 DDL。
  - 所有权：每次获取使用唯一 token，释放时原子校验 key + token；仅成功持锁才释放。
  - 租期：记录过期时间不等于数据库自动删除；需设计过期接管、续租及清理。

  当前问题：未获取客户锁也会进入 finally 解锁；岗位锁失败但值同为 AddCustProtect 时仍放行。

  必做实验：A 持锁，B 获取失败并退出，验证 B 不能删除 A 的锁。

  ④ 学数据库原子性：让配额与客保一起成功或失败

  主方案先研究 MySQL 条件更新 + 本地事务。以下是设计示例，非当前实现：

  UPDATE position_quota
  SET used = used + 1
  WHERE pos_id = ?
    AND used < quota_limit;

  影响行数为 1 才获得名额。事务内完成：

  登记幂等请求 → 占额 → 创建客保及历史 → 保存请求结果 → 提交

  任何一步失败，整体回滚。远程查询尽量移出锁持有区间；必须在提交后可靠执行的通知通过持久化任务处理。

  重点追问：

  - 客保插入失败，额度是否回滚？
  - 掉保、转移、撤回如何同步释放额度？
  - 所有写入口是否遵守同一协议？
  - 多资源加锁顺序是否统一，死锁后如何重试？

  当前 addCustProtectOperation 是 private 自调用，其事务注解不能通过常规 Spring 代理开启事务。事务边界必须用回滚实验验证。

  ⑤ 学幂等与过期执行：锁释放正确仍不够

  先研究两个失败时序：

  - 已提交，响应丢失：客户端重试，应返回原结果，不能再次占额。
  - A 锁过期，B 接管，A 恢复执行：A 虽不能误删 B 的锁，仍可能继续写业务数据。

  对应知识：

  - 请求唯一键、参数摘要、处理中/成功/失败状态；请求记录与业务效果原子提交。
  - 超时请求如何接管；同一请求号但参数不同如何拒绝。
  - 唯一约束、业务状态条件更新；需要严格防止旧持有者写入时，学习 fencing token：存储端校验单调递增的持锁代次，拒绝旧代次。

  锁 token 证明谁能解锁；fencing token 约束谁还能写。 普通版本号不能自动替代完整的过期执行防护。

  ⑥ 故障验证：把理解变成面试证据

   实验                    验收标准
  ━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   两人同时抢同一客户      同一排他范围只有一次有效占用
  ──────────────────────  ──────────────────────────────
   同岗位争最后一个名额    普通申领只成功一次
  ──────────────────────  ──────────────────────────────
   未持锁请求退出          原持有者的锁仍在
  ──────────────────────  ──────────────────────────────
   占额后插入失败          额度与客保一起回滚
  ──────────────────────  ──────────────────────────────
   提交后丢失响应并重试    返回原结果，不重复占额
  ──────────────────────  ──────────────────────────────
   锁过期后旧线程恢复      旧操作不能破坏新状态
  ──────────────────────  ──────────────────────────────
   重复掉保或撤回          额度只释放一次

  先用并发单测验证时序，再用独立进程连接测试 MySQL 验证真实事务与锁行为。记录成功数、实际占额、重复记录、锁等待和死锁重试。

  面试按这条线讲：业务约束 → 可复现竞争 → 现有锁的缺口 → 原子事务与幂等方案 → 故障实验结果。当前已确认的是源码风险；修复效果要在实际完成实验后陈述。