# NvwaX Server 数据库迁移索引

> **命名约定**: `{number}_{description}.sql`，数字递增
> **执行方式**: 由部署脚本按序依次执行，幂等（`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` / `ON CONFLICT DO NOTHING`）
> **重要原则**: 任何字段增删都必须**双端同步 PR**（ProClaw 端的 Rust `nvwax_client.rs` + TS `nvwaxClient.ts` + `types/nvwax.ts`）

---

## Sprint 2.13–2.17 新增迁移

### 012_virtual_company_local_state.sql

**Sprint**: 2.13（初始化）+ 2.14（启用 PUT 回写）+ 2.15（启用 GET 拉取，多设备同步） + 2.17（无需新文件，SSE 事件增强）

**变更**: 在 `virtual_company_sessions` 表加 `local_state` JSONB 列。

**背景**: ProClaw 桌面端的"虚拟公司"插件需要在本地启用/停用某个 Agent、改别名、设负责人角色后，把这些变更同步回 NvWaX；同时 NvWaX 也需要返回最新状态，让 MacBook / Windows 多设备之间自动同步。

**数据结构**:

```json
{
  "schemaVersion": "1.0.0",
  "lastSyncedAt": "2026-01-01T12:00:00Z",
  "proclawVersion": "1.3.2",
  "importedPackageId": "uuid-here",
  "teamStatus": "active",
  "agents": [
    {
      "agentId": "agent-barista-1",
      "enabled": true,
      "alias": "咖啡师小绿",
      "ownerRole": "owner",
      "lastRunAt": "2026-01-01T12:00:00Z"
    }
  ]
}
```

**索引**: `idx_vcs_local_state_pkg`（基于 `local_state->>'importedPackageId'` 的 GIN 索引，加速多设备同步拉取）。

**关联代码**:

- Controller: `packages/nvwax-server/src/controllers/aiteam-creation.controller.ts`
  - `pushLocalState`（Sprint 2.14，接收 PUT 回写）
  - `getLocalState`（Sprint 2.15，处理 GET 拉取）
- Service: `packages/nvwax-server/src/services/aiteam-creation.service.ts`
  - `getLocalState(sessionId, userId)`
  - `mapRowToSession` 已暴露 `local_state` + `localStateLastSyncedAt` 字段
- Routes: `packages/nvwax-server/src/routes/aiteam-creation.routes.ts`
  - `PUT /api/aiteam-creation/sessions/:id/local-state`
  - `GET /api/aiteam-creation/sessions/:id/local-state`
  - `GET /api/aiteam-creation/sessions`（列表响应）

**ProClaw 端配套改动**:

- Rust: `src-tauri/src/services/nvwax_client.rs` 新增 `fetch_local_state()` / `list_sessions_with_state()` / `push_virtual_company_local_state()` 方法
- TS: `src/lib/nvwaxClient.ts` 新增 `fetchVirtualCompanyLocalState()` / `listVirtualCompanySessionsWithState()` / `pushVirtualCompanyLocalState()` 客户端方法
- 类型: `src/types/nvwax.ts` 新增 `VirtualCompanyAgentState` / `VirtualCompanyLocalStatePayload` / `VirtualCompanyLocalStatePushResult` / `VirtualCompanyLocalStateResponse` / `VirtualCompanySessionWithState` / `VirtualCompanySessionListResponse`
- 合并引擎: `src/lib/virtualCompanySync.ts`（纯函数 + 14 个单元测试）
- Companies 页: 加 "🔄 立即同步" 按钮 + 同步报告卡片

**回滚方案**: 删 `local_state` 列（`ALTER TABLE virtual_company_sessions DROP COLUMN local_state;`），同时下掉 NvWaX 端 `pushLocalState` / `getLocalState` 相关路由与 controller 方法。

**注意事项**:

- 该列无 NOT NULL 约束，老数据自动得 `null`，与旧版 ProClaw 兼容
- 字段级 LWW 合并依赖 `lastSyncedAt` 字段；首次同步时两端都没有，则取云端值（"云端权威"原则）
- 一定要确保 ProClaw 端 `parseVirtualCompanyPackage` 的 schema 主版本检查与该 JSON 结构一致

---

## 历史迁移（按编号倒序）

### 011_virtual_company_config_save.sql

在 `virtual_company_sessions` 表加 `team_design` / `ceo_config` / `agent_matches` / `skill_matches` / `document_package_url` 列。
Sprint 2.13 的虚拟公司打包前置依赖。

### 010_fix_virtual_company_sessions_fk.sql / 009_virtual_company_sessions_fixed.sql / 009_virtual_company_sessions.sql

`virtual_company_sessions` 表的建立与外键修复。`created_at`、`updated_at`、`completed_at` 时间戳字段，`final_team_skill_id` 外键引用 `team_skills.id`。

### 004_virtual_company_templates.sql

`virtual_company_templates` 表，提供 NvWaX 端「虚拟公司模板」市场。

---

## 迁移部署 checklist

1. **备份**: 部署前 `pg_dump` 全量备份
2. **停止服务**: 关闭 NvWaX server 实例
3. **依次执行**: `psql -U nvwax -d nvwax -f migrations/{N}_{name}.sql`，按编号顺序
4. **验证**: `\d virtual_company_sessions` 确认新列存在
5. **冒烟测试**: 调 `GET /api/aiteam-creation/sessions/test-id/local-state` 确认端点可访问
6. **回滚预案**: 若有兼容性问题，回滚上一个 migration 并回退代码

---

## 双端同步 PR checklist（强制）

任何字段增删都必须**同时**改以下文件：

- **NvWaX 端**：
  - `packages/nvwax-server/src/schemas/virtual-company-package.schema.json`
  - `packages/nvwax-server/src/services/proclaw.service.ts`
  - `packages/nvwax-server/src/services/aiteam-creation.service.ts`
  - `packages/nvwax-server/src/controllers/aiteam-creation.controller.ts`
  - `packages/nvwax-server/src/routes/aiteam-creation.routes.ts`
  - 本目录的迁移文件
- **ProClaw 端**：
  - `src-tauri/src/services/nvwax_client.rs`
  - `src-tauri/src/services/nvwax_commands.rs`
  - `src-tauri/src/invoke_handler.rs`
  - `src-tauri/src/commands/mod.rs`
  - `src/types/nvwax.ts`
  - `src/lib/nvwaxClient.ts`
  - `src/plugins/virtual-company/frontend/index.js`（UI 字段变化时）
  - `src/lib/virtualCompanySync.ts`（合并字段变化时）

---

**最后更新**: 2026-XX-XX（Sprint 2.15 之后）
