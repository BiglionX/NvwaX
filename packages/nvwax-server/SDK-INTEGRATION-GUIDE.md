# NvwaX SDK 集成指南

本文档介绍如何使用 NvwaX SDK 将 AI 能力集成到您的应用中。

## 📋 目录

- [快速开始](#快速开始)
- [API Key 管理](#api-key-管理)
- [认证方式](#认证方式)
- [速率限制](#速率限制)
- [错误处理](#错误处理)
- [示例代码](#示例代码)

---

## 快速开始

### 1. 获取 API Key

首先,您需要在 NvwaX 平台创建一个租户并生成 API Key:

```bash
# 运行数据库迁移(仅首次需要)
cd packages/nvwax-server
pnpm run migrate-sdk
```

### 2. 安装 SDK (即将发布)

```bash
npm install @nvwax/sdk
# 或
yarn add @nvwax/sdk
# 或
pnpm add @nvwax/sdk
```

### 3. 基本使用

```javascript
import { NvwaXClient } from '@nvwax/sdk';

const client = new NvwaXClient({
  apiKey: 'nvwx_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
});

// 发送对话请求
const response = await client.chat.completions.create({
  model: 'marketing-team-v1',
  messages: [
    { role: 'user', content: '如何提升产品转化率?' }
  ]
});

console.log(response.choices[0].message.content);
```

---

## API Key 管理

### 创建 API Key

**端点**: `POST /api/sdk/api-keys`

**请求体**:
```json
{
  "name": "Production API Key",
  "tenantId": "your-tenant-id",
  "permissions": ["sdk:*"],
  "rateLimit": 1000,
  "expiresInDays": 90
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "key-123",
    "key_prefix": "nvwx_abc12345",
    "secret_key": "nvwx_abc12345_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Production API Key",
    "permissions": ["sdk:*"],
    "rate_limit": 1000,
    "expires_at": "2026-07-25T00:00:00.000Z",
    "created_at": "2026-04-26T00:00:00.000Z",
    "warning": "Store your secret key securely. It will not be shown again."
  }
}
```

⚠️ **重要**: `secret_key` 仅在创建时显示一次,请妥善保存!

### 列出 API Keys

**端点**: `GET /api/sdk/api-keys`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "key-123",
      "key_prefix": "nvwx_abc12345",
      "name": "Production API Key",
      "permissions": ["sdk:*"],
      "rate_limit": 1000,
      "expires_at": "2026-07-25T00:00:00.000Z",
      "last_used_at": "2026-04-26T12:00:00.000Z",
      "is_active": true,
      "created_at": "2026-04-26T00:00:00.000Z"
    }
  ]
}
```

### 轮换 API Key

**端点**: `POST /api/sdk/api-keys/:id/rotate`

此操作会停用旧密钥并创建新密钥,适用于安全事件响应。

### 删除 API Key

**端点**: `DELETE /api/sdk/api-keys/:id`

立即撤销 API Key,所有使用该密钥的请求将被拒绝。

---

## 认证方式

所有 SDK API 请求都需要在请求头中包含 API Key:

```http
Authorization: Bearer nvwx_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### cURL 示例

```bash
curl -X GET https://api.nvwax.com/api/sdk/api-keys \
  -H "Authorization: Bearer nvwx_abc12345_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### JavaScript 示例

```javascript
const response = await fetch('https://api.nvwax.com/api/sdk/api-keys', {
  headers: {
    'Authorization': 'Bearer nvwx_abc12345_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  }
});
```

---

## 速率限制

每个 API Key 都有速率限制,默认值为每小时 1000 次请求。您可以在创建 API Key 时自定义此值。

### 速率限制响应头

每次 API 响应都会包含以下头部信息:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1714118400
```

### 超出速率限制

当超出速率限制时,您将收到 `429 Too Many Requests` 响应:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please upgrade your plan or wait before making more requests.",
    "retry_after": 3600
  },
  "headers": {
    "Retry-After": "3600",
    "X-RateLimit-Limit": "1000",
    "X-RateLimit-Remaining": "0",
    "X-RateLimit-Reset": "1714118400"
  }
}
```

### 升级配额

如需更高的速率限制,请升级到 Pro 或 Enterprise 套餐,或联系支持团队。

---

## 错误处理

### 错误响应格式

所有错误响应都遵循以下格式:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### 常见错误代码

| 错误代码 | HTTP 状态码 | 说明 |
|---------|------------|------|
| `MISSING_AUTH_HEADER` | 401 | 缺少 Authorization 头部 |
| `INVALID_AUTH_FORMAT` | 401 | Authorization 头部格式错误 |
| `INVALID_API_KEY` | 401 | API Key 无效或已过期 |
| `INSUFFICIENT_PERMISSIONS` | 403 | 权限不足 |
| `RATE_LIMIT_EXCEEDED` | 429 | 超出速率限制 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

### 错误处理示例

```javascript
try {
  const response = await client.chat.completions.create({
    model: 'marketing-team-v1',
    messages: [{ role: 'user', content: 'Hello' }]
  });
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    console.log('Rate limited. Retry after:', error.retry_after);
  } else if (error.code === 'INVALID_API_KEY') {
    console.error('Invalid API key. Please check your credentials.');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

---

## 示例代码

### Node.js

```javascript
const { NvwaXClient } = require('@nvwax/sdk');

const client = new NvwaXClient({
  apiKey: process.env.NVWX_API_KEY
});

async function main() {
  try {
    const response = await client.chat.completions.create({
      model: 'marketing-team-v1',
      messages: [
        { role: 'system', content: 'You are a helpful marketing assistant.' },
        { role: 'user', content: 'How can I improve my email open rates?' }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    console.log('Response:', response.choices[0].message.content);
    console.log('Tokens used:', response.usage.total_tokens);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

### Python (使用 requests)

```python
import requests
import os

API_KEY = os.environ.get('NVWX_API_KEY')
BASE_URL = 'https://api.nvwax.com/v1'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

response = requests.post(
    f'{BASE_URL}/chat/completions',
    headers=headers,
    json={
        'model': 'marketing-team-v1',
        'messages': [
            {'role': 'user', 'content': 'How to increase conversion rates?'}
        ]
    }
)

if response.status_code == 200:
    data = response.json()
    print(data['choices'][0]['message']['content'])
else:
    print(f'Error: {response.status_code}')
    print(response.json())
```

### cURL

```bash
curl -X POST https://api.nvwax.com/v1/chat/completions \
  -H "Authorization: Bearer nvwx_abc12345_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "marketing-team-v1",
    "messages": [
      {"role": "user", "content": "What are the best practices for SEO?"}
    ],
    "temperature": 0.7,
    "max_tokens": 1000
  }'
```

---

## 权限系统

NvwaX 使用基于角色的访问控制 (RBAC)。每个 API Key 都有一组权限,决定它可以访问哪些资源。

### 权限格式

权限使用冒号分隔的层级结构:

- `sdk:*` - 所有 SDK 功能
- `sdk:api-keys:*` - API Key 管理
- `sdk:api-keys:create` - 创建 API Key
- `sdk:chat:*` - Chat API 访问
- `sdk:usage:read` - 查看使用统计

### 通配符权限

使用 `*` 作为通配符:

- `sdk:*` 匹配所有以 `sdk:` 开头的权限
- `*` 匹配所有权限(超级管理员)

---

## 使用量统计

您可以查询 API 使用量统计信息:

**端点**: `GET /api/sdk/usage?period=month`

**查询参数**:
- `period`: `day`, `week`, 或 `month` (默认: `month`)

**响应**:
```json
{
  "success": true,
  "data": {
    "period": "month",
    "usage": {
      "total_requests": 1234,
      "total_tokens": 56789,
      "total_cost": 12.34,
      "successful_requests": 1200,
      "failed_requests": 30,
      "rate_limited_requests": 4,
      "avg_response_time": 245.5
    },
    "quota": {
      "current": 1234,
      "limit": 50000,
      "percentage": 2.47
    }
  }
}
```

---

## Webhooks (即将推出)

Webhooks 允许您在事件发生时接收实时通知。

### 注册 Webhook

**端点**: `POST /api/sdk/webhooks`

```json
{
  "url": "https://your-domain.com/webhook",
  "events": ["chat.completed", "task.started"],
  "secret": "your-webhook-secret"
}
```

### 验证 Webhook 签名

每个 webhook 请求都包含 `X-NvwaX-Signature` 头部,使用 HMAC-SHA256 签名:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}
```

---

## 最佳实践

### 1. 安全存储 API Key

- ✅ 使用环境变量: `process.env.NVWX_API_KEY`
- ✅ 使用密钥管理服务 (如 AWS Secrets Manager)
- ❌ 不要硬编码在代码中
- ❌ 不要提交到版本控制系统

### 2. 错误重试

实现指数退避重试策略:

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s...
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 3. 监控使用量

定期检查使用量统计,避免意外超额:

```javascript
const stats = await client.usage.getStats({ period: 'month' });
if (stats.quota.percentage > 80) {
  console.warn('Approaching quota limit!');
}
```

### 4. 定期轮换密钥

建议每 90 天轮换一次 API Key:

```bash
curl -X POST https://api.nvwax.com/api/sdk/api-keys/{key-id}/rotate \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 支持

- 📖 **完整文档**: [https://docs.nvwax.com](https://docs.nvwax.com)
- 💬 **社区论坛**: [https://community.nvwax.com](https://community.nvwax.com)
- 🐛 **问题反馈**: [GitHub Issues](https://github.com/BigLionX/NvwaX/issues)
- 📧 **电子邮件**: support@nvwax.com

---

## 变更日志

### v1.0.0 (2026-04-26)

- ✨ 初始版本发布
- 🔑 API Key 管理系统
- 🛡️ RBAC 权限控制
- 📊 使用量统计
- ⚡ 速率限制

---

**祝您使用愉快!** 🚀
