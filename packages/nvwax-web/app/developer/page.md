# NvwaX 开发者门户

欢迎来到 NvwaX 开发者中心!这里提供完整的 API 文档、SDK 指南和示例代码,帮助您快速集成 NvwaX AI 服务。

---

## 🚀 快速开始

### 1. 获取 API Key

访问 [NvwaX Console](https://console.nvwax.com) 创建账户并生成 API Key。

### 2. 安装 SDK

```bash
npm install @nvwax/sdk
```

### 3. 发送第一个请求

```typescript
import { createClient } from '@nvwax/sdk';

const client = createClient('nvwx_your_api_key');

const response = await client.chat('Hello, NvwaX!');
console.log(response);
```

---

## 📚 核心产品

### 1. Chat Completions API

OpenAI 兼容的对话 API,支持多 Agent 协作。

**端点**: `POST /v1/chat/completions`

```typescript
const response = await client.createChatCompletion({
  model: 'marketing-team-v1',
  messages: [
    { role: 'user', content: 'How to improve conversion rates?' }
  ],
  temperature: 0.7
});
```

[查看完整文档 →](/docs/api/chat-completions)

### 2. Agent Marketplace Web Component

将 Agent 广场嵌入您的应用。

```html
<nvwax-agent-marketplace 
  api-key="your-api-key"
  base-url="https://api.nvwax.com">
</nvwax-agent-marketplace>
```

[查看完整文档 →](/docs/components/agent-marketplace)

### 3. Agent Studio

低代码 Agent 构建器,可视化创建工作流。

```html
<nvwax-agent-studio 
  api-key="your-api-key"
  base-url="https://studio.nvwax.com">
</nvwax-agent-studio>
```

[查看完整文档 →](/docs/components/agent-studio)

---

## 🛠️ SDK 和工具

### JavaScript/TypeScript SDK

- **包名**: `@nvwax/sdk`
- **支持环境**: Node.js 14+, 现代浏览器
- **功能**: Chat API, API Key 管理, 使用量统计

[安装指南 →](/docs/sdk/javascript)

### Web Components

- **Agent Marketplace**: `@nvwax/agent-marketplace`
- **Agent Studio**: `@nvwax/agent-studio`
- **框架支持**: React, Vue, Angular, 原生 JS

[组件文档 →](/docs/components)

### API 客户端库

- Python (即将推出)
- Go (即将推出)
- Java (即将推出)

---

## 📖 API 参考

### 认证

所有 API 请求都需要在 Header 中包含 API Key:

```
Authorization: Bearer nvwx_your_api_key
```

### 速率限制

| 套餐 | 每小时请求数 |
|------|-------------|
| Free | 1,000 |
| Pro | 50,000 |
| Enterprise | 无限制 |

超出限制将返回 `429 Too Many Requests`。

### 错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 认证失败 |
| 403 | 权限不足 |
| 429 | 速率限制 |
| 500 | 服务器错误 |

[完整 API 参考 →](/docs/api-reference)

---

## 💡 示例项目

### 1. 客服机器人

使用 NvwaX 构建智能客服系统。

[查看示例 →](/examples/customer-service-bot)

### 2. 营销内容生成器

自动生成营销文案和社交媒体内容。

[查看示例 →](/examples/marketing-content-generator)

### 3. 数据分析助手

连接数据源,自动生成洞察报告。

[查看示例 →](/examples/data-analysis-assistant)

### 4. 代码审查助手

自动审查代码并提供改进建议。

[查看示例 →](/examples/code-review-assistant)

[查看更多示例 →](/examples)

---

## 🔧 开发者工具

### API Playground

在线测试 API 端点,无需编写代码。

[打开 Playground →](/playground)

### Webhook 调试工具

测试和调试 Webhook 事件。

[打开调试工具 →](/webhook-debugger)

### SDK 生成器

根据您的配置生成定制化的 SDK 代码。

[打开生成器 →](/sdk-generator)

---

## 📊 计费与配额

### 定价方案

| 方案 | 价格 | Token 配额 | 功能 |
|------|------|-----------|------|
| Free | $0/月 | 100K | 基础功能 |
| Pro | $49/月 | 5M | 高级功能 + 优先支持 |
| Enterprise | 定制 | 无限制 | 专属支持 + SLA |

### 使用量监控

实时查看 API 使用情况和成本。

[查看控制台 →](https://console.nvwax.com/usage)

---

## 🎓 学习资源

### 教程

- [5分钟快速入门](/tutorials/quick-start)
- [构建第一个 Agent](/tutorials/build-first-agent)
- [集成到 React 应用](/tutorials/react-integration)
- [Webhook 最佳实践](/tutorials/webhook-best-practices)

### 视频课程

- NvwaX 平台概览
- 高级 Agent 编排技巧
- 性能优化指南

[查看所有教程 →](/tutorials)

### 博客

- [如何提升 Agent 响应质量](/blog/improve-agent-quality)
- [多租户架构设计](/blog/multi-tenant-architecture)
- [Webhook 安全最佳实践](/blog/webhook-security)

[阅读博客 →](/blog)

---

## 🤝 社区与支持

### Discord 社区

加入我们的开发者社区,与其他开发者交流经验。

[加入 Discord →](https://discord.gg/nvwax)

### GitHub

查看源代码,报告问题,提交 PR。

[访问 GitHub →](https://github.com/BigLionX/NvwaX)

### 技术支持

- **邮箱**: support@nvwax.com
- **工单系统**: [提交工单](https://console.nvwax.com/support)
- **响应时间**: 
  - Free: 48小时
  - Pro: 24小时
  - Enterprise: 4小时

---

## 📢 更新日志

### v1.0.0 (2026-04-26)

- ✅ 发布 Chat Completions API
- ✅ 发布 JavaScript SDK
- ✅ 发布 Agent Marketplace Web Component
- ✅ 发布 Agent Studio iframe 组件
- ✅ 支持 Webhook 事件系统
- ✅ 支持 RBAC 权限控制

[查看完整更新日志 →](/changelog)

---

## ❓ 常见问题

### Q: 如何获取 API Key?

A: 注册账户后,在 [Console](https://console.nvwax.com/api-keys) 中生成 API Key。

### Q: 支持哪些编程语言?

A: 目前官方支持 JavaScript/TypeScript。Python、Go、Java 客户端正在开发中。

### Q: 如何升级套餐?

A: 在 [Console](https://console.nvwax.com/billing) 中选择新套餐并完成支付。

### Q: 可以私有化部署吗?

A: 是的,Enterprise 套餐支持私有化部署。请联系销售团队了解详情。

[查看更多 FAQ →](/faq)

---

## 📞 联系我们

- **销售咨询**: sales@nvwax.com
- **技术支持**: support@nvwax.com
- **商务合作**: partnerships@nvwax.com

---

© 2026 NvwaX. All rights reserved.

[隐私政策](/privacy) | [服务条款](/terms) | [状态页面](https://status.nvwax.com)
