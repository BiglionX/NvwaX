-- Migration: 030_creation_state_machine
-- Description: 创建状态机流程引擎所需的 checkpoint 表和 agent_definitions 表
-- Date: 2026-06-22

-- ============================================================
-- 1. creation_checkpoints 表（状态机断点恢复）
-- ============================================================

CREATE TABLE IF NOT EXISTS creation_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  node_id VARCHAR(50) NOT NULL,
  state_data JSONB NOT NULL DEFAULT '{}',
  history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 一个 session 只保留最新的 checkpoint（upsert 语义）
  CONSTRAINT unique_session_checkpoint UNIQUE (session_id)
);

-- 索引：按 session_id 快速查找
CREATE INDEX IF NOT EXISTS idx_creation_checkpoints_session 
  ON creation_checkpoints (session_id);

-- 索引：按创建时间排序（用于清理旧 checkpoint）
CREATE INDEX IF NOT EXISTS idx_creation_checkpoints_created 
  ON creation_checkpoints (created_at);

COMMENT ON TABLE creation_checkpoints IS '状态机流程引擎的检查点表，用于断点恢复';
COMMENT ON COLUMN creation_checkpoints.node_id IS '当前状态节点 ID';
COMMENT ON COLUMN creation_checkpoints.state_data IS '完整的状态数据快照';
COMMENT ON COLUMN creation_checkpoints.history IS '状态转换历史';

-- ============================================================
-- 2. agent_definitions 表（动态 Agent 注册表）
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_definitions (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  
  -- 能力标签（用于语义匹配）
  capabilities JSONB NOT NULL DEFAULT '[]',
  
  -- 关键词（用于降级匹配）
  keywords JSONB NOT NULL DEFAULT '[]',
  
  -- 语义向量（用于 embedding 匹配，可选）
  -- 使用 float8 数组代替 pgvector，兼容性更好
  embedding FLOAT8[],
  
  -- 工作流模板
  workflow_template JSONB NOT NULL DEFAULT '{}',
  
  -- 可用工具
  tools JSONB NOT NULL DEFAULT '[]',
  
  -- 约束条件
  constraints JSONB NOT NULL DEFAULT '{}',
  
  -- 元数据
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- 来源（built-in / yaml / api / community）
  source VARCHAR(50) NOT NULL DEFAULT 'built-in',
  
  -- 状态
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：按名称搜索
CREATE INDEX IF NOT EXISTS idx_agent_definitions_name 
  ON agent_definitions (name);

-- 索引：按来源过滤
CREATE INDEX IF NOT EXISTS idx_agent_definitions_source 
  ON agent_definitions (source);

-- 索引：按 active 状态过滤
CREATE INDEX IF NOT EXISTS idx_agent_definitions_active 
  ON agent_definitions (is_active) WHERE is_active = true;

-- 索引：GIN 索引用于 capabilities JSONB 查询
CREATE INDEX IF NOT EXISTS idx_agent_definitions_capabilities 
  ON agent_definitions USING GIN (capabilities);

COMMENT ON TABLE agent_definitions IS '动态 Agent 注册表，支持 CRUD 和语义匹配';
COMMENT ON COLUMN agent_definitions.capabilities IS '能力标签数组，用于语义匹配';
COMMENT ON COLUMN agent_definitions.embedding IS '语义向量（可选），用于向量相似度匹配';
COMMENT ON COLUMN agent_definitions.workflow_template IS 'Agent 的工作流模板定义';
COMMENT ON COLUMN agent_definitions.source IS '来源：built-in（内置）/ yaml（文件定义）/ api（API注册）/ community（社区）';

-- ============================================================
-- 3. 预填充内置 Agent 类型（从 agent-definitions.js 迁移）
-- ============================================================

INSERT INTO agent_definitions (id, name, description, capabilities, keywords, workflow_template, source)
VALUES
  (
    'frontend-agent',
    'Frontend Agent',
    '专长于 React/Vue 组件、UI/UX、状态管理',
    '["frontend", "ui", "react", "vue", "css", "html", "javascript", "component", "state_management"]',
    '["前端", "界面", "组件", "UI", "样式", "React", "Vue", "CSS", "HTML", "JavaScript"]',
    '{"nodes": [{"type": "llm", "params": {"prompt": "作为前端专家，分析需求并设计组件结构，包括 props、state 和事件处理。"}}]}',
    'built-in'
  ),
  (
    'backend-agent',
    'Backend Agent',
    '专长于 API 设计、业务逻辑、认证授权',
    '["backend", "api", "server", "express", "authentication", "middleware", "rest"]',
    '["后端", "API", "服务器", "接口", "Express", "Fastify", "路由", "中间件", "认证"]',
    '{"nodes": [{"type": "llm", "params": {"prompt": "作为后端专家，设计 RESTful API 端点、请求验证和业务逻辑实现。"}}]}',
    'built-in'
  ),
  (
    'database-agent',
    'Database Agent',
    '专长于数据模型、查询优化、迁移脚本',
    '["database", "sql", "orm", "schema", "migration", "index", "query_optimization"]',
    '["数据库", "表结构", "SQL", "Prisma", "Schema", "模型", "迁移", "索引"]',
    '{"nodes": [{"type": "llm", "params": {"prompt": "作为数据库专家，设计数据模型、表结构和关系，包括字段类型和索引策略。"}}]}',
    'built-in'
  ),
  (
    'test-agent',
    'Test Agent',
    '专长于单元测试、集成测试、E2E 测试',
    '["testing", "unit_test", "e2e", "jest", "cypress", "coverage", "mock"]',
    '["测试", "用例", "jest", "cypress", "测试覆盖率", "断言", "mock"]',
    '{"nodes": [{"type": "llm", "params": {"prompt": "作为测试专家，编写全面的测试用例，包括边界情况和错误处理。"}}]}',
    'built-in'
  ),
  (
    'docs-agent',
    'Documentation Agent',
    '专长于 API 文档、README、技术文档',
    '["documentation", "readme", "api_docs", "technical_writing", "guide"]',
    '["文档", "说明", "注释", "README", "API 文档", "使用指南"]',
    '{"nodes": [{"type": "llm", "params": {"prompt": "作为文档专家，编写清晰、完整的技术文档，包括示例代码和使用说明。"}}]}',
    'built-in'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. nvwax_memories 表扩展（增加 embedding 字段）
-- ============================================================

-- 检查表是否存在，如果存在则添加 embedding 列
DO $$
BEGIN
  -- 添加 embedding 列（如果不存在）
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nvwax_memories')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nvwax_memories' AND column_name = 'embedding') THEN
    ALTER TABLE nvwax_memories ADD COLUMN embedding FLOAT8[];
    RAISE NOTICE 'Added embedding column to nvwax_memories';
  END IF;
  
  -- 添加 reflection_notes 列（反思学习记录）
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nvwax_memories')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nvwax_memories' AND column_name = 'reflection_notes') THEN
    ALTER TABLE nvwax_memories ADD COLUMN reflection_notes JSONB DEFAULT '[]';
    RAISE NOTICE 'Added reflection_notes column to nvwax_memories';
  END IF;
END $$;

-- ============================================================
-- 完成
-- ============================================================

SELECT 'Migration 030 completed successfully' AS result;
