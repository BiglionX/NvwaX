-- ============================================
-- NvwaX Agent 表数据库迁移脚本
-- 版本: 1.0.0
-- 日期: 2026-05-15
-- 描述: 创建 agents 表以支持 Nvwa 智能体工厂
-- ============================================

-- ============================================
-- 1. 创建 agents 表
-- ============================================

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  data_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
  output_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  implementation TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  template_id UUID,
  version VARCHAR(20) DEFAULT '1.0.0',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_agent_status CHECK (status IN ('draft', 'active', 'archived', 'deleted'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_name_trgm ON agents USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_agents_skills ON agents USING GIN(skills);

-- ============================================
-- 2. 创建触发器（自动更新 updated_at）
-- ============================================

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. 添加注释
-- ============================================

COMMENT ON TABLE agents IS 'Nvwa 智能体表，存储用户创建的智能体配置';
COMMENT ON COLUMN agents.user_id IS '智能体所有者用户ID';
COMMENT ON COLUMN agents.name IS '智能体名称';
COMMENT ON COLUMN agents.description IS '智能体描述';
COMMENT ON COLUMN agents.config IS '智能体配置（JSON格式）';
COMMENT ON COLUMN agents.skills IS '智能体包含的技能列表';
COMMENT ON COLUMN agents.data_sources IS '数据源列表';
COMMENT ON COLUMN agents.output_types IS '输出类型列表';
COMMENT ON COLUMN agents.implementation IS '实现方式描述';
COMMENT ON COLUMN agents.status IS '智能体状态：draft, active, archived, deleted';
COMMENT ON COLUMN agents.template_id IS '基于的模板ID（可选）';
COMMENT ON COLUMN agents.version IS '智能体版本号';

-- ============================================
-- 迁移完成
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Agents 表创建成功！';
  RAISE NOTICE '新增表: agents';
  RAISE NOTICE '索引: 5个（user_id, status, created_at, name搜索, skills）';
END $$;
