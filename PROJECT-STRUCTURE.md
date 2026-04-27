# NvwaX 项目文件结构

```
NvwaX/
│
├── 📄 NvwaXProjectPlan-1.md                    # 原始项目计划（2个月 MVP）
├── 📄 SkillHub-API-Integration-Plan.md         # ✨ API 集成方案（787行）
├── 📄 MULTI-AGENT-SYSTEM-SUMMARY.md            # ✨ 完整方案总结（369行）
├── 📄 PROJECT-STRUCTURE.md                     # ✨ 本文件（已更新）
├── 📄 DAY1-DAY3-*.md                           # 开发日志和进度报告
│
├── packages/                                   # ✨ 新增：Monorepo 包管理
│   ├── flowise/                               # Flowise 核心（Fork 版本）
│   ├── skillhub-workflow/                     # SkillHub 工作流引擎
│   ├── workflow-editor/                       # 工作流编辑器（待开发）
│   ├── nvwax-web/                             # ✨ Next.js 前端应用（新建）
│   │   ├── app/                               # App Router 页面
│   │   │   ├── page.tsx                       # 首页
│   │   │   ├── search/page.tsx                # Agent/Skill 搜索
│   │   │   ├── marketplace/page.tsx           # Agent 广场
│   │   │   └── projects/                      # 项目管理系统
│   │   │       ├── page.tsx                   # 项目列表
│   │   │       └── [projectId]/page.tsx       # 项目详情
│   │   ├── components/                        # React 组件
│   │   │   └── Layout/                        # 布局组件
│   │   │       ├── MainLayout.tsx             # 主布局
│   │   │       └── Sidebar.tsx                # 侧边栏
│   │   ├── lib/api/                           # API 客户端
│   │   │   ├── client.ts                      # Axios 实例
│   │   │   ├── search.ts                      # 搜索 API
│   │   │   └── projects.ts                    # 项目管理 API
│   │   └── store/                             # 状态管理
│   │       └── useProjectStore.ts             # Zustand Store
│   │
│   └── nvwax-server/                          # ✨ Express 后端服务（新建）
│       ├── src/
│       │   ├── config/index.ts                # 配置文件
│       │   ├── app.ts                         # Express 应用入口
│       │   ├── routes/index.ts                # API 路由
│       │   ├── controllers/                   # 控制器层
│       │   │   ├── search.controller.ts       # 搜索控制器
│       │   │   └── project.controller.ts      # 项目管理控制器
│       │   └── services/                      # 业务逻辑层
│       │       ├── database.service.ts        # SQLite 数据库服务
│       │       ├── skillhub.service.ts        # SkillHub API 集成
│       │       ├── agent-search.service.ts    # Agent 搜索服务
│       │       └── project.service.ts         # 项目管理服务
│       └── data/nvwax.db                      # SQLite 数据库文件
│
└── .lingma/
    └── skills/
        └── multi-agent-orchestrator/           # ✨ 多 Agent 协作系统
            │
            ├── 📘 README.md                    # 使用指南（326行）
            ├── 📋 SKILL.md                     # 主指令文件（450行）
            ├── 📚 agents-reference.md          # Agent 参考手册（566行）
            ├── 📡 communication-protocol.md    # 通信协议规范（812行）
            ├── 💡 examples.md                  # 实战示例集（788行）
            ├── ⚡ QUICK-REFERENCE.md           # 快速参考卡片（226行）
            │
            └── scripts/
                └── 🐍 task_tracker.py          # 任务跟踪工具（443行）
```

---

## 📊 文件统计

### 文档总览

| 文件 | 行数 | 大小 | 用途 |
|------|------|------|------|
| **SkillHub-API-Integration-Plan.md** | 787 | 21 KB | API 集成详细方案 |
| **MULTI-AGENT-SYSTEM-SUMMARY.md** | 369 | 9 KB | 完整方案总结 |
| **SKILL.md** | 450 | 13 KB | 多 Agent 主指令 |
| **agents-reference.md** | 566 | 12 KB | Agent 类型详解 |
| **communication-protocol.md** | 812 | 20 KB | 通信协议规范 |
| **examples.md** | 788 | 19 KB | 实战示例集合 |
| **README.md** | 326 | 8 KB | 使用指南 |
| **QUICK-REFERENCE.md** | 226 | 5 KB | 快速参考 |
| **task_tracker.py** | 443 | - | 任务跟踪脚本 |
| **小计（文档）** | **4,767** | **~107 KB** | **9个核心文件** |

### 代码总览（新增）

| 模块 | 文件数 | 代码行数 | 说明 |
|------|--------|----------|------|
| **nvwax-web (前端)** | ~15 | ~1,500 | Next.js + React + TypeScript |
| **nvwax-server (后端)** | ~10 | ~1,200 | Express + TypeScript + SQLite |
| **API 接口** | - | ~300 | RESTful API 实现 |
| **数据库模型** | - | ~200 | SQLite Schema |
| **小计（代码）** | **~25** | **~3,200** | **完整全栈应用** |

### 总体统计

- **文档**: 9 个核心文件，4,767 行
- **代码**: 25+ 个文件，3,200+ 行
- **总计**: 34+ 个文件，7,967+ 行
- **技术栈**: Next.js, Express, TypeScript, SQLite, Tailwind CSS

---

## 🎯 文件用途说明

### 0. 新增：全栈应用层（2026-04-24）

#### `packages/nvwax-web/` - Next.js 前端应用
- **用途**: 独立的 AI Agent 搜索、发现和管理平台
- **核心功能**:
  1. **Agent/Skill 搜索引擎** - 支持全网 Agent（GitHub、HuggingFace）和 SkillHub 技能的统一搜索
  2. **Agent 广场** - 展示和浏览可用的 AI Agent
  3. **我的项目管理系统** - 三级层级结构：我的项目 > AiTeam > Agent团队
- **技术栈**: Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, TanStack Query
- **读者**: 前端开发、UI/UX 设计师
- **状态**: ✅ 已完成基础版本

#### `packages/nvwax-server/` - Express 后端服务
- **用途**: 提供 RESTful API，集成 SkillHub 和全网 Agent 搜索
- **核心功能**:
  - SkillHub API 集成服务
  - Agent 搜索聚合（GitHub + HuggingFace）
  - 项目管理 CRUD（SQLite 数据库）
  - 统一的搜索 API
- **技术栈**: Node.js, Express, TypeScript, SQLite, Axios
- **读者**: 后端开发、架构师
- **状态**: ✅ 已完成基础版本

---

### 1. 战略规划层

#### `NvwaXProjectPlan-1.md`
- **用途**: 项目整体规划（2个月 MVP）
- **内容**: 里程碑、技术选型、时间线
- **读者**: 项目经理、技术负责人

#### `SkillHub-API-Integration-Plan.md`
- **用途**: SkillHub API 与 Flowise 集成方案
- **内容**: API 文档、三种集成方案、实施计划
- **读者**: 后端开发、架构师
- **关键发现**: ✅ API 完全可用，推荐 OpenAPI Toolkit

#### `MULTI-AGENT-SYSTEM-SUMMARY.md`
- **用途**: 所有交付物的汇总和导航
- **内容**: 文件清单、核心价值、下一步行动
- **读者**: 所有团队成员
- **特点**: 一站式了解整个系统

---

### 2. Skill 核心层

#### `.lingma/skills/multi-agent-orchestrator/SKILL.md`
- **用途**: AI assistant 的主指令文件
- **内容**: 工作流程、Agent 类型、任务分配策略
- **触发**: 当用户提到"多 agent"、"并行开发"等关键词
- **重要性**: ⭐⭐⭐⭐⭐ 核心文件

#### `README.md`
- **用途**: Skill 的使用指南
- **内容**: 快速开始、工作流程、使用示例
- **读者**: 首次使用者
- **建议**: 📖 第一个阅读的文档

---

### 3. 参考文档层

#### `agents-reference.md`
- **用途**: 各 Agent 类型的详细说明
- **内容**: 
  - 6种 Agent 的职责和技术栈
  - 触发场景关键词
  - 输出标准和代码规范
  - 完整示例代码
- **读者**: 需要了解特定 Agent 能力的开发者
- **示例**: Database Agent 的 Prisma schema 标准

#### `communication-protocol.md`
- **用途**: Agent 间通信的标准化协议
- **内容**:
  - TypeScript 消息接口定义
  - 9种消息类型
  - Redis/内存队列实现
  - 安全性、性能优化
- **读者**: 需要扩展或调试通信系统的开发者
- **技术深度**: 🔥🔥🔥🔥🔥 最技术化的文档

#### `examples.md`
- **用途**: 真实场景的完整案例
- **内容**:
  - 示例1: 博客系统（从需求到部署）
  - 示例2: 紧急 Bug 修复
  - 示例3: 性能优化
- **读者**: 学习如何使用的开发者
- **价值**: 💡 最佳学习资源

---

### 4. 快速参考层

#### `QUICK-REFERENCE.md`
- **用途**: 日常开发的速查表
- **内容**:
  - 触发关键词
  - Agent 类型速查表
  - 消息格式模板
  - 常见场景快速响应
- **读者**: 日常使用者
- **特点**: 📌 打印出来贴在墙上

---

### 5. 工具层

#### `scripts/task_tracker.py`
- **用途**: 跟踪多 Agent 任务进度
- **功能**:
  - 任务依赖管理
  - 实时进度显示（带进度条）
  - JSON/Markdown 报告导出
  - 内置博客系统示例
- **语言**: Python 3.8+
- **使用**: `python task_tracker.py demo`

---

## 🚀 快速开始

### 前置要求

- Node.js 20.11+
- npm 或 yarn

### 启动开发环境

#### 1. 启动后端服务

```bash
cd packages/nvwax-server
npm install
npm run dev
```

后端服务将运行在: http://localhost:3001

#### 2. 启动前端应用

```bash
cd packages/nvwax-web
npm install
npm run dev
```

前端应用将运行在: http://localhost:3000

### 访问应用

打开浏览器访问 http://localhost:3000，您将看到：

- **首页** - 功能导航和介绍
- **Agent 搜索** (/search) - 搜索全网 Agent 和 SkillHub 技能
- **Agent 广场** (/marketplace) - 浏览热门 Agent
- **我的项目** (/projects) - 管理 AiTeam 和 Agent 团队

---

## 🔌 API 端点文档

### 搜索相关

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/search/agents?q={query}&page={page}` | 搜索 Agent |
| GET | `/api/search/skills?q={query}&page={page}` | 搜索 Skill |
| POST | `/api/search/unified` | 统一搜索（Agent + Skill） |

### 项目管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/projects?userId={userId}` | 获取项目列表 |
| POST | `/api/projects` | 创建项目 |
| GET | `/api/projects/:id` | 获取项目详情 |
| PUT | `/api/projects/:id` | 更新项目 |
| DELETE | `/api/projects/:id` | 删除项目 |

### AiTeam 管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/projects/:projectId/teams` | 获取 AiTeam 列表 |
| POST | `/api/teams` | 创建 AiTeam |
| PUT | `/api/teams/:id` | 更新 AiTeam |
| DELETE | `/api/teams/:id` | 删除 AiTeam |

### Agent Team 管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/teams/:teamId/agent-teams` | 获取 Agent Team 列表 |
| POST | `/api/agent-teams` | 创建 Agent Team |
| PUT | `/api/agent-teams/:id` | 更新 Agent Team |
| DELETE | `/api/agent-teams/:id` | 删除 Agent Team |

---

## 📖 推荐阅读顺序

### 新手入门路径

```
1️⃣ MULTI-AGENT-SYSTEM-SUMMARY.md
   ↓ 了解整体方案
   
2️⃣ README.md
   ↓ 学习基本概念
   
3️⃣ QUICK-REFERENCE.md
   ↓ 掌握常用命令
   
4️⃣ examples.md
   ↓ 查看实际案例
   
5️⃣ 开始实践！
```

### 深度学习路径

```
1️⃣ SKILL.md
   ↓ 理解核心工作流程
   
2️⃣ agents-reference.md
   ↓ 掌握各 Agent 能力
   
3️⃣ communication-protocol.md
   ↓ 深入通信机制
   
4️⃣ task_tracker.py (源码)
   ↓ 理解实现细节
   
5️⃣ 扩展和定制
```

### 实施团队路径

```
1️⃣ NvwaXProjectPlan-1.md
   ↓ 了解项目规划
   
2️⃣ SkillHub-API-Integration-Plan.md
   ↓ 掌握 API 集成方案
   
3️⃣ README.md + examples.md
   ↓ 学习使用方法
   
4️⃣ 开始 Milestone 1
```

---

## 🔗 文件间关系

```
NvwaXProjectPlan-1.md (项目规划)
    ↓ 指导
SkillHub-API-Integration-Plan.md (技术方案)
    ↓ 支持
multi-agent-orchestrator/ (执行系统)
    ├── SKILL.md (核心指令)
    ├── agents-reference.md (能力定义)
    ├── communication-protocol.md (交互规范)
    ├── examples.md (实践案例)
    └── task_tracker.py (监控工具)
```

---

## 💾 版本控制建议

### Git 分支策略

```
main
├── feature/api-integration       # SkillHub API 集成
├── feature/multi-agent-skill     # 多 Agent 系统开发
├── feature/flowise-customization # Flowise 定制
└── docs/documentation            # 文档更新
```

### 提交规范

```bash
# 文档更新
git commit -m "docs: add multi-agent orchestrator skill"

# 新功能
git commit -m "feat: implement task tracker script"

# Bug 修复
git commit -m "fix: correct message format in protocol"

# 重构
git commit -m "refactor: simplify agent assignment logic"
```

---

## 📦 打包和分发

### 创建发布包

```bash
# 压缩整个 skill
tar -czf multi-agent-orchestrator.tar.gz \
  .lingma/skills/multi-agent-orchestrator/

# 包含所有文档
tar -czf nvwax-docs.tar.gz \
  *.md \
  .lingma/skills/multi-agent-orchestrator/*.md
```

### Docker 镜像（可选）

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY .lingma/skills/multi-agent-orchestrator/scripts/ /app/scripts/

RUN pip install redis

CMD ["python", "scripts/task_tracker.py", "demo"]
```

---

## 🔄 更新和维护

### 文档更新流程

1. **修改文档**
   ```bash
   # 编辑相关文件
   code .lingma/skills/multi-agent-orchestrator/SKILL.md
   ```

2. **验证更改**
   ```bash
   # 运行示例确保仍然有效
   python scripts/task_tracker.py demo
   ```

3. **更新版本号**
   - 在 README.md 中更新版本
   - 在 CHANGELOG.md 中记录变更

4. **提交和推送**
   ```bash
   git add .
   git commit -m "docs: update skill documentation"
   git push origin main
   ```

### 定期维护任务

- [ ] 每月检查 API 端点是否仍然可用
- [ ] 每季度更新示例代码
- [ ] 每半年审查和优化工作流程
- [ ] 收集用户反馈并改进

---

## 📞 获取帮助

### 问题排查

1. **Skill 未激活**
   - 检查文件位置: `.lingma/skills/multi-agent-orchestrator/SKILL.md`
   - 确认触发关键词匹配
   - 查看 Lingma 日志

2. **任务跟踪器无法运行**
   ```bash
   # 检查 Python 版本
   python --version  # 需要 3.8+
   
   # 安装依赖
   pip install redis  # 可选，用于 Redis 支持
   ```

3. **API 连接失败**
   ```bash
   # 测试连通性
   curl https://skillhub.proclaw.cc/api/tools/discovery
   ```

### 联系支持

- 📧 Email: team@nvwax.com
- 💬 Discord: [NvwaX Community](https://discord.gg/nvwax)
- 🐛 Issues: [GitHub Issues](https://github.com/BiglionX/NvwaX/issues)

---

## 🎉 总结

### 当前成果（2026-04-24 更新）

你现在拥有：

✅ **完整的文档体系** - 9个核心文件，4,767+ 行  
✅ **清晰的文件结构** - 分层组织，易于导航  
✅ **实用的工具** - 任务跟踪器和报告生成  
✅ **丰富的示例** - 3个完整实战案例  
✅ **详细的协议** - 标准化通信机制  

✨ **新增：完整全栈应用**
- ✅ **Next.js 前端应用** - 现代化的 UI/UX，响应式设计
- ✅ **Express 后端服务** - RESTful API，SQLite 数据库
- ✅ **Agent/Skill 搜索引擎** - 支持全网 Agent 和 SkillHub 技能
- ✅ **Agent 广场** - 展示和浏览 AI Agent
- ✅ **项目管理系统** - 三级层级结构（项目 > AiTeam > Agent团队）
- ✅ **API 集成** - SkillHub API + GitHub + HuggingFace

### 项目统计

- **总文件数**: 34+ 个
- **总代码行数**: 7,967+ 行
- **技术栈**: Next.js, Express, TypeScript, SQLite, Tailwind CSS
- **开发状态**: 基础版本已完成，可运行和测试

### 下一步行动

1. **立即可用**:
   ```bash
   # 终端 1: 启动后端
   cd packages/nvwax-server && npm run dev
   
   # 终端 2: 启动前端
   cd packages/nvwax-web && npm run dev
   ```

2. **功能增强**:
   - [ ] 实现用户认证系统（JWT）
   - [ ] 添加更多 Agent 数据源
   - [ ] 完善 Agent Team 详情页面
   - [ ] 集成 Flowise 工作流可视化

3. **质量提升**:
   - [ ] 添加单元测试和 E2E 测试
   - [ ] 性能优化和缓存策略
   - [ ] Docker 化部署
   - [ ] CI/CD 流水线

**开始探索**: 访问 http://localhost:3000 体验 NvwaX 平台！

---

**最后更新**: 2026-04-24  
**版本**: 2.0.0 (全栈应用版)  
**项目**: [NvwaX](https://github.com/BiglionX/NvwaX)
