# NvwaX 快速启动指南

## 🚀 5 分钟快速开始

### 前置检查

确保已安装：
- ✅ Node.js 20.11+ (`node --version`)
- ✅ npm 或 yarn (`npm --version`)

### 步骤 1: 启动后端服务

```bash
# 进入后端目录
cd packages/nvwax-server

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

✅ 后端运行在: **http://localhost:3001**  
✅ 健康检查: http://localhost:3001/health

### 步骤 2: 启动前端应用

打开**新的终端窗口**：

```bash
# 进入前端目录
cd packages/nvwax-web

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

✅ 前端运行在: **http://localhost:3000**

### 步骤 3: 访问应用

打开浏览器访问: **http://localhost:3000**

您将看到 NvwaX 首页，包含三个主要功能入口。

---

## 📱 主要功能页面

| 页面 | 路由 | 功能说明 |
|------|------|----------|
| 首页 | `/` | 功能导航和介绍 |
| Agent 搜索 | `/search` | 搜索全网 Agent 和 SkillHub 技能 |
| Agent 广场 | `/marketplace` | 浏览热门 AI Agent |
| 我的项目 | `/projects` | 管理项目和团队 |

---

## 🔍 功能演示

### 1. 搜索 Agent

1. 点击侧边栏 "Agent 搜索"
2. 在搜索框输入关键词（如 "chatbot"）
3. 切换 Tab 查看 Agent 或 Skill 结果
4. 点击卡片查看详情

### 2. 浏览 Agent 广场

1. 点击侧边栏 "Agent 广场"
2. 浏览热门 Agent 卡片
3. 点击 "查看详情" 跳转到源码仓库

### 3. 创建项目

1. 点击侧边栏 "我的项目"
2. 点击 "创建项目" 按钮
3. 输入项目名称和描述
4. 点击 "创建"

### 4. 创建 AiTeam

1. 进入项目详情页
2. 点击 "创建 AiTeam" 按钮
3. 输入团队名称
4. 点击 "创建"

### 5. 创建 Agent Team

1. 进入 AiTeam 详情页
2. 点击 "创建 Agent Team" 按钮
3. 配置 Agent 团队
4. 点击 "创建"

---

## 🛠️ 常用命令

### 后端服务

```bash
cd packages/nvwax-server

# 开发模式（带热重载）
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

### 前端应用

```bash
cd packages/nvwax-web

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

---

## 📁 重要文件位置

### 后端
- **主入口**: `packages/nvwax-server/src/app.ts`
- **路由**: `packages/nvwax-server/src/routes/index.ts`
- **数据库**: `packages/nvwax-server/data/nvwax.db`
- **环境配置**: `packages/nvwax-server/.env`

### 前端
- **主入口**: `packages/nvwax-web/app/layout.tsx`
- **首页**: `packages/nvwax-web/app/page.tsx`
- **API 客户端**: `packages/nvwax-web/lib/api/client.ts`
- **环境配置**: `packages/nvwax-web/.env.local`

---

## 🔧 故障排查

### 问题 1: 端口被占用

**错误**: `EADDRINUSE: address already in use`

**解决**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### 问题 2: 依赖安装失败

**解决**:
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 问题 3: 前端无法连接后端

**检查**:
1. 后端是否正常运行: http://localhost:3001/health
2. 前端环境变量是否正确: `.env.local` 中 `NEXT_PUBLIC_API_URL`
3. 浏览器控制台是否有 CORS 错误

**解决**:
```bash
# 确认后端运行
curl http://localhost:3001/health

# 检查前端配置
cat packages/nvwax-web/.env.local
```

### 问题 4: 数据库文件不存在

**解决**:
```bash
# 创建 data 目录
mkdir -p packages/nvwax-server/data

# 重启后端服务
cd packages/nvwax-server
npm run dev
```

---

## 📊 API 测试

### 使用 curl 测试后端 API

```bash
# 健康检查
curl http://localhost:3001/health

# 搜索 Agent
curl "http://localhost:3001/api/search/agents?q=chatbot&page=1"

# 搜索 Skill
curl "http://localhost:3001/api/search/skills?q=api&page=1"

# 创建项目
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123","name":"Test Project","description":"Test"}'

# 获取项目列表
curl "http://localhost:3001/api/projects?userId=user-123"
```

### 使用 Postman/Insomnia

导入以下集合进行测试：
- Base URL: `http://localhost:3001/api`
- 所有端点见 `PROJECT-STRUCTURE.md` API 文档部分

---

## 🎯 开发提示

### 修改后端代码

1. 编辑 `packages/nvwax-server/src/` 下的文件
2. 保存后自动热重载（nodemon）
3. 查看终端输出确认编译成功

### 修改前端代码

1. 编辑 `packages/nvwax-web/app/` 或 `components/` 下的文件
2. 保存后 Next.js 自动刷新
3. 浏览器自动更新（Fast Refresh）

### 查看数据库

```bash
# 安装 SQLite CLI
npm install -g sqlite3

# 打开数据库
sqlite3 packages/nvwax-server/data/nvwax.db

# 查询示例
.tables
.schema projects
SELECT * FROM projects;
```

---

## 📚 更多资源

- **完整文档**: `PROJECT-STRUCTURE.md`
- **开发进展**: `DEVELOPMENT-PROGRESS-DAY4.md`
- **前端说明**: `packages/nvwax-web/README-NVWAX.md`
- **API 集成方案**: `SkillHub-API-Integration-Plan.md`

---

## 💡 小贴士

1. **同时查看前后端日志**: 使用两个终端窗口
2. **浏览器开发者工具**: 检查 Network 标签查看 API 请求
3. **TypeScript 类型提示**: IDE 中享受完整的类型安全
4. **Tailwind CSS**: 使用 IntelliSense 插件快速编写样式
5. **数据库备份**: 定期复制 `nvwax.db` 文件

---

**祝您开发愉快！** 🎉

如有问题，请查阅完整文档或提交 Issue。
