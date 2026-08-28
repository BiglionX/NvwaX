-- ============================================
-- 虚拟公司本地状态回写 (Sprint 2.14)
-- 支持 ProClaw 桌面端把虚拟公司的本地状态变更
-- （启用/停用某个 Agent、负责人角色映射、运行状态）
-- 回写到 NvWaX 云端，实现双向同步闭环。
-- ============================================

BEGIN;

-- 1. 在 virtual_company_sessions 表加 local_state JSONB 列
ALTER TABLE virtual_company_sessions
ADD COLUMN IF NOT EXISTS local_state JSONB DEFAULT '{}'::jsonb;

-- 2. local_state 结构示例：
-- {
--   "schemaVersion": "1.0.0",
--   "lastSyncedAt": "2026-01-01T00:00:00Z",
--   "proclawVersion": "1.3.1",
--   "importedPackageId": "uuid-here",
--   "agents": [
--     {
--       "agentId": "agent-barista-1",
--       "enabled": true,
--       "alias": "本地昵称：咖啡师小绿",
--       "ownerRole": "owner" | "shared" | "reviewer",
--       "lastRunAt": "2026-01-01T00:00:00Z"
--     }
--   ],
--   "teamStatus": "active" | "paused" | "archived"
-- }

-- 3. 索引：按 importedPackageId 查询
CREATE INDEX IF NOT EXISTS idx_vcs_local_state_pkg
  ON virtual_company_sessions USING GIN ((local_state->'importedPackageId'));

COMMENT ON COLUMN virtual_company_sessions.local_state IS
  'ProClaw 桌面端回写的本地状态：Agent 启用/停用、负责人角色、最近运行时间等';

COMMIT;