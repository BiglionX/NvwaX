# ProClaw × NvwaX API 集成需求文档

## 1. 整体架构

```
┌─────────────────────────────────────────────────┐
│                   ProClaw.cc                    │
│                                                 │
│  ProClaw 用户 ──→ ProClaw 后端 ──→ NvwaX API     │
│       ↑                  │                      │
│       │                  ▼                      │
│       └── ProClaw 自己收费 ── NvwaX 记录消耗      │
│                                                 │
│  两级计费：                                      │
│  - NvwaX 侧：放行，不计费，仅记录原始 Token 消耗    │
│  - ProClaw 侧：根据消耗记录向 ProClaw 用户收费     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                  NvwaX 服务                     │
│                                                 │
│  /api/v1/*  ←── API Key 认证                    │
│  user_token_quotas.is_internal_team = true      │
│  → 跳过配额扣减 → 仅记录消费明细                   │
│  → 返回 remaining: Infinity                     │
└─────────────────────────────────────────────────┘
```

## 2. 前置条件

### 2.1 ProClaw 注册 NvwaX 开发者账号

| 步骤 | 操作 | 说明 |
|------|------|------|
| ① | 访问 https://nvwax.proclaw.cc/register | 注册一个 NvwaX 账号（如 `proclaw@proclaw.cc`） |
| ② | 登录 → 用户中心 → Profile → API Keys | 进入 API Key 管理页面 |
| ③ | 点击「+ 创建 Key」，输入名称如 "ProClaw Production" | 生成一个 API Key（格式：`nvwx_xxxxxxxxxxxx`） |
| ④ | 联系 NvwaX 管理员 | 将该用户在 Admin 后台 → Token 管理 → 标记为「内部团队」 |

> ⚠️ **注意**: API Key 生成后立即复制保存，关闭弹窗后将无法再次查看完整密钥。

### 2.2 内部团队权限说明

标记为「内部团队」的用户调用 NvwaX API 时：

| 行为 | 说明 |
|------|------|
| API 认证 | 正常校验 API Key，正常放行 |
| 权限 | 全部权限 `*`，无限制 |
| Token 扣减 | **不扣减**配额，不产生超额费用 |
| 消费记录 | 仍记录消费明细，标记为 `[内部团队]` |
| 返回剩余 | `remaining: Infinity` |

## 3. API 基础信息

### 3.1 基础 URL

```
生产环境: https://nvwax.proclaw.cc
API 前缀: /api/v1
SDK 模块: @nvwax/sdk
```

### 3.2 认证方式

所有请求在 HTTP Header 中携带 API Key：

```
Authorization: Bearer nvwx_your_api_key_here
```

### 3.3 通用响应格式

```json
// 成功
{
  "success": true,
  "data": { ... }
}

// 失败
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### 3.4 错误码

| HTTP 状态码 | 错误码 | 说明 |
|-------------|--------|------|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 401 | `MISSING_AUTH_HEADER` | 缺少 Authorization Header |
| 401 | `INVALID_API_KEY` | API Key 无效或已过期 |
| 403 | `INSUFFICIENT_PERMISSIONS` | API Key 权限不足 |
| 404 | `NOT_FOUND` | 请求的资源不存在 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

## 4. API 端点清单

### 4.1 Marketplace — Agent/AiTeam 市场浏览

#### 搜索 Agent

```
GET /api/v1/marketplace/agents
Authorization: Bearer nvwx_xxx
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 否 | 搜索关键词 |
| category | string | 否 | 分类过滤 |
| tags | string | 否 | 标签过滤，逗号分隔 |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，最大 50，默认 20 |

#### 获取 Agent 详情

```
GET /api/v1/marketplace/agents/:id
Authorization: Bearer nvwx_xxx
```

#### 获取分类列表

```
GET /api/v1/marketplace/categories
Authorization: Bearer nvwx_xxx
```

#### 搜索 AiTeam

```
GET /api/v1/marketplace/aiteams
Authorization: Bearer nvwx_xxx
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 否 | 搜索关键词 |
| industry | string | 否 | 行业过滤 |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，最大 50，默认 20 |

#### 获取 AiTeam 详情

```
GET /api/v1/marketplace/aiteams/:id
Authorization: Bearer nvwx_xxx
```

#### 获取行业分类

```
GET /api/v1/marketplace/industries
Authorization: Bearer nvwx_xxx
```

#### 获取行业插件详情

```
GET /api/v1/marketplace/plugins/:id
Authorization: Bearer nvwx_xxx
```

### 4.2 Agents — Agent CRUD

#### 创建 Agent

```
POST /api/v1/agents
Authorization: Bearer nvwx_xxx
Content-Type: application/json

{
  "name": "Agent 名称",
  "description": "Agent 描述",
  "config": {
    "model": "deepseek-v3",
    "temperature": 0.7,
    "system_prompt": "系统提示词"
  }
}
```

#### 获取 Agent 列表

```
GET /api/v1/agents
Authorization: Bearer nvwx_xxx
```

| 参数 | 说明 |
|------|------|
| page | 页码，默认 1 |
| limit | 每页数量，最大 50，默认 20 |
| status | 过滤状态：draft / published |

#### 获取 Agent 详情

```
GET /api/v1/agents/:id
Authorization: Bearer nvwx_xxx
```

#### 更新 Agent

```
PUT /api/v1/agents/:id
Authorization: Bearer nvwx_xxx
Content-Type: application/json

{
  "name": "新名称",
  "description": "新描述",
  "config": { ... }
}
```

#### 删除 Agent

```
DELETE /api/v1/agents/:id
Authorization: Bearer nvwx_xxx
```

#### 发布 Agent

```
POST /api/v1/agents/:id/publish
Authorization: Bearer nvwx_xxx
```

#### 取消发布 Agent

```
POST /api/v1/agents/:id/unpublish
Authorization: Bearer nvwx_xxx
```

### 4.3 AiTeams — AiTeam CRUD

#### 创建 AiTeam

```
POST /api/v1/aiteams
Authorization: Bearer nvwx_xxx
Content-Type: application/json

{
  "name": "团队名称",
  "description": "团队描述",
  "members": [
    { "agent_id": "agent-uuid", "role": "主管" }
  ]
}
```

#### 获取 AiTeam 列表

```
GET /api/v1/aiteams
Authorization: Bearer nvwx_xxx
```

| 参数 | 说明 |
|------|------|
| page | 页码，默认 1 |
| limit | 每页数量，最大 50，默认 20 |

#### 获取 AiTeam 详情

```
GET /api/v1/aiteams/:id
Authorization: Bearer nvwx_xxx
```

#### 更新 AiTeam

```
PUT /api/v1/aiteams/:id
Authorization: Bearer nvwx_xxx
Content-Type: application/json

{
  "name": "新名称",
  "members": [...]
}
```

#### 删除 AiTeam

```
DELETE /api/v1/aiteams/:id
Authorization: Bearer nvwx_xxx
```

#### 发布 AiTeam

```
POST /api/v1/aiteams/:id/publish
Authorization: Bearer nvwx_xxx
```

#### 取消发布 AiTeam

```
POST /api/v1/aiteams/:id/unpublish
Authorization: Bearer nvwx_xxx
```

### 4.4 Search — 搜索

#### 搜索 Agent（跨平台）

```
GET /api/v1/search/agents?q=关键词
Authorization: Bearer nvwx_xxx
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 是 | 搜索关键词 |
| page | number | 否 | 页码 |
| limit | number | 否 | 每页数量 |

#### 搜索 SkillHub 技能

```
GET /api/v1/search/skills?q=关键词
Authorization: Bearer nvwx_xxx
```

#### 统一搜索

```
GET /api/v1/search?q=关键词
Authorization: Bearer nvwx_xxx
```

| 参数 | 说明 |
|------|------|
| q | 搜索关键词（必填） |
| type | 搜索类型：agents / skills / all，默认 all |
| page | 页码 |
| limit | 每页数量 |

### 4.5 Export — 导出

#### 导出 Agent

```
POST /api/v1/agents/:id/export
Authorization: Bearer nvwx_xxx
Content-Type: application/json

{
  "format": "json",
  "includeMetadata": true,
  "includeImplementation": false
}
```

| format 可选值 | 说明 |
|--------------|------|
| json | JSON 格式 |
| yaml | YAML 格式 |
| proclaw | ProClaw 专用格式（含完整元数据） |

#### 导出 AiTeam

```
POST /api/v1/aiteams/:id/export
Authorization: Bearer nvwx_xxx
Content-Type: application/json

{
  "format": "json",
  "includeMetadata": true
}
```

#### 批量导出

```
POST /api/v1/export/batch
Authorization: Bearer nvwx_xxx
Content-Type: application/json

{
  "items": [
    { "type": "agent", "id": "agent-uuid-1" },
    { "type": "aiteam", "id": "aiteam-uuid-2" }
  ],
  "format": "json"
}
```

#### 导出历史

```
GET /api/v1/export/history
Authorization: Bearer nvwx_xxx
```

### 4.6 消耗统计 API

ProClaw 可以通过此接口拉取本账号的 Token 消耗数据，用于对账和向 ProClaw 用户收费的依据。

```
GET /api/user/api-keys/usage?period=month
Authorization: Bearer <JWT_TOKEN>
```

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| period | string | 否 | month | 统计周期：day / week / month |

> ⚠️ **注意**: 此接口使用 JWT 认证（需登录 NvwaX 网页），非 API Key 认证。如果 ProClaw 需要以编程方式拉取数据，请使用 SDK 的 `client.getUsage()` 方法（走 API Key 认证）。

## 5. Token 消耗与计费机制

### 5.1 NvwaX 侧（已实现）

每次 API 调用时，NvwaX 会：
1. 校验 API Key 有效性 ✅
2. 检查 `is_internal_team` 标记
3. 如果为 true → **不扣减配额，不计超额费用**，仅记录消费明细
4. 记录内容包含：用户 ID、消耗 Token 数、端点、时间、模型

### 5.2 ProClaw 侧（需实现）

ProClaw 需要在自身系统中实现两级计费：

**方案一：实时拦截计费（推荐）**

```
ProClaw 用户请求 → ProClaw 检查用户余额/配额
  ├─ 充足 → 调用 NvwaX API → 记录消耗 → 扣减 ProClaw 用户额度
  └─ 不足 → 返回余额不足，不调 NvwaX API
```

**方案二：后付费月结**

```
每月初拉取 NvwaX 消耗统计
比对 ProClaw 本地记录
向 ProClaw 用户出具账单
```

### 5.3 Token 消耗记录建议字段

ProClaw 端推荐建立 `nvwax_usage_logs` 表：

```sql
CREATE TABLE nvwax_usage_logs (
  id TEXT PRIMARY KEY,
  proclaw_user_id TEXT NOT NULL,      -- ProClaw 用户 ID
  nvwax_user_id TEXT NOT NULL,        -- NvwaX 开发者账号
  tokens_consumed INTEGER NOT NULL,   -- 本次消耗 Token 数
  endpoint TEXT,                      -- 调用的 API 端点
  model TEXT,                         -- 使用的模型
  source TEXT,                        -- 来源（如 agent_chat, search 等）
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (proclaw_user_id) REFERENCES users(id)
);
```

### 5.4 定价建议（ProClaw 自定义）

ProClaw 可自定义面向自身用户的 Token 定价策略，与 NvwaX 无关：

| 模式 | 说明 |
|------|------|
| 免费额度 | 每月赠送 X Token，超出收费（推荐 100 万免费） |
| 按量计费 | 直接用完即付，¥Y / 百万 Token |
| 套餐制 | 月付套餐含固定 Token 数 |
| 企业版 | 月付固定费用，无限 Token |

## 6. SDK 集成（可选）

ProClaw 也可以直接使用 `@nvwax/sdk` npm 包进行集成：

```bash
npm install @nvwax/sdk
```

```typescript
import { createClient } from '@nvwax/sdk';

const client = createClient('nvwx_your_proclaw_api_key');

// 浏览市场
const agents = await client.marketplace.searchAgents({ q: '客服', limit: 10 });

// 获取 Agent 详情
const detail = await client.marketplace.getAgent('agent-uuid');

// 搜索技能
const skills = await client.search.searchSkills({ q: '自然语言' });

// 导出
const exported = await client.exportModule.agent('agent-uuid', { format: 'proclaw' });

// 获取消耗统计
const usage = await client.getUsage('month');
```

## 7. 实施清单

### ProClaw 侧实现步骤

| # | 任务 | 说明 |
|---|------|------|
| 1 | 注册 NvwaX 开发者账号 | 获取 API Key |
| 2 | 联系 NvwaX 管理员开通内部团队 | 保证不计费 |
| 3 | 创建 NvwaX API 客户端模块 | 封装 HTTP 请求，统一加 Authorization Header |
| 4 | 实现 Token 消耗记录表 | 建立 `nvwax_usage_logs` 或类似表 |
| 5 | 实现实时计费拦截 | 每次调 NvwaX API 前检查用户余额 |
| 6 | 接入 Marketplace 接口 | 浏览/搜索 Agent 和 AiTeam |
| 7 | 接入 Agent/AiTeam CRUD | 创建/更新/发布/删除 |
| 8 | 接入导出接口 | 导出 ProClaw 格式 |
| 9 | 实现消耗统计同步 | 定期拉取对账 |
| 10 | 部署验证 | 端到端测试 |

### 验收标准

- [ ] ProClaw 可调用 `GET /api/v1/marketplace/agents` 获取 Agent 列表
- [ ] ProClaw 可通过 API 创建/发布 Agent
- [ ] ProClaw 可通过 API 导入/导出 Agent（含 ProClaw 格式）
- [ ] NvwaX 侧 Token 消耗记录正确标记为 `[内部团队]`
- [ ] NvwaX 侧未产生任何超额费用
- [ ] ProClaw 侧正确记录每次 API 调用的 Token 消耗
- [ ] ProClaw 侧可向 ProClaw 用户正确展示 Token 用量和账单

---

## 附录：NvwaX 联系人

| 项目 | 信息 |
|------|------|
| NvwaX 平台地址 | https://nvwax.proclaw.cc |
| API 基础 URL | https://nvwax.proclaw.cc/api/v1 |
| SDK 包名 | @nvwax/sdk |
| Admin 后台 | https://nvwax.proclaw.cc/admin |
| 技术支持 | 联系 NvwaX 开发团队开通内部团队权限 |

---

## 📌 实施更新记录（v2.2.0 / Sprint 2.13–2.15）

> **本节为附录**：原 PRD 主体（§1-§7）描述 v1.0 设计的 Agent 集成 + 两级计费 + Marketplace 流程。
> **v2.2.0 起三个 Sprint 把范围扩展到"虚拟公司（Virtual Company）"双向闭环**，新增以下端点、服务、数据结构。
> 若要回顾原始设计，请看上方 §1-§7；若要查最新实施，请阅读本节。

### 新增端点（5 个）

| Method | Path | 用途 | Sprint |
|--------|------|------|--------|
| POST | `/api/aiteam-creation/sessions/:id/integrate-proclaw` | 把 session 数据组装成 `VirtualCompanyPackage` JSON，写入临时目录，返回 `downloadUrl` | 2.13 |
| GET  | `/api/aiteam-creation/packages/:packageId/download` | 返回 128-bit UUID 对应的导出包 JSON（packageId 不可枚举） | 2.13 |
| PUT  | `/api/aiteam-creation/sessions/:id/local-state` | 接收 ProClaw 推送的本地状态变更（Agent 启停 / 别名 / 负责人角色） | 2.14 |
| GET  | `/api/aiteam-creation/sessions/:id/local-state` | 拉取单个 session 的最新 `local_state` JSONB | 2.15 |
| GET  | `/api/aiteam-creation/sessions` | 列表响应增加 `local_state` + `localStateLastSyncedAt` 字段 | 2.15 |

### 新增 Service 方法

- `ProClawBackendService.buildVirtualCompanyPackageFromSession(sessionId, userId)`（Sprint 2.13）
  - 从 `aiteam_creation_sessions` 读 `team_design` / `ceo_config` / `agent_matches` / `skill_matches`
  - 兜底逻辑：若 `agent_matches` 为空，从 `team_design.roles` 提取
  - 计算 SHA-256 校验和写入 `checksum` 字段
- `ProClawBackendService.writePackageToTempFile(pkg)` / `readPackageFromTempFile(packageId)`（Sprint 2.13）
  - 临时目录：`os.tmpdir()/nvwax-vc-packages/{uuid}.nvwax-vc.json`
- `AiTeamCreationService.getLocalState(sessionId, userId)`（Sprint 2.15）

### 新增 Controller 方法

- `aiteamCreationController.integrateToProClaw`（Sprint 2.13）
  - 不再返回 mock：`success: true` + 真实 `downloadUrl` + `checksum` + `packageId`
- `aiteamCreationController.pushLocalState`（Sprint 2.14）
  - 接收 ProClaw 推送，写入 `aiteam_creation_sessions.local_state` JSONB
  - 返回 `{ sessionId, lastSyncedAt, agentsCount, teamStatus }`
- `aiteamCreationController.getLocalState`（Sprint 2.15）
  - 拉取单个 session 的 `local_state` JSONB

### 新增数据库迁移

`packages/nvwax-server/migrations/012_virtual_company_local_state.sql`：
- 在 `virtual_company_sessions` 表加 `local_state` JSONB 列（可空，老数据自动得 `null`）
- 加 GIN 索引 `idx_vcs_local_state_pkg`（基于 `(local_state->>'importedPackageId')`，加速多设备同步拉取）

> 详细部署说明见 [`packages/nvwax-server/migrations/README.md`](../packages/nvwax-server/migrations/README.md)（v2.2.0 新增迁移索引）。

### 跨包数据契约

新增 [`packages/nvwax-server/src/schemas/virtual-company-package.schema.json`](../packages/nvwax-server/src/schemas/virtual-company-package.schema.json)（**v1.0.0**，与 ProClaw 端 [`ProClaw/docs/integration/virtual-company-package.schema.json`](https://github.com/BiglionX/ProClaw/blob/main/docs/integration/virtual-company-package.schema.json) 双端镜像）：

```jsonc
{
  "schemaVersion": "1.0.0",         // 主版本不一致即拒绝导入
  "packageId": "uuid",              // 导入幂等键
  "exportedAt": "ISO-8601",         // 导出时间
  "source": { "platform": "nvwax", "sessionId": "..." },
  "team": { "id": "...", "name": "...", "ceoConfig": {...}, ... },
  "agents": [ { "id": "...", "name": "...", "role": "...", ... } ],
  "skills": [ ... ],                  // 可选
  "metadata": { ... }                // 可选
}
```

### 字段级 Last-Write-Wins 合并（多设备同步核心算法）

虽然合并逻辑在 ProClaw 端实现（[`ProClaw/src/lib/virtualCompanySync.ts`](https://github.com/BiglionX/ProClaw/blob/main/src/lib/virtualCompanySync.ts)），但 NvWaX 端需要保证 `lastSyncedAt` 字段单调递增：

```ts
// 简化版（实现细节见 ProClaw 端 mergeAgentState）
function lww(localVal, localTs, remoteVal, remoteTs) {
  if (localTs === 0 && remoteTs === 0) return remoteVal;  // 首次同步 → 云端权威
  if (remoteTs > localTs) return remoteVal;  // 远程新 → 用远程
  if (localTs > remoteTs) return localVal;    // 本地新 → 保留本地
  return remoteVal;                           // tie → 云端优先
}
```

### 三 Sprint 工时累计

| Sprint | 工时 | 关键交付 |
|--------|------|----------|
| **2.13** | ~28h | 1 套 JSON Schema + 3 个 Tauri 命令 + 4 个 React 路由 + 修复 plugin frontend bug |
| **2.14** | ~24h | CEO Skill + 220+ 行开发者文档 + 回写 API + SSE 流式 |
| **2.15** | ~22h | 字段级 LWW 合并引擎 + App 启动后台同步 + Companies 页报告卡片 |
| **合计** | **~74h** | 8 个 Tauri 命令 / 10 个 TS 类型 / 67 个新测试 |

### 与原始 PRD §7 实施清单对照

| 原 §7 任务 | 当前状态 | 说明 |
|-----------|---------|------|
| 1. 注册 NvwaX 开发者账号 | ✅ | 完成 |
| 2. 内部团队标记 | ✅ | 完成 |
| 3. NvwaX API 客户端模块 | ✅ | Rust 端 `src-tauri/src/services/nvwax_client.rs` |
| 4. Token 消耗记录表 | ✅ | `nvwax_billing.rs` |
| 5. 实时计费拦截 | ✅ | `billing.require_balance()` 前置检查 |
| 6. 接入 Marketplace 接口 | ✅ | `search_agents` / `get_agent_detail` 等 |
| 7. 接入 Agent/AiTeam CRUD | ✅ | `create_agent` / `update_agent` 等 |
| **8. 接入导出接口** | ✅→🚀 | v1.0 阶段：`exportModule.agent`；**v2.2.0 新增**：`/integrate-proclaw` 端点（生成 `VirtualCompanyPackage`） |
| 9. 消耗统计同步 | ✅ | `nvwax_sync_usage` Tauri 命令 |
| 10. 部署验证 | ✅ | 端到端测试覆盖 8 个 Tauri 命令 |

### 验收标准（v2.2.0 更新版）

在原 §7 验收基础上**新增**：

- [x] NvwaX 端 `integrateToProClaw` controller 真正生成 `.nvwax-vc.json`（不再返回 mock `proclaw_team_${Date.now()}`）
- [x] `GET /api/aiteam-creation/packages/:packageId/download` 端点可访问且返回合法 JSON
- [x] `PUT /api/aiteam-creation/sessions/:id/local-state` 接收 ProClaw 推送，合并入 `local_state` JSONB
- [x] `GET /api/aiteam-creation/sessions/:id/local-state` 拉取单 session 状态（供多设备同步用）
- [x] `GET /api/aiteam-creation/sessions` 列表响应包含 `local_state`
- [x] 数据库迁移 `012_virtual_company_local_state.sql` 已部署，`local_state` 列存在
- [x] 跨包 JSON Schema `virtual-company-package.schema.json` 在两端保持 1:1 一致（schemaVersion 1.0.0）

### 后续计划（非本轮范围）

- **v2.3.0**：虚拟公司模板市场反向发布（ProClaw → NvWaX marketplace）
- **v3.0.0**：Schema v2.0 主版本升级（ADR 流程）
- **持续**：与 ProClaw 端协调文档同步（[`MULTI_PROJECT_INTEGRATION_SPEC.md`](https://github.com/BiglionX/ProClaw/blob/main/docs/MULTI_PROJECT_INTEGRATION_SPEC.md) 第 11 节）
