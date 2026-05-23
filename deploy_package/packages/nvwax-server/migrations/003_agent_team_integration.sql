-- ============================================
-- NvwaX Agent Team 集成数据库迁移脚本
-- 版本: 2.0.0
-- 日期: 2026-04-25
-- 描述: 添加 JiuwenClaw Agent Team 支持所需的表结构
-- ============================================

-- 启用 pg_trgm 扩展（用于全文搜索，如果尚未启用）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 1. 创建 Agent Team Executions 表（执行记录）
-- ============================================

CREATE TABLE IF NOT EXISTS agent_team_executions (
  id TEXT PRIMARY KEY,
  agent_team_id TEXT NOT NULL REFERENCES agent_teams(id) ON DELETE CASCADE,
  
  -- 执行状态
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed, cancelled
  progress JSONB DEFAULT '{}'::jsonb,
  
  -- 执行结果
  results JSONB,
  error_message TEXT,
  
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE agent_team_executions IS 'Agent Team 执行记录表';
COMMENT ON COLUMN agent_team_executions.status IS '执行状态: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN agent_team_executions.progress IS '执行进度信息（JSON格式）';
COMMENT ON COLUMN agent_team_executions.results IS '执行结果（JSON格式）';

-- ============================================
-- 2. 创建 Team Skills 表（团队技能模板）
-- ============================================

CREATE TABLE IF NOT EXISTS team_skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,  -- 'development', 'research', 'content', 'analysis', etc.
  
  -- Team Skills 结构化数据
  leader_config JSONB DEFAULT '{}'::jsonb,
  roles JSONB DEFAULT '[]'::jsonb,
  workflow JSONB DEFAULT '{}'::jsonb,
  binding_rules JSONB DEFAULT '{}'::jsonb,
  
  -- 元数据
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  version TEXT DEFAULT '1.0.0',
  is_public BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE team_skills IS 'Team Skills 模板表（可复用的团队协作模式）';
COMMENT ON COLUMN team_skills.leader_config IS 'Leader Agent 配置';
COMMENT ON COLUMN team_skills.roles IS '角色定义数组';
COMMENT ON COLUMN team_skills.workflow IS '工作流程定义';
COMMENT ON COLUMN team_skills.binding_rules IS '协作规则（冲突处理、决策机制等）';
COMMENT ON COLUMN team_skills.is_public IS '是否公开（其他人可以使用）';

-- ============================================
-- 3. 创建 Team Workspaces 表（共享工作区）
-- ============================================

CREATE TABLE IF NOT EXISTS team_workspaces (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES ai_teams(id) ON DELETE CASCADE,
  
  -- 工作区内容
  files JSONB DEFAULT '[]'::jsonb,
  shared_data JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE team_workspaces IS '团队共享工作区';
COMMENT ON COLUMN team_workspaces.files IS '文件列表（JSON格式）';
COMMENT ON COLUMN team_workspaces.shared_data IS '共享数据（JSON格式）';

-- ============================================
-- 4. 创建索引以提高查询性能
-- ============================================

-- Team Skills 索引
CREATE INDEX IF NOT EXISTS idx_team_skills_category ON team_skills(category);
CREATE INDEX IF NOT EXISTS idx_team_skills_public ON team_skills(is_public);
CREATE INDEX IF NOT EXISTS idx_team_skills_author ON team_skills(author_id);
CREATE INDEX IF NOT EXISTS idx_team_skills_name ON team_skills USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_team_skills_description ON team_skills USING GIN(description gin_trgm_ops);

-- Team Workspaces 索引
CREATE INDEX IF NOT EXISTS idx_workspaces_team ON team_workspaces(team_id);

-- Agent Team Executions 索引
CREATE INDEX IF NOT EXISTS idx_executions_agent_team ON agent_team_executions(agent_team_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON agent_team_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON agent_team_executions(created_at DESC);

-- ============================================
-- 5. 插入示例 Team Skills 数据（可选）
-- ============================================

-- 示例 1: 全栈开发团队
INSERT INTO team_skills (id, name, description, category, leader_config, roles, workflow, binding_rules, is_public)
VALUES (
  'team-skill-fullstack-dev-001',
  '全栈开发团队',
  '完整的全栈应用开发团队，包括前端、后端、数据库和测试专家',
  'development',
  '{"name": "Tech Lead", "responsibilities": ["需求分析", "技术选型", "代码审查", "进度管理"]}',
  '[
    {"role": "Frontend Developer", "specialty": "React/Vue 组件开发", "agent_type": "frontend-agent"},
    {"role": "Backend Developer", "specialty": "API 设计和业务逻辑", "agent_type": "backend-agent"},
    {"role": "Database Engineer", "specialty": "数据模型设计和优化", "agent_type": "database-agent"},
    {"role": "QA Engineer", "specialty": "测试用例编写和执行", "agent_type": "test-agent"}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "需求分析和系统设计", "performed_by": "Tech Lead", "output": "design_doc"},
      {"step": 2, "action": "数据库设计", "performed_by": "Database Engineer", "output": "db_schema"},
      {"step": 3, "action": "API 接口设计", "performed_by": "Backend Developer", "output": "api_spec"},
      {"step": 4, "action": "前端界面开发", "performed_by": "Frontend Developer", "output": "ui_components"},
      {"step": 5, "action": "后端逻辑实现", "performed_by": "Backend Developer", "output": "backend_code"},
      {"step": 6, "action": "集成测试", "performed_by": "QA Engineer", "output": "test_report"}
    ]
  }',
  '{
    "communication_protocol": "每个步骤完成后更新共享工作区并通知下一个角色",
    "conflict_resolution": "由 Tech Lead 最终决策",
    "quality_standards": "代码需通过单元测试，API 需符合 RESTful 规范"
  }',
  true
) ON CONFLICT (id) DO NOTHING;

-- 示例 2: 数据分析团队
INSERT INTO team_skills (id, name, description, category, leader_config, roles, workflow, binding_rules, is_public)
VALUES (
  'team-skill-data-analysis-001',
  '数据分析团队',
  '专业的数据分析团队，负责数据采集、清洗、分析和可视化',
  'analysis',
  '{"name": "Data Science Lead", "responsibilities": ["分析目标定义", "方法论选择", "结果验证"]}',
  '[
    {"role": "Data Engineer", "specialty": "数据采集和ETL", "agent_type": "backend-agent"},
    {"role": "Data Analyst", "specialty": "统计分析和洞察", "agent_type": "backend-agent"},
    {"role": "Visualization Expert", "specialty": "图表和报告生成", "agent_type": "frontend-agent"}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "数据源识别和采集", "performed_by": "Data Engineer", "output": "raw_data"},
      {"step": 2, "action": "数据清洗和预处理", "performed_by": "Data Engineer", "output": "clean_data"},
      {"step": 3, "action": "探索性数据分析", "performed_by": "Data Analyst", "output": "eda_report"},
      {"step": 4, "action": "深度分析和建模", "performed_by": "Data Analyst", "output": "analysis_results"},
      {"step": 5, "action": "可视化展示", "performed_by": "Visualization Expert", "output": "dashboard"}
    ]
  }',
  '{
    "communication_protocol": "数据工程师完成数据处理后通知分析师",
    "conflict_resolution": "由 Data Science Lead 协调",
    "quality_standards": "分析结果需有统计学显著性，可视化需清晰易懂"
  }',
  true
) ON CONFLICT (id) DO NOTHING;

-- 示例 3: 内容创作团队
INSERT INTO team_skills (id, name, description, category, leader_config, roles, workflow, binding_rules, is_public)
VALUES (
  'team-skill-content-creation-001',
  '内容创作团队',
  '高效的内容创作团队，从选题到发布全流程覆盖',
  'content',
  '{"name": "Content Director", "responsibilities": ["内容策略", "质量把控", "发布计划"]}',
  '[
    {"role": "Researcher", "specialty": "市场调研和竞品分析", "agent_type": "backend-agent"},
    {"role": "Writer", "specialty": "文章撰写和编辑", "agent_type": "backend-agent"},
    {"role": "Editor", "specialty": "内容审核和优化", "agent_type": "backend-agent"},
    {"role": "Designer", "specialty": "配图和排版设计", "agent_type": "frontend-agent"}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "选题研究和大纲制定", "performed_by": "Researcher", "output": "topic_research"},
      {"step": 2, "action": "初稿撰写", "performed_by": "Writer", "output": "first_draft"},
      {"step": 3, "action": "内容审核和修改", "performed_by": "Editor", "output": "reviewed_content"},
      {"step": 4, "action": "视觉设计", "performed_by": "Designer", "output": "visual_assets"},
      {"step": 5, "action": "最终整合和发布准备", "performed_by": "Content Director", "output": "final_content"}
    ]
  }',
  '{
    "communication_protocol": "每个环节完成后提交审核，审核通过后进入下一环节",
    "conflict_resolution": "由 Content Director 决定最终版本",
    "quality_standards": "内容需原创、准确、有价值，符合品牌调性"
  }',
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 迁移完成
-- ============================================

COMMENT ON SCHEMA public IS 'NvwaX Agent Team 集成迁移 v2.0.0 已完成';
