-- Migration: 034_agent_blueprints
-- Description: 创建结果蓝图（agent_blueprints）——团队配置快照 + 用户画布微调（Draft/Deploy）
-- Date: 2026-06-22

-- ============================================================
-- agent_blueprints：一次创建结果的团队配置快照 + 微调状态
--   config JSONB 结构（由前端画布读写，服务端 Deploy 时校验）：
--   {
--     "root": { "id", "name", "systemPrompt", "model", "temperature" },
--     "subagents": [{ "id", "name", "systemPrompt", "parentId" }],
--     "skills":   [{ "agentId", "skillId", "skillName" }],
--     "tools":    [{ "agentId", "toolName" }]
--   }
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_id TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',          -- draft | deployed
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 按 Agent 快速查询（一个 agent 至多一个活跃蓝图，允许多个历史版本）
CREATE INDEX IF NOT EXISTS idx_agent_blueprints_agent
  ON agent_blueprints (agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_blueprints_status
  ON agent_blueprints (status);

COMMENT ON TABLE agent_blueprints IS '创建结果蓝图：团队配置快照 + 画布微调（Draft→Deploy 门禁）';
COMMENT ON COLUMN agent_blueprints.config IS '蓝图配置 JSON（root/subagents/skills/tools），Deploy 时由服务端校验';
COMMENT ON COLUMN agent_blueprints.status IS 'draft=草稿（不可用）| deployed=已部署（可运行）';
