# Context Engineering 维度审查清单

审查时仅阅读选定维度的对应段落，不需通读全文。

---

## 1. context-fundamentals

**核心原则：** Context 是模型推理时的完整状态（系统指令、工具定义、检索文档、消息历史、工具输出）。Context 工程的本质是精选最小的高信号 token 集合以最大化期望输出。注意力是有限预算，随 context 增长而稀释。

### 审查清单

- [ ] **结构化分区** `[Prompt/Skill]`：系统 prompt 是否用 XML/Markdown 标签明确分区（背景、指令、工具指导、输出描述）
- [ ] **指令高度** `[Prompt/Skill]`：指令是否在"正确高度"——既不过于硬编码（脆弱）也不过于模糊（歧义）
- [ ] **渐进式披露** `[代码/架构]`：是否采用按需加载策略——先摘要，需要时再加载全文，而非一次性全量填充
- [ ] **注意力位置** `[全部]`：关键信息是否放在 context 的开头或结尾（注意力 U 形曲线偏好位置），避免埋在中部
- [ ] **Context 预算** `[代码/架构]`：是否设有显式 token 预算并监控使用量
- [ ] **压缩触发** `[代码]`：是否在 70-80% 利用率时触发压缩/compaction
- [ ] **信息密度** `[全部]`：是否偏好信息量优先（informativity）而非穷举（exhaustiveness）

### 常见反模式

1. **全量填充**：把所有文档一次性塞入 context，不做按需加载
2. **窗口迷信**：假设更大的 context 窗口能解决记忆问题（已被实证证伪）
3. **中部死区**：将非关键信息放在 context 中部——注意力最弱区域
4. **一次性思维**：把 context 工程视为一次性 prompt 编写，而非持续迭代的管理纪律

> **深入学习：** `context-engineering-fundamentals:context-fundamentals`

---

## 2. context-optimization

**核心原则：** 通过四大策略延展有限窗口的有效容量：compaction（摘要压缩）、observation masking（输出遮蔽）、KV-cache 优化（前缀复用）、context partitioning（子代理分区）。质量优于数量——保留信号、消除噪声。

### 审查清单

- [ ] **优化触发** `[代码]`：是否在 context 利用率 >70% 时触发优化策略
- [ ] **Observation masking** `[代码]`：工具输出占比高时是否应用输出遮蔽（可实现 60-80% 缩减）
- [ ] **KV-cache 友好** `[代码/Prompt]`：稳定元素（系统 prompt、工具定义）是否前置以最大化 cache 命中
- [ ] **Cache 稳定性** `[Prompt]`：prompt 中是否避免动态内容（时间戳等）破坏 cache
- [ ] **Context 分区** `[代码/架构]`：是否通过子代理分区实现 context 隔离，避免单一窗口过载
- [ ] **Compaction 效率** `[代码]`：compaction 是否达到 50-70% 缩减且质量损失可控
- [ ] **度量先行** `[全部]`：是否先度量再优化，基于数据而非假设做决策
- [ ] **优雅降级** `[代码/架构]`：边缘情况是否有降级策略

### 常见反模式

1. **盲目优化**：不度量就优化——凭直觉做决策
2. **一刀切 masking**：所有 observation 无差别 mask（当前任务关键的输出不应 mask）
3. **Cache 破坏**：prompt 格式频繁变动导致 KV-cache 失效
4. **晚期介入**：context 已严重降级后才开始优化

> **深入学习：** `context-engineering-fundamentals:context-optimization`

---

## 3. context-compression

**核心原则：** 当 agent 会话产生大量 token 时，压缩成为刚需。优化目标是 **tokens-per-task**（完成整个任务的总 token），而非 tokens-per-request。结构化强制保留——专用段落充当检查清单，防止信息静默丢失。

### 审查清单

- [ ] **优化指标** `[代码/架构]`：是否以 tokens-per-task 而非 tokens-per-request 作为优化指标
- [ ] **结构化摘要** `[代码]`：摘要是否包含 Session Intent / Files Modified / Decisions / Current State / Next Steps
- [ ] **增量合并** `[代码]`：是否采用增量锚定式合并而非每次全量重生成
- [ ] **触发阈值** `[代码]`：是否在 70-80% context 利用率时触发压缩
- [ ] **Artifact trail** `[代码/Skill]`：文件路径、错误码等关键细节是否有专门保留机制
- [ ] **质量评估** `[代码/设计]`：是否用功能性探针（recall / artifact / continuation / decision）评估压缩质量
- [ ] **Re-fetch 监控** `[代码]`：是否监控重新获取频率作为压缩质量信号
- [ ] **阶段化工作流** `[全部]`：大型任务是否采用 Research → Planning → Implementation 分阶段

### 常见反模式

1. **细节丢失**：激进压缩导致关键细节（文件路径、错误码）丢失，引发高昂 re-fetch 成本
2. **Trail 断裂**：通用摘要无法维护完整的文件修改记录
3. **错误度量**：使用 ROUGE/embedding 等传统指标而非功能性探针评估压缩质量
4. **全量重生成**：每次压缩重建摘要，跨周期细节逐步丢失

> **深入学习：** `context-engineering-fundamentals:context-compression`

---

## 4. context-degradation

**核心原则：** LLM 随 context 增长呈现可预测的降级模式：lost-in-middle（U 形注意力）、context poisoning（错误累积放大）、context distraction（无关信息竞争注意力）、context confusion（跨任务干扰）、context clash（信息互相矛盾）。降级是连续光谱而非二元状态。

### 审查清单

- [ ] **Lost-in-middle 防护** `[Prompt/全部]`：关键信息是否放在 context 首尾（中部回忆率低 10-40%）
- [ ] **Poisoning 检测** `[代码]`：是否有检测 context poisoning 的机制（质量突降、工具调用错位、幻觉持续）
- [ ] **Distraction 过滤** `[代码/Prompt]`：检索文档是否做相关性过滤（单个无关文档即可显著降低性能）
- [ ] **任务隔离** `[代码/架构]`：不同任务间是否做 context 隔离（防止 confusion）
- [ ] **版本过滤** `[代码]`：是否有机制防止 context clash（新旧矛盾信息共存）
- [ ] **降级阈值** `[代码/设计]`：是否了解所用模型的降级阈值并据此设计
- [ ] **四桶策略** `[代码/架构]`：是否运用 Write（外存）/ Select（检索）/ Compress（摘要）/ Isolate（子代理）
- [ ] **早期测试** `[代码/设计]`：是否在开发阶段用递增 context 大小测试性能拐点

### 常见反模式

1. **窗口迷信**：假设更大 context 窗口能避免降级
2. **毒化修补**：出现 poisoning 后试图在 poisoned context 中纠正（应截断或重启 clean context）
3. **假基准**：依赖 needle-in-haystack 测试判断长 context 能力（不代表真实理解力）
4. **Distraction 阶跃**：忽视单个无关文档即有阶跃式性能影响

> **深入学习：** `context-engineering-fundamentals:context-degradation`

---

## 5. filesystem-context

**核心原则：** 文件系统提供单一接口让 agent 灵活存取无限量 context。核心洞察：文件实现**动态 context 发现**——agent 按需拉取而非全量携带。六大模式：scratch pad、plan persistence、子代理文件通信、动态 skill 加载、日志持久化、自修改学习。

### 审查清单

- [ ] **输出外存** `[代码]`：超过 2000 token 的工具输出是否写入文件并返回摘要 + 引用
- [ ] **计划持久化** `[代码/Skill]`：长期计划/state 是否持久化为结构化文件供 agent 重读
- [ ] **文件通信** `[代码/架构]`：多代理间是否通过文件系统共享状态（避免消息链的"电话游戏"）
- [ ] **动态加载** `[代码/Prompt]`：skill/指令是否按需动态加载（而非全部塞入系统 prompt）
- [ ] **目录可发现性** `[代码/Skill]`：文件目录结构是否为 agent 可发现性而设计（清晰命名、分层组织）
- [ ] **搜索策略** `[代码/架构]`：是否结合结构匹配（grep/glob）和语义查询（semantic search）
- [ ] **Token 比率** `[代码]`：是否追踪 static vs dynamic context 的 token 比率
- [ ] **清理机制** `[代码]`：scratch 文件是否有清理机制防止无限增长

### 常见反模式

1. **历史膨胀**：所有工具输出直接进入消息历史，累积 token 膨胀
2. **全量加载**：将所有 skill 指令塞入系统 prompt（而非按需加载）
3. **消息链传递**：子代理通过消息链传递结果——信息在每跳的摘要中降级
4. **无防护自修改**：自修改模式缺少防护——agent 可能积累错误或矛盾指令

> **深入学习：** `context-engineering-fundamentals:filesystem-context`

---

## 6. tool-design

**核心原则：** 工具是确定性系统与非确定性 agent 之间的合约。工具描述本质是 prompt engineering。**合并原则**：如果人类工程师无法明确判断该用哪个工具，agent 也做不到。趋势是**架构精简**——用少量通用原语取代大量特化工具。

### 审查清单

- [ ] **描述清晰度** `[代码/Skill]`：工具描述是否回答四个问题——做什么、何时用、接受什么输入、返回什么
- [ ] **合并原则** `[代码/架构]`：是否消除功能重叠的工具（10-20 个工具为合理范围）
- [ ] **命名一致性** `[代码]`：参数命名是否一致（不混用 id / identifier / customer_id）
- [ ] **可操作错误** `[代码]`：错误消息是否告诉 agent 如何纠正（而非通用错误码）
- [ ] **输出控制** `[代码]`：是否提供 response format 选项（concise/detailed）控制 token 消耗
- [ ] **MCP 命名** `[代码/Skill]`：MCP 工具是否使用完全限定名（ServerName:tool_name）
- [ ] **赋能 vs 约束** `[代码/架构]`：工具是在赋能还是在约束模型推理能力
- [ ] **迭代优化** `[全部]`：是否基于观察到的失败模式迭代优化工具描述

### 常见反模式

1. **模糊描述**："Search the database"——agent 被迫猜测使用场景
2. **晦涩参数**：参数名为 x, val, param1——无法推断含义
3. **过度工具化**：构建大量特化工具来"保护"模型（实际约束推理能力）
4. **Token 忽视**：忽视工具描述的 token 开销——每个工具定义都消耗 context 预算
5. **过度适配**：针对当前模型能力过度优化架构——应构建最小架构

> **深入学习：** `context-engineering-fundamentals:tool-design`

---

## 7. memory-systems

**核心原则：** 记忆提供跨会话持久层，从易失 context 窗口到持久存储构成分层体系。关键发现：**工具复杂度不如检索可靠性重要**——Letta 的文件系统 agent 用基础文件操作在 LoCoMo 上胜过 Mem0 复杂记忆工具。从简单开始，仅在检索质量要求时增加复杂度。

### 审查清单

- [ ] **记忆分层** `[代码/架构]`：记忆层级是否清晰（Working / Short-term / Long-term / Entity / Temporal KG）
- [ ] **从简开始** `[代码/设计]`：是否先用文件系统记忆原型验证，再升级至向量存储/图数据库
- [ ] **时间有效性** `[代码]`：会变化的事实是否追踪 valid_from / valid_until
- [ ] **检索回退** `[代码]`：检索失败时是否有回退策略（扩大范围、提示用户澄清）
- [ ] **合并策略** `[代码/架构]`：是否有记忆合并/清理策略防止无限增长
- [ ] **冲突解决** `[代码]`：冲突事实是否优先使用最新 valid_from 版本
- [ ] **隐私合规** `[代码/设计]`：是否考虑保留策略和删除权利
- [ ] **质量评估** `[代码/设计]`：是否用 LoCoMo / LongMemEval 等基准评估记忆质量

### 常见反模式

1. **全量塞入**：把所有内容塞入 context——长输入昂贵且降级
2. **时间盲区**：忽视时间有效性——过时信息 poison context
3. **过早复杂化**：文件系统 agent 可以胜过复杂记忆工具
4. **无限增长**：无合并策略——记忆无限增长降低检索质量

> **深入学习：** `context-engineering-fundamentals:memory-systems`

---

## 8. multi-agent-patterns

**核心原则：** 多代理架构通过分布式工作解决单 agent context 限制。三大模式：Supervisor（集中控制）、Peer-to-Peer/Swarm（灵活交接）、Hierarchical（层级抽象）。**子代理的首要目的是隔离 context，而非拟人化角色分工。** Token 经济：多代理约 15x 基线消耗。

### 审查清单

- [ ] **设计动机** `[代码/架构]`：多代理设计是否基于 context 隔离需求（而非组织隐喻/角色扮演）
- [ ] **Handoff 协议** `[代码/架构]`：是否有明确的 handoff 协议并传递状态
- [ ] **电话游戏防护** `[代码/架构]`：子代理能否直接传递响应给用户，而非经 supervisor 多层转述
- [ ] **共识机制** `[代码/设计]`：是否避免 sycophancy（使用加权投票 / debate / 触发干预）
- [ ] **Supervisor 健康** `[代码]`：supervisor 是否约束子代理输出 schema 防止自身 context 过载
- [ ] **输出验证** `[代码]`：代理间传递前是否验证输出防止错误传播
- [ ] **执行边界** `[代码]`：是否设置 TTL 防止无限循环
- [ ] **失败测试** `[代码/设计]`：是否显式测试了失败场景（瓶颈、分歧、错误传播）

### 常见反模式

1. **组织隐喻驱动**：用角色扮演而非 context 隔离需求设计多代理
2. **Supervisor 过载**：supervisor 累积所有 worker context 导致自身降级
3. **等权投票**：弱模型幻觉与强模型推理等权——应加权
4. **协调过度**：复杂协调抵消并行化收益
5. **无收敛 Swarm**：agent 追求不同目标导致偏离

> **深入学习：** `context-engineering-fundamentals:multi-agent-patterns`

---

## 9. bdi-mental-states

**核心原则：** BDI（Belief-Desire-Intention）是将外部知识转化为 agent 心理状态的认知架构。核心流程：感知世界状态 → 形成信念 → 生成欲望 → 承诺意图 → 指定计划 → 执行任务。T2B2T 范式实现知识图谱与心理状态的双向流转。

### 审查清单

- [ ] **实体分离** `[代码/架构]`：心理状态（Belief/Desire/Intention）是否作为独立实体建模，与世界状态分离
- [ ] **认知链完整** `[代码/架构]`：Belief → motivates → Desire → fulfils ← Intention → specifies → Plan 链路是否完整
- [ ] **时间有效性** `[代码]`：每个心理实体是否关联时间边界（atTime / hasValidity）
- [ ] **组合建模** `[代码]`：复杂信念是否用 hasPart 支持选择性更新
- [ ] **可解释性** `[代码/设计]`：每个心理实体是否链接到 Justification 实例
- [ ] **行动映射** `[代码/架构]`：意图是否通过 Plan → Task 映射到行动（而非直接意图→行动）
- [ ] **双向属性** `[代码]`：是否使用双向属性对（motivates / isMotivatedBy）支持灵活查询
- [ ] **正确性验证** `[代码]`：是否用 Competency Questions (SPARQL) 验证实现

### 常见反模式

1. **状态混淆**：混淆心理状态与世界状态
2. **时间缺失**：缺少时间边界——无法进行历时推理
3. **扁平结构**：复杂信念未用 hasPart 分解
4. **隐式证据**：justification 未显式链接
5. **跳过 Plan 层**：直接将意图映射到行动

> **深入学习：** `context-engineering-fundamentals:bdi-mental-states`

---

## 10. hosted-agents

**核心原则：** 托管 agent 运行在远程沙箱环境，提供无限并发、一致执行和多人协作。关键洞察：会话速度应仅受限于模型 TTFT，所有基础设施准备应在用户启动前完成。架构三层：sandbox 基础设施、API 状态管理层、客户端接口层。

### 审查清单

- [ ] **预构建镜像** `[代码/架构]`：是否预构建环境镜像避免冷启动
- [ ] **预测性预热** `[代码/设计]`：用户开始交互时是否即启动 sandbox（而非提交后）
- [ ] **非阻塞读取** `[代码]`：文件读取是否允许在 git sync 完成前开始（仅阻塞写入）
- [ ] **Server-first** `[代码/架构]`：agent 框架是否 server-first 架构（客户端为薄封装）
- [ ] **Session 隔离** `[代码/架构]`：每个 session 是否有隔离的状态存储
- [ ] **身份归属** `[代码/设计]`：commit 归属是否为 prompting 用户（而非 app 身份）
- [ ] **成功指标** `[设计]`：是否以"导致合并 PR 的 session 数"作为首要成功指标
- [ ] **多人协作** `[架构/设计]`：是否从一开始就设计多人协作支持

### 常见反模式

1. **延迟初始化**：用户提交后才创建环境——应预热
2. **冷启动惩罚**：所有初始化放在 session 启动时而非镜像构建时
3. **Session 泄漏**：session 状态共享导致跨 session 干扰
4. **身份混乱**：commit 使用 app 身份导致用户可批准自己的 PR

> **深入学习：** `context-engineering-fundamentals:hosted-agents`

---

## 11. evaluation

**核心原则：** Agent 评估需要不同于传统软件的方法：决策是动态的、非确定性的，常无单一正确答案。必须以**结果导向**评估，不评判具体路径。关键发现：token 用量解释 80% 的性能方差，工具调用 ~10%，模型选择 ~5%。

### 审查清单

- [ ] **多维度评分** `[代码/设计]`：是否使用多维度评分标准（而非单一指标）
- [ ] **结果导向** `[代码/设计]`：评估是否关注结果而非具体执行路径
- [ ] **复杂度分层** `[代码/设计]`：测试集是否覆盖从简单到极复杂的分层场景
- [ ] **真实 Context 测试** `[代码]`：是否在真实 context 大小下测试（而非理想化短 context）
- [ ] **持续评估** `[代码/架构]`：是否建立了持续评估管线（不仅发布前评估）
- [ ] **人机结合** `[代码/设计]`：是否结合 LLM-as-judge 和人工评估
- [ ] **趋势追踪** `[代码]`：是否追踪指标趋势以检测回归
- [ ] **明确阈值** `[代码/设计]`：是否设定基于用例的通过/失败阈值

### 常见反模式

1. **路径过拟合**：评估具体步骤而非最终结果
2. **单指标执念**：忽视多维度质量
3. **Context 盲测**：不在真实 context 大小下测试
4. **跳过人工**：自动评估无法发现异常查询上的幻觉和系统故障

> **深入学习：** `context-engineering-fundamentals:evaluation`

---

## 12. advanced-evaluation

**核心原则：** LLM-as-Judge 是一族方法：Direct Scoring（有客观真相）和 Pairwise Comparison（主观偏好）。LLM 评委存在系统性偏差（位置、长度、自我增强、冗余、权威），必须主动缓解。良好 rubric 可减少 40-60% 评估方差。

### 审查清单

- [ ] **方法选择** `[代码/设计]`：是否根据有无客观真相选择 Direct Scoring vs Pairwise
- [ ] **位置偏差** `[代码]`：Pairwise 是否做了位置交换（双 pass + 一致性检查）
- [ ] **证据先行** `[代码/Prompt]`：是否要求先给出证据/理由再打分（CoT 提升 15-25%）
- [ ] **量表粒度** `[代码/设计]`：评分量表粒度是否匹配 rubric 详细程度
- [ ] **边缘处理** `[代码/Prompt]`：是否定义了边缘情况的处理指引
- [ ] **领域特化** `[代码/Prompt]`：rubric 是否使用领域特定术语
- [ ] **偏差监控** `[代码]`：是否监控系统性偏差模式
- [ ] **规模化方案** `[代码/架构]`：高量级评估是否采用 PoLL 或分层评估

### 常见反模式

1. **无据打分**：分数缺乏可审计的证据
2. **单 pass 比较**：位置偏差污染 pairwise 结果
3. **标准过载**：单个标准度量多个方面
4. **忽视校准**：高置信度的错误判断比低置信度更危险
5. **通用 rubric**：产出通用（无用）评估

> **深入学习：** `context-engineering-fundamentals:advanced-evaluation`

---

## 13. project-development

**核心原则：** 在写代码前先评估任务-模型匹配度（Task-Model Fit）。LLM 项目受益于分阶段管线架构（acquire → prepare → process → parse → render），其中只有 process 是非确定性的。**架构精简**是核心策略——减少工具数可提升成功率。

### 审查清单

- [ ] **手动验证** `[代码/设计]`：是否先做手动原型验证（直接测试模型）再构建自动化
- [ ] **阶段化管线** `[代码/架构]`：管线是否分为离散、幂等、可缓存、可独立运行的阶段
- [ ] **文件状态机** `[代码]`：是否用文件系统作为状态机（目录 + 文件标记阶段完成）
- [ ] **格式指定** `[代码/Prompt]`：prompt 是否指定了精确格式要求并附带示例
- [ ] **容错 Parser** `[代码]`：parser 是否能容忍 LLM 输出的微小格式变异
- [ ] **成本追踪** `[代码/设计]`：是否在开发早期就估算并追踪 token 成本
- [ ] **最小架构** `[全部]`：架构是否从最小开始，仅在证明必要时增加复杂度
- [ ] **迭代预期** `[设计]`：是否预期并规划了多次架构迭代

### 常见反模式

1. **跳过验证**：直接构建自动化后发现任务不适合 LLM
2. **单体管线**：所有阶段合为一个脚本，难以调试和迭代
3. **过度约束**：添加模型本可自行处理的防护/预过滤/验证逻辑
4. **成本后知**：忽视成本直到生产环境——token 成本在规模化时急剧复合
5. **过早优化**：基础管线尚未跑通就加 caching/并行化

> **深入学习：** `context-engineering-fundamentals:project-development`
