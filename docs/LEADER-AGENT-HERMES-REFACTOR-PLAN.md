# Leader Agent Hermes 化改造计划

> 项目：Nvwax（女娲）多智能体团队创建平台
> 目标：将 aiteam 创建流程中的"团队 Leader Agent"角色从"一次性 LLM 调用"升级为 Hermes Agent 风格的"自进化单体"
> 范围：P0 + P1 + P2 全套
> 文档定位：实施前的设计审阅稿，所有代码改动待本文档确认后再启动

---

## 0. 执行摘要

### 0.1 改造前后对比

| 维度 | 改造前 | 改造后 |
|---|---|---|
| Leader 匹配 | 关键词 if-else + 3 个硬编码模板（营销/开发/设计） | SKILL.md 语义路由 + pgvector 历史相似团队召回 + LLM 排序 |
| Leader 记忆 | 无（每次对话都是 cold start） | L1 JSONL 轨迹 + L3 pgvector 长期语义记忆 + L4 反思摘要 |
| 编排失败处理 | 直接抛错 | 事件溯源 + Saga 逆序补偿 + WAL 崩溃恢复 |
| 学习闭环 | 无 | 反思条目注入 leader system prompt，二次失败自动规避 |
| Skill 体系 | leader 是数据字段，不是可复用能力 | `leader-skills/SKILL.md` 标准化，可分发、可被外部 Agent 复用 |
| 团队配置生成 | `nvwa-leader.service.ts` 一次性 LLM | `LeaderAgent.orchestrate()` 检索-生成-反思三段式 |
| 状态可观测性 | 控制台日志 | 完整事件流（PostgreSQL `leader_events` 表）+ 可重放 |

### 0.2 阶段路线图

```
P0 (第 1-2 周) ─→ P1 (第 3-5 周) ─→ P2 (第 6-8 周)
   │                  │                  │
   ├─ SKILL.md        ├─ Saga 事件溯源   ├─ Skill Bundle 分发
   ├─ L1 JSONL        ├─ WAL            ├─ Atropos 风格训练
   ├─ L4 反思注入      └─ L3 pgvector    └─ Hermes 生态互通
   └─ 路由触发器
```

---

## 1. 现状盘点与差距分析

### 1.1 现有"团队 Leader Agent 自动匹配"涉及的文件

| 文件 | 行数 | 角色 | 主要短板 |
|---|---|---|---|
| `packages/skillhub-workflow/src/agents/leader-agent.js` | 389 | LangChain.js 版 Leader | 无记忆、无反思、模板硬编码 |
| `packages/skillhub-server/src/services/nvwa-leader.service.ts` | 558 | 需求→团队配置 | 关键词 if-else 推断 |
| `packages/nvwax-server/src/services/ceo-agent-generator.service.ts` | 275 | CEO 模板管理 | 数据库模板无版本、无反思 |
| `packages/nvwax-server/src/services/nvwax-agent.service.ts` | 1051 | NvwaX 需求分析 | 调用链路过长，无状态机 |
| `packages/nvwax-server/src/services/aiteam-creation.service.ts` | 432 | 会话状态机 | 7 步固定流程，无事件溯源 |
| `packages/nvwax-server/src/controllers/aiteam-creation.controller.ts` | 1237 | HTTP 控制器 | 业务逻辑臃肿 |

### 1.2 关键代码片段（现状）

**`leader-agent.js` 第 34-48 行（核心匹配逻辑）**：
```javascript
async selectOrCreateTeamSkill(requirement) {
  const matchedSkill = await this.matchTeamSkill(requirement);  // LLM 选数字
  if (matchedSkill) return matchedSkill;
  return await this.createDynamicTeam(requirement);            // LLM 编 JSON
}
```
问题：① 模板硬编码在 `loadTeamSkills()`；② LLM 只回数字；③ 失败直接抛错无补偿。

**`nvwa-leader.service.ts` 第 420-441 行（关键词匹配）**：
```typescript
private inferCompanyType(nvwaData: any): string {
  if (desc.includes('营销') || desc.includes('marketing')) return 'marketing';
  if (desc.includes('设计') || desc.includes('design')) return 'design';
  return 'development';
}
```
问题：① 简单字符串包含；② 4 种类型无法覆盖；③ 不能复用历史成功的 leader 配置。

**`aiteam-creation.controller.ts` 第 1029-1045 行（事务处理）**：
```typescript
await pool.query(`UPDATE aiteam_creation_sessions SET ...`);  // 单条 UPDATE
```
问题：① 多步骤无事务包装；② 失败不留轨迹；③ 不可回放。

### 1.3 与 Hermes Agent 的具体差距

| Hermes 特性 | 当前 Nvwax | 缺失程度 |
|---|---|---|
| L1 JSONL 轨迹 | 无 | 🔴 严重 |
| L2 定时任务 | 无 | 🟡 中等 |
| L3 矢量索引 | 无 | 🔴 严重 |
| L4 反思注入 | 无 | 🔴 严重 |
| WAL 模式 | 无 | 🟡 中等 |
| 事件溯源 | 无 | 🔴 严重 |
| Saga 补偿 | 无 | 🔴 严重 |
| Skill 系统 | 弱（数据字段） | 🔴 严重 |
| Skill Bundle | 无 | 🟡 中等 |
| Atropos RL | 无 | 🟢 可选 |
| Coordinator-Worker | 有（弱） | 🟡 中等 |
| Gateway | 有（HTTP only） | 🟢 良好 |

---

## 2. 目标架构：Hermes 化的 Leader Agent

### 2.1 核心设计哲学

> **"运行时 = 学习态"**：Leader Agent 的每一次决策都是事件、每一条反思都会在下次被召回、每一次失败都会被 Saga 补偿。

### 2.2 新增数据模型

#### 2.2.1 `leader_skills` 表（Hermes SKILL.md 持久化）

```sql
CREATE TABLE leader_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id VARCHAR(100) UNIQUE NOT NULL,        -- e.g. "marketing-director-v1"
  name VARCHAR(200) NOT NULL,                    -- e.g. "营销总监"
  category VARCHAR(50) NOT NULL,                 -- e.g. "marketing"
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  
  -- SKILL.md 元数据（对齐 Hermes 规范）
  triggers JSONB NOT NULL,                       -- ["营销","marketing","推广","广告"]
  triggers_embedding VECTOR(1024),               -- pgvector，用于语义路由
  tools_required JSONB NOT NULL,                 -- ["data-analysis","copywriting"]
  risk_level VARCHAR(10) NOT NULL DEFAULT 'low',-- low / medium / high
  
  -- 完整配置
  responsibilities JSONB NOT NULL,               -- ["需求分析","策略制定","质量把控"]
  system_prompt TEXT NOT NULL,                   -- 完整 system prompt
  management_style VARCHAR(100),                 -- "数据驱动型"
  decision_rules JSONB,                          -- ["以 ROI 为先", ...]
  default_skills JSONB,                          -- [skill_xxx, skill_yyy]
  
  -- 元数据
  bundle VARCHAR(100),                           -- "marketing-bundle"
  is_active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,                     -- 使用频次（用于排序）
  success_count INT DEFAULT 0,                   -- 成功数（用于排序）
  failure_count INT DEFAULT 0,                   -- 失败数
  
  -- 审计
  author_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  superseded_by UUID                             -- 版本链
);
CREATE INDEX idx_leader_skills_triggers ON leader_skills USING GIN (triggers);
CREATE INDEX idx_leader_skills_embedding ON leader_skills USING ivfflat (triggers_embedding vector_cosine_ops);
```

#### 2.2.2 `leader_events` 表（事件溯源 + WAL）

```sql
CREATE TABLE leader_events (
  seq BIGSERIAL PRIMARY KEY,                     -- 全局递增序号（用于重放）
  event_id UUID NOT NULL DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,                      -- aiteam_creation_session.id
  user_id UUID,
  
  -- 事件溯源
  event_type VARCHAR(50) NOT NULL,               -- skill.router / skill.matched / skill.activated
                                                   -- trajectory.appended / reflection.created
                                                   -- orchestration.start / worker.dispatch
                                                   -- worker.succeeded / worker.failed
                                                   -- saga.compensate
  parent_event_id UUID,                          -- 因果链
  causation_id UUID,                             -- 触发本次事件的上游事件
  
  -- 事件载荷
  payload JSONB NOT NULL,                        -- 事件详细内容
  metadata JSONB,                                -- 协议、时间戳、Token 消耗等
  
  -- Saga 补偿
  compensation_action JSONB,                     -- 失败时的补偿步骤
  compensation_status VARCHAR(20),                -- pending / running / succeeded / failed
  
  -- WAL 一致性
  hash_chain VARCHAR(64),                        -- 与上一事件的 hash 链接
  wal_position BIGINT,                           -- WAL 文件位置
  
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ                          -- 实际生效时间
);
CREATE INDEX idx_leader_events_session ON leader_events (session_id, seq);
CREATE INDEX idx_leader_events_type ON leader_events (event_type, occurred_at);
CREATE INDEX idx_leader_events_unapplied ON leader_events (occurred_at) WHERE applied_at IS NULL;
```

#### 2.2.3 `leader_reflections` 表（L4 反思记忆）

```sql
CREATE TABLE leader_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  leader_skill_id UUID,                          -- 是哪个 leader 触发的反思
  requirement_embedding VECTOR(1024),            -- 用于下次相似需求召回
  
  -- 反思内容
  summary TEXT NOT NULL,                         -- 反思摘要（注入 prompt 用）
  failure_pattern VARCHAR(200),                  -- 失败模式：timeout / skill_missing / conflict
  improvement_suggestion TEXT,                   -- 改进建议
  
  -- 评分
  success_score DECIMAL(3,2) NOT NULL,           -- 0.00 ~ 1.00
  impact_score DECIMAL(3,2) DEFAULT 0.5,         -- 影响权重
  
  -- 应用统计
  injected_count INT DEFAULT 0,                  -- 已被注入到多少次 prompt
  resolved_count INT DEFAULT 0,                  -- 解决了多少次同类问题
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ                         -- 反思可有过期时间
);
CREATE INDEX idx_leader_reflections_embedding ON leader_reflections USING ivfflat (requirement_embedding vector_cosine_ops);
CREATE INDEX idx_leader_reflections_session ON leader_reflections (session_id);
```

#### 2.2.4 `leader_trajectories` 表（L1 轨迹原始日志）

```sql
CREATE TABLE leader_trajectories (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  event_id UUID,                                 -- 关联到 leader_events
  
  -- 原始对话（JSONL 风格）
  role VARCHAR(20) NOT NULL,                     -- system / user / assistant / tool
  content TEXT NOT NULL,
  tool_call JSONB,                               -- 工具调用
  tool_result JSONB,                             -- 工具结果
  
  -- 元数据
  tokens_used INT,
  model VARCHAR(50),
  latency_ms INT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_leader_trajectories_session ON leader_trajectories (session_id, id);
```

### 2.3 改造后的 Leader Agent 核心循环

参考 Hermes 的"核心循环 < 10 行"哲学，新版 `LeaderAgent.orchestrate()` 长这样：

```javascript
// packages/skillhub-workflow/src/agents/leader-agent.js （改造后）
class HermesStyleLeaderAgent {
  async orchestrate(requirement, sessionId, userId) {
    // 1. 感知：从 L3 召回相似 leader skill + 历史反思
    const [candidates, reflections] = await Promise.all([
      this.skillRouter.search(requirement, top_k=5),
      this.reflectionStore.recall(requirement, top_k=5)
    ]);

    // 2. 推理：注入反思到 system prompt，让 LLM 排序
    const systemPrompt = this.buildPrompt({candidates, reflections});
    const decision = await this.llm.rank(requirement, candidates, systemPrompt);

    // 3. 执行：选定 leader skill 并编排团队（事件溯源）
    return await this.eventSourcing.runInTransaction(async (tx) => {
      await tx.appendEvent('orchestration.start', {decision});
      const result = await this.executeWorkflow(decision, tx);
      await tx.appendEvent('orchestration.success', {result});
      return result;
    });
  }
}
```

### 2.4 改造后的 aiteam 创建流程

```
用户描述需求
  ↓
NvwaX Agent 分析（已有）
  ↓
nvwax-agent.service.ts → 设计团队角色（已有）
  ↓
【新增】LeaderSkillRouter.route(roles, requirements)
  ├─ L3 检索：pgvector 召回 top-5 候选 leader
  ├─ LLM 排序：注入 L4 反思，让 LLM 选最佳
  └─ 输出：selectedLeaderSkillId
  ↓
【新增】LeaderAgent.activate(leaderSkill, teamContext)
  ├─ 从 leader_skills 读 system_prompt
  ├─ 注入 L4 反思经验
  └─ 生成 leaderConfig（落库）
  ↓
【保留】Agent 匹配 + Skill 匹配
  ↓
【新增】Saga 编排：执行团队任务
  ├─ 每个 worker 都是事件，落 leader_events
  ├─ 失败触发 saga.compensate 逆序补偿
  └─ 完成后触发 L4 反思
  ↓
【保留】保存到 team_skills 表
  ↓
【新增】L4 反思写入 leader_reflections
```

### 2.5 新增文件清单

```
packages/nvwax-server/
├── src/
│   ├── services/
│   │   ├── leader-skill.service.ts          # [NEW] Skill CRUD + 路由
│   │   ├── leader-router.service.ts         # [NEW] SKILL.md 路由 + pgvector
│   │   ├── leader-orchestrator.service.ts   # [NEW] 事件溯源 + Saga
│   │   ├── leader-trajectory.service.ts     # [NEW] L1 JSONL 轨迹
│   │   ├── leader-reflection.service.ts     # [NEW] L4 反思记忆
│   │   └── leader-event-store.service.ts    # [NEW] 事件总线 + WAL
│   ├── controllers/
│   │   └── leader-skill.controller.ts       # [NEW] /api/leader-skills REST API
│   └── routes/
│       └── leader-skill.routes.ts           # [NEW]

packages/skillhub-workflow/
├── src/
│   ├── agents/
│   │   └── hermes-leader-agent.js           # [NEW] 新的 Hermes 化 Leader
│   └── skills/
│       └── leader-skills/                   # [NEW] SKILL.md 模板目录
│           ├── marketing-director/SKILL.md
│           ├── tech-lead/SKILL.md
│           ├── creative-director/SKILL.md
│           ├── customer-service-lead/SKILL.md
│           ├── data-analysis-lead/SKILL.md
│           └── project-manager/SKILL.md

packages/nvwax-server/migrations/
└── 2025XX_leader_agent_hermes.sql           # [NEW] 数据表迁移

docs/
├── HERMES-AGENT-ARCHITECTURE-RESEARCH.md     # [DONE] 已完成
└── LEADER-AGENT-HERMES-REFACTOR-PLAN.md     # [DONE] 本文档
```

### 2.6 改造后的文件改动清单

| 文件 | 改动类型 | 改动量估算 |
|---|---|---|
| `packages/skillhub-workflow/src/agents/leader-agent.js` | 重构 | 389 → ~250 行（核心循环收敛） |
| `packages/nvwax-server/src/services/nvwa-leader.service.ts` | 重构 | 558 → ~300 行（拆分职责） |
| `packages/nvwax-server/src/services/ceo-agent-generator.service.ts` | 改造为 LeaderSkill 适配层 | 275 → ~200 行 |
| `packages/nvwax-server/src/services/nvwax-agent.service.ts` | 接入新路由 | +80 行（接入 LeaderSkillRouter） |
| `packages/nvwax-server/src/services/aiteam-creation.service.ts` | 接入事件溯源 | 432 → ~450 行 |
| `packages/nvwax-server/src/controllers/aiteam-creation.controller.ts` | 调用新 service | -100 / +50 行 |

---

## 3. P0：核心改造（第 1-2 周）

### 3.1 任务分解

| # | 任务 | 文件 | 工作量 | 验收标准 |
|---|---|---|---|---|
| P0-1 | 写 SQL 迁移：`leader_skills` / `leader_events` / `leader_reflections` / `leader_trajectories` | `migrations/2025XX_leader_agent_hermes.sql` | 1d | `psql` 应用无报错 |
| P0-2 | 迁移现有 `ceo_templates` 数据到 `leader_skills`（含 triggers 关键词填充） | 一次性脚本 | 0.5d | 老模板全部导入且 triggers_embedding 生成 |
| P0-3 | 创建 6 个 SKILL.md 模板（marketing/tech/creative/cs/data/pm） | `packages/skillhub-workflow/src/skills/leader-skills/**` | 1d | 6 个文件齐全 |
| P0-4 | 实现 `LeaderSkillService`（CRUD + 列表 + 详情） | `leader-skill.service.ts` | 1.5d | 单元测试覆盖 |
| P0-5 | 实现 `LeaderSkillRouter`（triggers 关键词 + pgvector 语义路由 + LLM 排序） | `leader-router.service.ts` | 2d | E2E：输入需求，输出 top-5 候选 |
| P0-6 | 实现 `LeaderTrajectoryService`（L1 JSONL 写入） | `leader-trajectory.service.ts` | 0.5d | 每个 turn 落库 |
| P0-7 | 实现 `LeaderReflectionService`（L4 反思 CRUD + 召回） | `leader-reflection.service.ts` | 1d | 注入到 leader system prompt 验证有效 |
| P0-8 | 重构 `leader-agent.js` 为 `HermesStyleLeaderAgent.orchestrate()` | `packages/skillhub-workflow/src/agents/leader-agent.js` | 2d | 老 API 兼容，新 API 可用 |
| P0-9 | 在 `nvwa-leader.service.ts` 中接入新路由 | `nvwa-leader.service.ts` | 1d | aiteam 创建自动调用新流程 |
| P0-10 | 编写 P0 集成测试 | `tests/integration/leader-hermes.test.ts` | 1d | 端到端跑通 |

### 3.2 P0 关键代码示例

#### P0-3：SKILL.md 模板示例（`marketing-director/SKILL.md`）

```markdown
---
skill_id: marketing-director-v1
name: 营销总监
category: marketing
version: 1.0.0
triggers:
  - "营销"
  - "marketing"
  - "推广"
  - "广告"
  - "品牌"
  - "内容创作"
  - "增长"
tools_required:
  - data-analysis
  - copywriting
  - visual-design
risk_level: low
bundle: marketing-bundle
---

# 营销总监 Leader Skill

你是营销团队的领导者，负责协调数据分析师、文案专员、设计专员完成营销目标。

## 核心职责
1. 需求分析与目标设定
2. 营销策略制定
3. 团队分工与进度管理
4. 质量审核与最终决策

## 决策原则
- 数据驱动决策，所有方案必须有数据支撑
- ROI 优先，拒绝拍脑袋
- 跨部门冲突以品牌一致性为准

## 协作流程
1. 接收需求 → 拆解为子任务
2. 派发数据分析师 → 收集洞察
3. 派发文案专员 → 创作文案
4. 派发设计专员 → 制作素材
5. 最终审核 → 整合输出

## 反思经验（自动注入）
> 系统会在你的 prompt 中追加"近期反思经验"，请遵守。
```

#### P0-5：`LeaderSkillRouter.route()` 核心逻辑

```typescript
// packages/nvwax-server/src/services/leader-router.service.ts
export class LeaderSkillRouter {
  async route(requirement: string, topK: number = 5): Promise<LeaderSkillMatch[]> {
    // 1. 关键词召回（triggers 数组命中）
    const keywordMatches = await this.keywordMatch(requirement);
    
    // 2. 语义召回（pgvector 余弦相似度）
    const embedding = await this.embedder.embed(requirement);
    const semanticMatches = await this.pool.query(`
      SELECT id, skill_id, name, category, triggers,
             1 - (triggers_embedding <=> $1) AS similarity
      FROM leader_skills
      WHERE is_active = true
      ORDER BY triggers_embedding <=> $1
      LIMIT $2
    `, [embedding, topK]);
    
    // 3. 合并去重
    const candidates = this.mergeCandidates(keywordMatches, semanticMatches.rows);
    
    // 4. LLM 二次排序（注入 L4 反思）
    const reflections = await this.reflectionStore.recall(requirement, 5);
    const ranked = await this.llmRank(requirement, candidates, reflections);
    
    return ranked;
  }
}
```

#### P0-7：反思注入到 system prompt

```typescript
// packages/nvwax-server/src/services/leader-reflection.service.ts
export class LeaderReflectionService {
  buildReflectionPrompt(reflections: LeaderReflection[]): string {
    if (reflections.length === 0) return '';
    
    const reflectionBlock = reflections.map((r, i) => 
      `${i + 1}. [${r.failure_pattern || '经验'}] ${r.summary}` +
      (r.improvement_suggestion ? `\n   建议：${r.improvement_suggestion}` : '')
    ).join('\n');
    
    return `
## 历史反思经验（请务必遵守）
${reflectionBlock}
`;
  }
}
```

---

## 4. P1：事件溯源 + Saga + L3 长期记忆（第 3-5 周）

### 4.1 任务分解

| # | 任务 | 文件 | 工作量 | 验收标准 |
|---|---|---|---|---|
| P1-1 | 实现 `LeaderEventStore`（WAL + 追加写 + hash chain） | `leader-event-store.service.ts` | 2d | 崩溃后能从 seq 重放 |
| P1-2 | 实现 `LeaderOrchestrator`（Coordinator-Worker + Saga 补偿） | `leader-orchestrator.service.ts` | 3d | 失败 worker 自动补偿 |
| P1-3 | 实现 `SettlementSaga`（逆序调用 worker.compensate()） | `leader-orchestrator.service.ts` 内 | 1d | 补偿日志可追溯 |
| P1-4 | 接入 `pgvector` 扩展（生成 embedding + HNSW 索引） | DB 迁移 | 1d | 现有 leader_skills.triggers_embedding 填充 |
| P1-5 | 实现 L3 长期记忆召回（基于 requirement embedding） | `leader-reflection.service.ts` | 1d | top-5 召回准确 |
| P1-6 | 改造 `aiteam-creation.service.ts`：用事件溯源替换固定 7 步 | 改造文件 | 2d | 状态可重放 |
| P1-7 | P1 集成测试 + 崩溃恢复测试 | `tests/integration/leader-saga.test.ts` | 1d | kill -9 后可恢复 |

### 4.2 关键技术点

#### 4.2.1 Saga 补偿

```typescript
// leader-orchestrator.service.ts
class LeaderOrchestrator {
  async executeWorkflow(plan: WorkflowPlan, sessionId: string) {
    const completedWorkers: WorkerHandle[] = [];
    
    try {
      // 正向派发
      for (const step of plan.steps) {
        const worker = await this.dispatchWorker(step, sessionId);
        const result = await worker.execute();
        completedWorkers.push({...worker, result});
        await this.eventStore.append('worker.succeeded', {step, result});
      }
      return {success: true, artifacts: completedWorkers.map(w => w.result)};
    } catch (error) {
      // 逆序补偿
      await this.eventStore.append('saga.compensate.start', {error});
      
      for (let i = completedWorkers.length - 1; i >= 0; i--) {
        const worker = completedWorkers[i];
        try {
          await worker.compensate();
          await this.eventStore.append('worker.compensated', {workerId: worker.id});
        } catch (compError) {
          await this.eventStore.append('compensation.failed', {workerId: worker.id, error: compError});
          // 补偿失败：升级到人工 / 写反思
        }
      }
      
      // 触发 L4 反思
      await this.reflectionService.createReflection({
        sessionId,
        failurePattern: this.classifyError(error),
        summary: this.summarizeFailure(plan, error)
      });
      
      throw error;
    }
  }
}
```

#### 4.2.2 WAL + hash chain

```typescript
// leader-event-store.service.ts
async append(eventType: string, payload: any, metadata?: any): Promise<LeaderEvent> {
  return await this.pool.transaction(async (tx) => {
    // 1. 计算 hash chain
    const prevEvent = await tx.query(
      'SELECT hash_chain FROM leader_events ORDER BY seq DESC LIMIT 1'
    );
    const prevHash = prevEvent.rows[0]?.hash_chain || 'genesis';
    const hashChain = sha256(prevHash + JSON.stringify({eventType, payload}));
    
    // 2. 写 WAL
    const result = await tx.query(`
      INSERT INTO leader_events (event_type, payload, metadata, hash_chain, session_id, ...)
      VALUES ($1, $2, $3, $4, $5, ...) RETURNING *
    `, [eventType, payload, metadata, hashChain, sessionId]);
    
    // 3. 异步推送给订阅者
    this.notify(result.rows[0]);
    
    return result.rows[0];
  });
}
```

---

## 5. P2：Skill Bundle + Atropos 风格训练（第 6-8 周）

### 5.1 任务分解

| # | 任务 | 文件 | 工作量 | 验收标准 |
|---|---|---|---|---|
| P2-1 | 把 leader skills 打包为 Skill Bundle（npm/OCI 兼容） | `bundles/marketing-bundle/` | 1w | 可独立分发 |
| P2-2 | 实现 Skill Bundle Registry（远端拉取 + 缓存） | `skill-bundle-registry.service.ts` | 0.5w | 支持从 GitHub/HuggingFace 拉取 |
| P2-3 | 暴露 Leader Skill 为 MCP Server（stdin/stdout JSON-RPC） | `mcp/leader-skill-mcp.ts` | 0.5w | 外部 Claude/Cursor 可调用 |
| P2-4 | 接入 Hermes 兼容的 Skill 路由（多 bundle 联邦） | 路由层 | 0.5w | 跨 bundle 召回 |
| P2-5 | Atropos 风格训练：收集轨迹 → Critic 评分 → LoRA 微调 DeepSeek | `training/atropos/` | 2w | success_score 提升 |
| P2-6 | P2 端到端测试 + 性能基准 | `tests/e2e/` | 0.5w | 团队配置生成成功率 ≥ 85% |

### 5.2 Skill Bundle 结构

```
bundles/marketing-bundle/
├── bundle.json                          # Bundle 元数据
├── README.md
├── skills/
│   ├── marketing-director/SKILL.md
│   ├── content-strategist/SKILL.md
│   └── growth-analyst/SKILL.md
├── tools/
│   └── data-analysis.js                 # 自定义 tool
└── tests/
    └── bundle.test.json
```

#### `bundle.json`

```json
{
  "name": "marketing-bundle",
  "version": "1.0.0",
  "format": "hermes-skill-bundle/v1",
  "description": "营销团队 Leader Skill Bundle",
  "skills": ["marketing-director", "content-strategist", "growth-analyst"],
  "tools": ["data-analysis"],
  "dependencies": {
    "leader-agent": ">=2.0.0"
  },
  "author": "nvwax-team",
  "license": "MIT"
}
```

---

## 6. API 设计与向后兼容

### 6.1 新增 REST API

| 方法 | 路径 | 描述 |
|---|---|---|
| GET | `/api/leader-skills` | 列出所有可用 leader skill |
| GET | `/api/leader-skills/:skillId` | 获取详情（含 system prompt） |
| POST | `/api/leader-skills` | 创建新 skill（管理员） |
| PUT | `/api/leader-skills/:skillId` | 更新 skill（管理员） |
| POST | `/api/leader-skills/:skillId/activate` | 手动激活某个 leader |
| GET | `/api/leader-events?sessionId=xxx` | 查询事件流（用于前端可视化） |
| GET | `/api/leader-events/:seq` | 获取单个事件 |
| POST | `/api/leader-events/:seq/replay` | 重放事件（管理员/调试） |
| GET | `/api/leader-reflections` | 查询反思列表 |
| POST | `/api/leader-reflections/:id/apply` | 标记反思被采纳 |

### 6.2 向后兼容

- 旧 API `/api/aiteam-creation/sessions/:id/*` 全部保留
- 旧 `LeaderAgent` 类的方法签名保留（标记 `@deprecated`）
- 新 `HermesStyleLeaderAgent` 是默认实现
- 数据库迁移可回滚（详细见 §9）

---

## 7. 测试策略

### 7.1 单元测试（每服务都需覆盖）

```typescript
// leader-router.service.test.ts
describe('LeaderSkillRouter', () => {
  it('路由 "我想做小红书营销" 应返回 marketing-director', async () => {
    const matches = await router.route('我想做小红书营销');
    expect(matches[0].category).toBe('marketing');
  });
  
  it('关键词召回和语义召回结果合并去重', async () => {
    // ...
  });
  
  it('反思注入到 LLM prompt 后能改变排序', async () => {
    // ...
  });
});
```

### 7.2 集成测试

```typescript
// leader-hermes.e2e.test.ts
describe('Leader Agent Hermes 化端到端', () => {
  it('创建 aiteam → 自动匹配 leader → 编排团队 → 反思闭环', async () => {
    // 1. POST /api/aiteam-creation/sessions
    // 2. 发送需求描述
    // 3. 验证 leader_skills.usage_count 增加
    // 4. 验证 leader_events 有完整轨迹
    // 5. 验证 leader_reflections 有新条目
  });
});
```

### 7.3 崩溃恢复测试

```typescript
// leader-wal.test.ts
describe('WAL 崩溃恢复', () => {
  it('杀掉服务进程后能从未应用事件恢复', async () => {
    // 1. 启动 leader
    // 2. 派发 worker
    // 3. 在 WAL 写入前 kill -9
    // 4. 重启服务
    // 5. 验证事件流完整
  });
});
```

### 7.4 性能基准

| 指标 | 当前 | 目标 |
|---|---|---|
| aiteam 创建成功率 | 未知（需统计基线） | ≥ 85% |
| Leader 路由延迟 | < 500ms | < 800ms（含 LLM 排序） |
| 反思召回延迟 | N/A | < 200ms |
| 事件写入 TPS | N/A | ≥ 100/s |
| 崩溃恢复时间 | N/A | < 30s |

---

## 8. 风险评估与缓解

| 风险 | 等级 | 缓解措施 |
|---|---|---|
| 数据迁移失败 | 🔴 高 | 迁移脚本幂等 + 干跑模式 + 备份 |
| pgvector 性能不达标 | 🟡 中 | 起步用 384 维（小模型），按需升级 1024 维 |
| L4 反思注入导致 prompt 膨胀 | 🟡 中 | top-5 限制 + 摘要压缩 + 过期清理 |
| Saga 补偿失败 | 🟡 中 | 补偿失败升级到人工，写反思不再补偿 |
| LLM 排序耗时 | 🟡 中 | 缓存 + 异步排序 + 兜底关键词匹配 |
| 现有 aiteam 创建流程中断 | 🔴 高 | 双写 + 灰度切换 + feature flag |
| Atropos 训练引入复杂度 | 🟢 低 | P2 范围，可推迟 |

---

## 9. 回滚方案

### 9.1 数据库回滚

```sql
-- 回滚迁移（保留数据 30 天后删除）
BEGIN;
DROP TABLE IF EXISTS leader_reflections CASCADE;
DROP TABLE IF EXISTS leader_trajectories CASCADE;
DROP TABLE IF EXISTS leader_events CASCADE;
DROP TABLE IF EXISTS leader_skills CASCADE;
COMMIT;
```

### 9.2 代码回滚

- 所有新文件以 `leader-*.ts` / `hermes-*.js` 命名，与旧文件无重名
- 通过环境变量 `LEADER_AGENT_MODE=legacy|hermes` 切换
- 旧 `leader-agent.js` 保留为 `legacy-leader-agent.js`，可一键恢复

### 9.3 灰度策略

```
Phase 1 (P0 完成):  internal users only (10% traffic)
Phase 2 (1 周后):    beta users (30% traffic)
Phase 3 (2 周后):    all users (100% traffic)
                     但保留 feature flag: ?leader_hermes=false 可回退
```

---

## 10. 验收清单（Definition of Done）

### P0 验收
- [ ] 4 张新表创建成功，老数据迁移完成
- [ ] 6 个 SKILL.md 模板可被路由召回
- [ ] 新 `HermesStyleLeaderAgent.orchestrate()` 端到端跑通
- [ ] 老 API 行为不变（向后兼容测试通过）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 集成测试 5/5 通过

### P1 验收
- [ ] Saga 补偿在测试中触发并成功
- [ ] WAL 崩溃恢复测试通过
- [ ] pgvector 索引生效（召回延迟 < 200ms）
- [ ] L1/L3/L4 协作闭环跑通（轨迹→反思→召回→注入）

### P2 验收
- [ ] 至少 1 个 Skill Bundle 可分发
- [ ] MCP Server 暴露成功，外部 Client 可调用
- [ ] Atropos 训练闭环产出 1 个 LoRA 适配器
- [ ] 团队配置生成成功率 ≥ 85%（统计基线对比）

---

## 11. 时间线

```
Week 1-2  (P0)
├─ Day 1-2   数据迁移
├─ Day 3-4   SKILL.md 模板 + LeaderSkillService
├─ Day 5-7   LeaderSkillRouter + LLM 排序
├─ Day 8-10  L1/L4 + 重构 leader-agent.js

Week 3-5  (P1)
├─ Week 3   LeaderEventStore + WAL
├─ Week 4   LeaderOrchestrator + Saga
├─ Week 5   集成测试 + 崩溃恢复测试

Week 6-8  (P2)
├─ Week 6-7 Skill Bundle + MCP Server
└─ Week 8   Atropos 训练（PoC）+ 全链路验收
```

---

## 12. 待用户确认事项

在动代码之前，请用户决策：

1. ✅ **范围**：P0+P1+P2 全套（已确认）
2. ✅ **匹配策略**：SKILL.md 风格 Skill 系统路由（已确认）
3. ✅ **向量库**：pgvector（已确认）
4. ✅ **节奏**：先出计划文档再开工（已确认）
5. ❓ **里程碑节点**：是否需要每周 review？
6. ❓ **数据库迁移时机**：是否可以接受 5 分钟停机？还是必须在线迁移？
7. ❓ **新 API 是否对外开放**：还是仅内部使用？
8. ❓ **Atropos 训练是否真做**：还是 P2 阶段先用 LoRA 模拟，最后阶段再决定？

---

> 文档版本：v1.0
> 撰写日期：2026-06
> 配套研究文档：`docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md`
> 等待用户审阅与确认后启动编码