# DeepSeek API 配置指南

## 概述

NvwaX 现已支持使用 DeepSeek 大模型作为 AI Agent 的后端引擎。DeepSeek 提供了高性能、低成本的中文语言模型服务。

## 获取 API Key

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册/登录账号
3. 在控制台创建 API Key
4. 复制你的 API Key

## 配置环境变量

### 方式一：使用 .env 文件（推荐）

在项目根目录创建或编辑 `.env` 文件：

```bash
# DeepSeek API 配置
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 或者继续使用 OpenAI API（可选）
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 方式二：系统环境变量

```bash
# Linux/Mac
export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Windows PowerShell
$env:DEEPSEEK_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Windows CMD
set DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 使用的模型

当前配置使用 **deepseek-chat** 模型，这是 DeepSeek 的对话优化模型，适合：
- 自然语言对话
- 需求分析
- 角色推荐
- 代码生成

## 优先级

系统会按以下顺序查找 API Key：
1. `DEEPSEEK_API_KEY` （优先）
2. `OPENAI_API_KEY` （兼容）

如果两者都未配置，系统将使用模拟响应（mock responses）。

## 验证配置

启动后端服务后，查看日志：

```
✅ DeepSeek API configured
NvwaX Server is running on http://localhost:3001
```

如果看到警告信息：
```
⚠️ DEEPSEEK_API_KEY not configured. Using mock responses.
```

说明 API Key 未正确配置，请检查环境变量。

## API 端点

DeepSeek API 端点：`https://api.deepseek.com/v1`

该端点与 OpenAI API 完全兼容，因此可以使用相同的 SDK。

## 费用说明

DeepSeek 提供具有竞争力的价格：
- deepseek-chat: ¥2 / 百万 tokens（输入），¥8 / 百万 tokens（输出）
- 新用户通常有免费额度

详细价格请参考 [DeepSeek 定价页面](https://platform.deepseek.com/pricing)

## 故障排除

### 问题：API 调用失败

**可能原因：**
1. API Key 无效或已过期
2. 账户余额不足
3. 网络连接问题

**解决方案：**
- 检查 API Key 是否正确
- 确认账户有足够的余额
- 检查网络连接和防火墙设置

### 问题：仍然使用模拟响应

**可能原因：**
- 环境变量未正确加载

**解决方案：**
- 确保 `.env` 文件存在且格式正确
- 重启后端服务
- 检查日志确认 API 配置状态

## 切换回 OpenAI

如果想切换回 OpenAI，只需：

1. 注释或删除 `DEEPSEEK_API_KEY`
2. 设置 `OPENAI_API_KEY`
3. 重启服务

系统会自动检测并使用可用的 API。

## 更多信息

- [DeepSeek 官方文档](https://platform.deepseek.com/docs)
- [DeepSeek API 参考](https://platform.deepseek.com/api-docs)
- [NvwaX 项目主页](../README.md)
