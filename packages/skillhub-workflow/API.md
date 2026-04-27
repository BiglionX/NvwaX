# SkillHub Workflow Engine API 文档

## 基础信息

- **Base URL**: `http://localhost:3001`
- **Content-Type**: `application/json`

---

## 健康检查

### GET /health

检查服务状态。

**响应**:
```json
{
  "status": "ok",
  "service": "SkillHub Workflow Engine",
  "timestamp": "2026-04-24T12:00:00.000Z"
}
```

---

## 工作流管理

### GET /api/workflows

获取所有工作流列表。

**响应**:
```json
[
  {
    "id": "workflow-uuid",
    "name": "My Workflow",
    "description": "Workflow description",
    "createdAt": "2026-04-24T12:00:00.000Z"
  }
]
```

### GET /api/workflows/:id

获取单个工作流详情。

**路径参数**:
- `id`: 工作流 ID

**响应**:
```json
{
  "id": "workflow-uuid",
  "name": "My Workflow",
  "description": "Workflow description",
  "nodes": [
    {
      "id": "node_1",
      "type": "skillhub_search",
      "params": { "query": "AI", "limit": 5 }
    }
  ],
  "edges": [
    { "from": "node_1", "to": "node_2" }
  ],
  "created_at": "2026-04-24T12:00:00.000Z",
  "updated_at": "2026-04-24T12:00:00.000Z"
}
```

### POST /api/workflows

创建新工作流。

**请求体**:
```json
{
  "name": "My Workflow",
  "description": "Workflow description",
  "nodes": [
    {
      "id": "node_1",
      "type": "skillhub_search",
      "params": { "query": "AI", "limit": 5 }
    }
  ],
  "edges": [
    { "from": "node_1", "to": "node_2" }
  ]
}
```

**响应**: 返回创建的工作流对象（201 Created）

### PUT /api/workflows/:id

更新工作流。

**路径参数**:
- `id`: 工作流 ID

**请求体**: 同 POST

**响应**: 返回更新后的工作流对象

### DELETE /api/workflows/:id

删除工作流。

**路径参数**:
- `id`: 工作流 ID

**响应**:
```json
{
  "message": "Workflow deleted"
}
```

### POST /api/workflows/:id/execute

执行工作流。

**路径参数**:
- `id`: 工作流 ID

**请求体**:
```json
{
  "input": {
    "query": "search term"
  }
}
```

**响应**:
```json
{
  "success": true,
  "result": {
    "workflowId": "workflow-uuid",
    "results": {
      "node_1": {
        "success": true,
        "skills": [...]
      }
    },
    "executedAt": "2026-04-24T12:00:00.000Z"
  }
}
```

---

## 多 Agent 系统

### GET /api/agents

获取可用的 Agent 列表。

**响应**:
```json
[
  {
    "id": "frontend-agent",
    "name": "Frontend Agent",
    "description": "专长于 React/Vue 组件、UI/UX、状态管理",
    "keywords": ["前端", "界面", "组件", "UI", "样式", "React", "Vue"]
  },
  {
    "id": "backend-agent",
    "name": "Backend Agent",
    "description": "专长于 API 设计、业务逻辑、认证授权",
    "keywords": ["后端", "API", "服务器", "接口"]
  },
  ...
]
```

### POST /api/orchestrate

执行多 Agent 任务协调。

**请求体**:
```json
{
  "task": "帮我创建一个待办事项应用，包括前端界面、后端 API 和数据库设计"
}
```

**响应**:
```json
{
  "success": true,
  "taskDescription": "帮我创建一个待办事项应用...",
  "executionStrategy": "hybrid",
  "totalSubtasks": 3,
  "completedSubtasks": 3,
  "failedSubtasks": 0,
  "results": [
    {
      "agent": "database-agent",
      "agentName": "Database Agent",
      "task": "task_1",
      "taskDescription": "设计数据库表结构",
      "status": "completed",
      "result": "设计了 todos 表结构，包括 id, title, completed, created_at 字段...",
      "timestamp": "2026-04-24T12:00:00.000Z"
    },
    ...
  ],
  "summary": "任务已完成。共执行 3 个子任务...",
  "elapsedTime": "15.23s",
  "completedAt": "2026-04-24T12:00:00.000Z"
}
```

**错误响应**:
```json
{
  "success": false,
  "taskDescription": "...",
  "error": "Error message",
  "completedAt": "2026-04-24T12:00:00.000Z"
}
```

---

## 节点类型

### SkillHub 相关节点

#### skillhub_search
搜索 SkillHub 中的技能。

**参数**:
- `query` (string): 搜索关键词
- `limit` (number): 返回数量限制，默认 10
- `page` (number): 页码，默认 1

**输出**:
```json
{
  "success": true,
  "skills": [...],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

#### skillhub_detail
获取技能详情。

**参数**:
- `skillId` (string): 技能 ID 或 slug

**输出**:
```json
{
  "success": true,
  "skill": { ... }
}
```

#### semantic_search
语义搜索技能。

**参数**:
- `query` (string): 自然语言查询

**输出**: 同 skillhub_search

#### tool_discovery
发现可用工具。

**参数**: 无

**输出**:
```json
{
  "success": true,
  "tools": [...],
  "platform": "SkillHub",
  "version": "1.0.0"
}
```

#### related_skills
获取相关技能。

**参数**:
- `skillSlug` (string): 技能 slug
- `limit` (number): 返回数量，默认 5

**输出**: 同 skillhub_search

### LLM 节点

#### llm
调用 OpenAI API。

**参数**:
- `prompt` (string): 提示词
- `model` (string): 模型名称，默认 gpt-3.5-turbo
- `temperature` (number): 温度参数，默认 0.7

**输出**:
```json
{
  "response": "LLM response text",
  "model": "gpt-3.5-turbo"
}
```

**注意**: 需要在 `.env` 中配置 `OPENAI_API_KEY`

### 数据处理节点

#### text_process
文本处理。

**参数**:
- `text` (string): 输入文本
- `operation` (string): 操作类型 (uppercase/lowercase/trim)

**输出**:
```json
{
  "result": "processed text"
}
```

#### data_transform
数据格式转换。

**参数**:
- `data` (any): 输入数据
- `operation` (string): 操作类型
  - `json_parse`: 解析 JSON 字符串
  - `json_stringify`: 转换为 JSON 字符串
  - `extract_field`: 提取字段（需额外参数 `field`）
  - `uppercase/lowercase/trim`: 文本处理

**输出**:
```json
{
  "result": "transformed data"
}
```

### 控制流节点

#### condition
条件判断。

**参数**:
- `condition` (string): 条件表达式
- `value` (any): 判断值

**输出**:
```json
{
  "passed": true
}
```

#### agent_router
Agent 路由。

**参数**:
- `input` (string): 任务描述
- `agents` (array): 可选的 Agent 列表

**输出**:
```json
{
  "selectedAgent": "frontend-agent",
  "originalInput": "..."
}
```

---

## 错误处理

所有 API 端点在发生错误时返回以下格式：

```json
{
  "error": "Error message description"
}
```

常见 HTTP 状态码：
- `200`: 成功
- `201`: 创建成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误

---

## 示例

### 示例 1: 创建工作流并执行

```bash
# 1. 创建工作流
curl -X POST http://localhost:3001/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Search AI Skills",
    "nodes": [
      {
        "id": "node_1",
        "type": "skillhub_search",
        "params": { "query": "AI", "limit": 5 }
      }
    ],
    "edges": []
  }'

# 假设返回的工作流 ID 为 "abc-123"

# 2. 执行工作流
curl -X POST http://localhost:3001/api/workflows/abc-123/execute \
  -H "Content-Type: application/json" \
  -d '{ "input": {} }'
```

### 示例 2: 使用多 Agent 系统

```bash
curl -X POST http://localhost:3001/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "task": "设计一个用户认证系统，包括登录、注册和权限管理"
  }'
```

---

## 环境变量配置

在 `.env` 文件中配置：

```env
# 服务器端口
PORT=3001

# OpenAI API Key（用于 LLM 节点）
OPENAI_API_KEY=your_openai_api_key_here

# SkillHub API 配置
SKILLHUB_API_URL=https://skillhub.proclaw.cc
SKILLHUB_API_KEY=

# 数据库路径
DATABASE_PATH=./data/workflows.db

# 日志级别
LOG_LEVEL=info
```

---

## 技术栈

- **Express.js**: Web 服务器框架
- **LangChain.js**: LLM 集成
- **SQLite**: 数据存储
- **UUID**: 唯一 ID 生成
- **better-sqlite3**: SQLite 驱动

---

## 许可证

MIT
