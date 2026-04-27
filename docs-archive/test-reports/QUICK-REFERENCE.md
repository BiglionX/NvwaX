# NvwaX SDK 快速参考指南

## 🚀 快速开始

### 安装

```bash
npm install @nvwax/sdk
```

### 初始化

```typescript
import { createClient } from '@nvwax/sdk';

const client = createClient('nvwx_your_api_key', {
  baseURL: 'https://api.nvwax.com',
  timeout: 30000
});
```

---

## 💬 Chat API

### 简单聊天

```typescript
const response = await client.chat('Hello, how are you?');
console.log(response); // string
```

### 高级聊天

```typescript
const response = await client.createChatCompletion({
  model: 'marketing-team-v1',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is AI?' }
  ],
  temperature: 0.7,
  max_tokens: 500,
  top_p: 0.9
});

console.log(response.choices[0].message.content);
console.log(response.usage.total_tokens);
```

### 多轮对话

```typescript
const messages = [
  { role: 'user', content: 'What is machine learning?' }
];

// First message
const response1 = await client.createChatCompletion({
  model: 'general-assistant-v1',
  messages
});

messages.push(response1.choices[0].message);
messages.push({ role: 'user', content: 'Can you give examples?' });

// Continue conversation
const response2 = await client.createChatCompletion({
  model: 'general-assistant-v1',
  messages
});
```

---

## 🔑 API Key 管理

### 列出 API Keys

```typescript
const keys = await client.listApiKeys();
keys.forEach(key => {
  console.log(`${key.name}: ${key.prefix}...`);
});
```

### 创建 API Key

```typescript
const result = await client.createApiKey({
  name: 'Production Key',
  tenantId: 'tenant-uuid',
  permissions: ['sdk:*'],
  rateLimit: 1000,
  expiresInDays: 90
});

console.log('Secret:', result.data.secret_key); // Store securely!
```

### 删除 API Key

```typescript
await client.deleteApiKey('api-key-id');
```

---

## 📊 使用量统计

```typescript
const usage = await client.getUsage('month');
console.log(`Requests: ${usage.requests}`);
console.log(`Tokens: ${usage.tokens_used}`);
console.log(`Cost: $${usage.cost.toFixed(2)}`);
```

---

## 🔐 权限检查

```typescript
const hasPermission = await client.checkPermission('user-id', 'sdk:chat:create');
if (hasPermission) {
  console.log('User can create chat completions');
}
```

---

## 🎨 Web Components

### Agent Marketplace

```html
<nvwax-agent-marketplace 
  api-key="your-api-key"
  base-url="https://api.nvwax.com">
</nvwax-agent-marketplace>

<script>
  const marketplace = document.querySelector('nvwax-agent-marketplace');
  
  marketplace.addEventListener('skill-selected', (e) => {
    console.log('Selected:', e.detail.skill);
  });
</script>
```

### Agent Studio

```html
<nvwax-agent-studio 
  api-key="your-api-key"
  base-url="https://studio.nvwax.com">
</nvwax-agent-studio>

<script>
  const studio = document.querySelector('nvwax-agent-studio');
  
  studio.addEventListener('agent-saved', (e) => {
    console.log('Saved:', e.detail);
  });
  
  // Programmatic control
  studio.loadTemplate('template-id');
  studio.saveAgent();
  studio.publishAgent();
</script>
```

---

## 🔔 Webhooks

### 创建订阅

```bash
curl -X POST http://localhost:3001/api/sdk/webhooks \
  -H "Authorization: Bearer nvwx_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "chat.completed",
    "url": "https://your-app.com/webhook",
    "secret": "webhook-secret"
  }'
```

### 验证签名

```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## 💰 计费警报

### 创建警报

```bash
curl -X POST http://localhost:3001/api/sdk/billing/alerts \
  -H "Authorization: Bearer nvwx_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "threshold_type": "cost",
    "threshold_value": 100,
    "email": "admin@example.com"
  }'
```

### 获取账单报告

```bash
curl http://localhost:3001/api/sdk/billing/report?period=month \
  -H "Authorization: Bearer nvwx_api_key"
```

---

## ⚠️ 错误处理

```typescript
import { NvwaXError } from '@nvwax/sdk';

try {
  const response = await client.chat('Hello');
} catch (error) {
  if (error instanceof NvwaXError) {
    switch (error.code) {
      case 'AUTH_ERROR':
        console.error('Invalid API key');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        console.log(`Retry after: ${error.details.retryAfter}s`);
        await sleep(error.details.retryAfter * 1000);
        break;
      case 'FORBIDDEN':
        console.error('Insufficient permissions');
        break;
      default:
        console.error('Error:', error.message);
    }
  }
}
```

---

## 🔄 重试逻辑

```typescript
async function chatWithRetry(message: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await client.chat(message);
    } catch (error) {
      if (error.code === 'RATE_LIMIT_EXCEEDED' && i < retries - 1) {
        const waitTime = error.details.retryAfter * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
}
```

---

## 🌍 环境变量

```bash
# .env
NVWAX_API_KEY=nvwax_your_api_key
NVWAX_API_URL=https://api.nvwax.com
```

```typescript
const client = createClient(process.env.NVWAX_API_KEY!, {
  baseURL: process.env.NVWAX_API_URL
});
```

---

## 📦 React 集成

```jsx
import { useEffect, useState } from 'react';
import { createClient } from '@nvwax/sdk';

function ChatComponent() {
  const [response, setResponse] = useState('');
  const client = createClient(process.env.NEXT_PUBLIC_NVWAX_API_KEY!);

  const sendMessage = async (message) => {
    const result = await client.chat(message);
    setResponse(result);
  };

  return (
    <div>
      <button onClick={() => sendMessage('Hello')}>Send</button>
      <p>{response}</p>
    </div>
  );
}
```

---

## 🎯 最佳实践

### 1. API Key 安全

```typescript
// ❌ 不好
const client = createClient('nvwx_secret_key');

// ✅ 好
const client = createClient(process.env.NVWAX_API_KEY!);
```

### 2. 限制上下文长度

```typescript
// Keep only last 10 messages
if (messages.length > 10) {
  messages = messages.slice(-10);
}
```

### 3. 设置合理的超时

```typescript
const client = createClient(apiKey, {
  timeout: 60000 // 60 seconds for long operations
});
```

### 4. 使用正确的模型

```typescript
// Marketing tasks
model: 'marketing-team-v1'

// Customer service
model: 'customer-service-team-v1'

// General queries
model: 'general-assistant-v1'
```

---

## 📚 更多资源

- [完整文档](https://docs.nvwax.com)
- [API 参考](https://docs.nvwax.com/api-reference)
- [示例项目](/examples)
- [开发者社区](https://discord.gg/nvwax)

---

© 2026 NvwaX Team
