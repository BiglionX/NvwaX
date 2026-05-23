-- ============================================
-- 虚拟公司创建会话系统迁移 v1.0.0
-- 创建虚拟公司创建会话表和相关索引
-- ============================================

BEGIN;

-- 1. 创建 virtual_company_sessions 表
CREATE TABLE IF NOT EXISTS virtual_company_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 会话状态
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN (
    'initiated',
    'requirements_gathering',
    'role_selection',
    'agent_searching',
    'skill_matching',
    'confirming',
    'building',
    'completed',
    'failed',
    'cancelled'
  )),
  
  -- 对话历史（JSONB 数组）
  conversation_history JSONB DEFAULT '[]'::jsonb,
  
  -- 收集的需求信息
  requirements JSONB DEFAULT '{}'::jsonb,
  
  -- 选定的角色列表
  selected_roles JSONB DEFAULT '[]'::jsonb,
  
  -- 进度追踪
  progress JSONB DEFAULT '{
    "currentStep": 0,
    "totalSteps": 7,
    "percentage": 0,
    "steps": []
  }'::jsonb,
  
  -- 关联的最终虚拟公司 ID（创建完成后）
  final_team_skill_id TEXT REFERENCES team_skills(id),
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_vcs_user_id ON virtual_company_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_vcs_status ON virtual_company_sessions(status);
CREATE INDEX IF NOT EXISTS idx_vcs_created_at ON virtual_company_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vcs_final_team_skill_id ON virtual_company_sessions(final_team_skill_id);

-- 3. 扩展 team_skills 表（添加创建来源追踪）
ALTER TABLE team_skills 
ADD COLUMN IF NOT EXISTS creation_session_id TEXT REFERENCES virtual_company_sessions(id),
ADD COLUMN IF NOT EXISTS source_agents JSONB DEFAULT '[]'::jsonb,  -- 引用的开源 Agent IDs
ADD COLUMN IF NOT EXISTS custom_skills JSONB DEFAULT '[]'::jsonb;  -- 自定义 Skills

-- 4. 扩展 agents 表（如果存在）
-- 注意：agents 表可能不存在，使用动态 SQL 条件执行
DO $$ 
BEGIN
  -- 检查 agents 表是否存在
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agents') THEN
    ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS created_from_session TEXT REFERENCES virtual_company_sessions(id),
    ADD COLUMN IF NOT EXISTS is_from_marketplace BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS marketplace_agent_id TEXT;
    
    RAISE NOTICE 'agents 表已扩展';
  ELSE
    RAISE NOTICE 'agents 表不存在，跳过扩展（不影响核心功能）';
  END IF;
END $$;

-- 5. 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_virtual_company_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vcs_updated_at ON virtual_company_sessions;
CREATE TRIGGER trigger_update_vcs_updated_at
  BEFORE UPDATE ON virtual_company_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_virtual_company_sessions_updated_at();

-- 6. 添加表注释
COMMENT ON TABLE virtual_company_sessions IS '虚拟公司创建会话表 - 跟踪用户创建虚拟公司的完整流程';
COMMENT ON COLUMN virtual_company_sessions.status IS '会话状态：initiated/requirements_gathering/role_selection/agent_searching/skill_matching/confirming/building/completed/failed/cancelled';
COMMENT ON COLUMN virtual_company_sessions.conversation_history IS '与 CEO Agent 的对话历史';
COMMENT ON COLUMN virtual_company_sessions.requirements IS '收集的用户需求信息';
COMMENT ON COLUMN virtual_company_sessions.selected_roles IS '用户选择的团队角色列表';
COMMENT ON COLUMN virtual_company_sessions.progress IS '创建进度追踪信息';
COMMENT ON COLUMN virtual_company_sessions.final_team_skill_id IS '创建成功后关联的 Team Skill ID';

-- ============================================
-- 迁移完成
-- ============================================

COMMIT;

COMMENT ON SCHEMA public IS 'NvwaX 虚拟公司创建会话系统迁移 v1.0.0 已完成';
