# NvwaX 开发者公开 API 需求文档

**版本**: 1.0  
**日期**: 2026-06-05  
**状态**: 需求评审中  

---

## 1. 项目背景

NvwaX 定位为 AI Agent 智能体工厂，当前已具备完整的内部功能：Agent 广场、Agent 搜索、Agent 搭建工具、AiTeam 搭建工具、行业插件体系等。但所有功能仅对本站登录用户开放（基于 JWT Session 认证），尚未提供面向第三方开发者的公开 API。

### 1.1 当前已有基础

| 已有能力 | 说明 |
|---------|------|
| API Key 认证中间件 | 完整的 API Key 生成、验证、权限检查、速率限制、使用量统计 |
| `@nvwax/sdk` SDK 包 | 基础 SDK 结构（Chat + API Key 管理），可扩展 |
| Web Components | `nvwax-agent-marketplace`、`nvwax-agent-studio` 可嵌入式组件 |
| 开发者门户页面 | `/developer` 页面展示产品概览（大部分链接为占位） |
| 文件下载路由 | `/api/downloads` 已有基础下载能力 |
| Agent/AiTeam 导出 | `/api/agent-teams/:id/export` 导出为 JSON/YAML 包 |

### 1.2 核心缺口

**开发者登录后，以下功能均无法通过 API Key 编程式访问：**

- ❌ Agent 广场搜索与浏览（仅有内部 JWT 接口）
- ❌ Agent 搜索工具（GitHub/HuggingFace 源搜索未对外暴露）
- ❌ Agent 搭建工具（创建/配置/发布 Agent 无公开 API）
- ❌ AiTeam 搭建工具（创建/配置/发布 AiTeam 无公开 API）
- ❌ Agent 广场行业插件浏览与接入
- ❌ Agent/AiTeam 下载到开发者自有应用（导出格式：JSON/YAML/ProClaw）

---

## 2. 需求目标

为第三方开发者提供一套**完整的 RESTful API + SDK**，使其能够：

1. 使用 API Key 认证，在自有应用中编程式访问 NvwaX 的 Agent 生态
2. 在自有应用中嵌入 Agent 广场，浏览和搜索已发布的 Agent/AiTeam
3. 在自有应用中调用 Agent 搭建工具，创建和配置自定义 Agent
4. 在自有应用中调用 AiTeam 搭建工具，组建 AI 团队
5. 浏览行业插件市场，选择适合自己行业的 AiTeam 方案
6. **将选中的 Agent/AiTeam 导出（下载）到开发者自有应用中集成使用**

---

## 3. 功能需求详述

### 3.1 开发者 API Key 管理（部分已有，需增强）

**已有**:
- `POST /api/sdk/api-keys` — 创建 API Key
- `GET /api/sdk/api-keys` — 列出 API Keys
- `DELETE /api/sdk/api-keys/:id` — 删除 API Key
- `GET /api/sdk/usage` — 查询使用量

**需新增/增强**:

| 优先级 | 功能 | 说明 |
|-------|------|------|
| P0 | 用户端 API Key 管理 UI | 在用户中心 `/profile` 页提供 API Key 创建/查看/删除界面 |
| P0 | API Key 权限细分 | 当前默认 `sdk:*` 通配权限，需定义细粒度权限（见 3.7） |
| P1 | API Key 使用仪表盘 | 展示调用次数、Token 消耗、错误率等图表 |

### 3.2 Agent 广场公开 API

开发者可通过 API 浏览和搜索 NvwaX 市场上已发布的 Agent。

**需新增接口**:

#### 3.2.1 搜索/浏览已发布 Agent

```
GET /api/v1/marketplace/agents
```
认证: `Authorization: Bearer nvwx_xxx` (API Key)

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `q` | string | 否 | — | 搜索关键词 |
| `category` | string | 否 | — | 分类过滤 |
| `tags` | string | 否 | — | 标签过滤（逗号分隔） |
| `page` | number | 否 | 1 | 页码 |
| `limit` | number | 否 | 20 | 每页数量（最大 50） |
| `sort_by` | string | 否 | `popular` | 排序: `popular`, `newest`, `rating` |

**响应**:
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "agent-uuid",
        "name": "电商客服 Agent",
        "description": "智能客服机器人...",
        "category": "customer-service",
        "tags": ["ecommerce", "chatbot", "customer-support"],
        "author": { "id": "user-xxx", "name": "作者名" },
        "rating": 4.7,
        "download_count": 1523,
        "version": "1.2.0",
        "publish_status": "published",
        "created_at": "2026-05-01T10:00:00Z",
        "updated_at": "2026-06-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "total_pages": 8
    }
  }
}
```

#### 3.2.2 获取 Agent 详情

```
GET /api/v1/marketplace/agents/:id
```

**响应** 包含 Agent 完整信息：配置、技能列表、数据源、输出类型、依赖等。

#### 3.2.3 获取 Agent 分类列表

```
GET /api/v1/marketplace/categories
```

返回所有可用的 Agent 分类及每类数量。

---

### 3.3 Agent 搜索工具公开 API

开发者可调用 NvwaX 的聚合搜索引擎，搜索 GitHub、HuggingFace 等来源的 Agent。

**需新增接口**:

#### 3.3.1 全网 Agent 搜索

```
GET /api/v1/search/agents
```
认证: API Key

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `q` | string | 是 | 搜索关键词 |
| `source` | string | 否 | 来源过滤: `github`, `huggingface`, `all`（默认 all） |
| `page` | number | 否 | 页码 |
| `limit` | number | 否 | 每页数量 |

**响应**:
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "ext-xxx",
        "name": "awesome-ai-agent",
        "description": "...",
        "source": "github",
        "url": "https://github.com/...",
        "stars": 5200,
        "language": "Python",
        "tags": ["llm", "agent", "autonomous"]
      }
    ],
    "sources": {
      "github": 120,
      "huggingface": 45
    },
    "pagination": { ... }
  }
}
```

#### 3.3.2 SkillHub 技能搜索

```
GET /api/v1/search/skills
```

搜索 SkillHub 上的可复用技能。

#### 3.3.3 统一搜索

```
POST /api/v1/search/unified
```

一次请求同时搜索 Agents + Skills + AiTeams。

---

### 3.4 Agent 搭建工具公开 API

开发者可通过 API 创建、配置、管理自己的 Agent。

**需新增接口**:

#### 3.4.1 创建 Agent

```
POST /api/v1/agents
```
认证: API Key + `agent:create` 权限

**请求体**:
```json
{
  "name": "我的自定义 Agent",
  "description": "用于处理订单查询的智能体",
  "config": {
    "model": "deepseek-v3",
    "temperature": 0.7,
    "system_prompt": "你是一个订单查询助手..."
  },
  "skills": ["order-query", "database-connector"],
  "data_sources": ["postgresql://..."],
  "output_types": ["text", "json"],
  "category": "customer-service",
  "tags": ["ecommerce", "order"]
}
```

#### 3.4.2 列出我的 Agent

```
GET /api/v1/agents
```

返回当前开发者创建的所有 Agent。

#### 3.4.3 获取/更新/删除 Agent

```
GET    /api/v1/agents/:id
PUT    /api/v1/agents/:id
DELETE /api/v1/agents/:id
```

#### 3.4.4 发布 Agent 到市场

```
POST /api/v1/agents/:id/publish
```

将草稿 Agent 发布到 NvwaX 市场，供其他开发者搜索和使用。

#### 3.4.5 取消发布

```
POST /api/v1/agents/:id/unpublish
```

---

### 3.5 AiTeam 搭建工具公开 API

开发者可通过 API 创建、配置多 Agent 协作的 AiTeam。

**需新增接口**:

#### 3.5.1 创建 AiTeam

```
POST /api/v1/aiteams
```
认证: API Key + `aiteam:create` 权限

**请求体**:
```json
{
  "name": "电商运营团队",
  "description": "负责电商日常运营的 AI 团队",
  "members": [
    { "agent_id": "agent-uuid-1", "role": "客服主管" },
    { "agent_id": "agent-uuid-2", "role": "数据分析师" },
    { "agent_id": "agent-uuid-3", "role": "内容编辑" }
  ],
  "category": "ecommerce",
  "tags": ["operations", "marketing"],
  "workflow_config": {
    "orchestration": "sequential"
  }
}
```

#### 3.5.2 列出/获取/更新/删除 AiTeam

```
GET    /api/v1/aiteams
GET    /api/v1/aiteams/:id
PUT    /api/v1/aiteams/:id
DELETE /api/v1/aiteams/:id
```

#### 3.5.3 发布/取消发布 AiTeam

```
POST /api/v1/aiteams/:id/publish
POST /api/v1/aiteams/:id/unpublish
```

#### 3.5.4 浏览已发布 AiTeam

```
GET /api/v1/marketplace/aiteams
```

类似 Agent 广场，浏览市场上已发布的 AiTeam。

---

### 3.6 Agent/AiTeam 导出与下载 API 🎯 核心需求

这是开发者将 NvwaX 上的 Agent/AiTeam **集成到自有应用** 的关键能力。

**需新增接口**:

#### 3.6.1 导出 Agent

```
POST /api/v1/agents/:id/export
```
认证: API Key

**请求体**:
```json
{
  "format": "json"  // 支持: "json", "yaml", "proclaw"
}
```

**响应**: 直接返回文件下载流
- `Content-Type: application/json` 或 `application/x-yaml` 或 `application/zip`
- `Content-Disposition: attachment; filename="agent-name-v1.0.0.json"`

**导出格式说明**:

**JSON 格式** — 通用格式，包含完整的 Agent 定义：
```json
{
  "format_version": "1.0",
  "type": "agent",
  "name": "电商客服 Agent",
  "description": "...",
  "config": { ... },
  "skills": [ ... ],
  "data_sources": [ ... ],
  "dependencies": { ... },
  "nvwax_metadata": {
    "id": "agent-uuid",
    "version": "1.2.0",
    "exported_at": "2026-06-05T10:00:00Z"
  }
}
```

**YAML 格式** — 同上，YAML 输出。

**ProClaw 格式** — 专为 ProClaw 本地桌面端设计的包格式（ZIP）：
```
agent-name-v1.0.0.proclaw.zip
├── manifest.json        # Agent 元数据
├── config.json          # 配置
├── skills/              # 技能定义
├── prompts/             # 提示词模板
└── README.md            # 使用说明
```

#### 3.6.2 导出 AiTeam

```
POST /api/v1/aiteams/:id/export
```

认证: API Key

**请求体**:
```json
{
  "format": "json",
  "include_agents": true  // 是否包含成员 Agent 的完整定义
}
```

导出格式类似 Agent，但包含团队编排配置和成员列表。

**AiTeam JSON 导出示例**:
```json
{
  "format_version": "1.0",
  "type": "aiteam",
  "name": "电商运营团队",
  "description": "...",
  "orchestration": "sequential",
  "members": [
    {
      "role": "客服主管",
      "agent": { /* 内嵌完整 Agent 定义 */ }
    }
  ],
  "nvwax_metadata": { ... }
}
```

#### 3.6.3 批量导出

```
POST /api/v1/export/batch
```

**请求体**:
```json
{
  "items": [
    { "type": "agent", "id": "agent-uuid-1" },
    { "type": "aiteam", "id": "aiteam-uuid-2" }
  ],
  "format": "proclaw"
}
```

一次导出多个 Agent/AiTeam，打包为单个 ZIP。

---

### 3.7 行业插件市场 API

开发者可浏览和筛选面向特定行业的 AiTeam 方案（如餐饮、零售、教育等）。

#### 3.7.1 行业分类列表

```
GET /api/v1/marketplace/industries
```

#### 3.7.2 按行业浏览 AiTeam

```
GET /api/v1/marketplace/aiteams?industry=catering
```

#### 3.7.3 行业插件详情

```
GET /api/v1/marketplace/plugins/:id
```

返回行业插件的完整信息：适用场景、预置工作流、所需技能等。

---

### 3.8 API Key 权限体系设计

当前默认权限为 `sdk:*`，需要细化为：

| 权限标识 | 说明 | 对应接口 |
|---------|------|---------|
| `marketplace:read` | 浏览 Agent 广场 | `GET /api/v1/marketplace/*` |
| `search:read` | 使用搜索工具 | `GET /api/v1/search/*` |
| `agent:create` | 创建 Agent | `POST /api/v1/agents` |
| `agent:read` | 读取自己的 Agent | `GET /api/v1/agents` |
| `agent:update` | 更新自己的 Agent | `PUT /api/v1/agents/:id` |
| `agent:delete` | 删除自己的 Agent | `DELETE /api/v1/agents/:id` |
| `agent:publish` | 发布 Agent 到市场 | `POST /api/v1/agents/:id/publish` |
| `aiteam:create` | 创建 AiTeam | `POST /api/v1/aiteams` |
| `aiteam:read` | 读取自己的 AiTeam | `GET /api/v1/aiteams` |
| `aiteam:update` | 更新自己的 AiTeam | `PUT /api/v1/aiteams/:id` |
| `aiteam:delete` | 删除自己的 AiTeam | `DELETE /api/v1/aiteams/:id` |
| `aiteam:publish` | 发布 AiTeam 到市场 | `POST /api/v1/aiteams/:id/publish` |
| `export:read` | 导出/下载 Agent/AiTeam | `POST /api/v1/*/export` |
| `chat:create` | 调用 Chat API | `POST /v1/chat/completions` |
| `sdk:api-keys:*` | 管理自己的 API Keys | `/api/sdk/api-keys/*` |
| `sdk:usage:read` | 查看使用量统计 | `GET /api/sdk/usage` |

**预设权限套餐**:

| 套餐 | 包含权限 | 适用场景 |
|------|---------|---------|
| **免费版** | `marketplace:read`, `search:read`, `chat:create` (限流 1000/h) | 浏览和体验 |
| **专业版** | 免费版 + `agent:*`, `aiteam:*`, `export:read` (限流 50000/h) | 正式开发集成 |
| **企业版** | 全部权限，无限流 | 深度集成和定制 |

---

## 4. SDK 扩展需求

`@nvwax/sdk` 需新增以下方法：

```typescript
// Agent 广场
client.marketplace.searchAgents({ q, category, page, limit })
client.marketplace.getAgent(id)
client.marketplace.getCategories()
client.marketplace.searchAiTeams({ q, industry, page, limit })

// Agent 搜索
client.search.searchAgents({ q, source, page, limit })
client.search.searchSkills({ q, page, limit })
client.search.unifiedSearch({ q, types })

// Agent 管理
client.agents.create({ name, description, config, skills, ... })
client.agents.list()
client.agents.get(id)
client.agents.update(id, data)
client.agents.delete(id)
client.agents.publish(id)
client.agents.unpublish(id)

// AiTeam 管理
client.aiteams.create({ name, members, ... })
client.aiteams.list()
client.aiteams.get(id)
client.aiteams.update(id, data)
client.aiteams.delete(id)
client.aiteams.publish(id)
client.aiteams.unpublish(id)

// 导出下载
client.export.agent(id, { format: 'json' | 'yaml' | 'proclaw' })
client.export.aiteam(id, { format, includeAgents })
client.export.batch({ items, format })

// 行业插件
client.marketplace.getIndustries()
client.marketplace.getPlugins({ industry })
```

---

## 5. 开发者门户页面增强

`/developer` 页面目前大量链接为占位符（如 `/docs/api/chat-completions`、`/playground`、`/webhook-debugger` 等），需要：

| 优先级 | 工作项 | 说明 |
|-------|--------|------|
| P0 | API Reference 文档 | 生成完整的 OpenAPI 3.0 规范文档，支持 Swagger UI 在线浏览 |
| P0 | 快速开始指南 | 5 分钟上手教程：获取 Key → 安装 SDK → 第一个 API 调用 |
| P1 | API Playground | 在线 API 调试工具（类似 Postman 的 Web 版） |
| P1 | SDK 代码生成器 | 输入需求，自动生成调用代码 |
| P2 | Webhook 调试器 | 调试 Agent/AiTeam 的事件回调 |

---

## 6. 技术实现建议

### 6.1 路由设计

所有公开 API 统一挂在 `/api/v1/` 下，与内部 API (`/api/`) 隔离：

```
/api/v1/marketplace/...    # Agent 广场
/api/v1/search/...          # 搜索工具
/api/v1/agents/...          # Agent 管理
/api/v1/aiteams/...         # AiTeam 管理
/api/v1/export/...          # 导出下载
/api/v1/marketplace/plugins/... # 行业插件
```

### 6.2 认证流程

```
开发者自有应用                   NvwaX API
     │                              │
     │  POST /api/sdk/api-keys      │
     │  (创建 API Key)              │
     │◄─────────────────────────────│
     │  { secret_key: "nvwx_..." }  │
     │                              │
     │  GET /api/v1/marketplace/agents │
     │  Authorization: Bearer nvwx_...│
     │◄─────────────────────────────│
     │  { agents: [...], ... }      │
```

### 6.3 复用现有基础

- **认证中间件**: 复用 `api-key-auth.middleware.ts` + `requirePermission()`
- **速率限制**: 复用 `apiKeyService.checkRateLimit()`
- **使用量统计**: 复用 `apiKeyService.recordUsage()`
- **导出逻辑**: 复用 `projectController.exportAgentTeam()` 和 `buildPackage()`
- **下载服务**: 复用 `download.routes.ts`

### 6.4 新增文件清单

```
packages/nvwax-server/src/
├── routes/
│   └── v1/
│       ├── marketplace.routes.ts    # Agent 广场公开路由
│       ├── search.routes.ts         # 搜索工具公开路由
│       ├── agents.routes.ts         # Agent 管理公开路由
│       ├── aiteams.routes.ts        # AiTeam 管理公开路由
│       ├── export.routes.ts         # 导出下载公开路由
│       └── index.ts                 # v1 路由汇总
├── controllers/
│   └── v1/
│       ├── marketplace.controller.ts
│       ├── search.controller.ts
│       ├── agent.controller.ts
│       ├── aiteam.controller.ts
│       └── export.controller.ts
└── services/
    └── v1/
        ├── marketplace.service.ts
        └── export.service.ts

packages/nvwax-sdk/src/
└── v1/
    ├── marketplace.ts    # 广场模块
    ├── search.ts         # 搜索模块
    ├── agents.ts         # Agent 管理模块
    ├── aiteams.ts        # AiTeam 管理模块
    └── export.ts         # 导出模块

packages/nvwax-web/app/[locale]/
├── (user-center)/profile/
│   └── api-keys/              # API Key 管理页面
│       └── page.tsx
└── developer/
    └── api-reference/         # API 参考文档
        └── page.tsx
```

---

## 7. 验收标准

1. ✅ 开发者可在用户中心生成/管理 API Key，选择权限套餐
2. ✅ 使用 API Key 可成功调用 `GET /api/v1/marketplace/agents` 获取 Agent 列表
3. ✅ 使用 API Key 可成功调用 `GET /api/v1/search/agents?q=客服` 进行全网搜索
4. ✅ 使用 API Key 可成功创建 Agent (`POST /api/v1/agents`)，并发布到市场
5. ✅ 使用 API Key 可成功创建 AiTeam (`POST /api/v1/aiteams`)，并发布到市场
6. ✅ 使用 API Key 可成功将 Agent 导出为 JSON/YAML/ProClaw 格式并下载
7. ✅ `@nvwax/sdk` 封装上述所有功能，开发者可通过 SDK 调用
8. ✅ `/developer` 页面提供完整的 API Reference 文档和快速开始指南
9. ✅ 速率限制正确生效，超过限额返回 429 错误
10. ✅ 权限控制正确生效，无权限请求返回 403 错误

---

## 8. 里程碑规划

| 阶段 | 内容 | 预估工期 |
|------|------|---------|
| **Phase 1: 基础通路** | API Key 权限细化、v1 路由框架搭建、Agent 广场读接口 + SDK 封装 | 3-5 天 |
| **Phase 2: 搭建能力** | Agent/AiTeam 创建/管理 API + 发布/取消发布 | 3-5 天 |
| **Phase 3: 导出下载** | Agent/AiTeam 多格式导出 + 批量导出 + SDK 封装 | 2-3 天 |
| **Phase 4: 搜索 + 插件** | 全网搜索 API + 行业插件 API + 统一搜索 | 2-3 天 |
| **Phase 5: 门户完善** | API Reference 文档、Playground、SDK 代码生成器、API Key 管理 UI | 3-5 天 |

**总预估**: 13-21 天

---

**文档作者**: NvwaX Team  
**最后更新**: 2026-06-05
