-- ============================================
-- NvwaX Agent 仓库重构数据库迁移脚本
-- 版本: 013
-- 日期: 2026-05-17
-- 描述: 
--   1. 增强 agents 表，支持独立管理和导出
--   2. 创建独立的 aiteams 表（不再依赖 projects）
--   3. 添加导出相关的元数据字段
-- ============================================

BEGIN;

-- ============================================
-- 1. 增强 agents 表
-- ============================================

-- 添加新字段到 agents 表
ALTER TABLE agents 
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'single' CHECK (type IN ('single', 'team_member')),
  ADD COLUMN IF NOT EXISTS publish_status VARCHAR(20) DEFAULT 'private' CHECK (publish_status IN ('draft', 'published', 'private')),
  ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS export_format TEXT[],
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_publish_status ON agents(publish_status);
CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category);
CREATE INDEX IF NOT EXISTS idx_agents_tags ON agents USING GIN(tags);

-- 添加注释
COMMENT ON COLUMN agents.type IS 'Agent类型：single(单个智能体) 或 team_member(团队成员)';
COMMENT ON COLUMN agents.publish_status IS '发布状态：draft(草稿)/published(已发布)/private(私有)';
COMMENT ON COLUMN agents.download_count IS '下载次数统计';
COMMENT ON COLUMN agents.export_format IS '支持的导出格式列表';
COMMENT ON COLUMN agents.tags IS '标签列表，用于分类和搜索';
COMMENT ON COLUMN agents.category IS '分类（如：客服、开发、营销等）';
COMMENT ON COLUMN agents.thumbnail_url IS '缩略图URL';
COMMENT ON COLUMN agents.rating IS '平均评分（0-5）';
COMMENT ON COLUMN agents.review_count IS '评论数量';

-- ============================================
-- 2. 创建独立的 aiteams 表
-- ============================================

CREATE TABLE IF NOT EXISTS aiteams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 基本信息
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- 团队成员配置（JSONB）
  -- 结构：[{agent_id, role, responsibilities, config}]
  members JSONB DEFAULT '[]'::jsonb,
  
  -- 协作工作流定义（JSONB）
  workflow JSONB DEFAULT '{}'::jsonb,
  
  -- 触发条件配置（JSONB）
  triggers JSONB DEFAULT '{}'::jsonb,
  
  -- 发布和版本控制
  version VARCHAR(20) DEFAULT '1.0.0',
  publish_status VARCHAR(20) DEFAULT 'private' CHECK (publish_status IN ('draft', 'published', 'private')),
  
  -- 统计信息
  download_count INTEGER DEFAULT 0,
  execution_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 100.00,
  
  -- 分类和标签
  category VARCHAR(100),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  thumbnail_url TEXT,
  
  -- 评分系统
  rating DECIMAL(3, 2) DEFAULT 0.00,
  review_count INTEGER DEFAULT 0,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_aiteam_publish_status CHECK (publish_status IN ('draft', 'published', 'private'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_aiteams_user_id ON aiteams(user_id);
CREATE INDEX IF NOT EXISTS idx_aiteams_publish_status ON aiteams(publish_status);
CREATE INDEX IF NOT EXISTS idx_aiteams_category ON aiteams(category);
CREATE INDEX IF NOT EXISTS idx_aiteams_created_at ON aiteams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aiteams_name_trgm ON aiteams USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_aiteams_tags ON aiteams USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_aiteams_members ON aiteams USING GIN(members);

-- 创建触发器自动更新 updated_at
DROP TRIGGER IF EXISTS update_aiteams_updated_at ON aiteams;
CREATE TRIGGER update_aiteams_updated_at
  BEFORE UPDATE ON aiteams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 添加表注释
COMMENT ON TABLE aiteams IS 'AI团队表 - 独立于项目的智能体团队管理';
COMMENT ON COLUMN aiteams.user_id IS '团队所有者用户ID';
COMMENT ON COLUMN aiteams.name IS '团队名称';
COMMENT ON COLUMN aiteams.description IS '团队描述';
COMMENT ON COLUMN aiteams.members IS '团队成员配置（JSONB数组）';
COMMENT ON COLUMN aiteams.workflow IS '协作工作流定义（JSONB）';
COMMENT ON COLUMN aiteams.triggers IS '触发条件配置（JSONB）';
COMMENT ON COLUMN aiteams.version IS '版本号';
COMMENT ON COLUMN aiteams.publish_status IS '发布状态：draft/published/private';
COMMENT ON COLUMN aiteams.download_count IS '下载次数';
COMMENT ON COLUMN aiteams.execution_count IS '执行次数';
COMMENT ON COLUMN aiteams.success_rate IS '成功率（百分比）';

-- ============================================
-- 3. 创建 aiteam_members 关联表（可选，用于更灵活的查询）
-- ============================================

CREATE TABLE IF NOT EXISTS aiteam_members (
  aiteam_id UUID REFERENCES aiteams(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  responsibilities TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (aiteam_id, agent_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_aiteam_members_agent_id ON aiteam_members(agent_id);
CREATE INDEX IF NOT EXISTS idx_aiteam_members_role ON aiteam_members(role);

-- 添加注释
COMMENT ON TABLE aiteam_members IS 'AiTeam成员关联表 - 支持多对多关系';
COMMENT ON COLUMN aiteam_members.role IS '成员角色（如：CEO、Developer、Designer等）';
COMMENT ON COLUMN aiteam_members.responsibilities IS '职责描述';
COMMENT ON COLUMN aiteam_members.config IS '角色特定配置';
COMMENT ON COLUMN aiteam_members.sort_order IS '排序顺序';

-- ============================================
-- 4. 创建 exports 表（记录导出历史）
-- ============================================

CREATE TABLE IF NOT EXISTS agent_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 导出的资源
  resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('agent', 'aiteam')),
  resource_id UUID NOT NULL,
  
  -- 导出配置
  format VARCHAR(20) NOT NULL CHECK (format IN ('json', 'yaml', 'proclaw')),
  config JSONB DEFAULT '{}'::jsonb,
  
  -- 导出结果
  file_path TEXT,
  file_size INTEGER,
  download_url TEXT,
  
  -- 状态
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_agent_exports_user_id ON agent_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_exports_resource ON agent_exports(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_agent_exports_status ON agent_exports(status);
CREATE INDEX IF NOT EXISTS idx_agent_exports_created_at ON agent_exports(created_at DESC);

-- 添加注释
COMMENT ON TABLE agent_exports IS '导出历史记录表';
COMMENT ON COLUMN agent_exports.resource_type IS '资源类型：agent 或 aiteam';
COMMENT ON COLUMN agent_exports.resource_id IS '资源ID';
COMMENT ON COLUMN agent_exports.format IS '导出格式：json/yaml/proclaw';
COMMENT ON COLUMN agent_exports.file_path IS '导出文件路径';
COMMENT ON COLUMN agent_exports.download_url IS '下载链接';

-- ============================================
-- 5. 数据迁移（从旧结构迁移到新结构）
-- ============================================

-- 注意：这部分需要根据实际情况调整
-- 如果 ai_teams 表中已有数据，可以考虑迁移到新的 aiteams 表

DO $$
DECLARE
  old_team RECORD;
  new_aiteam_id UUID;
BEGIN
  -- 检查是否存在旧的 ai_teams 表
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_teams') THEN
    RAISE NOTICE '检测到旧的 ai_teams 表，开始数据迁移...';
    
    -- 遍历旧的 ai_teams
    FOR old_team IN SELECT * FROM ai_teams LOOP
      -- 创建新的 aiteam 记录
      INSERT INTO aiteams (id, user_id, name, description, publish_status)
      SELECT 
        old_team.id,
        p.user_id,
        old_team.name,
        '从旧系统迁移的AI团队',
        'private'
      FROM projects p
      WHERE p.id = old_team.project_id
      ON CONFLICT (id) DO NOTHING;
      
      RAISE NOTICE '迁移 AiTeam: %', old_team.name;
    END LOOP;
    
    RAISE NOTICE '✅ 旧 ai_teams 数据迁移完成';
  ELSE
    RAISE NOTICE '未检测到旧的 ai_teams 表，跳过迁移';
  END IF;
END $$;

-- ============================================
-- 迁移完成
-- ============================================

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Agent 仓库重构迁移完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '新增/修改内容：';
  RAISE NOTICE '1. agents 表：新增 9 个字段（type, publish_status, tags等）';
  RAISE NOTICE '2. aiteams 表：新建独立表，支持完整的团队管理';
  RAISE NOTICE '3. aiteam_members 表：成员关联表，支持多对多关系';
  RAISE NOTICE '4. agent_exports 表：导出历史记录';
  RAISE NOTICE '========================================';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '- 实现 AgentService 和 AiTeamService';
  RAISE NOTICE '- 创建导出功能（ExportService）';
  RAISE NOTICE '- 更新 API 端点';
  RAISE NOTICE '========================================';
END $$;
