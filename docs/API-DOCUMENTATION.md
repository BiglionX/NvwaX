# NvwaX Agent Factory API 文档

**版本**: 1.0.0  
**基础 URL**: `http://localhost:3001/api`  
**认证方式**: JWT Bearer Token（部分接口需要）

---

## 📋 目录

- [1. 模板搜索 API](#1-模板搜索-api)
- [2. 技能分析 API](#2-技能分析-api)
- [3. 悬赏管理 API](#3-悬赏管理-api)
- [4. 用户积分 API](#4-用户积分-api)
- [5. 错误处理](#5-错误处理)

---

## 1. 模板搜索 API

### 1.1 搜索模板

**端点**: `GET /api/templates/search`

**描述**: 搜索可用的智能体模板，支持关键词、分类、技能等多维度过滤。

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `q` | string | 否 | - | 搜索关键词（支持中文） |
| `category` | string | 否 | - | 分类过滤 |
| `skills` | string[] | 否 | - | 技能过滤（逗号分隔） |
| `minStars` | number | 否 | 0 | 最低星级 |
| `source` | string[] | 否 | - | 数据源过滤（github,gitee,huggingface） |
| `isTemplate` | boolean | 否 | true | 是否仅返回模板 |
| `page` | number | 否 | 1 | 页码 |
| `limit` | number | 否 | 20 | 每页数量（最大 100） |
| `sortBy` | string | 否 | relevance | 排序字段：relevance, stars, downloads, created_at |
| `order` | string | 否 | desc | 排序方向：asc, desc |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "agent-123",
        "name": "电商客服智能体",
        "description": "自动回复客户咨询的客服机器人",
        "source": "github",
        "url": "https://github.com/example/ecommerce-customer-service",
        "stars": 1523,
        "downloads": 3421,
        "skills": ["customer-service", "intent-recognition", "knowledge-retrieval"],
        "useCases": ["电商客服", "售后支持", "订单咨询"],
        "dataSources": ["订单数据库", "商品库存 API"],
        "outputTypes": ["文本回复", "JSON 数据"],
        "matchScore": 95.5,
        "createdAt": "2026-04-20T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

**使用示例**:

```bash
# 搜索客服相关模板
curl "http://localhost:3001/api/templates/search?q=客服&minStars=100&page=1&limit=10"

# 按技能过滤
curl "http://localhost:3001/api/templates/search?skills=customer-service,order-query"

# 按星级排序
curl "http://localhost:3001/api/templates/search?sortBy=stars&order=desc"
```

---

### 1.2 获取模板详情

**端点**: `GET /api/templates/:id`

**描述**: 获取单个模板的详细信息。

**路径参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | 是 | 模板 ID |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "agent-123",
    "name": "电商客服智能体",
    "description": "自动回复客户咨询的客服机器人",
    "source": "github",
    "url": "https://github.com/example/ecommerce-customer-service",
    "downloadUrl": "https://github.com/example/ecommerce-customer-service/archive/main.zip",
    "stars": 1523,
    "downloads": 3421,
    "skills": [
      {
        "name": "客户服务",
        "slug": "customer-service",
        "description": "处理客户咨询和投诉的技能"
      },
      {
        "name": "意图识别",
        "slug": "intent-recognition",
        "description": "识别用户意图和需求"
      }
    ],
    "useCases": ["电商客服", "售后支持", "订单咨询"],
    "dataSources": ["订单数据库", "商品库存 API"],
    "outputTypes": ["文本回复", "JSON 数据"],
    "templateVersion": "1.2.0",
    "compatibility": {
      "minNodeVersion": "18.0.0",
      "requiredServices": ["database", "redis"]
    },
    "installationGuide": "## 安装步骤\n\n1. 克隆仓库...\n2. 安装依赖...",
    "author": {
      "id": "user-456",
      "name": "张三",
      "avatar": "https://..."
    },
    "createdAt": "2026-04-20T10:30:00Z",
    "updatedAt": "2026-04-24T15:20:00Z"
  }
}
```

---

## 2. 技能分析 API

### 2.1 分析技能缺口

**端点**: `POST /api/skills/analyze`

**描述**: 分析用户需求与模板技能的差距，推荐补充技能。

**请求体**:

```json
{
  "userRequirement": "我需要一个能自动回复客户咨询并查询订单状态的客服智能体",
  "templateId": "agent-123"
}
```

或者（不提供 templateId 时）：

```json
{
  "userRequirement": "我需要一个能自动回复客户咨询并查询订单状态的客服智能体",
  "templateSkills": ["customer-service", "intent-recognition"]
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `userRequirement` | string | 是 | 用户需求描述（自然语言） |
| `templateId` | string | 否* | 选中的模板 ID |
| `templateSkills` | string[] | 否* | 模板包含的技能列表 |

*\* `templateId` 和 `templateSkills` 至少提供一个*

**响应示例**:

```json
{
  "success": true,
  "data": {
    "requiredSkills": [
      "customer-service",
      "order-query",
      "intent-recognition"
    ],
    "availableSkills": [
      "customer-service",
      "intent-recognition"
    ],
    "missingSkills": [
      "order-query"
    ],
    "suggestedSkills": [
      {
        "name": "订单查询技能",
        "slug": "order-query",
        "description": "从订单数据库中查询订单状态和详情",
        "category": "data_processing",
        "matchScore": 95,
        "source": "skillhub",
        "downloadCount": 1523,
        "rating": 4.7
      }
    ],
    "analysis": {
      "confidence": 0.92,
      "reasoning": "用户需求包含两个核心功能：客服回复和订单查询。模板已具备客服能力（customer-service, intent-recognition），但缺少订单查询技能（order-query）。建议补充该技能以实现完整功能。"
    }
  }
}
```

**使用示例**:

```bash
curl -X POST http://localhost:3001/api/skills/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userRequirement": "我需要一个能自动回复客户咨询并查询订单状态的客服智能体",
    "templateId": "agent-123"
  }'
```

---

### 2.2 搜索技能

**端点**: `GET /api/skills/search`

**描述**: 在技能库中搜索可用技能。

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `q` | string | 否 | - | 搜索关键词 |
| `category` | string | 否 | - | 分类过滤 |
| `status` | string | 否 | active | 状态过滤 |
| `page` | number | 否 | 1 | 页码 |
| `limit` | number | 否 | 20 | 每页数量 |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "id": "skill-789",
        "name": "订单查询技能",
        "slug": "order-query",
        "description": "从订单数据库中查询订单状态和详情",
        "category": "data_processing",
        "version": "1.2.0",
        "author": {
          "id": "user-456",
          "name": "李四"
        },
        "downloadCount": 1523,
        "rating": 4.7,
        "repositoryUrl": "https://github.com/example/order-query-skill",
        "documentationUrl": "https://docs.example.com/order-query"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

## 3. 悬赏管理 API

### 3.1 创建悬赏

**端点**: `POST /api/bounties`

**描述**: 发布新的技能开发悬赏任务。

**认证**: ✅ 需要 JWT Token

**请求体**:

```json
{
  "title": "开发订单查询技能",
  "description": "需要一个能从 PostgreSQL 数据库查询订单状态的智能体技能，支持按订单号、用户 ID、时间范围等条件查询。",
  "requiredSkills": ["database-connector", "postgresql", "data-processing"],
  "rewardAmount": 500,
  "currency": "points",
  "deadline": "2026-05-25T23:59:59Z"
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `title` | string | 是 | 悬赏标题 |
| `description` | string | 是 | 详细描述 |
| `requiredSkills` | string[] | 是 | 完成任务所需的技能 |
| `rewardAmount` | number | 是 | 悬赏金额（积分） |
| `currency` | string | 否 | 货币类型（默认 points） |
| `deadline` | string | 否 | 截止时间（ISO 8601） |

**响应示例**:

```json
{
  "success": true,
  "message": "悬赏发布成功",
  "data": {
    "id": "bounty-abc123",
    "title": "开发订单查询技能",
    "status": "open",
    "rewardAmount": 500,
    "currency": "points",
    "creatorId": "user-456",
    "createdAt": "2026-04-25T10:00:00Z",
    "deadline": "2026-05-25T23:59:59Z"
  }
}
```

**错误响应**:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_POINTS",
    "message": "积分余额不足，当前余额: 300, 需要: 500"
  }
}
```

---

### 3.2 查询悬赏列表

**端点**: `GET /api/bounties`

**描述**: 查询悬赏列表，支持多种过滤条件。

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `status` | string | 否 | open | 状态过滤：open, claimed, submitted, completed |
| `creatorId` | string | 否 | - | 发布者 ID |
| `claimerId` | string | 否 | - | 领取者 ID |
| `skill` | string | 否 | - | 按技能过滤 |
| `minReward` | number | 否 | 0 | 最低悬赏金额 |
| `page` | number | 否 | 1 | 页码 |
| `limit` | number | 否 | 20 | 每页数量 |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "bounties": [
      {
        "id": "bounty-abc123",
        "title": "开发订单查询技能",
        "description": "需要一个能从 PostgreSQL 数据库查询订单状态的智能体技能...",
        "requiredSkills": ["database-connector", "postgresql", "data-processing"],
        "rewardAmount": 500,
        "currency": "points",
        "status": "open",
        "creator": {
          "id": "user-456",
          "name": "张三",
          "avatar": "https://..."
        },
        "claimer": null,
        "deadline": "2026-05-25T23:59:59Z",
        "createdAt": "2026-04-25T10:00:00Z",
        "applicationCount": 3
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    }
  }
}
```

---

### 3.3 获取悬赏详情

**端点**: `GET /api/bounties/:id`

**描述**: 获取单个悬赏的详细信息。

**路径参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | 是 | 悬赏 ID |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "bounty-abc123",
    "title": "开发订单查询技能",
    "description": "需要一个能从 PostgreSQL 数据库查询订单状态的智能体技能...",
    "requiredSkills": ["database-connector", "postgresql", "data-processing"],
    "rewardAmount": 500,
    "currency": "points",
    "status": "claimed",
    "creator": {
      "id": "user-456",
      "name": "张三",
      "avatar": "https://..."
    },
    "claimer": {
      "id": "user-789",
      "name": "李四",
      "avatar": "https://..."
    },
    "submissionUrl": null,
    "verificationNotes": null,
    "deadline": "2026-05-25T23:59:59Z",
    "createdAt": "2026-04-25T10:00:00Z",
    "claimedAt": "2026-04-26T14:30:00Z",
    "submittedAt": null,
    "verifiedAt": null,
    "completedAt": null
  }
}
```

---

### 3.4 领取悬赏

**端点**: `POST /api/bounties/:id/claim`

**描述**: 开发者领取悬赏任务。

**认证**: ✅ 需要 JWT Token

**路径参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | 是 | 悬赏 ID |

**响应示例**:

```json
{
  "success": true,
  "message": "悬赏领取成功",
  "data": {
    "id": "bounty-abc123",
    "status": "claimed",
    "claimerId": "user-789",
    "claimedAt": "2026-04-26T14:30:00Z"
  }
}
```

**错误响应**:

```json
{
  "success": false,
  "error": {
    "code": "BOUNTY_NOT_AVAILABLE",
    "message": "该悬赏已被领取或已完成"
  }
}
```

---

### 3.5 提交成果

**端点**: `POST /api/bounties/:id/submit`

**描述**: 开发者提交完成的成果。

**认证**: ✅ 需要 JWT Token（必须是领取者）

**路径参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | 是 | 悬赏 ID |

**请求体**:

```json
{
  "submissionUrl": "https://github.com/liSi/order-query-skill",
  "description": "已完成订单查询技能开发，支持按订单号、用户 ID、时间范围查询。已添加单元测试和文档。"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "成果提交成功，等待验证",
  "data": {
    "id": "bounty-abc123",
    "status": "submitted",
    "submissionUrl": "https://github.com/liSi/order-query-skill",
    "submittedAt": "2026-04-28T16:45:00Z"
  }
}
```

---

### 3.6 验证并支付

**端点**: `POST /api/bounties/:id/verify`

**描述**: 悬赏发布者验证提交的成果并支付赏金。

**认证**: ✅ 需要 JWT Token（必须是发布者）

**路径参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | 是 | 悬赏 ID |

**请求体**:

```json
{
  "approved": true,
  "notes": "代码质量很好，测试覆盖率高，已通过验证。"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "验证通过，赏金已支付",
  "data": {
    "id": "bounty-abc123",
    "status": "completed",
    "verifiedAt": "2026-04-29T10:00:00Z",
    "completedAt": "2026-04-29T10:00:00Z",
    "rewardTransferred": 400,
    "platformFee": 100
  }
}
```

**业务逻辑**:
- 如果 `approved=true`:
  - 转移 80% 积分给领取者
  - 平台抽成 20%
  - 状态改为 `completed`
- 如果 `approved=false`:
  - 状态改回 `open`
  - 清除 claimer_id
  - 返回验证意见

---

### 3.7 取消悬赏

**端点**: `DELETE /api/bounties/:id`

**描述**: 取消悬赏（仅限发布者，且状态为 open）。

**认证**: ✅ 需要 JWT Token（必须是发布者）

**路径参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | 是 | 悬赏 ID |

**响应示例**:

```json
{
  "success": true,
  "message": "悬赏已取消，积分已退还",
  "data": {
    "id": "bounty-abc123",
    "status": "cancelled",
    "refundedAmount": 500
  }
}
```

---

## 4. 用户积分 API

### 4.1 查询积分余额

**端点**: `GET /api/users/:id/points`

**描述**: 查询用户的积分余额和统计信息。

**认证**: ✅ 需要 JWT Token（只能查询自己的积分）

**路径参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | 是 | 用户 ID |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "userId": "user-456",
    "balance": 1250.00,
    "totalEarned": 2000.00,
    "totalSpent": 750.00
  }
}
```

---

### 4.2 查询积分流水

**端点**: `GET /api/users/:id/points/transactions`

**描述**: 查询用户的积分交易记录。

**认证**: ✅ 需要 JWT Token（只能查询自己的流水）

**路径参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | 是 | 用户 ID |

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `type` | string | 否 | - | 交易类型过滤 |
| `page` | number | 否 | 1 | 页码 |
| `limit` | number | 否 | 20 | 每页数量 |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn-001",
        "amount": 100.00,
        "type": "register_bonus",
        "description": "注册赠送积分",
        "createdAt": "2026-04-20T10:00:00Z"
      },
      {
        "id": "txn-002",
        "amount": -500.00,
        "type": "bounty_payment",
        "description": "发布悬赏：开发订单查询技能",
        "referenceId": "bounty-abc123",
        "createdAt": "2026-04-25T10:00:00Z"
      },
      {
        "id": "txn-003",
        "amount": 400.00,
        "type": "bounty_reward",
        "description": "完成悬赏奖励",
        "referenceId": "bounty-def456",
        "createdAt": "2026-04-29T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

---

### 4.3 每日签到

**端点**: `POST /api/users/:id/points/checkin`

**描述**: 用户每日签到获得积分。

**认证**: ✅ 需要 JWT Token（只能签到自己账户）

**路径参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | 是 | 用户 ID |

**响应示例**:

```json
{
  "success": true,
  "message": "签到成功，获得 5 积分",
  "data": {
    "amount": 5.00,
    "newBalance": 1255.00,
    "streakDays": 7,
    "lastCheckin": "2026-04-25T08:00:00Z"
  }
}
```

**错误响应**:

```json
{
  "success": false,
  "error": {
    "code": "ALREADY_CHECKED_IN",
    "message": "今日已签到，请明天再来"
  }
}
```

---

## 5. 错误处理

### 5.1 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "人类可读的错误描述",
    "details": {} // 可选，额外信息
  }
}
```

### 5.2 常见错误码

| 错误码 | HTTP 状态码 | 描述 |
|--------|------------|------|
| `INVALID_TOKEN` | 401 | JWT Token 无效或过期 |
| `INSUFFICIENT_PERMISSIONS` | 403 | 权限不足 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `INSUFFICIENT_POINTS` | 400 | 积分余额不足 |
| `BOUNTY_NOT_AVAILABLE` | 400 | 悬赏不可用（已领取/已完成） |
| `DUPLICATE_CLAIM` | 400 | 重复领取悬赏 |
| `NOT_THE_CLAIMER` | 403 | 不是悬赏领取者 |
| `NOT_THE_CREATOR` | 403 | 不是悬赏发布者 |
| `DEADLINE_PASSED` | 400 | 已超过截止时间 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

### 5.3 错误示例

**验证失败**:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "fields": [
        {
          "field": "title",
          "message": "标题不能为空"
        },
        {
          "field": "rewardAmount",
          "message": "悬赏金额必须大于 0"
        }
      ]
    }
  }
}
```

**资源不存在**:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "模板不存在",
    "details": {
      "templateId": "agent-999"
    }
  }
}
```

---

## 6. 认证

### 6.1 JWT Token 获取

通过登录接口获取 JWT Token：

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**响应**:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-456",
      "email": "user@example.com",
      "name": "张三"
    }
  }
}
```

### 6.2 使用 Token

在请求头中添加 Bearer Token：

```bash
curl http://localhost:3001/api/bounties \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 7. 速率限制

- **未认证用户**: 60 请求/分钟
- **认证用户**: 300 请求/分钟
- **搜索 API**: 30 请求/分钟（防止滥用）

超过限制将返回 `429 Too Many Requests` 错误。

---

## 8. 版本控制

API 版本通过 URL 路径控制：

- 当前版本: `/api/v1/...` （简化为 `/api/...`）
- 未来版本: `/api/v2/...`

向后兼容性保证： minor 版本更新不会破坏现有接口。

---

**文档最后更新**: 2026-04-25  
**API 版本**: 1.0.0  
**维护者**: NvwaX Team
