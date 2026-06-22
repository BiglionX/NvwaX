# NvwaX Agent 创建方法升级需求文档 v3.0

**版本**: v3.0.0  
**创建日期**: 2026-06-22  
**状态**: 待实施  
**作者**: NvwaX Team

---

## 1. 升级背景

NvwaX 已完成 Phase 1-5 的全部功能（需求分析→团队设计→Agent/Skill匹配→CEO生成→文档包→自我进化记忆），建立了完整的 Aiteam 创建骨架。但通过代码审计和最新 Agent 创建技术（CrewAI、LangGraph、AutoGen、OpenAgents 等框架）的对标分析，发现在**鲁棒性、灵活性、智能化**三个维度上存在显著提升空间。

## 2. 升级目标

| 维度 | 当前水平 | 目标水平 |
|------|---------|---------|
| **鲁棒性** | LLM 输出 JSON 正则解析失败率 ~20% | Structured Output 保证 ~99% 成功率 |
| **灵活性** | 5 种硬编码 Agent 类型，线性 7 步流程 | 无限动态注册，图状态机支持分支/回退 |
| **智能化** | 频率统计推荐，无反思学习 | 语义向量检索 + 反思学习 + 协议互操作 |

---

## 3. 维度一：鲁棒性升级

### 3.1 Structured Output 替代 JSON 正则解析

**现状问题**：
- `nvwax-agent.service.ts` 中所有 LLM 调用都使用 `response.match(/```json\s*([\s\S]*?)\s*```/)` 提取 JSON
- LLM 输出不稳定，可能遗漏 markdown 标记或输出非法 JSON
- 降级逻辑大量使用硬编码 mock 数据，维护成本高

**升级需求**：

| 编号 | 需求 | 优先级 |
|------|------|--------|
| R-1.1 | 为 `RequirementAnalysis` 定义 JSON Schema，使用 `response_format: { type: 'json_schema' }` | P0 |
| R-1.2 | 为 `TeamDesign` 定义 JSON Schema | P0 |
| R-1.3 | 为 `CEOConfig` 定义 JSON Schema | P0 |
| R-1.4 | 为 `NvwaXResponse` 定义完整的 JSON Schema | P0 |
| R-1.5 | 消除所有正则 JSON 解析代码，统一使用结构化输出 | P0 |
| R-1.6 | 为 DeepSeek API 不支持 structured output 时保留 JSON mode 降级 | P1 |

### 3.2 状态机流程引擎

**现状问题**：
- 7 步创建流程是线性执行，无法回退、分支或暂停
- 无 checkpoint 持久化，服务重启后丢失进度
- 无 human-in-the-loop 审批节点

**升级需求**：

| 编号 | 需求 | 优先级 |
|------|------|--------|
| R-2.1 | 将创建流程建模为有向图（StateGraph），每个步骤为节点 | P0 |
| R-2.2 | 支持条件分支：根据匹配结果走不同路径（复用/新建/引导创建） | P0 |
| R-2.3 | 支持 checkpoint 持久化（存储到 `creation_checkpoints` 表） | P0 |
| R-2.4 | 支持 human-in-the-loop：关键节点暂停等待用户确认 | P0 |
| R-2.5 | 支持状态回退：用户可在任何步骤返回修改前序配置 | P1 |
| R-2.6 | 支持断点恢复：服务重启后可从最近 checkpoint 继续 | P1 |
| R-2.7 | 提供状态转换历史和审计日志 | P2 |

**流程图**：

```
[requirements_gathering]
        │
        ├──(信息不足)──→ [clarify] ──→ [requirements_gathering]
        │
        ├──(信息充分)──→ [team_design]
                              │
                              ├──(用户修改)──→ [revise_design] ──→ [team_design]
                              │
                              └──(确认通过)──→ [agent_matching]
                                                  │
                                                  ├──(有匹配)──→ [skill_matching]
                                                  │
                                                  └──(无匹配)──→ [create_agent_guide]──→ [skill_matching]
                                                                      │
                                                                      ├──→ [ceo_generation]
                                                                      │        │
                                                                      │        └──→ [document_generation]
                                                                      │                   │
                                                                      │                   └──→ [confirm] ──→ [complete]
                                                                      │
                                                                      └──(失败回退)──→ [team_design]
```

---

## 4. 维度二：灵活性升级

### 4.1 动态 Agent 注册表

**现状问题**：
- `agent-definitions.js` 硬编码 5 种 Agent 类型（frontend/backend/database/test/docs）
- 新增 Agent 类型需要修改源代码
- 匹配逻辑是简单字符串包含，无语义理解能力

**升级需求**：

| 编号 | 需求 | 优先级 |
|------|------|--------|
| R-3.1 | 设计 `AgentRegistry` 接口，支持 CRUD 注册/注销 | P1 |
| R-3.2 | Agent 定义存入数据库表 `agent_definitions`，支持热加载 | P1 |
| R-3.3 | Agent 定义包含 capabilities 标签和 embedding 向量字段 | P1 |
| R-3.4 | 实现语义匹配：需求描述 vs Agent capabilities 的向量相似度 | P1 |
| R-3.5 | 保留关键词匹配作为降级方案 | P2 |
| R-3.6 | 支持从外部 MCP/A2A 网络发现 Agent | P2 |

### 4.2 声明式 Agent DSL

**现状问题**：
- 工作流模板硬编码在 `agent-templates.js` 中
- 添加新模板需修改 JS 代码并重启服务
- 非开发人员无法创建或修改工作流

**升级需求**：

| 编号 | 需求 | 优先级 |
|------|------|--------|
| R-4.1 | 设计 YAML Schema 用于声明式定义 Agent（`agents/*.yaml`） | P1 |
| R-4.2 | 设计 YAML Schema 用于声明式定义工作流（`workflows/*.yaml`） | P1 |
| R-4.3 | 实现 YAML 加载器，支持热加载（文件变更自动重载） | P1 |
| R-4.4 | YAML 定义支持变量引用 `{{input.xxx}}` 和条件执行 | P2 |
| R-4.5 | 提供 Web UI 的可视化 YAML 编辑器 | P3 |

**Agent YAML Schema 示例**：

```yaml
agent:
  id: content-strategist
  name: 内容策略师
  version: 1.0.0
  description: 专业的内容策略规划与执行专家
  capabilities:
    - content_strategy
    - trend_analysis
    - seo_optimization
  tools:
    - skillhub_search
    - web_scraper
  system_prompt: |
    你是一位资深内容策略师，擅长制定内容日历和选题规划...
  constraints:
    max_concurrent_tasks: 3
    timeout_seconds: 300
    retry_on_failure: true
```

---

## 5. 维度三：智能化升级

### 5.1 增强记忆系统

**现状问题**：
- `nvwax-memory.service.ts` 基于 SQL `GROUP BY` 的频率统计推荐
- 无语义级别的相似案例匹配
- 无失败案例的反思学习机制

**升级需求**：

| 编号 | 需求 | 优先级 |
|------|------|--------|
| R-5.1 | 为记忆记录生成 embedding 向量，支持语义检索相似案例 | P2 |
| R-5.2 | 实现反思学习：定期分析 `success_score < 0.5` 的案例 | P2 |
| R-5.3 | 将反思结果注入 LLM system prompt，避免重复犯错 | P2 |
| R-5.4 | 实现 A/B 推荐测试：对比新旧推荐策略的效果 | P3 |

### 5.2 MCP/A2A 协议支持

**现状问题**：
- 系统完全封闭，无法与外部 Agent 框架互操作
- Agent 搜索仅限本地数据库 + GitHub/HuggingFace 爬虫

**升级需求**：

| 编号 | 需求 | 优先级 |
|------|------|--------|
| R-6.1 | 将 NvwaX 核心能力（搜索/设计/匹配）暴露为 MCP Tools | P2 |
| R-6.2 | 支持通过 A2A 协议发现和引入外部 Agent | P2 |
| R-6.3 | 创建的 Agent 配置支持 A2A 格式导出 | P3 |

---

## 6. 非功能需求

| 编号 | 需求 | 说明 |
|------|------|------|
| NF-1 | 向后兼容 | 所有升级必须保持现有 API 不变或提供平滑迁移路径 |
| NF-2 | 渐进式迁移 | 新功能通过 feature flag 控制，可逐步开启 |
| NF-3 | 性能 | 结构化输出延迟 < 5s，状态机转换 < 100ms |
| NF-4 | 可测试性 | 每个新模块必须有独立的单元测试 |

---

## 7. 技术约束

1. **LLM 提供商**：主要使用 DeepSeek API（`deepseek-chat` / `deepseek-v4-flash`）
2. **运行时**：Node.js + TypeScript（Express.js）
3. **数据库**：PostgreSQL（Neon）+ pg ORM
4. **前端**：Next.js 14 + TanStack Query
5. **包管理**：pnpm monorepo

---

## 8. 成功指标

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| LLM 输出解析成功率 | ~80% | >99% |
| 创建流程平均耗时 | 3-5 分钟 | <2 分钟 |
| Agent 类型覆盖 | 5 种 | 无限制（动态注册） |
| 推荐准确率 | 基于频率 | 基于语义（+30% 精度） |
| 流程中断恢复率 | 0% | >95% |

---

*文档结束*
