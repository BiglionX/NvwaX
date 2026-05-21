# NvwaX - 开源 AI Agent 平台

<div align="center">

![NvwaX Logo](https://img.shields.io/badge/NvwaX-AI%20Agent%20Platform-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue?style=for-the-badge&logo=postgresql)
![Version](https://img.shields.io/badge/Version-v2.0.0-orange?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=for-the-badge)
![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%2B%20Railway-blue?style=for-the-badge)

**开源的 AI Agent 搜索、发现和管理平台**

[文档](#-文档) • [快速开始](#-快速开始) • [功能特性](#-功能特性) • [贡献指南](#-贡献指南) • [社区](#-社区)

</div>

---

## 📖 简介

NvwaX 是一个现代化的 AI Agent 平台，提供全网 Agent 和技能的搜索、发现、管理功能。支持多数据源集成，包括 GitHub、Gitee 以及中国科技公司的开源项目。

### ✨ 核心亮点

- 🔍 **智能搜索**: 支持全文搜索、搜索建议、历史记录、热门搜索
- 🤖 **Nvwa 智能体工厂**: 对话式创建智能体，7步引导流程，可视化进度追踪（NEW! v2.0）
-  **虚拟公司打包**: CEO Agent 动态生成 + 团队经营配置文档生成（NEW! v2.0）
- 🎁 **悬赏系统**: 发布、领取、提交、验证完整的悬赏流程
- 🏢 **虚拟公司打包**: Team Skill 异步打包，多平台支持（NEW!）
- 👑 **Admin 后台升级**: Agent管理、虚拟公司监控、通知中心、审计日志（NEW! v1.5.0）
- 🌐 **多数据源**: GitHub、Gitee（码云）、ModelScope（魔搭）、百度、阿里、腾讯等（NEW! v2.0）
- 👥 **团队管理**: 创建和管理 AiTeam 和 Agent Teams
- 🚀 **工作流引擎**: 基于 LangChain.js 的工作流编排
- 📦 **Web Component SDK**: Lit-based 可嵌入组件（NEW!）
- 🎨 **现代 UI**: 响应式设计，支持深色模式，左右分栏布局
- 🔒 **权限控制**: 完整的用户认证和路由保护
- ✅ **生产就绪**: 代码质量 100%，零错误零警告

---

## 🆕 最新更新 (v2.0.0)

**更新日期**: 2026-05-20

### ✨ Nvwa Agent 工作流重构（重大升级）

- ** 可视化进度追踪** - 左侧面板实时显示 7 步骤进度（0-100%）
- **⚡ 自动化流程** - Step 4-6 完全自动化（模板搜索 → 技能分析 → 配置审查）
- **🇳 国内源支持** - 新增 Gitee（码云）和 ModelScope（魔搭）并行搜索
- ** 性能优化** - 跳过 HuggingFace，搜索时间 < 5s
- **🎯 智能匹配** - 基于名称、描述、标签的综合评分算法
- **🎨 UI/UX 优化** - 实时需求信息面板、标签式展示、Markdown 渲染

>  详细文档: [PHASE2-NVWA-AGENT-WORKFLOW-REFACTOR.md](./docs/PHASE2-NVWA-AGENT-WORKFLOW-REFACTOR.md) | [DOMESTIC-SOURCES-SEARCH-IMPLEMENTATION.md](./docs/DOMESTIC-SOURCES-SEARCH-IMPLEMENTATION.md) | [FRONTEND-INTEGRATION-TEST-REPORT.md](./docs/FRONTEND-INTEGRATION-TEST-REPORT.md)

###  虚拟公司 CEO Agent 动态生成（Phase 2 完成）

- **👔 CEO 模板库** - 4 种管理风格的 CEO 模板
- **🧠 智能推断** - 根据团队类型自动生成 CEO 配置
- **💼 Skills 配置** - 每个 CEO 自动配置 3 个默认技能
- **✨ System Prompt 生成** - AI 驱动的个性化提示词
- **👁️ 实时预览** - 前端组件展示 CEO 配置详情

>  详细文档: [PHASE2-FINAL-SUMMARY.md](./docs/PHASE2-FINAL-SUMMARY.md)

### 📄 团队经营配置文档生成（Phase 3 完成）

- **📦 文档包生成** - 4 种文档类型（团队章程、运营指南、决策流程、绩效指标）
- **📥 多格式导出** - 支持 JSON 和 Markdown 格式下载
- **👁️ 内容预览** - 前端组件实时预览文档内容
- **💾 本地保存** - 一键下载完整文档包

> 📖 详细文档: [PHASE3-FINAL-SUMMARY.md](./docs/PHASE3-FINAL-SUMMARY.md)

### 🐛 重要修复

- **✅ React 渲染错误修复** - 修复 "Objects are not valid as a React child" 错误
- **✅ Railway 部署兼容** - 优化类型安全，确保生产环境稳定运行

---

## 🆕 历史更新 (v1.4.0)

**更新日期**: 2026-05-18

### ✨ 新增功能

- **🔔 通知系统** - 完整的站内通知功能，支持多种通知类型和优先级（NEW!）
- **🤖 Nvwa Agent API** - 智能体 CRUD 后端 API，支持用户管理自己的智能体（NEW!）
- **📊 执行监控页面** - 团队执行监控界面，实时显示 Leader Agent 执行结果（NEW!）
- 🏢 **虚拟公司打包系统** - CEO Agent 动态生成 + 团队经营配置文档生成
- **📦 Web Component SDK** - 基于 Lit 的可嵌入组件 (@nvwax/agent-marketplace, @nvwax/agent-studio)
- **🔧 代码质量全面提升** - 零 TypeScript 错误，零 ESLint 警告
- **🎨 Tailwind CSS v4** - 迁移到最新规范，50+ 处更新
- **👥 用户中心整合** - 优化"我的Agent仓库"与"虚拟公司"功能入口，提升用户体验（NEW!）

### 🚀 部署就绪

- ✅ 完整的部署检查清单 ([DEPLOYMENT-READY-CHECKLIST.md](./docs/DEPLOYMENT-READY-CHECKLIST.md))
- ✅ Docker Compose 一键部署
- ✅ **Vercel + Railway 云部署** (推荐生产环境)
- ✅ 所有包构建验证通过
- ✅ 详细的清理报告 ([CLEANUP-AND-DEPLOYMENT-REPORT.md](./CLEANUP-AND-DEPLOYMENT-REPORT.md))

📖 查看详细进展: [DEVELOPMENT-PROGRESS-2026-04-26.md](./docs/DEVELOPMENT-PROGRESS-2026-04-26.md)

---

## 🚀 快速开始

### 前置要求

- Node.js 18+ 
- PostgreSQL 15+ (或使用 Neon 云数据库)
- pnpm (推荐) 或 npm

### 安装步骤

```
# 1. 克隆仓库
git clone https://github.com/BigLionX/NvwaX.git
cd NvwaX

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp packages/nvwax-server/.env.example packages/nvwax-server/.env
cp packages/nvwax-web/.env.local.example packages/nvwax-web/.env.local

# 4. 初始化数据库
cd packages/nvwax-server
npm run db:migrate

# 5. 启动开发服务器
# 终端 1: 后端服务
cd packages/nvwax-server
npm run dev

# 终端 2: 前端应用
cd packages/nvwax-web
npm run dev
```

访问 http://localhost:3000 开始使用！

### ☁️ 云部署（推荐生产环境）

#### 方案一：Vercel + Railway（最简单）

```
# 1. 部署后端到 Railway
# - 访问 https://railway.app
# - 创建 PostgreSQL 数据库
# - 部署 packages/nvwax-server
# - 配置环境变量

# 2. 部署前端到 Vercel
cd packages/nvwax-web
vercel --project-name nvwax-web

# 3. 设置环境变量
vercel env add NEXT_PUBLIC_API_URL production
# 输入您的 Railway API URL
```

📖 详细指南:
- [完整部署架构](./FULL-STACK-DEPLOYMENT-ARCHITECTURE.md)
- [Vercel 部署指南](./VERCEL-DEPLOYMENT-GUIDE.md)
- [后端部署指南](./BACKEND-DEPLOYMENT-GUIDE.md)

#### 方案二：Docker Compose（本地/私有服务器）

```
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置密码和密钥

# 2. 一键启动
docker-compose up -d --build

# 3. 运行数据库迁移
docker-compose exec backend npm run db:migrate
```

访问 http://localhost:3000

---

## 📦 功能特性

### 🔎 Agent 搜索与发现

- ✅ 全文搜索引擎
- ✅ 多维度过滤（来源、星级、语言等）
- ✅ 实时搜索结果
- ✅ 分页和排序

### 🌍 多数据源支持

| 数据源 | 数量 | 状态 |
|--------|------|------|
| GitHub | 186+ | ✅ 已集成 |
| Gitee（码云） | 15+ | ✅ 已集成（NEW!） |
| ModelScope（魔搭） | 20+ | ✅ 已集成（NEW!） |
| 百度 | 16 | ✅ 已集成 |
| 阿里 | 16 | ✅ 已集成 |
| 腾讯 | 9 | ✅ 已集成 |
| 华为 | 6 | ✅ 已集成 |
| 京东 | 7 | ✅ 已集成 |

> 💡 **国内源并行搜索**：同时搜索 GitHub、Gitee、ModelScope，提升国内网络访问速度

### 👤 用户系统

- ✅ 邮箱注册/登录
- ✅ JWT Token 认证
- ✅ 密码重置
- ✅ 用户资料管理
- ✅ 路由权限保护

### 🎁 悬赏系统

- ✅ 发布悬赏（积分扣除）
- ✅ 领取任务（权限控制）
- ✅ 提交成果（URL+说明）
- ✅ 验证审核（批准/拒绝）
- ✅ 积分转账（80%奖励+20%平台）
- ✅ 状态机管理（5种状态流转）
- ✅ 搜索增强（建议、历史、热门、高亮）
- ✅ 我的悬赏（发布/领取管理）

### 🤖 Nvwa 智能体工厂（v2.0 重大升级）

- ✅ 对话式需求分析（7步流程）
- ✅ **可视化进度追踪** - 左侧面板实时显示进度（0-100%）（NEW!）
- ✅ 左右分栏布局（信息+对话）
- ✅ 实时需求信息展示
- ✅ **自动化工作流** - Step 4-6 完全自动化（NEW!）
- ✅ 技能自动推荐
- ✅ **多源并行搜索** - GitHub + Gitee + ModelScope（NEW!）
- ✅ 进度可视化
- ✅ 模板匹配
- ✅ 登录验证集成
- ✅ 响应式设计
- ✅ **智能匹配评分** - 基于名称、描述、标签的综合算法（NEW!）
- ✅ **Agent CRUD API** - 创建、查询、更新、删除智能体
- ✅ **执行监控页面** - 实时显示 Leader Agent 执行结果

### 🔔 通知系统（NEW!）

- ✅ 多种通知类型（悬赏、智能体、团队、系统等12种）
- ✅ 优先级标识（紧急/高/普通/低）
- ✅ 未读数量徽章
- ✅ 下拉面板快速查看
- ✅ 标记单条/全部为已读
- ✅ 删除通知
- ✅ 智能时间格式化
- ✅ 深色模式支持
- ✅ 响应式设计

### 🏢 虚拟公司系统（Phase 2-3 完成）

- ✅ **CEO Agent 动态生成** - 4 种管理风格模板
- ✅ **智能团队推断** - 根据描述自动匹配团队类型
- ✅ **Skills 自动配置** - 每个 CEO 配置 3 个默认技能
- ✅ **System Prompt 生成** - AI 驱动的个性化提示词
- ✅ **团队经营配置文档** - 4 种文档类型自动生成
- ✅ **多格式导出** - JSON / Markdown 格式下载
- ✅ **实时预览组件** - 前端展示配置和文档详情

### ️ Admin 后台

- ✅ 数据看板
- ✅ 爬虫管理
- ✅ 管理员管理
- ✅ 系统设置

### 🤖 自动爬虫

- ✅ 定时任务调度
- ✅ 多关键词策略
- ✅ 数据去重
- ✅ 错误重试

---

## 🏗️ 技术栈

### 前端

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: TanStack Query (React Query)
- **图标**: Lucide React

### 后端

- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: PostgreSQL (Neon)
- **ORM**: pg (原生 SQL)
- **认证**: JWT

### 工具

- **包管理**: pnpm
- **代码规范**: ESLint + Prettier
- **工作流**: LangChain.js
- **部署**: Docker (可选)

---

## 📁 项目结构

```
NvwaX/
├── packages/
│   ├── nvwax-web/          # Next.js 前端应用
│   │   ├── app/            # App Router 页面
│   │   ├── components/     # React 组件
│   │   ├── hooks/          # 自定义 Hooks
│   │   └── lib/            # 工具函数
│   │
│   ├── nvwax-server/       # Express 后端服务
│   │   ├── src/
│   │   │   ├── routes/     # API 路由
│   │   │   ├── services/   # 业务逻辑
│   │   │   └── middleware/ # 中间件
│   │   └── migrations/     # 数据库迁移
│   │
│   ├── skillhub-workflow/  # 工作流引擎
│   └── workflow-editor/    # 工作流编辑器
│
├── docs/                   # 文档
├── .github/                # GitHub 配置
└── README.md
```

---

## 📚 文档

### 用户指南

- [快速开始指南](./GETTING-STARTED.md)
- [用户认证指南](./EMAIL-AUTH-GUIDE.md)
- [Flowise 集成指南](./FLOWISE-SETUP-GUIDE.md)

### 开发指南

- [项目结构说明](./PROJECT-STRUCTURE.md)
- [API 测试报告](./API-TEST-REPORT.md)
- [PostgreSQL 迁移指南](./POSTGRESQL-MIGRATION.md)

### 管理指南

- [Admin 后台使用](./ADMIN-GUIDE.md)
- [爬虫管理指南](./MULTI-AGENT-SYSTEM-SUMMARY.md)

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. **Fork** 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 **Pull Request**

### 开发流程

```
# 1. Fork 并克隆
git clone https://github.com/YOUR_USERNAME/NvwaX.git

# 2. 安装依赖
pnpm install

# 3. 创建分支
git checkout -b feature/your-feature

# 4. 开发并测试
# ... 你的代码 ...

# 5. 提交 PR
git push origin feature/your-feature
```

### 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 编写清晰的注释
- 添加必要的测试

---

## 🌟 Star History

如果这个项目对你有帮助，请给我们一个 ⭐ Star！

---

## 📊 数据统计

- **18,000+** 代码行数
- **5,000+** 文档行数
- **30+** API 端点
- **95%** 功能完成度
- **3** 个完整阶段交付

---

## 🗺️ 路线图

### v2.0 (已完成 ✅)

- ✅ Nvwa Agent 工作流重构
- ✅ 可视化进度追踪（7步骤）
- ✅ 国内源支持（Gitee + ModelScope）
- ✅ CEO Agent 动态生成
- ✅ 团队经营配置文档生成
- ✅ 自动化工作流（Step 4-6）
- ✅ 智能匹配评分算法

### v2.1 (计划中 📋)

-  评价系统（星级评分）
- 📋 数据统计图表
- 📋 批量操作
- 📋 动态技能列表
- 📋 智能推荐

### v3.0 (远期规划 🎯)

- 🎯 AI Agent 执行引擎
- 🎯 可视化工作流编辑器
- 🎯 插件市场
- 🎯 API 开放平台
- 🎯 多语言支持

---

## 💬 社区

- **GitHub Issues**: [报告问题](https://github.com/BigLionX/NvwaX/issues)
- **GitHub Discussions**: [讨论交流](https://github.com/BigLionX/NvwaX/discussions)
- **Email**: 1055603323@qq.com

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](./LICENSE) 文件了解详情

---

## 🙏 致谢

感谢以下开源项目：

- [Next.js](https://nextjs.org/)
- [Express.js](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [LangChain.js](https://js.langchain.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

<div align="center">

**Made with ❤️ by Open Source Community**

[Website](https://nvwax.dev) • [Documentation](#-文档) • [Support](mailto:1055603323@qq.com)

</div>
