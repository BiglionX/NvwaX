-- Migration: 033_leader_rl_training_and_scheduler
-- Description: GRPO/DPO 完整训练循环 + L2 定时任务记录
-- Date: 2026-06
-- 设计参考：docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §5.1
-- 训练方法参考：NousResearch Hermes Atropos RL（GRPO）+ DPO（Direct Preference Optimization）

-- ============================================================
-- 1. rl_training_runs 表（GRPO/DPO 训练运行）
-- ============================================================

CREATE TABLE IF NOT EXISTS rl_training_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_name VARCHAR(200) NOT NULL,
  base_model VARCHAR(100) NOT NULL,
  
  -- 训练方法
  method VARCHAR(20) NOT NULL DEFAULT 'grpo',         -- grpo / dpo / hybrid
  
  -- 训练配置
  config JSONB NOT NULL DEFAULT '{}',                -- { loraConfig, hyperparameters, ... }
  
  -- 数据统计
  total_rollouts INT NOT NULL DEFAULT 0,             -- 总 rollout 次数
  total_pairs INT NOT NULL DEFAULT 0,                -- DPO: 偏好对数量
  total_groups INT NOT NULL DEFAULT 0,               -- GRPO: 组数量
  total_tokens INT NOT NULL DEFAULT 0,
  avg_reward DECIMAL(5,4),
  
  -- 训练状态
  status VARCHAR(30) NOT NULL DEFAULT 'pending',     -- pending / rolling_out / scoring / updating / completed / failed / cancelled
  progress DECIMAL(3,2) NOT NULL DEFAULT 0,
  current_epoch INT NOT NULL DEFAULT 0,
  total_epochs INT NOT NULL DEFAULT 1,
  
  -- 训练指标
  metrics JSONB DEFAULT '{}',                        -- { loss_curve: [...], reward_curve: [...], kl_curve: [...] }
  
  -- 输出
  output_dir TEXT,                                    -- LoRA 适配器导出目录
  adapter_name VARCHAR(200),                         -- 导出的适配器名
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_rl_runs_status ON rl_training_runs (status);
CREATE INDEX IF NOT EXISTS idx_rl_runs_created ON rl_training_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rl_runs_method ON rl_training_runs (method);

COMMENT ON TABLE rl_training_runs IS 'GRPO/DPO 完整训练运行记录';

-- ============================================================
-- 2. rl_rollouts 表（GRPO：组内 rollout 样本）
-- ============================================================

CREATE TABLE IF NOT EXISTS rl_rollouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES rl_training_runs(id) ON DELETE CASCADE,
  group_id VARCHAR(100) NOT NULL,                    -- 组 ID（同一 prompt 的多个采样）
  epoch INT NOT NULL DEFAULT 0,
  
  -- 样本内容
  prompt TEXT NOT NULL,                              -- 输入 prompt
  response TEXT NOT NULL,                            -- 模型采样输出
  trajectory_id BIGINT,                              -- 关联 leader_trajectories.id（如果有）
  
  -- 奖励
  reward DECIMAL(5,4),                               -- 绝对奖励
  group_rewards JSONB DEFAULT '[]',                  -- 组内所有 reward（用于 GRPO 归一化）
  group_mean DECIMAL(5,4),                           -- 组均值
  group_std DECIMAL(5,4),                            -- 组标准差
  advantage DECIMAL(6,4),                            -- 相对优势 A = (r - mean) / std
  
  -- Critic 详情
  critic_scores JSONB DEFAULT '{}',                  -- { success, quality, coherence, helpfulness }
  
  -- KL 惩罚
  kl_divergence DECIMAL(8,4),                        -- 与参考策略的 KL
  kl_penalty DECIMAL(6,4),                           -- beta * KL
  
  -- 采样元数据
  temperature DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  model VARCHAR(100),
  tokens_used INT DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rl_rollouts_run ON rl_rollouts (run_id, epoch);
CREATE INDEX IF NOT EXISTS idx_rl_rollouts_group ON rl_rollouts (group_id);

COMMENT ON TABLE rl_rollouts IS 'GRPO 组内 rollout 样本，含组内相对优势计算';
COMMENT ON COLUMN rl_rollouts.advantage IS 'GRPO 核心：组内相对优势 A_i = (r_i - group_mean) / group_std';

-- ============================================================
-- 3. rl_preference_pairs 表（DPO：偏好对）
-- ============================================================

CREATE TABLE IF NOT EXISTS rl_preference_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES rl_training_runs(id) ON DELETE CASCADE,
  epoch INT NOT NULL DEFAULT 0,
  
  -- 偏好对
  prompt TEXT NOT NULL,                              -- 输入 prompt
  chosen TEXT NOT NULL,                              -- 被选中的响应（win）
  rejected TEXT NOT NULL,                            -- 被拒绝的响应（lose）
  chosen_score DECIMAL(5,4),                         -- chosen 的分数
  rejected_score DECIMAL(5,4),                       -- rejected 的分数
  margin DECIMAL(5,4),                               -- 分数差（用于加权）
  
  -- 来源
  source VARCHAR(50) DEFAULT 'critic',              -- critic / user_feedback / rollout_pairing
  trajectory_chosen_id BIGINT,
  trajectory_rejected_id BIGINT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rl_pairs_run ON rl_preference_pairs (run_id, epoch);

COMMENT ON TABLE rl_preference_pairs IS 'DPO 偏好对数据（chosen 优于 rejected）';

-- ============================================================
-- 4. scheduler_job_runs 表（定时任务执行记录）
-- ============================================================

CREATE TABLE IF NOT EXISTS scheduler_job_runs (
  id BIGSERIAL PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,                    -- daily_reflection / bundle_sync / rl_training
  job_type VARCHAR(50) NOT NULL,                     -- reflection / bundle_sync / training
  status VARCHAR(20) NOT NULL DEFAULT 'started',     -- started / completed / failed / skipped
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- 执行结果摘要
  result JSONB DEFAULT '{}',                         -- { processed: 10, reflectionsCreated: 3, ... }
  error_message TEXT,
  
  -- 元数据
  trigger VARCHAR(20) NOT NULL DEFAULT 'cron',      -- cron / manual
  duration_ms INT
);

CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_name ON scheduler_job_runs (job_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_status ON scheduler_job_runs (status, started_at DESC);

COMMENT ON TABLE scheduler_job_runs IS 'L2 定时任务执行记录（每日反思 / Bundle 同步 / RL 训练）';

-- ============================================================
-- 5. 验证
-- ============================================================

DO $$
DECLARE
  run_count INT;
  rollout_count INT;
  pair_count INT;
  job_count INT;
BEGIN
  SELECT COUNT(*) INTO run_count FROM rl_training_runs;
  SELECT COUNT(*) INTO rollout_count FROM rl_rollouts;
  SELECT COUNT(*) INTO pair_count FROM rl_preference_pairs;
  SELECT COUNT(*) INTO job_count FROM scheduler_job_runs;
  RAISE NOTICE 'rl_training_runs: % rows', run_count;
  RAISE NOTICE 'rl_rollouts: % rows', rollout_count;
  RAISE NOTICE 'rl_preference_pairs: % rows', pair_count;
  RAISE NOTICE 'scheduler_job_runs: % rows', job_count;
END $$;

SELECT 'Migration 033 completed successfully' AS result;