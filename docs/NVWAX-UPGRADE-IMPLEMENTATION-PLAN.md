# NvwaX Agent 创建方法升级 - 开发实施计划

**版本**: v3.0.0  
**创建日期**: 2026-06-22  
**基于**: NVWAX-AGENT-CREATION-UPGRADE-V3.md

---

## 概览

三个 Sprint，共 6 个实施任务，按 P0 → P1 → P2 优先级递进。

---

## Sprint 1: 鲁棒性基础（P0）

### Task 1: Structured Output 引擎
**目标**：消除所有 JSON 正则解析，替换为 Structured Output

**新建文件**：
- `packages/nvwax-server/src/services/structured-output.service.ts` — JSON Schema 定义和输出解析器

**修改文件**：
- `packages/nvwax-server/src/services/nvwax-agent.service.ts` — 替换 analyzeWithLLM / designWithLLM 中的 JSON 解析
- `packages/nvwax-server/src/services/nvwa-leader.service.ts` — 替换 generateWithLLM 中的 JSON 解析
- `packages/nvwax-server/src/services/ceo-agent-generator.service.ts` — CEO 生成使用结构化输出
- `packages/nvwax-server/src/prompts/nvwax-agent-prompt.ts` — 移除 JSON 格式指令，简化 prompt

**实施步骤**：
1. 创建 `StructuredOutputService`，定义所有 JSON Schema（RequirementAnalysis / TeamDesign / CEOConfig / NvwaXResponse）
2. 实现 `callWithSchema<T>()` 通用方法，封装 response_format + JSON 解析 + 重试
3. 逐一替换 nvwax-agent.service.ts 中的 4 处正则解析
4. 替换 nvwa-leader.service.ts 中的 2 处正则解析
5. 替换 ceo-agent-generator.service.ts 中的 1 处正则解析
6. 简化 prompt，移除 JSON 格式说明（由 schema 自动约束）

### Task 2: 状态机流程引擎
**目标**：用图状态机替代线性 7 步流程

**新建文件**：
- `packages/nvwax-server/src/services/creation-state-machine.service.ts` — 状态机核心
- `packages/nvwax-server/src/types/creation-state.ts` — 状态类型定义

**修改文件**：
- `packages/nvwax-server/src/controllers/aiteam-creation.controller.ts` — 使用状态机驱动流程
- `packages/nvwax-server/src/services/aiteam-creation.service.ts` — 添加 checkpoint 读写

**数据库迁移**：
- 新建 `creation_checkpoints` 表

**实施步骤**：
1. 定义 `CreationState` 类型和 `StateTransition` 类型
2. 实现 `CreationStateMachine` 类：节点注册、边定义、条件分支、状态转换
3. 实现 checkpoint 持久化（save/load/restore）
4. 实现 human-in-the-loop 暂停/恢复机制
5. 集成到现有 aiteam-creation.controller.ts
6. 编写数据库迁移脚本

---

## Sprint 2: 灵活性扩展（P1）

### Task 3: 动态 Agent 注册表
**目标**：用数据库 + 语义匹配替代硬编码 Agent 类型

**新建文件**：
- `packages/skillhub-workflow/src/services/agent-registry.service.js` — 注册表核心
- `packages/nvwax-server/src/services/agent-semantic-match.service.ts` — 语义匹配

**修改文件**：
- `packages/skillhub-workflow/src/agents/agent-definitions.js` — 改为从注册表加载
- `packages/skillhub-workflow/src/agents/orchestrator.js` — 使用注册表查找 Agent

**数据库迁移**：
- 新建 `agent_definitions` 表

**实施步骤**：
1. 设计 `agent_definitions` 表结构（id, name, capabilities, embedding, workflow_template 等）
2. 实现 `AgentRegistry` CRUD 服务
3. 实现语义匹配服务（embedding 生成 + 余弦相似度）
4. 将现有 5 种 Agent 类型迁移为数据库记录
5. 修改 orchestrator.js 使用注册表

### Task 4: 声明式 Agent YAML DSL
**目标**：支持通过 YAML 文件定义 Agent 和工作流

**新建文件**：
- `packages/skillhub-workflow/src/loaders/yaml-agent-loader.js` — YAML Agent 加载器
- `packages/skillhub-workflow/src/loaders/yaml-workflow-loader.js` — YAML 工作流加载器
- `packages/skillhub-workflow/agents/` — YAML Agent 定义目录（示例文件）
- `packages/skillhub-workflow/workflows/` — YAML 工作流定义目录（示例文件）

**修改文件**：
- `packages/skillhub-workflow/src/server.js` — 启动时加载 YAML 定义

**实施步骤**：
1. 定义 YAML Schema（Agent Schema + Workflow Schema）
2. 实现 YAML 加载器（使用 js-yaml 解析 + 校验）
3. 实现文件监听器（文件变更自动重载）
4. 创建 3 个示例 Agent YAML 和 2 个示例工作流 YAML
5. 集成到 server.js 启动流程

---

## Sprint 3: 智能化增强（P2）

### Task 5: 增强记忆系统
**目标**：语义检索 + 反思学习

**新建文件**：
- `packages/nvwax-server/src/services/memory-enhanced.service.ts` — 增强记忆服务
- `packages/nvwax-server/src/services/reflection-learning.service.ts` — 反思学习服务

**修改文件**：
- `packages/nvwax-server/src/services/nvwax-memory.service.ts` — 扩展 embedding 存储
- `packages/nvwax-server/src/services/nvwax-agent.service.ts` — 集成增强推荐

**数据库迁移**：
- `nvwax_memories` 表新增 `embedding` 字段

**实施步骤**：
1. 实现 embedding 生成（调用 DeepSeek embedding API）
2. 实现向量相似度搜索（pgvector 或应用层计算）
3. 实现反思学习服务：分析低分案例，提取失败模式
4. 将反思结论注入 system prompt

### Task 6: MCP 协议支持
**目标**：将 NvwaX 能力暴露为 MCP Tools

**新建文件**：
- `packages/nvwax-server/src/mcp/nvwax-mcp-server.ts` — MCP 服务端
- `packages/nvwax-server/src/mcp/tool-definitions.ts` — Tool Schema 定义

**修改文件**：
- `packages/nvwax-server/src/server.ts` — 挂载 MCP 服务

**实施步骤**：
1. 定义 MCP Tool Schema（search_agents / design_team / match_skills）
2. 实现 MCP 服务端适配器
3. 挂载到 Express 应用
4. 编写集成测试

---

## 依赖关系

```
Task 1 (Structured Output) ──→ Task 2 (状态机) ──→ Task 5 (增强记忆)
                                  │
                                  ├──→ Task 3 (Agent 注册表) ──→ Task 4 (YAML DSL)
                                  │
                                  └──→ Task 6 (MCP 协议)
```

---

## 风险与缓解

| 风险 | 影响 | 缓解策略 |
|------|------|---------|
| DeepSeek API 不支持 json_schema | Task 1 | 降级使用 JSON mode + 重试 |
| 状态机迁移影响现有 API | Task 2 | Feature flag 控制，新旧流程并行 |
| YAML 加载性能 | Task 4 | 文件缓存 + 增量加载 |
| Embedding API 成本 | Task 5 | 批量生成 + 本地缓存 |

---

*计划结束*
