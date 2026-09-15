# Java 常见框架

Java 框架可以按照用途分类，以下是后端开发中常见的框架及其主要作用。

## 一、常见框架分类

| 用途 | 项目使用情况 | 实际作用 |
| --- | --- | --- |
| 应用基础 | Spring Framework | 依赖注入、AOP、事务、事件 |
| 快速开发 | Spring Boot 2.0.7 | 自动配置、应用启动 |
| Web 开发 | Spring MVC；局部使用 WebFlux | MVC 提供业务接口；WebFlux 的 WebClient 调用 AI 流式接口 |
| 数据库访问 | MyBatis | XML/注解 SQL；配合 tk.mybatis、PageHelper、JdbcTemplate |
| 微服务 | Spring Cloud | Feign/OpenFeign 服务调用、Ribbon、Stream；集成百度配置与服务治理 |
| 权限安全 | 百度 UC Auth、ACS | 身份认证、岗位与业务权限 |
| 任务调度 | Spring @Scheduled、百度 Higgs | 本地定时任务、平台调度 |
| 网络通信 | Reactor Netty 依赖 | 配合 WebClient；未见直接编写 Netty 网络服务 |
| 测试 | JUnit 4、Mockito | 单元测试、依赖模拟 |


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
