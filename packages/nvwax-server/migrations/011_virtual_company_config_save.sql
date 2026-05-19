-- ============================================
-- 虚拟公司配置保存增强迁移 v1.1.0
-- 添加团队配置相关字段以支持完整保存
-- ============================================

BEGIN;

-- 1. 添加团队设计字段
ALTER TABLE virtual_company_sessions
ADD COLUMN IF NOT EXISTS team_design JSONB,
ADD COLUMN IF NOT EXISTS ceo_config JSONB,
ADD COLUMN IF NOT EXISTS agent_matches JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS skill_matches JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS document_package_url TEXT;

-- 2. 添加索引
CREATE INDEX IF NOT EXISTS idx_vcs_team_design ON virtual_company_sessions USING GIN(team_design);
CREATE INDEX IF NOT EXISTS idx_vcs_ceo_config ON virtual_company_sessions USING GIN(ceo_config);

-- 3. 添加注释
COMMENT ON COLUMN virtual_company_sessions.team_design IS '团队设计方案（角色列表、协作流程等）';
COMMENT ON COLUMN virtual_company_sessions.ceo_config IS 'CEO Agent 配置（模板、System Prompt等）';
COMMENT ON COLUMN virtual_company_sessions.agent_matches IS 'Agent 匹配结果';
COMMENT ON COLUMN virtual_company_sessions.skill_matches IS 'Skill 匹配结果';
COMMENT ON COLUMN virtual_company_sessions.document_package_url IS '文档包下载URL';

-- ============================================
-- 迁移完成
-- ============================================

COMMIT;

COMMENT ON SCHEMA public IS 'NvwaX 虚拟公司配置保存增强迁移 v1.1.0 已完成';
