# ProClaw × NvwaX API 集成需求文档

## 1. 整体架构

```
┌─────────────────────────────────────────────────┐
│                   ProClaw.cc                     │
│                                                   │
│  ProClaw 用户 ──→ ProClaw 后端 ──→ NvwaX API     │
│       ↑                  │                        │
│       │                  ▼                        │
│       └── ProClaw 自己收费 ── NvwaX 记录消耗       │
│                                                   │
│  两级计费：                                        │
│  - NvwaX 侧：放行，不计费，仅记录原始 Token 消耗    │
│  - ProClaw 侧：根据消耗记录向 ProClaw 用户收费      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                  NvwaX 服务                       │
│                                                   │
│  /api/v1/*  ←── API Key 认证                      │
│  user_token_quotas.is_internal_team = true       │
│  → 跳过配额扣减 → 仅记录消费明细                  │
│  → 返回 remaining: Infinity                      │
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
