# 🚀 NvwaX 快速开始指南

> **最新版本**: v1.2.0 | **更新日期**: 2026-04-25

## 📋 前置条件检查 ✅

- [x] Git v2.53.0
- [x] Node.js v20.11.0
- [x] npm v10.2.4
- [x] PostgreSQL 15+ (或 Neon 云数据库)
- [x] SkillHub API 已验证可用

---

## 🎯 现在开始编码！

你有 **两个选择** 来开始：

### 选项 A：使用自动化脚本（推荐）⭐

```powershell
# 在 PowerShell 中运行
.\setup.ps1
```

或

```cmd
# 在命令提示符中运行
setup.bat
```

**脚本会自动完成**:
1. ✅ 检查前置条件
2. 📝 指导你 Fork Flowise 仓库
3. 📥 克隆仓库到本地
4. 📦 安装所有依赖
5. ⚙️ 配置环境变量
6. 🗄️ 初始化数据库
7. 🏃 启动开发服务器（可选）

---

### 选项 B：手动操作

如果你想完全控制每个步骤：

#### 步骤 1: Fork Flowise 仓库

在浏览器中：
1. 访问 https://github.com/FlowiseAI/Flowise
2. 点击右上角 "Fork" 按钮
3. 选择组织: `BiglionX`
4. 仓库名称改为: `NvwaX`
5. 点击 "Create fork"

#### 步骤 2: 克隆仓库

```bash
cd d:\BigLionX
git clone https://github.com/BiglionX/NvwaX.git
cd NvwaX
```

#### 步骤 3: 安装依赖

```bash
npm install
```

如果速度慢，使用国内镜像：
```bash
npm config set registry https://registry.npmmirror.com
npm install
```

#### 步骤 4: 配置环境变量

```bash
# Windows PowerShell
Copy-Item packages\server\.env.example packages\server\.env

# 或使用默认配置
echo "PORT=3000" > packages\server\.env
echo "DATABASE_PATH=./database.sqlite" >> packages\server\.env
echo "API_KEY_PATH=./api.key" >> packages\server\.env
```

#### 步骤 5: 启动开发服务器

```bash
npm run dev
```

#### 步骤 6: 验证安装

打开浏览器访问：http://localhost:3000

你应该看到 Flowise 的主界面！

---

## 📚 相关文档

### 必读文档

| 文档 | 用途 |
|------|------|
| [FLOWISE-SETUP-GUIDE.md](FLOWISE-SETUP-GUIDE.md) | 详细的安装指南和故障排除 |
| [SkillHub-API-Integration-Plan.md](SkillHub-API-Integration-Plan.md) | API 集成方案 |
| [API-TEST-REPORT.md](API-TEST-REPORT.md) | API 测试结果 |

### Multi-Agent 系统文档

| 文档 | 用途 |
|------|------|
| [.lingma/skills/multi-agent-orchestrator/README.md](.lingma/skills/multi-agent-orchestrator/README.md) | 使用指南 |
| [.lingma/skills/multi-agent-orchestrator/QUICK-REFERENCE.md](.lingma/skills/multi-agent-orchestrator/QUICK-REFERENCE.md) | 快速参考 |
| [.lingma/skills/multi-agent-orchestrator/examples.md](.lingma/skills/multi-agent-orchestrator/examples.md) | 实战案例 |

### 项目进度

| 文档 | 内容 |
|------|------|
| [PROGRESS-DAY1.md](PROGRESS-DAY1.md) | Day 1 进度报告 |
| [MULTI-AGENT-SYSTEM-SUMMARY.md](MULTI-AGENT-SYSTEM-SUMMARY.md) | 完整系统总结 |
| [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md) | 项目文件结构 |

---

## 🎯 Milestone 1 任务清单

### Setup 阶段

- [ ] Fork Flowise 仓库为 NvwaX
- [ ] 克隆到本地
- [ ] 安装依赖
- [ ] 配置环境变量
- [ ] 启动开发服务器
- [ ] 验证基本功能

### 集成阶段

- [ ] 测试 OpenAPI spec 端点
- [ ] 在 Flowise 中添加 OpenAPI Toolkit
- [ ] 配置 SkillHub API
- [ ] 测试工具发现功能

### 开发阶段

- [ ] 创建 `SkillHubSearchNode`
- [ ] 创建 `SkillHubDetailNode`
- [ ] 构建第一个工作流
- [ ] 编写单元测试

---

## 🐛 常见问题

### Q1: npm install 很慢怎么办？

**A**: 使用国内镜像
```bash
npm config set registry https://registry.npmmirror.com
npm install
```

### Q2: 端口 3000 被占用？

**A**: 修改端口
```bash
# 在 packages/server/.env 中
PORT=3001
```

### Q3: 克隆失败？

**A**: 确认以下几点
1. 已完成 Fork 操作
2. GitHub 账号已登录
3. 网络连接正常
4. 可以尝试使用 SSH: `git clone git@github.com:BiglionX/NvwaX.git`

### Q4: TypeScript 编译错误？

**A**: 清理并重新构建
```bash
npm run clean
npm run build
```

更多问题查看：[FLOWISE-SETUP-GUIDE.md](FLOWISE-SETUP-GUIDE.md#-常见问题)

---

## 💡 开发提示

### 项目结构

```
NvwaX/
├── packages/
│   ├── server/          # 后端 (Express + TypeScript)
│   │   ├── src/         # 源代码
│   │   ├── .env         # 环境变量
│   │   └── database.sqlite
│   ├── ui/              # 前端 (React)
│   │   ├── src/
│   │   └── public/
│   └── components/      # 共享组件
├── .lingma/
│   └── skills/
│       └── multi-agent-orchestrator/  # 我们的 skill
└── docs/                # 文档
```

### 常用命令

```bash
# 开发模式（热重载）
npm run dev

# 生产构建
npm run build

# 运行测试
npm test

# 代码检查
npm run lint

# 清理构建产物
npm run clean
```

### 调试技巧

1. **后端日志**: 在终端查看
2. **前端日志**: 浏览器控制台 (F12)
3. **数据库**: 使用 DB Browser for SQLite

---

## 🎉 下一步

环境搭建完成后，我们将：

1. **集成 SkillHub API**
   - 添加 OpenAPI Toolkit 节点
   - 配置工具发现

2. **创建自定义节点**
   - SkillHubSearchNode
   - SkillHubDetailNode

3. **构建第一个 Agent**
   - 用户输入 → 搜索技能 → 显示结果

---

## 📞 需要帮助？

- 📧 Email: team@nvwax.com
- 🐛 Issues: GitHub Issues
- 📖 文档: 查看上面的文档列表

---

## ✅ 检查清单

开始前确认：

- [ ] 已阅读本指南
- [ ] 了解如何 Fork 仓库
- [ ] 准备好运行 setup.ps1 或 setup.bat
- [ ] 有稳定的网络连接
- [ ] 预留 10-15 分钟安装时间

---

**准备好了吗？让我们开始吧！** 🚀

运行以下命令开始：
```powershell
.\setup.ps1
```

或在浏览器中打开 Flowise 并完成 Fork 操作。

**加油！NvwaX 即将诞生！** 💪
