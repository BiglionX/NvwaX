# SkillHub Workflow Engine - 开发指南

## 📋 概述

这是一个轻量级的工作流引擎，专为 SkillHub 集成设计。相比 Flowise，它具有以下优势：

- ✅ **超轻量**：仅 160 个依赖包（Flowise: 4000+）
- ✅ **低内存**：<100MB（Flowise: 2GB+）
- ✅ **快速启动**：几秒钟
- ✅ **易于定制**：代码简洁清晰
- ✅ **数据持久化**：SQLite 数据库

## 🚀 快速开始

### 1. 安装依赖

```bash
cd packages/skillhub-workflow
npm install
```

### 2. 配置环境变量

编辑 `.env` 文件：

```env
PORT=3001
SKILLHUB_API_URL=http://localhost:8080
SKILLHUB_API_KEY=your_api_key_here
DATABASE_PATH=./data/workflows.db
```

### 3. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务将在 http://localhost:3001 启动

## 📡 API 参考

### 健康检查

```bash
GET /health
```

**响应**:
```json
{
  "status": "ok",
  "service": "SkillHub Workflow Engine",
  "timestamp": "2026-04-24T11:51:50.078Z"
}
```

### 工作流管理

#### 创建工作流

```bash
POST /api/workflows
Content-Type: application/json

{
  "name": "My Workflow",
  "description": "Workflow description",
  "nodes": [...],
  "edges": [...]
}
```

#### 获取工作流列表

```bash
GET /api/workflows
```

#### 获取单个工作流

```bash
GET /api/workflows/:id
```

#### 更新工作流

```bash
PUT /api/workflows/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### 删除工作流

```bash
DELETE /api/workflows/:id
```

#### 执行工作流

```bash
POST /api/workflows/:id/execute
Content-Type: application/json

{
  "input": {
    "query": "search term"
  }
}
```

## 🔧 节点类型

### 1. SkillHub Search (`skillhub_search`)

搜索 SkillHub 中的技能。

**参数**:
- `query` (string): 搜索关键词
- `limit` (number): 返回数量限制（默认 10）
- `page` (number): 页码（默认 1）

**示例**:
```javascript
{
  id: 'node_1',
  type: 'skillhub_search',
  params: {
    query: 'AI',
    limit: 5
  }
}
```

**输出**:
```javascript
{
  success: true,
  skills: [...],
  total: 100,
  page: 1,
  limit: 5
}
```

### 2. SkillHub Detail (`skillhub_detail`)

获取技能详情。

**参数**:
- `skillId` (string|number): 技能 ID

**示例**:
```javascript
{
  id: 'node_2',
  type: 'skillhub_detail',
  params: {
    skillId: 123
  }
}
```

### 3. LLM (`llm`)

调用大语言模型（需要配置 OpenAI API Key）。

**参数**:
- `prompt` (string): 提示词模板
- `model` (string): 模型名称（默认 gpt-3.5-turbo）

### 4. Text Process (`text_process`)

文本处理。

**参数**:
- `text` (string): 输入文本
- `operation` (string): 操作类型
  - `uppercase`: 转大写
  - `lowercase`: 转小写
  - `trim`: 去除首尾空格

### 5. Condition (`condition`)

条件判断。

**参数**:
- `condition` (string): 条件表达式
- `value` (any): 判断值

## 💡 使用示例

### 示例 1：搜索技能并处理结果

```javascript
// 创建工作流
const workflow = {
  name: 'Search and Format',
  nodes: [
    {
      id: 'search_node',
      type: 'skillhub_search',
      params: {
        query: 'machine learning',
        limit: 10
      }
    },
    {
      id: 'format_node',
      type: 'text_process',
      params: {
        text: '{{search_node.skills}}',
        operation: 'uppercase'
      }
    }
  ],
  edges: [
    { from: 'search_node', to: 'format_node' }
  ]
};

// 执行工作流
const result = await fetch('http://localhost:3001/api/workflows/{id}/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: {}
  })
});
```

### 示例 2：PowerShell 测试脚本

参见 `test.ps1` 文件。

## 🗄️ 数据库

工作流数据存储在 SQLite 数据库中：

- **位置**: `data/workflows.db`
- **表结构**:
  ```sql
  CREATE TABLE workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    nodes TEXT NOT NULL,  -- JSON
    edges TEXT NOT NULL,  -- JSON
    created_at DATETIME,
    updated_at DATETIME
  )
  ```

## 🛠️ 扩展开发

### 添加新节点类型

1. 在 `src/server.js` 中创建节点函数：

```javascript
async function myCustomNode(params) {
  // 你的逻辑
  return { result: '...' };
}
```

2. 注册到节点注册表：

```javascript
const nodeRegistry = {
  // ...existing nodes
  'my_custom_node': myCustomNode
};
```

3. 在工作流中使用：

```javascript
{
  id: 'node_1',
  type: 'my_custom_node',
  params: { ... }
}
```

### 集成外部 API

参考 `src/nodes/skillhub-client.js` 的实现。

## 📊 性能

- **启动时间**: <5 秒
- **内存占用**: ~50-100 MB
- **请求延迟**: <100ms（不含外部 API 调用）
- **并发支持**: 取决于 Node.js 事件循环

## 🐛 故障排除

### 问题 1：端口被占用

**症状**: `EADDRINUSE: address already in use :::3001`

**解决**:
```bash
# 查找占用端口的进程
netstat -ano | findstr :3001

# 杀死进程
taskkill /PID <PID> /F

# 或修改端口
# 在 .env 中设置 PORT=3002
```

### 问题 2：SkillHub API 连接失败

**症状**: 工作流执行时返回错误

**解决**:
1. 检查 `.env` 中的 `SKILLHUB_API_URL` 是否正确
2. 确保 SkillHub 服务正在运行
3. 检查网络连接

### 问题 3：数据库错误

**症状**: 无法保存工作流

**解决**:
```bash
# 删除数据库文件（会丢失所有工作流）
rm data/workflows.db

# 重启服务，数据库会自动重建
npm run dev
```

## 📝 下一步

- [ ] 实现图形化工作流编辑器
- [ ] 添加更多节点类型
- [ ] 支持复杂的工作流逻辑（循环、分支）
- [ ] 添加用户认证
- [ ] 实现工作流版本控制
- [ ] 添加监控和日志

## 📄 License

MIT
