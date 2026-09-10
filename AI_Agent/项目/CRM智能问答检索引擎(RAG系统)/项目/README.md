# CRM RAG 项目立项初期任务卡片

## 1. 阶段目标

这个阶段先解决 CRM 智能问答从 0 到 1 的问题，再启动工作流升级：将分散的销售 SOP、产品说明、操作手册和故障排查文档变成可检索知识，通过 Graph 1 完成多轮检索问答闭环，建立 Golden Set 与评测基线，再建设有界 Self-RAG 作为 Graph 2，并以灰度方式逐步迁移。

```text
Markdown 文档
    ↓
解析、标题合并和语义切分
    ↓
双进程批量写入 Milvus
    ↓
Dense + BM25 混合召回、RRF 融合、CrossEncoder 精排
    ↓
Graph 1 工具调用型 RAG 基线
    ↓
Golden Set 与分层评测基线
    ↓
Graph 2 有界 Self-RAG 升级
    ↓
Baseline/Candidate 对照、影子验证与灰度迁移
```

这个阶段先回答“系统能不能正确完成问答主链路，并用固定基准证明优化有效”。生产级租户治理、自动化发布门禁、容量和恢复协议等问题，在“项目逐渐成熟”阶段继续建设。

## 2. 卡片导航

### 2.1 整体架构与简单 Agentic RAG

- [CRM-3101：明确 CRM RAG 服务边界与接口契约](01-整体架构与简单Agentic-RAG/CRM-3101_明确CRM-RAG服务边界与接口契约.md)
- [CRM-3102：构建简单工具调用型 RAG 工作流](01-整体架构与简单Agentic-RAG/CRM-3102_构建简单工具调用型RAG工作流.md)
- [CRM-3103：建立新旧工作流灰度迁移机制](01-整体架构与简单Agentic-RAG/CRM-3103_建立新旧工作流灰度迁移机制.md)

### 2.2 Markdown 解析与语义切分

- [CRM-3110：将 Markdown 解析为结构化元素](02-Markdown解析与语义切分/CRM-3110_将Markdown解析为结构化元素.md)
- [CRM-3111：按标题层级合并父子内容](02-Markdown解析与语义切分/CRM-3111_按标题层级合并父子内容.md)
- [CRM-3112：对超长内容做语义二次切分](02-Markdown解析与语义切分/CRM-3112_对超长内容做语义二次切分.md)
- [CRM-3113：建立三代切分器对比与发布闭环](02-Markdown解析与语义切分/CRM-3113_建立三代切分器对比与发布闭环.md)

### 2.3 双进程知识库入库

- [CRM-3120：封装可入库的 LangChain Document](03-双进程知识库入库/CRM-3120_封装可入库的LangChain-Document.md)
- [CRM-3121：构建解析与写入双进程流水线](03-双进程知识库入库/CRM-3121_构建解析与写入双进程流水线.md)
- [CRM-3122：增加有界队列、结束信号和异常隔离](03-双进程知识库入库/CRM-3122_增加有界队列结束信号和异常隔离.md)

### 2.4 Milvus 混合检索与精排

- [CRM-3130：建立 Milvus Dense 与 Sparse 双路索引](04-Milvus混合检索与精排/CRM-3130_建立Milvus-Dense与Sparse双路索引.md)
- [CRM-3131：接入 BGE Dense Embedding 与 BM25 Sparse Function](04-Milvus混合检索与精排/CRM-3131_接入BGE-Dense-Embedding与BM25-Sparse-Function.md)
- [CRM-3132：使用 RRF 融合并通过 CrossEncoder 精排](04-Milvus混合检索与精排/CRM-3132_使用RRF融合并通过CrossEncoder精排.md)

### 2.5 Self-RAG 路由与自纠错

- [CRM-3140：建设问题路由与结构化输出](05-Self-RAG路由与自纠错/CRM-3140_建设问题路由与结构化输出.md)
- [CRM-3141：增加检索文档相关性判断与查询重写](05-Self-RAG路由与自纠错/CRM-3141_增加检索文档相关性判断与查询重写.md)
- [CRM-3142：对生成结果执行幻觉与切题双重校验](05-Self-RAG路由与自纠错/CRM-3142_对生成结果执行幻觉与切题双重校验.md)
- [CRM-3143：基于 ReAct 构建搜索推广 CRM 证据检索闭环](05-Self-RAG路由与自纠错/CRM-3143_基于ReAct构建搜索推广CRM证据检索闭环.md)

### 2.6 Agent 工具与多轮对话

- [CRM-3150：封装统一知识库检索 Tool](06-Agent工具与多轮对话/CRM-3150_封装统一知识库检索Tool.md)
- [CRM-3151：按会话保存 LangGraph 多轮状态](06-Agent工具与多轮对话/CRM-3151_按会话保存LangGraph多轮状态.md)
- [CRM-3152：控制历史上下文长度并保持问题完整](06-Agent工具与多轮对话/CRM-3152_控制历史上下文长度并保持问题完整.md)

### 2.7 RAG 评测体系与优化闭环

- [CRM-3160：构建 CRM RAG Golden Set](07-RAG评测体系与优化闭环/CRM-3160_构建CRM-RAG-Golden-Set.md)
- [CRM-3161：建立检索侧分层评测指标](07-RAG评测体系与优化闭环/CRM-3161_建立检索侧分层评测指标.md)
- [CRM-3162：建立上下文与生成侧评测](07-RAG评测体系与优化闭环/CRM-3162_建立上下文与生成侧评测.md)
- [CRM-3163：建立 Baseline 与 Candidate 对照实验](07-RAG评测体系与优化闭环/CRM-3163_建立Baseline与Candidate对照实验.md)
- [CRM-3164：形成离线评测到线上效果闭环](07-RAG评测体系与优化闭环/CRM-3164_形成离线评测到线上效果闭环.md)

共 25 张 CRM-31xx 卡片。内容覆盖需求、面试官可能追问、候选人回答和继续深挖方向；CRM-3143 是集中讲解 ReAct 与搜索推广 CRM 实践的面试长文。

## 3. 推荐实施顺序

```text
架构边界和 Graph 1
    ↓
Golden Set 与 Baseline
    ↓
Markdown 解析与语义切分
    ↓
双进程批量入库
    ↓
Milvus 混合检索与精排
    ↓
Graph 2 Self-RAG 升级
    ↓
Candidate 对照评测与新旧工作流灰度迁移
```

## 4. 阶段完成标准

- 文档能够稳定解析、切分并批量写入 Milvus。
- 专业术语和自然语言改写都能够召回相关知识。
- Graph 1 完成初版问答闭环，Graph 2 通过影子验证和灰度逐步替换旧版。
- 多轮追问能够复用同一会话中的上下文，不串会话。
- 检索、上下文、生成、引用和安全指标都有固定口径，可复现比较 baseline 与 candidate。
- 每张卡片都有代码、测试、运行说明和可复现样例。

## 5. 面试表述边界

可以说“参与整体架构设计，并负责知识摄取、混合检索、Self-RAG 和多轮对话等核心链路开发”。如果整个平台还有 CRM、前端、IAM 或模型服务等其他团队，不宜说成一个人独立完成整个平台。
