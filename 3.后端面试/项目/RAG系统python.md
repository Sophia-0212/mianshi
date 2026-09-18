# RAG 企业知识库项目：技术栈与面试题

## 一、项目技术栈

这是一个面向 CRM 场景的企业级 RAG 后端服务。

| 层次 | 技术 |
| --- | --- |
| 开发语言 | Python 3.11 |
| Web/API | FastAPI、Uvicorn、Pydantic |
| LLM 编排 | LangChain、LangGraph |
| 大模型 | ChatOpenAI，通过 OpenAI 兼容接口接入，生产配置示例为 DeepSeek V4 Pro |
| Embedding | BGE，例如 `BAAI/bge-large-zh-v1.5` |
| 向量数据库 | Milvus、PyMilvus、LangChain-Milvus |
| 检索 | Dense 向量检索 + BM25 Sparse 检索 + RRF 融合 |
| 重排序 | Sentence Transformers CrossEncoder，例如 `BAAI/bge-reranker-base` |
| 文档处理 | Markdown、`unstructured`、`markdown-it-py`、`tiktoken` |
| 状态存储 | 本地 SQLite；生产使用 PostgreSQL |
| 分布式协调 | Redis：会话 Lease、租户限流、任务选主 |
| 评测 | RAGAS、自研 Golden Set、Recall、Faithfulness 等 |
| 可观测性 | Langfuse、Prometheus Client、Loguru |
| 部署 | Docker、Docker Compose、Kubernetes |

### 数据库通信

- **Milvus**：通过 `pymilvus`、`langchain-milvus` 查询和写入向量、BM25 及文档元数据。
- **PostgreSQL**：通过 `psycopg`/`psycopg_pool` 连接池，以及 `langgraph-checkpoint-postgres` 保存 checkpoint、请求账本、会话和恢复状态。
- **SQLite**：通过标准库 `sqlite3` 和 `langgraph-checkpoint-sqlite` 支持本地单进程开发。
- **Redis**：通过 `redis-py` 实现跨副本会话锁、租户级 Token Bucket 限流和维护任务选主。

CRM 主数据由 ONECRM 等外部系统负责，RAG 服务主要保存检索索引和运行状态。

### 核心处理链路

```text
用户问题 → FastAPI → LangGraph
→ 查询改写 → Milvus Dense + BM25 召回
→ RRF 融合 → CrossEncoder 重排
→ 租户/ACL 权限过滤 → LLM 生成带引用答案
```

面试时应说明：Dify、IAM、ONECRM、审批服务是外部集成边界；Kafka、OpenTelemetry 等主要出现在架构设计材料中，不宜说成当前代码已经完整实现。

## 四、面试中的整体回答

> 这个项目的 Web 层使用 FastAPI，AI 编排使用 LangChain 和 LangGraph。检索层基于 Milvus，采用 Dense Embedding 和 BM25 的混合召回，再通过 RRF 融合和 BGE CrossEncoder 重排。生产环境使用 PostgreSQL 保存工作流 checkpoint、请求账本和会话状态，Redis 负责分布式 Lease、限流和协调，本地开发则使用 SQLite。项目还集成了 Docker、Kubernetes、Langfuse、Prometheus 和 RAGAS 评测。相比单纯调用大模型，项目重点解决了企业场景中的权限、文档版本、状态恢复、幂等、降级和质量评测问题。

如果被问 Django 和 Flask：Django 更完整规范，适合后台和大型业务系统；Flask 更轻量灵活，适合微服务和 API。当前 RAG 服务的需求偏独立 API 和 AI 工作流，因此使用 FastAPI；如果需要完整的用户体系、Admin 和标准化业务模块，则可以考虑 Django。
