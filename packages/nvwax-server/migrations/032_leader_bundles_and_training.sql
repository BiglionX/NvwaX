-- Migration: 032_leader_bundles_and_training
-- Description: Skill Bundle 注册中心 + Atropos 风格训练闭环
-- Date: 2026-06
-- 设计参考：docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §5

-- ============================================================
-- 1. leader_bundles 表（Bundle 注册中心）
-- ============================================================

CREATE TABLE IF NOT EXISTS leader_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,                -- bundle 名（如 marketing-bundle）
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  format VARCHAR(50) NOT NULL DEFAULT 'hermes-skill-bundle/v1',
  description TEXT,

  -- 包含的 skills（软关联，Skill 实际在 leader_skills 表）
  skills JSONB NOT NULL DEFAULT '[]',               -- ["marketing-director-v1", ...]

  -- 元数据
  author VARCHAR(200),
  license VARCHAR(50),
  homepage TEXT,
  icon VARCHAR(20),
  tags JSONB DEFAULT '[]',

  -- 依赖
  dependencies JSONB DEFAULT '{}',
  peer_dependencies JSONB DEFAULT '{}',
  engines JSONB DEFAULT '{}',

  -- 文档
  readme TEXT,
  changelog TEXT,

  -- 分发信息
  source VARCHAR(50) NOT NULL DEFAULT 'local',       -- local / remote / marketplace
  source_url TEXT,
  checksum VARCHAR(200),
  size_bytes INT,

  -- 统计
  install_count INT NOT NULL DEFAULT 0,
  download_count INT NOT NULL DEFAULT 0,

  is_active BOOLEAN NOT NULL DEFAULT true,
  is_official BOOLEAN NOT NULL DEFAULT false,        -- 官方 vs 社区贡献

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leader_bundles_name ON leader_bundles (name);
CREATE INDEX IF NOT EXISTS idx_leader_bundles_active ON leader_bundles (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_leader_bundles_tags ON leader_bundles USING GIN (tags);

COMMENT ON TABLE leader_bundles IS 'Leader Skill Bundle 注册中心（Hvgemes Skill Bundle 规范的数据库表示）';
COMMENT ON COLUMN leader_bundles.format IS 'Bundle 格式版本，固定为 hermes-skill-bundle/v1';
COMMENT ON COLUMN leader_bundles.source IS '来源：local（内置）/ remote（远端拉取）/ marketplace（社区）';

-- ============================================================
-- 2. leader_installations 表（Bundle 安装记录）
-- ============================================================

CREATE TABLE IF NOT EXISTS leader_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES leader_bundles(id) ON DELETE CASCADE,
  user_id UUID,
  tenant_id VARCHAR(100),

  -- 安装选项
  install_options JSONB NOT NULL DEFAULT '{}',       -- { skillsOnly: true, ... }
  installed_skills JSONB NOT NULL DEFAULT '[]',      -- 实际安装的 skill_ids

  -- 状态
  status VARCHAR(20) NOT NULL DEFAULT 'installed',   -- installed / failed / uninstalled
  error_message TEXT,

  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uninstalled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leader_installations_bundle ON leader_installations (bundle_id);
CREATE INDEX IF NOT EXISTS idx_leader_installations_user ON leader_installations (user_id);
CREATE INDEX IF NOT EXISTS idx_leader_installations_active ON leader_installations (bundle_id)
 WHERE status = 'installed';

COMMENT ON TABLE leader_installations IS 'Bundle 安装记录';
COMMENT ON COLUMN leader_installations.status IS 'installed / failed / uninstalled';

-- ============================================================
-- 3. training_runs 表（Atropos 风格训练运行）
-- ============================================================

CREATE TABLE IF NOT EXISTS training_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_name VARCHAR(200) NOT NULL,
  base_model VARCHAR(100) NOT NULL,                   -- 如 deepseek-v4-flash

  -- 训练配置
  training_type VARCHAR(50) NOT NULL DEFAULT 'lora', -- lora / full / qlora
  config JSONB NOT NULL DEFAULT '{}',                -- LoRA params: { r: 8, alpha: 16, ... }
  dataset_filter JSONB DEFAULT '{}',                  -- { minSuccessScore: 0.7, categories: [...] }

  -- 训练数据统计
  trajectory_count INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  avg_success_score DECIMAL(3,2),

  -- 训练状态
  status VARCHAR(30) NOT NULL DEFAULT 'pending',     -- pending / running / completed / failed / cancelled
  progress DECIMAL(3,2) NOT NULL DEFAULT 0,          -- 0.00 ~ 1.00
  current_step INT DEFAULT 0,
  total_steps INT DEFAULT 0,

  -- 输出
  output_dir TEXT,                                    -- 训练产物路径
  metrics JSONB DEFAULT '{}',                         -- { loss, accuracy, ... }

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_training_runs_status ON training_runs (status);
CREATE INDEX IF NOT EXISTS idx_training_runs_created ON training_runs (created_at DESC);

COMMENT ON TABLE training_runs IS 'Atropos 风格训练运行记录（用于 LoRA 微调）';

-- ============================================================
-- 4. training_critic_scores 表（Critic 模型评分）
-- ============================================================

CREATE TABLE IF NOT EXISTS training_critic_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES training_runs(id) ON DELETE CASCADE,
  trajectory_id BIGINT,                              -- 关联 leader_trajectories.id

  -- Critic 评分
  critic_model VARCHAR(100) NOT NULL,
  success_score DECIMAL(3,2) NOT NULL,               -- 0.00 ~ 1.00
  quality_score DECIMAL(3,2),                        -- 输出质量
  coherence_score DECIMAL(3,2),                      -- 逻辑连贯性
  helpfulness_score DECIMAL(3,2),                    -- 对用户帮助度

  -- Critic 评论
  critic_feedback TEXT,
  failure_pattern VARCHAR(200),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_critic_scores_run ON training_critic_scores (run_id);
CREATE INDEX IF NOT EXISTS idx_training_critic_scores_traj ON training_critic_scores (trajectory_id);

COMMENT ON TABLE training_critic_scores IS 'Atropos Critic 模型对 leader trajectory 的评分';

-- ============================================================
-- 5. leader_reflections 扩展（增加 training_signal 字段）
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leader_reflections')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leader_reflections' AND column_name = 'training_signal') THEN
    ALTER TABLE leader_reflections ADD COLUMN training_signal VARCHAR(20) DEFAULT 'positive';
    -- positive / negative / neutral
    -- 用于训练数据筛选：只取 negative 反思来训练"避免错误"模式
    RAISE NOTICE 'Added training_signal column to leader_reflections';
  END IF;
END $$;

-- ============================================================
-- 6. 预填充 3 个官方 Bundles
-- ============================================================

INSERT INTO leader_bundles (
  name, version, format, description, skills, author, license, icon, tags,
  source, is_official, is_active
) VALUES
  (
    'marketing-bundle', '1.0.0', 'hermes-skill-bundle/v1',
    '营销团队 Leader Skill Bundle - 提供营销策略、内容运营、用户增长相关 Leader',
    '["marketing-director-v1", "marketing-director-v2"]',
    'nvwax-team', 'MIT', '📈',
    '["marketing", "content", "growth", "seo"]',
    'local', true, true
  ),
  (
    'development-bundle', '1.0.0', 'hermes-skill-bundle/v1',
    '开发团队 Leader Skill Bundle - 提供技术架构、代码审查、DevOps 相关 Leader',
    '["tech-lead-v1"]',
    'nvwax-team', 'MIT', '💻',
    '["development", "engineering", "tech", "architecture"]',
    'local', true, true
  ),
  (
    'general-bundle', '1.0.0', 'hermes-skill-bundle/v1',
    '通用团队 Leader Skill Bundle - 提供项目管理、跨职能协调相关 Leader',
    '["project-manager-v1"]',
    'nvwax-team', 'MIT', '📋',
    '["general", "project-management", "coordination", "agile"]',
    'local', true, true
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 7. 验证
-- ============================================================

DO $$
DECLARE
  bundle_count INT;
  install_count INT;
  run_count INT;
BEGIN
  SELECT COUNT(*) INTO bundle_count FROM leader_bundles;
  SELECT COUNT(*) INTO install_count FROM leader_installations;
  SELECT COUNT(*) INTO run_count FROM training_runs;
  RAISE NOTICE 'leader_bundles: % rows', bundle_count;
  RAISE NOTICE 'leader_installations: % rows', install_count;
  RAISE NOTICE 'training_runs: % rows', run_count;
END $$;

SELECT 'Migration 032 completed successfully' AS result;