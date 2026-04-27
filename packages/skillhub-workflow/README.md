# SkillHub Workflow Engine

轻量级工作流引擎，用于 SkillHub 集成和多 Agent 协作。

## 🆕 新功能

### 多 Agent 系统
- ✅ 支持自动任务分解和 Agent 分配
- ✅ 5 种专业 Agent：Frontend、Backend、Database、Test、Docs
- ✅ 支持并行、串行和混合执行策略
- ✅ 智能任务路由和结果整合

### 新增节点类型
- `semantic_search`: 语义搜索
- `tool_discovery`: 工具发现
- `related_skills`: 相关技能推荐
- `llm`: 真实 OpenAI API 集成
- `agent_router`: Agent 路由
- `data_transform`: 数据转换
- `parallel_execute`: 并行执行（计划中）

### 可视化编辑器
- 基于 React Flow 的拖拽式编辑器（设计中）
- 实时保存和执行工作流
- 支持多种节点类型

## 🚀 快速开始

### 安装依赖

```bash
cd packages/skillhub-workflow
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
PORT=3001
OPENAI_API_KEY=your_key_here
SKILLHUB_API_URL=http://localhost:8080
```

### 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

## 📡 API 端点

### 健康检查
```bash
GET http://localhost:3001/health
```

### 管理工作流

#### 创建工作流
```bash
POST http://localhost:3001/api/workflows
Content-Type: application/json

{
  "name": "My Workflow",
  "description": "Test workflow",
  "nodes": [...],
  "edges": [...]
}
```

#### 获取工作流列表
```bash
GET http://localhost:3001/api/workflows
```

#### 获取单个工作流
```bash
GET http://localhost:3001/api/workflows/:id
```

#### 执行工作流
```bash
POST http://localhost:3001/api/workflows/:id/execute
Content-Type: application/json

{
  "input": {
    "query": "search term"
  }
}
```

## 🔧 节点类型

### 1. SkillHub Search (`skillhub_search`)
搜索 SkillHub 中的技能

**参数**:
- `query`: 搜索关键词
- `limit`: 返回数量限制

### 2. LLM (`llm`)
调用大语言模型

**参数**:
- `prompt`: 提示词模板
- `model`: 模型名称（默认 gpt-3.5-turbo）

### 3. Text Process (`text_process`)
文本处理

**参数**:
- `text`: 输入文本
- `operation`: 操作类型（uppercase/lowercase/trim）

### 4. Condition (`condition`)
条件判断

**参数**:
- `condition`: 条件表达式
- `value`: 判断值

## 📝 创建工作流示例

```javascript
const workflow = {
  name: 'Search and Process',
  nodes: [
    {
      id: 'node_1',
      type: 'skillhub_search',
      params: { query: 'AI', limit: 5 }
    },
    {
      id: 'node_2',
      type: 'text_process',
      params: { 
        text: '{{node_1.result}}',
        operation: 'uppercase'
      }
    }
  ],
  edges: [
    { from: 'node_1', to: 'node_2' }
  ]
};
```

## 🤖 多 Agent 系统使用

### 获取可用的 Agent 列表

```bash
curl http://localhost:3001/api/agents
```

### 执行多 Agent 任务

```bash
curl -X POST http://localhost:3001/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "task": "帮我创建一个待办事项应用，包括前端界面、后端 API 和数据库设计"
  }'
```

**响应示例**:
```json
{
  "success": true,
  "taskDescription": "帮我创建一个待办事项应用...",
  "executionStrategy": "hybrid",
  "totalSubtasks": 3,
  "completedSubtasks": 3,
  "results": [
    {
      "agent": "database-agent",
      "agentName": "Database Agent",
      "status": "completed",
      "result": "设计了 todos 表结构..."
    },
    {
      "agent": "backend-agent",
      "agentName": "Backend Agent",
      "status": "completed",
      "result": "设计了 CRUD API 端点..."
    },
    {
      "agent": "frontend-agent",
      "agentName": "Frontend Agent",
      "status": "completed",
      "result": "设计了 React 组件结构..."
    }
  ],
  "summary": "任务已完成。共创建3个子任务...",
  "elapsedTime": "15.23s"
}
```

## 🎯 下一步

- [x] 集成真实的 SkillHub API
- [x] 添加更多节点类型
- [x] 实现多 Agent 系统
- [ ] 实现图形化工作流编辑器（React Flow）
- [x] 添加数据库持久化
- [ ] 支持更复杂的工作流逻辑

## 📦 技术栈

- **Express.js** - Web 服务器
- **LangChain.js** - LLM 集成（可选）
- **SQLite** - 数据存储（计划中）
- **UUID** - 唯一 ID 生成

## 📄 License

MIT
