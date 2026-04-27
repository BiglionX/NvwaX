# SkillHub Workflow Engine - 快速启动指南

## 🚀 5 分钟快速开始

### 1. 安装依赖

```bash
cd packages/skillhub-workflow
npm install
```

### 2. 配置环境变量

编辑 `.env` 文件：

```env
PORT=3001

# OpenAI API Key（可选，用于 LLM 节点）
OPENAI_API_KEY=your_openai_api_key_here

# SkillHub API（已配置为在线版本）
SKILLHUB_API_URL=https://skillhub.proclaw.cc
SKILLHUB_API_KEY=

DATABASE_PATH=./data/workflows.db
LOG_LEVEL=info
```

**注意**: 
- 如果没有 OpenAI API Key，LLM 节点会自动使用 Mock 响应
- SkillHub API 已配置为在线版本，无需修改

### 3. 启动服务器

```bash
npm run dev
```

你会看到：
```
✅ Database initialized at: ./data/workflows.db
🚀 SkillHub Workflow Engine running on http://localhost:3001
📊 Health check: http://localhost:3001/health
📝 API docs: http://localhost:3001/api/workflows
```

### 4. 测试 API

#### 健康检查
```bash
curl http://localhost:3001/health
```

#### 获取 Agent 列表
```bash
curl http://localhost:3001/api/agents
```

#### 执行多 Agent 任务
```bash
curl -X POST http://localhost:3001/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "task": "帮我设计一个简单的博客系统"
  }'
```

---

## 📖 常用操作

### 创建工作流

```bash
curl -X POST http://localhost:3001/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Search AI Skills",
    "description": "Search for AI-related skills in SkillHub",
    "nodes": [
      {
        "id": "node_1",
        "type": "skillhub_search",
        "params": {
          "query": "AI",
          "limit": 5
        }
      },
      {
        "id": "node_2",
        "type": "llm",
        "params": {
          "prompt": "分析以下技能并推荐最适合的：{{node_1.skills}}",
          "model": "gpt-3.5-turbo"
        }
      }
    ],
    "edges": [
      { "from": "node_1", "to": "node_2" }
    ]
  }'
```

### 执行工作流

假设返回的工作流 ID 是 `abc-123`：

```bash
curl -X POST http://localhost:3001/api/workflows/abc-123/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": {}
  }'
```

### 查看所有工作流

```bash
curl http://localhost:3001/api/workflows
```

---

## 🤖 多 Agent 系统示例

### 示例 1: 简单任务

```bash
curl -X POST http://localhost:3001/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "task": "设计一个用户登录页面"
  }'
```

**预期输出**:
- Frontend Agent 会被调用
- 返回 React 组件设计和样式建议

### 示例 2: 复杂任务

```bash
curl -X POST http://localhost:3001/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "task": "创建一个完整的待办事项应用，包括数据库设计、后端 API 和前端界面"
  }'
```

**预期输出**:
- Database Agent: 设计表结构
- Backend Agent: 设计 API 端点
- Frontend Agent: 设计 UI 组件
- 执行策略: hybrid（混合执行）

---

## 🔧 可用的节点类型

### SkillHub 节点
- `skillhub_search`: 搜索技能
- `skillhub_detail`: 获取技能详情
- `semantic_search`: 语义搜索
- `tool_discovery`: 工具发现
- `related_skills`: 相关技能

### LLM 节点
- `llm`: 调用 OpenAI API

### 数据处理节点
- `text_process`: 文本处理
- `data_transform`: 数据转换

### 控制流节点
- `condition`: 条件判断
- `agent_router`: Agent 路由

---

## 📚 更多文档

- **完整 API 文档**: [API.md](./API.md)
- **项目 README**: [README.md](./README.md)
- **实施总结**: [IMPLEMENTATION-SUMMARY.md](../../IMPLEMENTATION-SUMMARY.md)

---

## ❓ 常见问题

### Q: OpenAI API Key 必须配置吗？
A: 不是必须的。如果没有配置，LLM 节点会返回 Mock 响应，适合开发和测试。

### Q: 如何更改端口？
A: 修改 `.env` 文件中的 `PORT` 变量。

### Q: 数据库文件在哪里？
A: 默认在 `./data/workflows.db`，可以通过 `DATABASE_PATH` 环境变量修改。

### Q: 如何查看日志？
A: 服务器启动后会在控制台输出日志。可以设置 `LOG_LEVEL=debug` 查看更多细节。

### Q: SkillHub API 连接失败怎么办？
A: 检查网络连接，确认 `SKILLHUB_API_URL` 配置正确。可以运行 `node test-api.js` 测试 API 连通性。

---

## 🎯 下一步

1. **阅读 API 文档**: 了解所有可用的端点和节点类型
2. **创建工作流**: 尝试创建和执行自己的工作流
3. **探索多 Agent 系统**: 测试不同的任务描述，观察 Agent 如何协作
4. **贡献代码**: 欢迎添加新的节点类型或改进现有功能

---

**祝你使用愉快！** 🎉
