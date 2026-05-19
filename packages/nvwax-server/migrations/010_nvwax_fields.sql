-- ============================================
-- NvwaX Aiteam 创建专家系统迁移 v2.0.0
-- 添加 NvwaX 分析结果、团队设计、Agent/Skill 匹配等字段
-- ============================================

BEGIN;

-- 1. 为 virtual_company_sessions 表添加 NvwaX 相关字段
ALTER TABLE virtual_company_sessions 
ADD COLUMN IF NOT EXISTS nvwax_analysis_result JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS team_design JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS agent_matches JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS skill_matches JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ceo_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS document_package_url TEXT,
ADD COLUMN IF NOT EXISTS creation_metadata JSONB DEFAULT '{}'::jsonb;

-- 2. 添加索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_vcs_nvwax_analysis ON virtual_company_sessions USING GIN (nvwax_analysis_result);
CREATE INDEX IF NOT EXISTS idx_vcs_team_design ON virtual_company_sessions USING GIN (team_design);

-- 3. 创建 NvwaX 记忆表（用于自我进化）
CREATE TABLE IF NOT EXISTS nvwax_memories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 团队信息
  team_type TEXT NOT NULL,
  industry TEXT,
  requirements JSONB DEFAULT '{}'::jsonb,
  
  -- 配置信息
  team_config JSONB DEFAULT '{}'::jsonb,
  agent_matches JSONB DEFAULT '{}'::jsonb,
  skill_matches JSONB DEFAULT '{}'::jsonb,
  
  -- 评估指标
  success_score FLOAT DEFAULT 0.0,
  user_feedback TEXT,
  usage_stats JSONB DEFAULT '{}'::jsonb,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 为记忆表添加索引
CREATE INDEX IF NOT EXISTS idx_nvwax_memories_team_type ON nvwax_memories(team_type);
CREATE INDEX IF NOT EXISTS idx_nvwax_memories_success_score ON nvwax_memories(success_score DESC);
CREATE INDEX IF NOT EXISTS idx_nvwax_memories_user_id ON nvwax_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_nvwax_memories_created_at ON nvwax_memories(created_at DESC);

-- 5. 创建 CEO 模板表
CREATE TABLE IF NOT EXISTS ceo_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_type TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  description TEXT,
  default_skills JSONB DEFAULT '[]'::jsonb,
  system_prompt_template TEXT NOT NULL,
  management_style TEXT,
  decision_rules JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. 插入默认的 CEO 模板
INSERT INTO ceo_templates (team_type, template_name, description, default_skills, system_prompt_template, management_style) VALUES
('营销团队', '营销团队CEO模板', '专注于内容策略和社交媒体运营的CEO', 
 '["content_strategy", "social_media_analytics", "campaign_management"]',
 '你是营销团队的CEO，专注于内容策略和社交媒体运营。你的目标是最大化品牌曝光和用户参与度。',
 '数据驱动，注重ROI'),
('客服团队', '客服团队CEO模板', '专注于客户满意度和问题解决的CEO',
 '["customer_communication", "problem_solving", "sentiment_analysis"]',
 '你是客服团队的CEO，专注于客户满意度和问题解决。你的目标是提供卓越的客户服务体验。',
 '客户至上，快速响应'),
('开发团队', '开发团队CEO模板', '专注于技术架构和项目管理的CEO',
 '["technical_architecture", "code_review", "project_management"]',
 '你是开发团队的CEO，专注于技术架构和项目管理。你的目标是交付高质量的软件产品。',
 '技术导向，质量优先'),
('数据分析团队', '数据分析团队CEO模板', '专注于数据挖掘和商业洞察的CEO',
 '["data_mining", "statistical_analysis", "business_intelligence"]',
 '你是数据分析团队的CEO，专注于数据挖掘和商业洞察。你的目标是从数据中发现价值。',
 '数据驱动，洞察先行')
ON CONFLICT (team_type) DO NOTHING;

-- 7. 添加注释
COMMENT ON COLUMN virtual_company_sessions.nvwax_analysis_result IS 'NvwaX需求分析结果';
COMMENT ON COLUMN virtual_company_sessions.team_design IS '团队设计方案';
COMMENT ON COLUMN virtual_company_sessions.agent_matches IS 'Agent匹配结果';
COMMENT ON COLUMN virtual_company_sessions.skill_matches IS 'Skill匹配结果';
COMMENT ON COLUMN virtual_company_sessions.ceo_config IS 'CEO Agent配置';
COMMENT ON COLUMN virtual_company_sessions.document_package_url IS '配置文档包下载URL';
COMMENT ON TABLE nvwax_memories IS 'NvwaX记忆表，存储创建历史用于自我进化';
COMMENT ON TABLE ceo_templates IS 'CEO Agent模板库';

COMMIT;
