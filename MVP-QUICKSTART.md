# MVP 快速启动指南

## 🚀 立即开始

### 步骤 1: 启动数据库

```bash
# 选项 A: 使用 Docker Compose（推荐）
cd d:\BigLionX\NvwaX
docker-compose up -d db

# 选项 B: 本地 PostgreSQL
# 确保 PostgreSQL 正在运行
pg_lsclusters
sudo systemctl start postgresql
```

### 步骤 2: 执行数据库迁移

```bash
cd packages/nvwax-server
node run-migration-009.mjs
```

预期输出：
```
🚀 开始执行虚拟公司会话系统迁移...
📄 执行 SQL 迁移脚本...
✅ 迁移成功完成！
✅ 验证通过: virtual_company_sessions 表已创建
📋 表结构:
────────────────────────────────────────────────────────────
  id                             text                 NO
  user_id                        text                 NO
  status                         text                 NO
  ...
────────────────────────────────────────────────────────────
✨ 迁移完成！可以开始使用虚拟公司创建功能了。
```

### 步骤 3: 配置环境变量

复制 `.env.example` 并添加 LLM API Key：

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# Database Configuration
DB_NAME=nvwax
DB_USER=nvwax
DB_PASSWORD=changeme
DB_PORT=5432

# LLM Configuration (至少配置一个)
OPENAI_API_KEY=sk-your-openai-key-here
# 或
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Backend Configuration
BACKEND_PORT=3001
```

### 步骤 4: 启动后端服务

```bash
cd packages/nvwax-server
npm run dev
```

后端将在 `http://localhost:3001` 启动

### 步骤 5: 启动前端服务

```bash
cd packages/nvwax-web
npm run dev
```

前端将在 `http://localhost:3000` 启动

---

## 🧪 测试 API

### 测试 1: 创建会话

```bash
curl -X POST http://localhost:3001/api/virtual-company/sessions \
  -H "Content-Type: application/json" \
  -d '{}'
```

预期响应：
```json
{
  "success": true,
  "data": {
    "id": "abc123...",
    "userId": "user-123",
    "status": "initiated",
    "conversationHistory": [],
    "requirements": {},
    "selectedRoles": [],
    "progress": {
      "currentStep": 0,
      "totalSteps": 7,
      "percentage": 0,
      "steps": [...]
    },
    "createdAt": "2026-05-16T...",
    "updatedAt": "2026-05-16T..."
  }
}
```

### 测试 2: 发送消息

```bash
curl -X POST http://localhost:3001/api/virtual-company/sessions/{SESSION_ID}/message \
  -H "Content-Type: application/json" \
  -d '{"content": "我想创建一个营销团队"}'
```

### 测试 3: 获取会话详情

```bash
curl http://localhost:3001/api/virtual-company/sessions/{SESSION_ID}
```

---

## 📁 项目结构

```
packages/
├── nvwax-server/              # 后端服务
│   ├── migrations/
│   │   └── 009_virtual_company_sessions.sql  ✅ 已创建
│   ├── src/
│   │   ├── services/
│   │   │   └── virtual-company-creation.service.ts  ✅ 已创建
│   │   ├── controllers/
│   │   │   └── virtual-company-creation.controller.ts  ✅ 已创建
│   │   └── routes/
│   │       └── virtual-company.routes.ts  ✅ 已创建
│   ├── run-migration-009.mjs  ✅ 已创建
│   └── MIGRATION-GUIDE-009.md  ✅ 已创建
│
└── nvwax-web/                 # 前端应用
    └── components/
        └── virtual-company-create-modal.tsx  ✅ 已创建（基础版）
```

---

## 🎯 下一步开发任务

### 优先级 P0（必须完成）

#### 1. CEO Agent 实现
**文件**: `packages/nvwax-server/src/services/ceo-agent.service.ts`

```typescript
export class CEOAgentService {
  async processMessage(sessionId: string, userMessage: string): Promise<string> {
    // 1. 加载会话历史
    // 2. 构建 Prompt
    // 3. 调用 LLM
    // 4. 提取结构化需求
    // 5. 更新会话状态
    // 6. 返回回复
  }
}
```

**Prompt 模板示例**:
```
你是 NvwaX 虚拟公司的 CEO，负责帮助用户创建 AI 团队。

当前会话状态: {status}
用户需求: {requirements}

请用友好、专业的语气与用户对话，逐步了解他们的需求。
每次回复后，尝试提取以下信息：
- 公司类型（营销/开发/设计等）
- 主要职责
- 期望产出
- 团队规模

如果信息不足，请提出具体问题。
```

#### 2. 角色推荐引擎
**文件**: `packages/nvwax-server/src/services/role-recommendation.service.ts`

```typescript
export class RoleRecommendationService {
  async recommendRoles(requirements: UserRequirements): Promise<SelectedRole[]> {
    // 1. 关键词提取
    // 2. 匹配预设模板
    // 3. 搜索 SkillHub
    // 4. LLM 智能排序
    // 5. 返回推荐列表
  }
}
```

#### 3. 前端 Chat UI
**文件**: `packages/nvwax-web/components/virtual-company-chat.tsx`

```tsx
export default function VirtualCompanyChat({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const sendMessage = async () => {
    // 调用 API
    // 更新消息列表
  };
  
  return (
    <div className="chat-container">
      {/* 消息列表 */}
      {/* 输入框 */}
      {/* 发送按钮 */}
    </div>
  );
}
```

---

## 🔧 开发工具

### 数据库管理
```bash
# 使用 psql
psql -U nvwax -d nvwax

# 或使用图形化工具
# - pgAdmin
# - DBeaver
# - DataGrip
```

### API 测试
- **Postman**: 导入 API 集合
- **Insomnia**: 轻量级替代
- **Thunder Client**: VS Code 插件

### 日志查看
```bash
# 后端日志
tail -f packages/nvwax-server/logs/development.log

# Docker 日志
docker-compose logs -f backend
```

---

## ⚠️ 常见问题

### Q1: 数据库连接失败
```
Error: connect ECONNREFUSED ::1:5432
```

**解决**:
```bash
# 检查 PostgreSQL 是否运行
docker ps | grep postgres
# 或
pg_lsclusters

# 启动服务
docker-compose up -d db
```

### Q2: TypeScript 编译错误
```
Cannot find module '...'
```

**解决**:
```bash
# 重新安装依赖
cd packages/nvwax-server
npm install

# 清理缓存
rm -rf node_modules .next
npm install
```

### Q3: API 返回 404
```
Cannot POST /api/virtual-company/sessions
```

**解决**:
1. 检查后端是否启动
2. 检查路由是否正确注册
3. 查看后端日志

---

## 📚 参考文档

1. **[MVP 开发进度](./MVP-DEVELOPMENT-PROGRESS.md)** - 当前进度和计划
2. **[详细需求分析](./docs/VIRTUAL-COMPANY-CREATION-SYSTEM-PLAN.md)** - 完整技术设计
3. **[可行性分析](./docs/VIRTUAL-COMPANY-FEASIBILITY-ANALYSIS.md)** - 逐项评估
4. **[迁移指南](./packages/nvwax-server/MIGRATION-GUIDE-009.md)** - 数据库迁移详细说明

---

## 💬 获取帮助

遇到问题？

1. 查看详细文档
2. 检查后端日志
3. 搜索 GitHub Issues
4. 联系开发团队

---

**最后更新**: 2026-05-16  
**状态**: 🚀 准备就绪，可以开始 Phase 2 开发
