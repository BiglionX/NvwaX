-- ============================================
-- 创建 agents 表（用户自定义智能体）
-- 用于 Nvwa 智能体工厂功能
-- ============================================

BEGIN;

-- 创建 agents 表
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 基本信息
  name TEXT NOT NULL,
  description TEXT,
  
  -- 配置信息（JSONB）
  config JSONB DEFAULT '{}'::jsonb,
  
  -- 技能和数据源
  skills TEXT[] DEFAULT '{}',
  data_sources TEXT[] DEFAULT '{}',
  output_types TEXT[] DEFAULT '{}',
  
  -- 实现代码/配置
  implementation TEXT,
  
  -- 模板引用
  template_id TEXT,
  
  -- 状态管理
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'active',
    'archived',
    'deleted'
  )),
  
  -- 版本控制
  version TEXT DEFAULT '1.0.0',
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_template_id ON agents(template_id);

-- 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_agents_updated_at ON agents;
CREATE TRIGGER trigger_update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_agents_updated_at();

-- 添加表注释
COMMENT ON TABLE agents IS '用户自定义智能体表 - Nvwa 智能体工厂';
COMMENT ON COLUMN agents.status IS '智能体状态：draft(草稿)/active(激活)/archived(归档)/deleted(已删除)';
COMMENT ON COLUMN agents.config IS '智能体配置信息（JSONB）';
COMMENT ON COLUMN agents.skills IS '技能列表（数组）';
COMMENT ON COLUMN agents.data_sources IS '数据源列表（数组）';
COMMENT ON COLUMN agents.output_types IS '输出类型列表（数组）';
COMMENT ON COLUMN agents.implementation IS '实现代码或配置';
COMMENT ON COLUMN agents.template_id IS '引用的模板 ID';
COMMENT ON COLUMN agents.version IS '版本号';

-- ============================================
-- 迁移完成
-- ============================================

COMMIT;

COMMENT ON SCHEMA public IS 'NvwaX agents 表创建迁移已完成';
