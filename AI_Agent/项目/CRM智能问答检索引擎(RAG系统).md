# CRM智能问答检索引擎（RAG系统）—— 项目复盘与面试知识点

> 项目路径：`/Users/lixiaofei05/Desktop/workspace/RAG企业知识库项目/RAG_PROJECT`
> 本文档目标：从底层原理到顶层架构，把这个项目"为什么这么设计"讲清楚，配合代码行号定位，作为面试复盘的唯一素材。

---

## 目录

1. [项目概述与架构](#1-项目概述与架构)
2. [底层原理：Embedding与相似度计算](#2-底层原理embedding与相似度计算)
3. [RAG核心链路：分块策略](#3-rag核心链路分块策略)
4. [RAG核心链路：Milvus混合检索](#4-rag核心链路milvus混合检索)
5. [Agent框架层：LangChain组件应用](#5-agent框架层langchain组件应用)
6. [Agent框架层：LangGraph图结构设计](#6-agent框架层langgraph图结构设计)
7. [Self-RAG自纠错设计（核心亮点）](#7-self-rag自纠错设计核心亮点)
8. [工程化细节](#8-工程化细节)
9. [项目难点与反思（STAR）](#9-项目难点与反思star)
10. [高频面试题清单](#10-高频面试题清单)

---

## 1. 项目概述与架构

### 1.1 一句话概述

面向CRM业务场景（销售SOP、产品知识、故障排查、客户异议处理）的企业级RAG检索增强引擎，是CRM智能助手问答能力的底层支撑。核心解决"内容分散在多份文档、人工查找耗时长、准确率不高"的问题。

### 1.2 技术栈

Python、LangChain、LangGraph、Milvus（Dense+Sparse混合检索）、BGE Embedding（本地）、BM25（Milvus内置Function）、Loguru、multiprocessing

### 1.3 架构分层

```
utils/env_utils.py（配置：MILVUS_URI、API Key）
  → llm_models/all_llm.py（LLM实例）、llm_models/embeddings_model.py（Embedding x2，用途不同）
  → documents/markdown_parser.py（解析Markdown + 两级切块）
  → documents/milvus_db.py（Schema定义 + Dense/Sparse混合索引 + 存储）
  → documents/write_milvus.py（双进程批量入库流水线）
  → tools/retriever_tools.py（检索器封装成Agent可调用的Tool）
  → agent/rag_agent.py（带多轮历史的tool-calling agent，简单封装）
  → graph/（graph1：简单Agentic RAG，链路较短）
  → graph2/（graph_2：Self-RAG，带路由+自纠错，链路复杂）
```

### 1.4 两条Pipeline的定位区别

项目里**同时存在两条独立实现**的RAG工作流，这是理解全局的关键：

- **graph1（`graph/graph1.py`）**：结构简单，靠`tools_condition`判断是否需要检索，检索后只做一次"文档相关性打分"，相关就生成，不相关就改写问题重新进Agent循环。**没有生成质量校验**，也没有web搜索兜底。
- **graph2（`graph2/graph_2.py`）**：结构复杂，多了问题路由（区分该走知识库检索还是web搜索）、多了生成后的双重校验（幻觉检测+答案相关性评估）、多了查询转换计数控制的收敛策略。这是Self-RAG论文思路的工程落地。

面试如果问"你的RAG项目是怎么设计的"，优先讲**graph2**，信息量更大，更能体现工程判断力。graph1可以作为"从简单到复杂的演进过程"提一句。

---

## 2. 底层原理：Embedding与相似度计算

### 2.1 为什么项目里有两套Embedding模型

代码位置：`llm_models/embeddings_model.py`

```python
openai_embedding   # 语义切块用（SemanticChunker），走OpenAI代理
bge_embedding      # Milvus存储/检索用，本地 BAAI/bge-small-zh-v1.5，CPU跑
```

**为什么不用同一套：**
- `openai_embedding`只在**切块阶段**用一次性判断"两段内容语义上是否该分开"，调用频次低、对精度要求没那么极端，用API模型省心。
- `bge_embedding`要在**每次文档入库和每次用户查询时都调用**，如果每次都走外部API，会有网络延迟、调用成本、以及"embedding服务不可用导致检索完全瘫痪"的风险。本地模型消除这三个问题，且BGE系列对中文语义的编码效果本身就优于大部分通用英文Embedding模型（这是CRM场景选它的直接原因——文档全是中文）。

**面试延伸**：这体现了"根据调用频次和场景敏感度决定该用重量级API还是轻量级本地模型"的工程判断，不是无脑统一用一个模型。

### 2.2 相似度计算的数学本质

Embedding模型把一段文本映射成固定维度向量（本项目dense向量维度=512，见`documents/milvus_db.py:33`），语义相近的文本在向量空间里距离也相近。

本项目Milvus的dense索引用的是`MetricType.IP`（内积，Inner Product）——当向量做过L2归一化后，内积等价于余弦相似度。Sparse侧的BM25不是向量距离，是基于词频统计的相关性打分（下一节详细展开区别）。

### 2.3 Temperature=0的使用场景

代码位置：`llm_models/all_llm.py:7`

```python
llm = ChatOpenAI(temperature=0, model='gpt-5.5', ...)
```

项目里所有的判断类调用（`grade_documents`判断文档相关性、`hallucination_grader_chain`判断是否幻觉、`question_router_chain`路由判断）复用的都是这个`temperature=0`的LLM实例。

**为什么必须是0**：这些调用要的是"确定性分类结果"（yes/no、web_search/vectorstore），不是创造性生成。如果temperature>0，同一份文档同一个问题，多次判断可能得到不同的yes/no结果，导致整个图的执行路径不可预测、调试困难、线上行为不稳定。只有最终`generate`生成用户可读答案这一步，理论上可以适当调高temperature换取表达多样性（本项目目前生成节点也复用了同一个temperature=0的实例，属于"能用但不是最优"，面试如果问到可以诚实说明这一点，展示你能看出这个可以优化的地方）。

---

## 3. RAG核心链路：分块策略

代码位置：`documents/markdown_parser.py`

### 3.1 两级切块策略设计

这是本项目在"分块"这个RAG最容易踩坑的环节上的核心设计，分三步：

**第一步：Unstructured解析（`parse_markdown`方法）**

```python
loader = UnstructuredMarkdownLoader(file_path=md_file, mode='elements', strategy='fast')
```

`mode='elements'`让Unstructured把Markdown拆解成"元素级"的文档对象（每个标题、每个段落都是独立的Document），每个元素带`category`（Title/NarrativeText）、`parent_id`（指向父级标题元素）等元数据。这一步产出的粒度**太细**，一个二级标题下的一段话可能单独是一个Document，直接拿去embedding检索粒度太碎、语义不完整。

**第二步：标题层级合并（`merge_title_content`方法）**

这是本项目**手写的核心逻辑**，不是调库现成功能：

```python
if category == 'Title':
    document.metadata['title'] = document.page_content
    if parent_id in parent_dict:
        document.page_content = parent_dict[parent_id].page_content + ' -> ' + document.page_content
    parent_dict[element_id] = document
if category != 'Title' and parent_id:
    parent_dict[parent_id].page_content = parent_dict[parent_id].page_content + ' ' + document.page_content
    parent_dict[parent_id].metadata['category'] = 'content'
```

逐行拆解：
- 用`parent_dict`（字典，key是元素ID）暂存每个"父标题"节点
- 遇到`Title`类型的元素：把当前标题拼接到它的父标题内容后面（形成"父标题 -> 子标题"的层级路径），存进字典
- 遇到非Title、且有`parent_id`的元素（即某个标题下的正文段落）：把这段正文内容追加到对应父标题的`page_content`后面，并把这个父节点的`category`标记为`'content'`

**效果**：一个标题下所有段落被合并成一个完整的Document，`page_content`同时包含了"标题层级路径 + 完整正文内容"（比如实际入库效果：`"CRM销售SOP常见问题 -> 客户对价格有异议该怎么处理？ 遇到客户价格异议时，建议按以下话术框架处理：..."`），检索时即使只匹配到正文内容，也能带出完整的标题上下文，避免"检索到答案却不知道这是回答什么问题"的语义割裂问题。

**第三步：超长内容语义二次切分（`text_chunker`方法）**

```python
if len(d.page_content) > 5000:
    new_docs.extend(self.text_splitter.split_documents([d]))
```

如果某个标题下内容合并后超过5000字符（比如一个特别长的说明文档），用`SemanticChunker`（基于`openai_embedding`，`breakpoint_threshold_type="percentile"`）按语义边界二次切分，而不是硬切断。`SemanticChunker`的原理是：计算相邻句子之间的embedding相似度，相似度骤降的地方就是语义边界，在这些地方切分，保证每个子块内部话题连贯。

### 3.2 为什么这个设计比"直接按固定字数切"更好

固定字数切分（比如每500字符一刀）最大的问题是**会把语义相关的上下文切散**——比如"原因是A，因此采取了措施B"，可能A在这一块，B在下一块，检索到下一块时模型看不到原因A。

本项目的两级策略优先保证"标题内的内容天然是一个完整语义单元"（第二步），只有真正超长的内容才动用更精细但更贵的语义切分（第三步），是"简单场景用便宜方法、复杂场景才用贵的方法"的分层处理思路。

---

## 4. RAG核心链路：Milvus混合检索

代码位置：`documents/milvus_db.py`

### 4.1 为什么选Milvus而不是Faiss/Chroma

- **Faiss**：只是检索库，没有持久化、Schema管理、多字段过滤这些数据库能力，本项目需要按`category`字段过滤（只检索`content`类文档，排除单独的Title块），需要真正的数据库能力。
- **Chroma**：轻量好上手，但生产级分布式能力和高级索引类型（尤其是内置BM25 Function）不如Milvus完整。
- **Milvus**：本项目选它的核心原因是**原生支持在一个collection里同时挂dense和sparse两种向量字段，并且sparse向量可以用内置Function直接从文本字段生成**，不需要额外维护一个独立的分词/BM25服务。这是"一栈式方案"对"多组件拼接方案"的工程简化。

### 4.2 Schema设计逐字段拆解

代码位置：`documents/milvus_db.py:22-33`

```python
schema.add_field('id', INT64, is_primary=True, auto_id=True)          # 主键，自增
schema.add_field('text', VARCHAR, max_length=6000, enable_analyzer=True,
                  analyzer_params={"tokenizer": "jieba", "filter": ["cnalphanumonly"]})  # 原文，中文分词
schema.add_field('category', VARCHAR, max_length=1000)   # content/Title，用于过滤
schema.add_field('source', VARCHAR, max_length=1000)
schema.add_field('filename', VARCHAR, max_length=1000)    # 溯源用：答案来自哪个文件
schema.add_field('filetype', VARCHAR, max_length=1000)
schema.add_field('title', VARCHAR, max_length=1000)       # 该块所属的标题
schema.add_field('category_depth', INT64)
schema.add_field('sparse', SPARSE_FLOAT_VECTOR, is_function_output=True)  # BM25自动生成，不用手填
schema.add_field('dense', FLOAT_VECTOR, dim=512)          # BGE embedding结果
```

**关键设计点**：`sparse`字段标记了`is_function_output=True`，意味着这个字段的值不需要应用层手动计算填入，由下面定义的`bm25_function`在写入`text`字段时自动生成——**这是Milvus 2.4+的BM25 Function特性，把"文本分词→计算BM25权重→生成稀疏向量"这套本来需要额外服务（比如Elasticsearch）做的事，收进了数据库内部**。

### 4.3 BM25 Function配置

代码位置：`documents/milvus_db.py:35-56`

```python
bm25_function = Function(
    name="text_bm25_emb",
    input_field_names=["text"],      # 从text字段读取原文
    output_field_names=["sparse"],   # 写入sparse字段
    function_type=FunctionType.BM25,
)
```

配套的稀疏索引：

```python
index_params.add_index(
    field_name="sparse",
    index_type="SPARSE_INVERTED_INDEX",
    metric_type="BM25",
    params={"inverted_index_algo": "DAAT_MAXSCORE", "bm25_k1": 1.2, "bm25_b": 0.75}
)
```

`bm25_k1`（词频饱和度参数）和`bm25_b`（文档长度归一化参数）用的是BM25算法的经典默认值，`DAAT_MAXSCORE`是一种倒排索引的剪枝加速算法，能在不牺牲排序精度的前提下跳过明显不可能进入Top-K的文档，加快检索速度。

Dense侧索引：

```python
index_params.add_index(
    field_name="dense",
    index_type=IndexType.HNSW,
    metric_type=MetricType.IP,
    params={"M": 16, "efConstruction": 64}
)
```

`HNSW`（Hierarchical Navigable Small World，层次化可导航小世界图）是主流的近似最近邻（ANN）算法之一，`M`控制图中每个节点的连接数（越大召回率越高但索引越大越慢），`efConstruction`控制建图时的搜索范围（越大建图质量越高但建图越慢）——这两个都是"检索质量 vs 资源消耗"的经典权衡参数。

### 4.4 Dense向量检索 vs Sparse（BM25）检索的本质区别

这是面试**必考的对比题**，务必吃透：

| | Dense向量检索 | Sparse（BM25）检索 |
|---|---|---|
| 原理 | Embedding模型把文本压缩成稠密向量，比较语义空间距离 | 基于词频统计（TF-IDF思想的改进版），比较词汇重叠度 |
| 优势场景 | 理解同义词、语义相近但用词不同的表达（比如"客户嫌贵"vs"价格异议"） | 精确匹配专有名词、型号、系统模块名等强关键词（比如"ERP同步失败"这种固定术语） |
| 劣势场景 | 对生僻专有名词、精确数字/代码不敏感（embedding会"模糊化"这些细节） | 无法理解语义相近但字面完全不同的表达 |
| 本项目用途 | 捕捉"销售话术""异议处理"这类语义层面的相关性 | 精确命中"审批流程""数据同步"等CRM系统特有术语 |

**为什么要混合而不是二选一**：CRM场景的提问既有语义化表达（"客户不想续约怎么办"），也有精确术语查询（"ERP同步失败"），单一策略必然在另一类场景上表现差，混合检索是同时兼顾两种查询模式的必然选择。

### 4.5 RRF融合排序原理

代码位置：`tools/retriever_tools.py:11-14`

```python
search_kwargs={
    "k": 4,
    "ranker_type": "rrf",
    "ranker_params": {"k": 100},
    ...
}
```

**RRF（Reciprocal Rank Fusion，倒数排名融合）**的核心思路：不直接比较dense分数和sparse分数（两者量纲完全不同，dense是[-1,1]的相似度，BM25分数是无固定上限的统计值，不能直接加权平均），而是**只看排名**——每个文档在dense检索结果里的排名转换成`1/(排名+k)`，在sparse检索结果里的排名也转换成`1/(排名+k)`，两个倒数排名分数相加得到最终融合分数。

**为什么这样设计更合理**：避免了"两种检索方式分数量纲不同导致加权失真"的问题，只要一个文档在任意一种检索方式里排名靠前，就能获得较高的融合分数，是一种更鲁棒、无需手动调权重的融合方式。`ranker_params: {"k": 100}`里的k是平滑常数，避免排名靠前的文档分数差距过大导致排名靠后的检索方式完全没有话语权。

### 4.6 检索参数与过滤

```python
search_type='similarity',
search_kwargs={
    "k": 4,                          # 最终返回4个文档块
    "score_threshold": 0.1,          # 相似度低于此值直接丢弃
    "filter": {"category": "content"}  # 只检索正文块，排除孤立的Title块
}
```

`filter`这个过滤条件很关键：`milvus_db.py`里的`merge_title_content`会把纯Title（没有子内容、没被合并进任何父子结构的孤立标题）保留在结果里但不标记`category='content'`，检索时加上这个过滤条件，避免检索出"只有一个标题、没有实际内容"的无意义结果。

---

## 5. Agent框架层：LangChain组件应用

### 5.1 Retriever → Tool 的封装

代码位置：`tools/retriever_tools.py`

```python
retriever = mv.vector_store_saved.as_retriever(...)
retriever_tool = create_retriever_tool(
    retriever, 'rag_retriever',
    '搜索并返回关于"CRM系统"的信息, 内容涵盖：销售SOP流程、产品功能模块、系统操作与故障排查、客户异议处理话术等'
)
```

`create_retriever_tool`把一个`Retriever`对象包装成LLM能"看懂"的Tool——本质是给这个检索器加上了`name`和`description`两个元信息，LLM在决定"要不要调用工具、调用哪个工具"时，读的就是这段`description`。**这段描述写得好不好直接影响Agent能不能在正确的时机调用检索**（如果描述太笼统或跟用户问题场景不匹配，模型可能该检索时不检索，或者不该检索时瞎检索）。

**面试要点**：Tool description本质上是"Prompt Engineering"的一种应用——你在教模型"什么时候该用我"，措辞的精确度直接影响Agent行为的准确率。

### 5.2 多轮对话记忆：RunnableWithMessageHistory

代码位置：`agent/rag_agent.py:26-46`

```python
store = {}  # session_id -> ChatMessageHistory

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

agent_with_history = RunnableWithMessageHistory(
    executor, get_session_history,
    input_messages_key='input', history_messages_key='chat_history'
)
```

**工作原理**：`RunnableWithMessageHistory`是一个装饰器模式的封装——每次`invoke`时，它先根据传入的`session_id`从`store`里取出（或新建）这个会话对应的历史记录对象，把历史注入到prompt的`chat_history`占位符位置，模型生成回复后，再把这轮的问答自动追加进这个历史对象。

**当前实现的局限（面试如果问到要能诚实指出）**：`store`是一个进程内内存字典，服务重启历史就丢失，也不支持分布式多实例部署（每个实例的`store`互相不可见）。生产级实现应该把历史存进Redis或数据库，这是本项目"demo级实现"和"生产级实现"的差距之一，也是能展示你有工程延展思考的加分点。

### 5.3 AgentExecutor与create_tool_calling_agent

```python
agent = create_tool_calling_agent(llm, [retriever_tool], prompt)
executor = AgentExecutor(agent=agent, tools=[retriever_tool])
```

`create_tool_calling_agent`创建的是一个**依赖模型原生Function Calling能力**的Agent（不是靠解析纯文本ReAct格式的老式Agent），底层依赖`ChatOpenAI`模型本身支持"结构化工具调用"这个API能力——模型直接返回"我要调用哪个工具、参数是什么"的结构化数据，而不是让开发者自己写正则去解析模型输出的自然语言里藏着的调用意图。`AgentExecutor`负责真正执行这个循环：模型决定调用工具 → 执行工具 → 把结果喂回模型 → 模型决定是否继续调用或给出最终答案。

---

## 6. Agent框架层：LangGraph图结构设计

### 6.1 为什么图1（graph1）也需要"图"，即使流程不算复杂

代码位置：`graph/graph1.py`

State定义（`graph/graph_state1.py`）只有一个字段：`messages`（消息列表）。整个流程：

```
START → agent → (tools_condition) → 有工具调用: retrieve；否则: END
retrieve → (grade_documents条件边) → generate（相关） / rewrite（不相关）
rewrite → 回到 agent（形成循环）
generate → END
```

**这里的关键设计是`rewrite → agent`这条边形成了一个循环**——如果检索到的文档跟问题不相关，不是直接报错或返回"没找到"，而是让`rewrite`节点改写问题后，重新回到`agent`节点再走一次判断-检索流程。这正是链式结构（LangChain Chain）做不到、必须用图（LangGraph）的地方：Chain只能从头到尾单向走一遍，没法表达"检索失败就绕回去重试"这种带反馈的控制流。

**该图当前的隐患**：这个循环**没有次数上限**——如果用户问题反复改写后依然检索不到相关内容（比如问的完全是知识库外的内容），会无限循环下去，是本项目一个**未修复的已知设计缺陷**（详见第9节难点分析）。

### 6.2 图2（graph2）的State设计与图1的本质区别

代码位置：`graph2/graph_state2.py`、`graph2/graph_2.py`

State字段：`question, transform_count, generation, documents`——比图1多了三个字段，这个差异直接反映了"图2要做的判断更多，需要在状态里携带更多决策所需的信息"：

- `documents`：检索到的文档列表，要在多个节点间传递用于判断相关性、用于生成、用于幻觉检测比对
- `generation`：生成结果，要传给后续的幻觉检测和答案相关性评估节点复用
- `transform_count`：**专门为了解决"死循环"问题而引入的计数字段**——每次进入`transform_query`节点就+1，`decide_to_generate`函数据此判断"改写次数是否已经到上限，到了就别再原地循环，转而升级用web搜索兜底"

**面试对比题的标准答案框架**：图1的循环没有终止条件兜底（只能靠改写后凑巧命中），图2用一个额外的状态字段实现了"有限次重试后自动降级"的收敛策略——这体现了"给循环设计一个明确的退出条件"是图结构设计里必须考虑的工程要点，不能只顾着"能循环"而不管"什么时候该停"。

### 6.3 条件边的三种典型用法（对应本项目实例）

| 用法 | 本项目对应位置 | 说明 |
|---|---|---|
| 二路分支 | `route_question`（`graph2/graph_2.py:79`） | 根据LLM路由判断结果，走`web_search`或`vectorstore`两条完全不同的分支 |
| 三路分支 | `decide_to_generate`（`graph_2.py:53`） | 根据"是否有相关文档"+"transform_count是否超限"，产出`generate`/`transform_query`/`web_search`三种走向 |
| 循环边（自身指向自身） | `grade_generation_v_documents_and_question`返回`"not supported"`时指向`generate`自身 | 生成结果没通过幻觉检测，直接让同一个`generate`节点重新生成一次（不是走别的节点，是原地重试） |

---

## 7. Self-RAG自纠错设计（核心亮点）

这是本项目**graph2**区别于普通RAG最有技术含量的部分，面试着重讲这里。

### 7.1 整体设计思路：Self-RAG论文核心思想的工程落地

传统RAG是"检索→直接生成"的一条直线，假设检索到的内容一定有用、生成的内容一定基于检索内容、没有验证环节。**Self-RAG的核心思想是在这条直线上插入多个"自我校验"节点**，让流程具备发现问题并自我修正的能力，而不是"检索到什么就直接用什么"。

本项目落地了Self-RAG思想里的三个关键校验点：
1. 检索前：判断问题该走知识库还是外部搜索（路由）
2. 检索后：判断检索到的文档是否真的相关（文档相关性打分）
3. 生成后：判断生成内容是否有幻觉、是否真正回答了问题（双重生成质量校验）

### 7.2 问题路由（Question Router）

代码位置：`graph2/query_route_chain.py`（结构）+ `graph2/graph_2.py:79-98`（调用逻辑）

```python
source = question_router_chain.invoke({"question": question})
if source.datasource == "web_search":
    return "web_search"
elif source.datasource == "vectorstore":
    return "vectorstore"
```

用一个带结构化输出的LLM判断"这个问题该用知识库检索，还是该走实时网络搜索"。**在CRM场景下的实际意义**：如果用户问的是"CRM系统里如何创建线索"（知识库里有），走`vectorstore`；如果用户问的是"最新的CRM行业解决方案趋势"这种知识库覆盖不到、需要时效性信息的问题，理论上该路由到`web_search`（本项目`web_search_tool`基于Tavily搜索API）。

**这一步存在的价值**：避免"不管什么问题都无脑走知识库检索"，检索本身有成本（Milvus查询延迟）且知识库覆盖不到的问题检索也没意义，路由是"先判断该用什么武器，再动手"的资源分配逻辑。

### 7.3 文档相关性打分（Grade Documents）

代码位置：`graph2/grade_documents_node.py`（节点）+ `graph2/grader_chain.py`（判断链）

设计思路跟graph1的`grade_documents`函数逻辑一致（结构化输出binary_score: yes/no），但graph2里是**对每个检索到的文档块逐个打分**，把打分为"不相关"的文档过滤掉，只保留真正相关的文档进入`documents`状态字段。

**为什么要过滤而不是把全部检索结果都扔给生成模型**：呼应第2部分讲的Context Engineering理念——检索出来的Top-K结果里混入不相关内容，会稀释生成模型对真正有用信息的关注度，甚至可能诱导模型把不相关内容也拼进答案里，过滤这一步是保证"喂给生成模型的都是真正有用的"。

### 7.4 生成质量双重校验：幻觉检测 + 答案相关性评估

代码位置：`graph2/graph_2.py:19-50`（`grade_generation_v_documents_and_question`函数）

这是**两级校验，顺序不能颠倒**：

```python
score = hallucination_grader_chain.invoke({"documents": documents, "generation": generation})
if score.binary_score == "yes":  # 第一级：生成内容是否基于检索文档（无幻觉）
    score = answer_grader_chain.invoke({"question": question, "generation": generation})
    if score.binary_score == "yes":  # 第二级：生成内容是否真正回答了用户问题
        return "useful"
    else:
        return "not useful"       # 基于文档但没答到点上 → 需要换个检索角度
else:
    return "not supported"        # 生成内容脱离了检索文档 → 幻觉，需要重新生成
```

**为什么必须先查幻觉、再查相关性，不能反过来或合并成一步**：
- 如果生成内容本身就是幻觉（模型编造的、脱离检索文档的内容），这时候去判断"是否回答了用户问题"是没有意义的判断——一段编造的内容完全可能"看起来很好地回答了问题"，但内容是假的，必须先确保生成有依据（"忠实度"检验），再谈这个有依据的回答是否真正切题（"相关性"检验），两者是不同维度的质量指标，必须分两步独立校验。
- `"not supported"`（有幻觉）→ 重新走`generate`节点再生成一次（同一批文档，换一次生成尝试）
- `"not useful"`（无幻觉但没答到点上）→ 走`transform_query`改写问题，重新检索（说明可能是检索角度不对，而不是生成的问题）

这个分支设计体现了**"根据失败的具体原因，采取不同的修复动作"**——不是笼统地"失败了就重试"，而是先诊断失败属于哪一类问题，再针对性处理，这是比"简单重试"更精细的容错设计思路。

### 7.5 查询转换（Query Transform）与收敛控制

代码位置：`graph2/transform_query_node.py`（节点）+ `graph_2.py:53-76`（`decide_to_generate`收敛逻辑）

```python
def decide_to_generate(state):
    filtered_documents = state["documents"]
    transform_count = state.get("transform_count", 0)
    if not filtered_documents:
        if transform_count >= 2:
            return "web_search"       # 已经改写查询2次仍检索不到相关文档，放弃知识库，转web搜索
        return "transform_query"      # 改写查询，换个说法重新检索
    else:
        return "generate"
```

`transform_query`节点的作用是用LLM把用户原始问题改写成一个"更适合检索"的版本（比如用户口语化的表达改写成更贴近知识库文档用词习惯的问题）。**`transform_count >= 2`这个收敛条件是本项目里唯一一处对"检索不到相关文档"这种失败情况设置了明确重试上限并兜底降级的地方**——这是好的设计模式，应该在整个项目里保持一致（详见第9节，`generate`节点的幻觉重试就**没有**做同样的收敛控制，是本项目现存的设计不一致问题）。

---

## 8. 工程化细节

### 8.1 双进程批量入库流水线

代码位置：`documents/write_milvus.py`

```python
file_parser_process(dir_path, output_queue, batch_size=20)   # 进程1：解析
milvus_writer_process(input_queue)                             # 进程2：写入
docs_queue = Queue(maxsize=queue_maxsize)                       # 进程间通信
```

**设计动机**：文档解析（尤其是`SemanticChunker`需要调用Embedding模型）和数据库写入是两类不同性质的耗时操作，如果串行执行（解析完一批再写入、写完再解析下一批），两边都在互相等待，总耗时是两者之和。用`multiprocessing.Queue`解耦成两个独立进程，解析进程持续产出、写入进程持续消费，两边并发执行，**只要写入速度不是解析速度的严重瓶颈，总耗时可以趋近于两者中较慢的那一个，而不是两者相加**。

`queue_maxsize=20`限制队列容量是**防止内存溢出的关键细节**——如果不限制，当写入进程速度跟不上解析进程时，未处理的文档会在内存里无限堆积；设置上限后，队列满了解析进程会自动阻塞等待，形成"背压"（backpressure）机制，这是生产者-消费者模型里控制资源占用的标准做法。

`output_queue.put(None)`作为终止信号：用`None`表示"数据已经处理完了"，消费者进程收到`None`就跳出循环结束，这是一种简单常见的"哨兵值"（sentinel value）用法，不需要额外维护一个"是否结束"的状态变量。

### 8.2 环境变量与跨环境适配

代码位置：`utils/env_utils.py`

```python
load_dotenv(override=True)
MILVUS_URI = os.getenv('MILVUS_URI', 'http://127.0.0.1:19530')  # 有默认值兜底
COLLECTION_NAME = 't_collection01'  # 硬编码，未走环境变量
```

**面试如果问到"这样设计合理吗"，可以诚实指出**：`MILVUS_URI`走环境变量+默认值是合理的（方便本地/远程环境切换而不用改代码），但`COLLECTION_NAME`硬编码是不够灵活的地方——如果需要同时维护多个环境（测试库、生产库）的不同collection，当前写法需要改代码而不是改配置，这是可以优化但本项目暂未处理的细节。

### 8.3 日志：Loguru单例

代码位置：`utils/log_utils.py`

全局共用一个`log`实例（loguru），所有模块直接`from utils.log_utils import log`导入使用，不需要每个模块自己`getLogger(__name__)`再配置Handler——loguru本身设计就是"开箱即用"的单例日志库，相比Python标准库`logging`需要显式配置Handler/Formatter，loguru默认配置已经足够好用，减少了工程配置成本。

---

## 9. 项目难点与反思（STAR）

### 难点1：单一检索策略召回率与准确率难以兼顾

**S（背景）**：CRM场景的用户提问既有语义化表达（"客户不想续约怎么办"），也有精确术语查询（"ERP同步失败""审批流程卡住"）。早期只考虑纯向量检索方案时发现，对专业术语、系统模块名等强关键词场景召回不稳定——embedding会把这些专有名词"模糊化"，检索排名不一定靠前。

**T（任务）**：需要同时兼顾语义理解能力和关键词精确匹配能力，且不希望引入额外的独立服务（比如单独搭Elasticsearch）增加运维复杂度。

**A（行动）**：采用Milvus原生的Dense+Sparse混合检索方案——Dense向量用本地BGE模型捕捉语义相关性，Sparse向量用Milvus内置BM25 Function直接从`text`字段生成（免去额外分词服务的维护成本），检索时用RRF算法融合两种排序结果（详见第4.5节，避免了手动调权重的量纲对齐问题）。

**R（结果）**：实测对"客户对价格有异议该怎么处理"这类语义化问题、以及"ERP同步失败"这类术语查询都能精准命中对应知识块（见本项目实际跑通记录：检索结果长度769字符，精准命中价格异议FAQ段落）。

### 难点2：长文档切块易破坏语义完整性

**S**：Markdown文档经过`UnstructuredMarkdownLoader`按元素解析后粒度过细（标题和正文段落是分离的独立对象），如果直接对每个碎片单独做embedding检索，一是语义不完整（正文段落脱离了所属标题的上下文），二是检索到答案却看不出这是回答什么问题。

**T**：需要一种切块方式既保证块内语义完整、又不因为块太大而丢失检索粒度。

**A**：设计"标题层级合并+超长文本语义二次切分"两级策略（详见第3.1节）——先按Markdown标题的父子关系把同一标题下的所有内容块合并成一个完整语义单元（`page_content`里同时带有标题路径和正文），再对超过5000字符阈值的合并块用`SemanticChunker`按语义边界二次切分。

**R**：合并后的文档块检索出来自带"标题 -> 内容"的完整上下文（如`"CRM销售SOP常见问题 -> 客户对价格有异议该怎么处理？ ..."`），生成模型不会看到孤立缺乏背景的文本碎片。

### 难点3（现存未修复问题，面试要诚实说明）：Self-RAG生成校验存在无限重试风险

**S**：`graph2/graph_2.py`里`grade_generation_v_documents_and_question`函数，当生成结果被判定为"not supported"（幻觉，脱离检索文档）时，条件边配置是**直接指回`generate`节点自身重新生成**（见`graph_2.py:136`：`"not supported": "generate"`），**这条边没有配套任何计数限制**。

**T**：理论上，如果模型持续产生幻觉（比如检索到的文档本身就模糊、或者模型在这类问题上稳定性差），这个"生成→判定幻觉→重新生成"的循环会无限执行下去，没有退出条件。

**A（诚实说明当前状态，不要在简历/面试里过度美化）**：对比第7.5节`transform_query`那条边已经用`transform_count`做了收敛控制，`generate`节点的幻觉重试目前**没有**采用同样的模式。**修复方案是显而易见的**——在State里加一个类似`generation_retry_count`的计数字段，超过阈值（比如3次）后不再无限重试，转而返回一个"无法确定答案准确性"的兜底提示给用户，而不是无限占用系统资源空转。

**R（反思）**：这是一个"知道正确做法、但还没有在所有该应用的地方保持一致"的典型工程遗留问题——`transform_query`那条边做对了，`generate`重试这条边没有照抄同样的模式，说明代码里**局部正确的设计模式没有被系统性地推广到所有类似场景**，这也是代码review时最容易漏掉的一类问题（"这个模式在A处做对了，但B处结构类似却没有应用同样的保护"）。

**面试应答策略**：如果面试官问"你的Self-RAG流程会不会死循环"，诚实回答"目前`transform_query`那条边已经做了收敛控制，但生成质量校验那条边确实还没有加同样的保护，这是我发现但还没修复的已知问题，修复方案是加一个重试计数字段" —— 这种诚实且给出具体修复方案的回答，比硬说"不会死循环"（一旦被追问代码细节就露馅）要可信得多，也更能体现真实的工程判断力。

---

## 10. 高频面试题清单

### RAG基础类

**Q1：为什么要做混合检索，不能只用向量检索？**
→ 见第4.4节。向量检索对专有名词/精确术语不敏感，纯关键词检索缺语义理解，CRM场景两种查询模式都存在，必须兼顾。

**Q2：RRF融合排序是怎么工作的，为什么不直接把两个分数加权平均？**
→ 见第4.5节。两种检索方式的分数量纲完全不同（相似度[-1,1] vs BM25无固定上限），只看排名转倒数分数相加，避免量纲对齐问题。

**Q3：你的分块策略是怎么设计的，为什么不直接按固定长度切？**
→ 见第3节。标题层级合并保证语义单元完整，超长内容才用SemanticChunker二次切分，固定长度切分会切断语义相关的上下文。

**Q4：Embedding模型你是怎么选的？**
→ 见第2.1节。本地BGE中文优化模型用于高频调用场景（入库+检索），OpenAI embedding用于低频的语义切块判断，按调用频次和场景敏感度分层选型。

**Q5：如何评估你的RAG效果？**
→ 目前项目**没有系统性建立评测集**，是可以承认的短板。可以说明理想方案：拆解检索环节（Top-K召回率/精确率）和生成环节（忠实度/答案相关性，本项目`hallucination_grader_chain`和`answer_grader_chain`本身就是这两个维度的评测思路，只是目前用于运行时自纠错，还没固化成离线评测集）。

### LangGraph/Agent架构类

**Q6：为什么用LangGraph而不是LangChain的Chain？**
→ 见第6.1节。需要"检索不相关就改写问题重新检索"这种带循环、条件分支的控制流，Chain是单向DAG做不到，图结构天然支持循环和条件边。

**Q7：你的两条Pipeline（graph1和graph2）有什么区别，为什么要做两套？**
→ 见第1.4节和第6.2节。graph1结构简单，只有一层文档相关性校验；graph2引入问题路由+生成质量双重校验+收敛控制的Self-RAG完整思路，复杂度和鲁棒性都更高。可以讲成"从简单原型到完整方案的演进过程"。

**Q8：Self-RAG的核心思想是什么，你是怎么落地的？**
→ 见第7.1节。核心是在"检索→生成"这条直线上插入自我校验环节（路由判断、文档相关性打分、生成幻觉检测、答案相关性评估），本项目在graph2里完整实现了这四个校验点。

**Q9：幻觉检测和答案相关性评估为什么要分两步，不能合并成一次判断？**
→ 见第7.4节。忠实度（是否基于文档）和相关性（是否切题）是两个独立维度，脱离文档的编造内容完全可能看起来很切题，必须先保证生成有依据，再判断这个有依据的回答是否真正回答了问题。

**Q10：你的系统会不会有死循环风险？**
→ 见难点3。诚实说明`transform_query`已做收敛控制，但`generate`节点的幻觉重试确实还没有，并给出具体修复思路（加计数字段），展示诚实的工程判断力而不是回避问题。

### 工程化类

**Q11：为什么要用双进程做批量入库，不直接单进程循环写？**
→ 见第8.1节。解析（尤其语义切块要调用Embedding模型）和数据库写入是异步的两件事，用Queue解耦成生产者-消费者模型并发执行，总耗时趋近于较慢的那一步而不是两步相加；`maxsize`限制还提供了背压机制防止内存溢出。

**Q12：RAG和微调怎么选，你的项目为什么选RAG不用微调？**
→ CRM知识频繁更新（SOP流程、系统功能会迭代），微调后知识很快过期，重新微调成本高；且RAG可以返回检索到的原文，答案可追溯验证，微调后的知识是隐式记忆在参数里无法验证来源。CRM场景更贴近RAG的适用场景。

---

## 附：项目文件与知识点速查表

| 代码文件 | 对应本文档章节 |
|---|---|
| `documents/markdown_parser.py` | 第3节（分块策略） |
| `documents/milvus_db.py` | 第4节（Milvus混合检索） |
| `tools/retriever_tools.py` | 第4.6节、第5.1节（检索参数、Tool封装） |
| `agent/rag_agent.py` | 第5.2、5.3节（多轮记忆、AgentExecutor） |
| `graph/graph1.py`、`graph/graph_state1.py` | 第6.1节（简单Agentic RAG图） |
| `graph2/graph_2.py`、`graph2/graph_state2.py` | 第6.2、7节（Self-RAG图、自纠错设计） |
| `documents/write_milvus.py` | 第8.1节（双进程流水线） |
| `utils/env_utils.py`、`utils/log_utils.py` | 第8.2、8.3节（配置与日志） |
| `llm_models/all_llm.py`、`llm_models/embeddings_model.py` | 第2节（底层模型原理） |
