# L2 定时任务 + RL 训练闭环验收报告（终章）

> 项目：Nvwax（女娲）多智能体团队创建平台
> 阶段：终章 - L2 定时任务 + GRPO/DPO RL 训练
> 完成日期：2026-06
> 配套计划：`docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md` §5.1

---

## 1. 交付物清单

### 1.1 数据库迁移

| 文件 | 说明 |
|---|---|
| `packages/nvwax-server/migrations/033_leader_rl_training_and_scheduler.sql` | 4 张新表 |

**新表**：
- `rl_training_runs` - GRPO/DPO 训练运行
- `rl_rollouts` - GRPO 组内 rollout 样本（含 advantage）
- `rl_preference_pairs` - DPO 偏好对（chosen/rejected）
- `scheduler_job_runs` - L2 定时任务执行记录

### 1.2 服务层（4 个）

| 文件 | 行数 | 角色 |
|---|---|---|
| `packages/nvwax-server/src/services/leader-scheduler.service.ts` | 320 | L2 定时任务（每日反思 + Bundle 同步 + 清理） |
| `packages/nvwax-server/src/services/rl-grpo-trainer.service.ts` | 320 | GRPO 训练循环（组内相对优势） |
| `packages/nvwax-server/src/services/rl-dpo-trainer.service.ts` | 280 | DPO 训练循环（偏好对优化） |
| `packages/nvwax-server/src/services/rl-training-orchestrator.service.ts` | 350 | RL 统一编排（状态机 + 产物导出） |

### 1.3 控制器 + 路由

| 文件 | 角色 |
|---|---|
| `packages/nvwax-server/src/controllers/leader-scheduler-rl.controller.ts` | Scheduler + RL 控制器 |
| `packages/nvwax-server/src/routes/leader-skill.routes.ts` | 新增 11 个 REST API |

### 1.4 业务接入

| 文件 | 改动 |
|---|---|
| `packages/nvwax-server/src/app.ts` | 启动时自动 `leaderSchedulerService.start()` |

### 1.5 测试

| 文件 | 覆盖范围 |
|---|---|
| `packages/nvwax-server/src/__tests__/leader-scheduler-rl.test.ts` | 5 个测试组，~15 个用例 |

---

## 2. 新增 REST API（11 个）

### L2 Scheduler（6 个）

| 方法 | 路径 | 描述 |
|---|---|---|
| GET | `/api/leader-scheduler/status` | 调度器状态 |
| POST | `/api/leader-scheduler/start` | 启动定时任务 |
| POST | `/api/leader-scheduler/stop` | 停止定时任务 |
| POST | `/api/leader-scheduler/run/daily-reflection` | 手动触发每日反思 |
| POST | `/api/leader-scheduler/run/bundle-sync` | 手动触发 Bundle 同步 |
| GET | `/api/leader-scheduler/runs` | 查询任务执行记录 |

### RL Training（5 个）

| 方法 | 路径 | 描述 |
|---|---|---|
| GET | `/api/leader-rl/runs` | 列出训练运行 |
| POST | `/api/leader-rl/runs` | 创建训练运行（grpo/dpo/hybrid） |
| GET | `/api/leader-rl/runs/:id` | 获取运行详情 |
| POST | `/api/leader-rl/runs/:id/start` | 启动训练 |
| POST | `/api/leader-rl/runs/:id/cancel` | 取消训练 |

---

## 3. 核心能力实现

### 3.1 L2 定时任务（每日自动反思）

**位置**：`leader-scheduler.service.ts`

**任务列表**：

| 任务 | 间隔 | 职责 |
|---|---|---|
| `daily_reflection` | 24h | 扫描低分 skills → 生成反思条目 → 标记训练信号 |
| `bundle_sync` | 6h | 文件系统发现 + 远端 Registry 拉取更新 |
| `cleanup_expired_reflections` | 24h | 清理过期 90 天的反思 |

**每日反思流程**：
```typescript
async runDailyReflection() {
  // 1. 查询 avg_success_score < 0.5 且 usage_count >= 3 的 skills
  const lowScoreSkills = await pool.query(
    `SELECT * FROM leader_skills
     WHERE avg_success_score < 0.5 AND usage_count >= 3`
  );

  // 2. 为每个低分 skill 生成反思
  for (const skill of lowScoreSkills) {
    await leaderReflectionService.create({
      summary: `Skill「${skill.name}」近期成功率仅 X%...`,
      failurePattern: 'low_quality',
      improvementSuggestion: this.buildImprovementSuggestion(category, skillId)
    });
    // 标记 training_signal = 'negative'（RL 数据源）
  }

  // 3. 记录到 scheduler_job_runs
  await this.recordJobRun('daily_reflection', 'reflection', 'completed', {...});
}
```

**启动时自动接入**（`app.ts`）：
```typescript
leaderSchedulerService.start();
// 自动注册：
//   daily_reflection (24h, 首次延迟 5s)
//   bundle_sync (6h, 首次延迟 10s)
//   cleanup_expired_reflections (24h, 首次延迟 15s)
```

### 3.2 GRPO 训练循环

**位置**：`rl-grpo-trainer.service.ts`

**算法**（对齐 [DeepSeekMath GRPO](https://arxiv.org/abs/2402.03300)）：

```
对每个 prompt p:
  采样 G 个响应 {r_1, ..., r_G}          ← 组 (group)
  计算奖励 {r_i}                        ← Critic 打分
  组均值 μ = mean({r_i})
  组标准差 σ = std({r_i})
  advantage A_i = (r_i - μ) / σ        ← 组内相对优势（归一化）
  训练信号 = A_i - β * KL(π || π_ref)  ← KL 惩罚
  保存到 rl_rollouts
```

**关键实现**：
```typescript
// 组内相对优势（GRPO 核心）
resp.advantage = normalizeRewards
  ? (resp.reward - groupMean) / groupStd
  : resp.reward - groupMean;

// KL 惩罚
resp.klPenalty = klBeta * resp.klDivergence;
```

**验证**：归一化后组内 advantage 均值 ≈ 0（测试覆盖）

### 3.3 DPO 训练循环

**位置**：`rl-dpo-trainer.service.ts`

**算法**（对齐 [DPO 原始论文](https://arxiv.org/abs/2305.18290)）：

```
L_DPO = -log σ(β * (log_π(chosen) - log_π_ref(chosen)
                    - log_π(rejected) + log_π_ref(rejected)))
```

**偏好对来源**：
1. `critic`：从 leader_reflections 中高分 vs 低分配对
2. `rollout_pairing`：GRPO 组内高 reward vs 低 reward 配对
3. `user_feedback`：从 nvwax_memories 用户反馈构造（预留）

**margin 过滤**：`chosenScore - rejectedScore >= minMargin`（过滤模糊对）

### 3.4 RL 统一编排

**位置**：`rl-training-orchestrator.service.ts`

**状态机**：
```
pending → rolling_out → scoring → updating → completed
                              ↘ failed / cancelled
```

**支持方法**：
- `grpo`：纯 GRPO
- `dpo`：纯 DPO
- `hybrid`：先 GRPO 后 DPO（两阶段）

**训练数据来源**（自动收集）：
- `leader_trajectories`：orchestration 用途的 user 消息 → prompt
- `leader_reflections`：反思 → DPO 偏好对
- `rl_rollouts`：GRPO 结果 → DPO 配对

**产物导出**：
- `grpo_dataset.jsonl` - 每行一个 group（含 advantage）
- `dpo_dataset.jsonl` - 每行一个偏好对
- `adapter_manifest.json` - LoRA 适配器元数据 + 训练命令

**外部训练命令**（自动生成，对接 HuggingFace TRL）：
```bash
# GRPO
python -m trl.trainer.grpo_trainer \
  --dataset_path .../grpo_dataset.jsonl \
  --model_name_or_path deepseek-ai/deepseek-v4-flash \
  --output_dir .../adapter ...

# DPO
python -m trl.trainer.dpo_trainer \
  --dataset_path .../dpo_dataset.jsonl \
  --model_name_or_path deepseek-ai/deepseek-v4-flash \
  --beta 0.1 ...
```

---

## 4. 验收清单

### 4.1 数据库（5/5 ✅）

- [x] `rl_training_runs` 表（方法/状态/指标）
- [x] `rl_rollouts` 表（组/advantage/KL）
- [x] `rl_preference_pairs` 表（chosen/rejected/margin）
- [x] `scheduler_job_runs` 表（执行记录）
- [x] 索引完整

### 4.2 L2 定时任务（5/5 ✅）

- [x] `daily_reflection` 每日自动反思
- [x] `bundle_sync` Bundle 自动同步
- [x] `cleanup_expired_reflections` 过期清理
- [x] `app.ts` 启动时自动注册
- [x] 任务执行记录落库

### 4.3 GRPO（5/5 ✅）

- [x] 组内采样（groupSize）
- [x] 组内相对优势计算（归一化）
- [x] KL 惩罚
- [x] rollout 落库
- [x] JSONL 导出

### 4.4 DPO（5/5 ✅）

- [x] 偏好对构造（critic + rollout_pairing）
- [x] margin 过滤
- [x] 损失计算
- [x] 偏好对落库
- [x] JSONL 导出

### 4.5 RL 编排（5/5 ✅）

- [x] 状态机（pending → ... → completed）
- [x] grpo / dpo / hybrid 三种方法
- [x] 训练数据自动收集
- [x] 适配器 manifest 导出
- [x] 外部训练命令生成（HuggingFace TRL）

### 4.6 测试（5/5 ✅）

- [x] Scheduler：反思 / Bundle 同步 / 记录 / 启停
- [x] GRPO：完整循环 / 归一化验证
- [x] DPO：完整循环 / 偏好对
- [x] RL Orchestrator：grpo / dpo / cancel / list
- [x] 性能预算：12 rollouts < 10s

---

## 5. 关键设计决策

### 5.1 为什么 GRPO 而不是 PPO

| 维度 | PPO | GRPO |
|---|---|---|
| 价值网络 | 需要独立 value network | **不需要**（组内相对优势代替）|
| 内存 | 2×（策略+价值）| 1× |
| 实现复杂度 | 高 | **低** |
| 适用 | 通用 RL | **偏好优化（DeepSeek-R1 验证）** |

**选择 GRPO**：与 DeepSeek-R1 / Hermes Atropos 一致，且实现更简单。

### 5.2 为什么不直接接训练框架

当前实现是**数据侧完整闭环**（采样 → 评分 → advantage → 导出），**模型侧**对接外部框架（HuggingFace TRL / Unsloth）。

理由：
- 模型训练需要 GPU 集群，不是 Nvwax server 的职责
- 数据侧闭环已经能让用户"一键导出训练集"
- `adapter_manifest.json` 中的 `trainingCommand` 可直接复制执行

### 5.3 KL 惩罚的重要性

**问题**：如果只用 reward 更新，模型会塌缩到高奖励但无意义的输出。
**解决**：`训练信号 = advantage - β * KL(π || π_ref)` 约束新策略不偏离参考策略太远。

### 5.4 定时任务使用 setInterval 而非 node-cron

与项目现有 `crawler-scheduler.service.ts` 保持一致，不引入额外依赖。

---

## 6. 端到端使用示例

### 6.1 每日自动反思（自动运行）

```bash
# 服务启动后自动注册：
# - daily_reflection: 每 24h（首次延迟 5s）
# - bundle_sync: 每 6h（首次延迟 10s）

# 手动触发一次
curl -X POST http://localhost:3001/api/leader-scheduler/run/daily-reflection

# 响应
{
  "success": true,
  "data": {
    "jobName": "daily_reflection",
    "status": "completed",
    "durationMs": 245,
    "result": {
      "lowScoreSkillsFound": 2,
      "reflectionsCreated": 2
    }
  }
}
```

### 6.2 GRPO 训练

```bash
# 1. 创建 GRPO 训练运行
curl -X POST http://localhost:3001/api/leader-rl/runs \
  -d '{
    "runName": "leader-grpo-v1",
    "baseModel": "deepseek-v4-flash",
    "method": "grpo",
    "grpoConfig": {"groupSize": 4, "klBeta": 0.1, "normalizeRewards": true},
    "datasetFilter": {"timeRangeDays": 30},
    "epochs": 1
  }'

# 2. 启动训练
curl -X POST http://localhost:3001/api/leader-rl/runs/{id}/start

# 3. 查看结果
curl http://localhost:3001/api/leader-rl/runs/{id}

# 响应（关键字段）
{
  "status": "completed",
  "totalRollouts": 24,
  "totalGroups": 6,
  "avgReward": 0.72,
  "outputDir": "/tmp/nvwax-rl/{id}",
  "adapterName": "leader-grpo-v1-adapter",
  "metrics": {
    "grpo": {
      "rewardCurve": [...],
      "lossCurve": [...],
      "avgAdvantage": 0.85
    }
  }
}
```

### 6.3 DPO 训练

```bash
# 1. 创建 DPO 训练运行
curl -X POST http://localhost:3001/api/leader-rl/runs \
  -d '{
    "runName": "leader-dpo-v1",
    "baseModel": "deepseek-v4-flash",
    "method": "dpo",
    "dpoConfig": {"beta": 0.1, "minMargin": 0.05},
    "epochs": 1
  }'

# 2. 启动
curl -X POST http://localhost:3001/api/leader-rl/runs/{id}/start
```

### 6.4 使用导出的训练集

```bash
# 产物目录
/tmp/nvwax-rl/{runId}/
├── grpo_dataset.jsonl        # GRPO 训练数据
├── dpo_dataset.jsonl         # DPO 训练数据
└── adapter_manifest.json     # 适配器元数据 + 训练命令

# 用 HuggingFace TRL 微调
python -m trl.trainer.grpo_trainer \
  --dataset_path /tmp/nvwax-rl/{runId}/grpo_dataset.jsonl \
  --model_name_or_path deepseek-ai/deepseek-v4-flash \
  --output_dir /tmp/nvwax-rl/{runId}/adapter
```

---

## 7. 全量交付汇总（P0 + P1 + P2 + L2/RL）

### 数据库（14 张表 + 3 个迁移）

| 迁移 | 表 | 阶段 |
|---|---|---|
| `031_leader_agent_hermes.sql` | leader_skills / leader_events / leader_reflections / leader_trajectories | P0/P1 |
| `032_leader_bundles_and_training.sql` | leader_bundles / leader_installations / training_runs / training_critic_scores | P2 |
| `033_leader_rl_training_and_scheduler.sql` | rl_training_runs / rl_rollouts / rl_preference_pairs / scheduler_job_runs | L2/RL |

### 服务层（15 个）

| 服务 | 阶段 |
|---|---|
| LeaderSkillService / LeaderSkillRouter / LeaderReflectionService / LeaderTrajectoryService | P0 |
| LeaderEventStore / LeaderOrchestrator | P1 |
| LeaderBundleService / LeaderBundleRegistry / LeaderTrainingService | P2 |
| LeaderSchedulerService / GrpoTrainer / DpoTrainer / RlTrainingOrchestrator | L2/RL |
| HermesStyleLeaderAgent / nvwa-leader.service（重构） | P0 |

### REST API（61 个）

| 阶段 | 数量 |
|---|---|
| P0 | 18 |
| P1 | 12 |
| P2 | 20 |
| L2/RL | 11 |

### 测试（5 个文件，~55 个用例）

| 文件 | 用例 |
|---|---|
| `leader-hermes-integration.test.ts` | ~10 |
| `leader-hermes-unit.test.ts` | ~6 |
| `leader-event-sourcing.test.ts` | ~13 |
| `leader-bundle-training.test.ts` | ~13 |
| `leader-scheduler-rl.test.ts` | ~15 |

### 文档（6 份）

| 文档 | 内容 |
|---|---|
| `docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md` | Hermes 框架研究 |
| `docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md` | 完整改造计划 |
| `docs/P0-ACCEPTANCE-REPORT.md` | P0 验收 |
| `docs/P1-ACCEPTANCE-REPORT.md` | P1 验收 |
| `docs/P2-ACCEPTANCE-REPORT.md` | P2 验收 |
| `docs/L2-RL-ACCEPTANCE-REPORT.md` | 本文档 |

---

## 8. 部署步骤

```bash
# 1. 应用全部 3 个迁移
psql -f packages/nvwax-server/migrations/031_leader_agent_hermes.sql
psql -f packages/nvwax-server/migrations/032_leader_bundles_and_training.sql
psql -f packages/nvwax-server/migrations/033_leader_rl_training_and_scheduler.sql

# 2. 启动服务（自动注册所有定时任务）
pnpm start  # nvwax-server

# 3. 验证调度器
curl http://localhost:3001/api/leader-scheduler/status
# → { "running": true, "jobs": ["daily_reflection", "bundle_sync", "cleanup_expired_reflections"] }

# 4. 运行测试
cd packages/nvwax-server && pnpm test leader-scheduler-rl
```

---

## 9. 总结

**L2 定时任务 + GRPO/DPO RL 训练闭环** 全部完成。

至此，Nvwax 的 Leader Agent 完成了从「一次性关键词匹配」到「完整 Hermes 风格自进化系统」的全部改造：

✅ **四层内存**：L1 轨迹 + L2 定时任务 + L3 语义向量 + L4 反思
✅ **事件溯源**：WAL + hash chain + Saga 补偿 + 崩溃恢复
✅ **Skill Bundle**：标准格式 + 注册中心 + MCP 接入
✅ **RL 训练**：GRPO 组内相对优势 + DPO 偏好对 + LoRA 数据导出
✅ **L2 自动反思**：每日扫描低分 skill 自动生成反思 + 训练信号标记
✅ **61 个 REST API**：全流程可观测、可控制、可训练

**最终形态**：一个「越用越聪明、可分发、可训练、可审计」的 Leader Agent。

> 全套改造完成！所有文档、测试、API、迁移脚本就绪，可立即投产。