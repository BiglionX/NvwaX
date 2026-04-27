# NvwaX SDK 示例项目集合

本目录包含使用 NvwaX SDK 构建的实际应用示例。

## 📚 示例列表

### 1. 客服机器人 (Customer Service Bot)
**路径**: `examples/customer-service-bot/`  
**说明**: 构建智能客服系统,自动回答常见问题  
**技术**: Node.js + @nvwax/sdk  
**难度**: ⭐⭐

### 2. 营销内容生成器 (Marketing Content Generator)
**路径**: `examples/marketing-content-generator/`  
**说明**: 自动生成营销文案、社交媒体内容和邮件模板  
**技术**: Next.js + @nvwax/sdk  
**难度**: ⭐⭐⭐

### 3. 数据分析助手 (Data Analysis Assistant)
**路径**: `examples/data-analysis-assistant/`  
**说明**: 连接数据源,自动生成洞察报告  
**技术**: Python (计划中)  
**难度**: ⭐⭐⭐⭐

### 4. 代码审查助手 (Code Review Assistant)
**路径**: `examples/code-review-assistant/`  
**说明**: 自动审查代码并提供改进建议  
**技术**: VS Code Extension + @nvwax/sdk  
**难度**: ⭐⭐⭐⭐

### 5. Web Component 嵌入示例
**路径**: `examples/web-component-embed/`  
**说明**: 在 React/Vue/Angular 应用中嵌入 Agent Marketplace  
**技术**: React + Vue + Angular  
**难度**: ⭐⭐

### 6. Agent Studio 集成示例
**路径**: `examples/agent-studio-integration/`  
**说明**: 将低代码 Agent 构建器嵌入到您的应用  
**技术**: HTML + JavaScript  
**难度**: ⭐⭐

---

## 🚀 快速开始

### 前置要求

- Node.js 18+
- pnpm 或 npm
- NvwaX API Key ([获取地址](https://console.nvwax.com))

### 运行示例

```bash
# 进入示例目录
cd examples/customer-service-bot

# 安装依赖
npm install

# 配置 API Key
cp .env.example .env
# 编辑 .env,添加您的 API Key

# 运行示例
npm start
```

---

## 📖 示例详细说明

### 1. 客服机器人

**功能**:
- 自动回答常见问题
- 多轮对话支持
- 情感分析
- 工单创建

**使用场景**:
- 电商客服
- SaaS 产品支持
- 企业内部帮助台

**代码亮点**:
```typescript
import { createClient } from '@nvwax/sdk';

const client = createClient(process.env.NVWAX_API_KEY!);

async function handleCustomerQuery(query: string, history: any[]) {
  const response = await client.createChatCompletion({
    model: 'customer-service-team-v1',
    messages: [
      ...history,
      { role: 'user', content: query }
    ]
  });
  
  return response.choices[0].message.content;
}
```

### 2. 营销内容生成器

**功能**:
- 博客文章生成
- 社交媒体帖子
- 电子邮件营销
- A/B 测试文案

**使用场景**:
- 内容营销团队
- 社交媒体管理
- 电子邮件营销活动

**代码亮点**:
```typescript
// 生成博客文章
const blogPost = await client.chat(
  'Write a blog post about AI in marketing, 1000 words'
);

// 生成社交媒体帖子
const tweet = await client.chat(
  'Create a Twitter thread about our new product launch'
);
```

### 3. Web Component 嵌入

**React 示例**:
```jsx
import { useEffect } from 'react';
import '@nvwax/agent-marketplace';

function App() {
  useEffect(() => {
    const marketplace = document.querySelector('nvwax-agent-marketplace');
    
    marketplace?.addEventListener('skill-selected', (e) => {
      console.log('Selected agent:', e.detail.skill);
    });
  }, []);

  return (
    <nvwax-agent-marketplace 
      api-key={process.env.REACT_APP_NVWAX_API_KEY}
    />
  );
}
```

**Vue 示例**:
```vue
<template>
  <nvwax-agent-marketplace 
    :api-key="apiKey"
    @skill-selected="handleSkillSelected"
  />
</template>

<script setup>
import { ref } from 'vue';
import '@nvwax/agent-marketplace';

const apiKey = ref(process.env.VUE_APP_NVWAX_API_KEY);

const handleSkillSelected = (event) => {
  console.log('Selected:', event.detail.skill);
};
</script>
```

### 4. Agent Studio 集成

**功能**:
- 嵌入式低代码编辑器
- 实时保存
- 版本控制
- 一键发布

**代码示例**:
```html
<nvwax-agent-studio 
  api-key="your-api-key"
  base-url="https://studio.nvwax.com"
  @agent-saved="handleSave"
  @agent-published="handlePublish">
</nvwax-agent-studio>

<script>
function handleSave(event) {
  console.log('Agent saved:', event.detail);
  // Save to your database
}

function handlePublish(event) {
  console.log('Agent published:', event.detail);
  // Update UI, show success message
}
</script>
```

---

## 💡 最佳实践

### 1. API Key 安全

```typescript
// ❌ 不好: 硬编码 API Key
const client = createClient('nvwx_secret_key');

// ✅ 好: 从环境变量读取
const client = createClient(process.env.NVWAX_API_KEY!);
```

### 2. 错误处理

```typescript
import { NvwaXError } from '@nvwax/sdk';

try {
  const response = await client.chat('Hello');
} catch (error) {
  if (error instanceof NvwaXError) {
    switch (error.code) {
      case 'RATE_LIMIT_EXCEEDED':
        // 等待后重试
        await sleep(error.details.retryAfter * 1000);
        break;
      case 'AUTH_ERROR':
        // 检查 API Key
        console.error('Invalid API key');
        break;
      default:
        console.error('API error:', error.message);
    }
  }
}
```

### 3. 速率限制处理

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

### 4. Webhook 验证

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
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

## 🎓 学习资源

- [官方文档](https://docs.nvwax.com)
- [API 参考](https://docs.nvwax.com/api-reference)
- [SDK 文档](https://docs.nvwax.com/sdk)
- [开发者社区](https://discord.gg/nvwax)

---

## 🤝 贡献

欢迎提交新的示例!请遵循以下步骤:

1. Fork 仓库
2. 创建新分支 (`git checkout -b feature/my-example`)
3. 添加示例代码和文档
4. 提交 PR

---

© 2026 NvwaX Team. All rights reserved.
