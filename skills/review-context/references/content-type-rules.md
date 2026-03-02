# 内容类型识别规则与维度映射

## 内容类型识别

按优先级从高到低判定。匹配到第一个即停止。

### 1. Prompt 类

**文件名特征：** 含 `prompt`、`system`、`instruction`、`persona`

**内容特征（任一即匹配）：**
- 含 `you are`、`你是`、`your role`、`你的角色`
- 含 `<system>`、`system prompt`、`## Instructions`、`## Role`、`## 角色`
- 含 `[INST]`、`<<SYS>>`、`<|system|>`
- 内容主体以指令语气定义 AI 行为或角色
- XML 标签结构化的指令集（`<context>`、`<instructions>`、`<output>`）

### 2. Agent 代码类

**文件扩展名：** `.py`、`.ts`、`.js`、`.go`、`.rs`、`.java`

**内容特征（需代码文件 + 任一以下特征）：**
- import/使用 LLM 框架：`langchain`、`langgraph`、`autogen`、`crewai`、`openai`、`anthropic`、`claude_agent_sdk`、`llama_index`
- 包含 tool definition / function calling 逻辑
- 管理 message history / conversation buffer
- 实现 agent loop、planning、reflection 模式
- 包含 system prompt 拼装逻辑
- 使用 MCP server/client 相关代码

### 3. 架构文档类

**文件扩展名：** `.md`、`.txt`、`.rst`

**内容特征（需文档文件 + 任二以下特征）：**
- 含 `architecture`、`架构`、`system design`、`系统设计`
- 含 `component`、`组件`、`service`、`服务`、`module`、`模块`
- 描述多个组件之间的交互或数据流
- 含 Mermaid 图（`graph`、`sequenceDiagram`、`flowchart`）
- 含 ASCII 架构图（`┌─`、`│`、`└─`、`--->`）
- 含 `data flow`、`数据流`、`sequence diagram`、`序列图`

### 4. 设计文档类

**文件扩展名：** `.md`、`.txt`、`.rst`

**内容特征（需文档文件 + 任二以下特征）：**
- 含 `PRD`、`RFC`、`proposal`、`提案`、`设计方案`
- 含 `motivation`、`动机`、`background`、`背景`
- 含 `alternatives`、`trade-off`、`方案对比`
- 含 `implementation plan`、`实现计划`、`milestone`
- 描述问题定义和解决方案选择

### 5. Skill / Workflow 定义类

**内容特征（任二即匹配）：**
- YAML frontmatter 含 `name:`、`description:`
- 含 `allowed-tools:`、`argument-hint:`
- 含编号步骤（`### Step 0`、`### Step 1`）
- 含 `$ARGUMENTS`、`$0`、`$1`
- 定义 agent 行为流程或工作流

### 6. 通用文本（Fallback）

不符合以上任何类型。

---

## 多内容输入的类型判定

- 多文件输入时，以入口文件或最大文件的类型为**主类型**
- 若多文件跨类型，记录所有类型，以主类型驱动维度选择
- 直接粘贴的内容片段按上述规则同等判定

---

## 维度选择映射矩阵

| 内容类型 | 必选维度 | 候选维度（按相关性选 1-2） |
|---------|---------|------------------------|
| Prompt | context-fundamentals, context-degradation | context-optimization, context-compression |
| Agent 代码 | context-optimization, tool-design | memory-systems, context-compression, multi-agent-patterns, filesystem-context |
| 架构文档 | multi-agent-patterns, context-fundamentals | filesystem-context, hosted-agents, evaluation, context-optimization |
| 设计文档 | project-development, evaluation | multi-agent-patterns, tool-design, context-fundamentals |
| Skill/Workflow | tool-design, context-fundamentals | filesystem-context, context-optimization, context-compression |
| 通用文本 | context-fundamentals | context-optimization, context-degradation |

## 特征驱动的维度追加

无论内容类型，若检测到以下特征则追加对应维度：

| 内容特征 | 追加维度 |
|---------|---------|
| 包含 KV-cache、token budget、compaction 相关讨论 | context-optimization |
| 包含多个 agent/worker/sub-agent 的定义或协调逻辑 | multi-agent-patterns |
| 包含 memory、embedding、vector store、knowledge graph 相关 | memory-systems |
| 包含 BDI、belief、desire、intention、mental state 相关 | bdi-mental-states |
| 包含 sandbox、hosted、remote execution、background agent 相关 | hosted-agents |
| 包含 eval、benchmark、LLM-as-judge、rubric 相关 | evaluation 或 advanced-evaluation |
| 包含文件系统读写作为 agent 状态管理手段 | filesystem-context |
| 包含 summarization、compaction、conversation history 压缩 | context-compression |

## 最终维度数量约束

- 最少 3 个，最多 5 个
- 若必选 + 特征追加超过 5 个，保留必选维度 + 最相关的候选维度
- 若必选不足 3 个，从候选维度中补充
