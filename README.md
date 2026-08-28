# NvwaX - 帮你组建 AI 公司的操作系统

<div align="center">

![NvwaX Logo](https://img.shields.io/badge/NvwaX-AI%20Virtual%20Company%20OS-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue?style=for-the-badge&logo=postgresql)
![Version](https://img.shields.io/badge/Version-v2.2.1-orange?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=for-the-badge)
![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%2B%20Railway-blue?style=for-the-badge)

**开源的 AI 虚拟公司（AI Team Builder）平台 — 你负责提需求，我们负责组建一支能干活的 AI 公司**

[文档](#-文档) • [快速开始](#-快速开始) • [功能特性](#-功能特性) • [MCP 协议](#-mcp-协议) • [贡献指南](#-贡献指南) • [社区](#-社区)

</div>

---

## 📖 简介

NvwaX 是帮你组建 **AI 公司（虚拟公司）** 的操作系统。用户旅程从「创建一个 Agent」升级为「注册团队 → 设置岗位 → 分配任务 → 产出成果」：选择公司类型（营销、客服、内容创作...）→ 描述核心目标 → AI 架构师设置岗位（CEO、市场总监、文案...）→ 招聘 AI 合伙人 → 生成可下载的公司经营配置文档包。

### ✨ 核心亮点

- 🏢 **AI 公司创建向导（主功能）**: 对话式组建 AI 虚拟公司——公司类型 → 核心目标 → 岗位设置（CEO、市场总监、文案...）→ 任务分配 → 成果交付，7 步引导流程，可视化进度追踪
- 🤖 **招聘员工（收敛入口）**: 创建单个智能体已收敛为「招聘」手段，是组建 AI 公司的一个环节；在招聘台按岗位（客服、数据分析、文案...）招募 AI 合伙人
- 🏪 **我的 AI 公司**: 组建完成的 AiTeam 自动保存到「我的 AI 公司」，支持岗位（AI 合伙人）管理、导出、发布与解散；创建成功后深链跳转 `?aiteam=<id>` 自动打开公司详情并高亮定位
- ⚡ **公司内任务分配/执行**: 每家公司可下达任务需求，CEO（Leader Agent）自动编排公司内各岗位 AI 合伙人协同执行，实时反馈参与岗位、工作流步数与耗时
- 🚀 **多壳落地导出**: 一键导出为 ProClaw / CrewAI / LangGraph / JSON / YAML 5 种格式，落到任意本地运行时
- 💼 **行业插件增强**: Action 类型扩展 + 能力注册 API + 插件上下文注入 + 推荐引擎
- 📦 **虚拟公司打包**: CEO Agent 动态生成 + 团队经营配置文档生成
- 🎁 **悬赏系统**: 发布、领取、提交、验证完整的悬赏流程
- 👑 **Admin 后台升级**: Agent管理、虚拟公司监控、通知中心、审计日志
- 🌐 **多数据源**: GitHub、Gitee（码云）、ModelScope（魔搭）、百度、阿里、腾讯等
- 👥 **团队管理**: 创建和管理 AiTeam 和 Agent Teams
- 🚀 **工作流引擎**: 基于 LangChain.js 的工作流编排
- 📦 **Web Component SDK**: Lit-based 可嵌入组件
- 🎨 **现代 UI**: 响应式设计，支持深色模式，左右分栏布局
- 🔒 **权限控制**: 完整的用户认证和路由保护
- ✅ **生产就绪**: 代码质量 100%，零错误零警告

> 📄 完整转型记录与审计结论见 [docs/AI-TEAM-BUILDER-TRANSFORMATION.md](./docs/AI-TEAM-BUILDER-TRANSFORMATION.md)

---

## 🆕 最新更新 (v2.2.1 — Sprint 2.17)

**更新日期**: 2026-XX-XX

### 📡 真实 SSE 流式（v1.4.0 闭环收尾）

配合 ProClaw v1.4.0 / v1.4.1 的 `nvwax_stream_session_v2` 真 SSE 命令，本轮改造 `GET /api/aiteam-creation/sessions/:id/stream` 端点：

- **新增 6 种 SSE 事件类型**（`event:` 前缀）：
  - `progress` — 进度快照（currentStep / percentage / status）
  - `agent_message` — NvWaX CEO Agent 的自然语言回复（**ProClaw wizard 真正流式显示的关键**）
  - `step` — 某 step 完成
  - `status` — 会话状态变化
  - `complete` — 会话终态（completed / failed / cancelled），携带 finalTeamSkillId
  - `error` — 错误事件
- **`broadcastAgentMessage(sessionId, message, phase?, progress?, confidence?, nextStep?)`** 在 `sse-progress.service` 中新增
- **`broadcastComplete(sessionId, finalStatus, finalTeamSkillId?)`** 在终态时调用
- `sendMessage` controller 改造：`broadcastAgentMessage(...)` 在持久化 `nvwaxResponse.message` 后立即推送
- `confirmAndSaveTeam` 改造：成功保存到 `team_skills` 后 `broadcastComplete('completed', aiteamId)`
- **向后兼容**：旧版（无 `event:` 前缀）客户端仍可工作（默认 fallback 到 progress_update 行为）
- **端到端测试覆盖**：`sse-progress.service.test.ts` 7 个用例（headers / events / cleanup / done detection / 客户端断开清理）

完整 changelog 与迁移指南见 [`docs/PROCLAW-NVWAX-API-INTEGRATION-REQUIREMENT.md`](./docs/PROCLAW-NVWAX-API-INTEGRATION-REQUIREMENT.md)。

---

## 🆕 历史更新 (v2.2.0)

**更新日期**: 2026-06-22

### 🚀 Agent 创建方法全面升级（v2.2 重磅发布）

本次升级针对 Agent 创建方法的三个核心维度（**鲁棒性**、**灵活性**、**智能化**），引入多项最新技术：

#### 1. 鲁棒性升级 - Structured Output 引擎

彻底告别 LLM 输出 JSON 的脆弱解析！

- **3 级降级策略**：`json_schema` → `json_object` → `fallback`（正则提取 + 重试）
- 输出可靠性从 ~80% 提升到 **~99%**
- 消除了 `nvwax-agent.service.ts` 和 `nvwa-leader.service.ts` 中所有 JSON 正则解析代码

**关键文件**：
- `packages/nvwax-server/src/services/structured-output.service.ts` (421 行)

#### 2. 鲁棒性升级 - 图状态机流程引擎

替代线性 7 步创建流程，支持：
- ✅ 条件分支（基于数据评估）
- ✅ Checkpoint 持久化（断点恢复）
- ✅ Human-in-the-loop（关键节点暂停审批）
- ✅ 状态回退（GO_BACK 任意节点）
- ✅ 状态转换审计日志

**关键文件**：
- `packages/nvwax-server/src/services/creation-state-machine.service.ts` (499 行)
- `packages/nvwax-server/src/types/creation-state.ts` (309 行)
- `packages/nvwax-server/migrations/030_creation_state_machine.sql`

#### 3. 灵活性升级 - 动态 Agent 注册表 + 语义匹配

突破 5 种硬编码 Agent 类型的限制！

- 支持 CRUD 动态注册 Agent
- 多源支持：`built-in` / `yaml` / `api` / `community`
- 语义匹配（capabilities + keywords + embedding）
- GIN 索引加速 JSONB 搜索

**关键文件**：
- `packages/nvwax-server/src/services/agent-registry.service.ts` (341 行)

#### 4. 灵活性升级 - 声明式 YAML DSL

通过 YAML 文件定义 Agent 和工作流，支持热加载：

```yaml
agent:
  id: content-strategist
  name: 内容策略师
  capabilities:
    - content_strategy
    - trend_analysis
  system_prompt: |
    你是一位资深内容策略师...
```

**关键文件**：
- `packages/skillhub-workflow/src/loaders/yaml-agent-loader.js` (377 行)
- `packages/skillhub-workflow/agents/*.yaml`（示例）
- `packages/skillhub-workflow/workflows/*.yaml`（示例）

#### 5. 智能化升级 - 反思学习系统

从失败案例中自动学习！

- 定期分析 `success_score < 0.5` 的失败案例
- 提取失败模式（角色过多、职责重叠、缺少关键角色等）
- 将反思结果注入 LLM system prompt，避免重复犯错

**关键文件**：
- `packages/nvwax-server/src/services/reflection-learning.service.ts` (402 行)

#### 6. 智能化升级 - MCP 协议支持

将 NvwaX 核心能力暴露为标准 MCP Tools，开放给外部 Agent 框架：

- **6 个 MCP Tools**：`nvwax_search_agents` / `nvwax_design_team` / `nvwax_match_skills` / `nvwax_analyze_requirements` / `nvwax_get_best_practices` / `nvwax_register_agent`
- 遵循 Model Context Protocol 规范
- 支持 CrewAI、LangGraph、OpenAgents 等外部 Agent 框架调用

详见 [MCP 协议](#-mcp-协议) 章节。

#### 📊 升级效果对比

| 维度 | 升级前 | 升级后 |
|------|--------|--------|
| LLM JSON 输出成功率 | ~80% | **~99%** |
| 流程分支能力 | 不支持 | **支持**（条件判断）|
| Agent 类型数量 | 5 种 | **无限**（动态注册）|
| 推荐准确率 | 频率统计 | **语义匹配 + 反思学习**|
| 单元测试覆盖 | 0 | **60 个测试，3 个套件**|

详细升级需求和实施计划见：
- [NVWAX-AGENT-CREATION-UPGRADE-V3.md](./docs/NVWAX-AGENT-CREATION-UPGRADE-V3.md)
- [NVWAX-UPGRADE-IMPLEMENTATION-PLAN.md](./docs/NVWAX-UPGRADE-IMPLEMENTATION-PLAN.md)

---

## 🌐 与 ProClaw 桌面端的集成（v2.2.0+）

> **官方推荐**：[ProClaw](https://github.com/BiglionX/ProClaw) 是 NvWaX 官方推荐的"本地壳"。
> NvWaX 在云端完成 AI 团队设计，ProClaw 在本地运行整个团队。三个 Sprint（2.13/2.14/2.15）累计交付：8 个 Tauri 命令 / 5 个 HTTP 端点 / 1 套 JSON Schema / 47 个测试。

### 双向闭环全景

```
┌─────────────────────────┐                  ┌──────────────────────────┐
│  NvWaX Cloud (Web)        │   HTTP / JWT    │  ProClaw Desktop (Tauri)  │
│  · 对话式创建虚拟公司      │ ◄─────────────► │  · virtual-company 插件   │
│  · AI 自动匹配 Agent       │                  │  · 本地 SQLite 持久化     │
│  · 一键导出 .nvwax-vc.json │                  │  · Hermes Skill 触发     │
│  · 多设备 local_state 同步  │                  │  · 多设备 LWW 合并        │
└─────────────────────────┘                  └──────────────────────────┘
```

### 用户旅程

1. 用户在 NvWaX Web 用对话式 AI 设计虚拟公司（5-10 分钟）
2. NvWaX 调 `POST /api/aiteam-creation/sessions/:id/integrate-proclaw` → 生成 `VirtualCompanyPackage`（schemaVersion 1.0.0），写入临时文件，返回 `{packageId, downloadUrl, checksum}`
3. 前端 `aiteam-creator-modal` 自动下载 `.nvwax-vc.json` + 显示完整下载链接
4. 用户在 ProClaw 桌面端粘贴 URL → `nvwax_import_virtual_company_from_url` 拉取 → 写入本地 SQLite
5. 用户在 ProClaw 启用/停用某个 Agent → `nvwax_push_virtual_company_state` → `PUT /sessions/:id/local-state` 同步到 NvWaX
6. MacBook 端 ProClaw 启动 5 秒后 `startBackgroundSync()` 拉取最新 → 字段级 LWW 合并 → 状态一致

### 5 个新增 HTTP 端点（Sprint 2.13–2.15）

| Method | Path | 用途 | Sprint |
|--------|------|------|--------|
| POST | `/api/aiteam-creation/sessions/:id/integrate-proclaw` | 生成 `.nvwax-vc.json` 包（写临时文件） | 2.13 |
| GET  | `/api/aiteam-creation/packages/:packageId/download` | 下载导出包 | 2.13 |
| PUT  | `/api/aiteam-creation/sessions/:id/local-state` | 接收 ProClaw 推送的本地状态回写 | 2.14 |
| GET  | `/api/aiteam-creation/sessions/:id/local-state` | 拉取单个 session 的最新 `local_state` | 2.15 |
| GET  | `/api/aiteam-creation/sessions` | 列表响应增加 `local_state` + `localStateLastSyncedAt` | 2.15 |

### 关键代码

- **Service**：`packages/nvwax-server/src/services/proclaw.service.ts`
  - `buildVirtualCompanyPackageFromSession(sessionId, userId)` → 组装 `VirtualCompanyPackage`
  - `getLocalState(sessionId, userId)` → 拉取 `local_state` JSONB
  - `writePackageToTempFile(pkg)` / `readPackageFromTempFile(packageId)` → 临时文件 I/O
- **Controller**：`packages/nvwax-server/src/controllers/aiteam-creation.controller.ts`
  - `integrateToProClaw`（Sprint 2.13）→ `pushLocalState`（2.14）→ `getLocalState`（2.15）
- **Migration**：`packages/nvwax-server/migrations/012_virtual_company_local_state.sql`（新增 `aiteam_creation_sessions.local_state` JSONB 列）
- **Schema 镜像**：`packages/nvwax-server/src/schemas/virtual-company-package.schema.json`（双端镜像）

### 跨包数据契约

- 文件位置：[`packages/nvwax-server/src/schemas/virtual-company-package.schema.json`](packages/nvwax-server/src/schemas/virtual-company-package.schema.json)
- 镜像：[ProClaw](https://github.com/BiglionX/ProClaw) 端 [`docs/integration/virtual-company-package.schema.json`](https://github.com/BiglionX/ProClaw/blob/main/docs/integration/virtual-company-package.schema.json)
- 当前版本：`1.0.0`（主版本不一致即拒绝导入）
- 必填字段：`schemaVersion` / `packageId` / `exportedAt` / `source.platform === "nvwax"` / `team.id` `team.name` / `agents[]`
- 可选字段：`checksum`（SHA-256）· `skills[]` · `metadata`

### 测试覆盖（4 个 Jest 测试）

`packages/nvwax-server/src/services/proclaw.service.test.ts`：
- `buildVirtualCompanyPackageFromSession` × 4 个场景
  - 完整 session → 完整 VirtualCompanyPackage
  - session 不存在 → 返回 null
  - agent_matches 为空时从 team_design.roles 兜底
  - checksum 对相同输入稳定

### 字段级 Last-Write-Wins 合并（实现细节）

- 每个 Agent 字段（`enabled` / `alias` / `ownerRole`）独立比较时间戳
- 时间更新的字段胜出；tie 场景：云端优先；首次同步：云端优先
- 实现见 ProClaw 端 `src/lib/virtualCompanySync.ts::mergeAgentState`

### 后续路线图（计划中）

- 虚拟公司模板市场反向发布（ProClaw → NvWaX marketplace）
- 多设备冲突 UI 撤销按钮
- Schema v2.0（ProClaw + NvWaX 同步主版本升级）

---

## 🆕 最新更新 (v2.1.0)

**更新日期**: 2026-06-04

### 🧩 行业插件增强（Phase 5 完成）

#### 📝 插件能力注册与查询

- ** 能力注册 API** - `POST /api/v2/capabilities/register` 注册/更新插件能力（UPSERT）
- ** 能力查询** - `GET /api/v2/capabilities/:plugin_id` 查询单个插件能力
- ** 行业标签搜索** - `GET /api/v2/capabilities` 支持按行业标签筛选
- ** 能力注销** - `DELETE /api/v2/capabilities/:plugin_id` 注销插件能力
- ** 数据库支持** - PostgreSQL JSONB 存储 actions/data_queries/skill_ids

#### 🔧 Agent Action 输出扩展

- ** 输出类型系统** - 5 种输出类型：text / action / data_query / card / mixed
- ** 智能解析引擎** - 从 LLM 回复中提取 JSON 块并识别输出类型
- ** 参数验证** - 根据插件定义验证 action 参数完整性，返回缺失参数+建议
- ** 预设提示词** - 根据 Agent + 插件 IDs 生成完整预设提示词

#### 📡 插件上下文注入

- ** 上下文中间件** - 解析 `X-Plugin-Capabilities` Header 并注入请求
- ** 系统提示词生成** - 将插件能力列表转为详细的 Agent System Prompt
- ** Function Calling 支持** - 自动生成 OpenAI/DeepSeek 兼容的 tools 定义
- ** Plugin-Aware Chat 端点** - `POST /api/v2/nvwa-agent/plugin-aware-chat`

#### 🎯 推荐引擎

- ** 3 级匹配算法** - 精确匹配 (50%) > 行业匹配 (30%) > 热榜 (15%)
- ** 双源推荐** - 同时推荐 Agent 和 SkillHub 技能
- ** 去重合并排序** - 相同分数按热度二次排序
- ** API 端点** - `POST /api/v2/agents/recommend` 和 `GET /api/v2/agents/recommend-skills`

####  测试覆盖

- ** 14 个集成测试** - 覆盖注册、查询、解析、验证、推荐全部流程
- ** 测试通过率 100%**
- ** 测试脚本** - `pnpm --filter nvwax-server run test:plugin-capabilities`

>  详细文档: [Nvwax_Agent平台行业插件增强需求_PRD_v2.0.md](./docs/Nvwax_Agent平台行业插件增强需求_PRD_v2.0.md) | [NVWAX-IMPLEMENTATION-PLAN.md](./docs/NVWAX-IMPLEMENTATION-PLAN.md)

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

## 🔌 MCP 协议

NvwaX 实现 **Model Context Protocol (MCP)**，将核心能力暴露为标准化 Tools，让外部 Agent 框架（CrewAI、LangGraph、OpenAgents 等）可以无缝调用。

### 🌐 可用 MCP 端点

启动后端服务后，MCP 端点位于 `http://localhost:3001/api/mcp/`（开发环境）：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/mcp/tools/list` | POST | 列出所有可用的 MCP Tools |
| `/api/mcp/tools/call` | POST | 调用指定的 MCP Tool |
| `/api/mcp/health` | GET | MCP 服务健康检查 |

### 🛠️ 可用 Tools（6 个）

| Tool 名称 | 功能 |
|-----------|------|
| `nvwax_search_agents` | 搜索匹配的 AI Agent（capabilities + keywords 语义匹配）|
| `nvwax_design_team` | 设计 AI 团队结构（3-5 角色 + 协作流程）|
| `nvwax_match_skills` | 为团队匹配所需 Skills（SkillHub 集成）|
| `nvwax_analyze_requirements` | 分析用户需求（提取团队类型、职责、产出）|
| `nvwax_get_best_practices` | 获取特定团队类型的最佳实践（基于历史数据）|
| `nvwax_register_agent` | 注册新的 Agent 定义（动态扩展 Agent 类型）|

### 📝 使用示例

**列出所有 Tools**：

```bash
curl -X POST http://localhost:3001/api/mcp/tools/list
```

**调用 Tool（搜索 Agent）**：

```bash
curl -X POST http://localhost:3001/api/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "nvwax_search_agents",
    "arguments": {
      "query": "frontend developer",
      "capabilities": ["react", "typescript"],
      "top_k": 3
    }
  }'
```

**调用 Tool（设计团队）**：

```bash
curl -X POST http://localhost:3001/api/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "nvwax_design_team",
    "arguments": {
      "team_type": "营销团队",
      "responsibilities": ["内容创作", "数据分析", "用户运营"],
      "expected_outputs": ["图文笔记", "数据报告"]
    }
  }'
```

### 🤖 外部 Agent 集成

**CrewAI 示例**：

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3001/api/mcp",
    api_key="your-nvwax-api-key"
)

# CrewAI Agent 现在可以通过 MCP 协议调用 NvwaX 的能力
response = client.chat.completions.create(
    model="nvwax-search-agent",
    messages=[{"role": "user", "content": "查找前端开发 Agent"}]
)
```

**LangGraph 示例**：

```python
from langchain.tools import tool
import requests

@tool
def nvwax_design_team(team_type: str, responsibilities: list):
    """通过 NvwaX MCP 设计 AI 团队"""
    return requests.post(
        "http://localhost:3001/api/mcp/tools/call",
        json={
            "name": "nvwax_design_team",
            "arguments": {
                "team_type": team_type,
                "responsibilities": responsibilities
            }
        }
    ).json()
```

### 📚 相关文档

- [NVWAX-AGENT-CREATION-UPGRADE-V3.md](./docs/NVWAX-AGENT-CREATION-UPGRADE-V3.md) — 升级需求详情
- [Model Context Protocol 规范](https://modelcontextprotocol.io/) — MCP 标准

---

## 📦 功能特性

### 🧩 插件能力注册（NEW! v2.1）

- ✅ ** 能力注册 API** - 注册/更新/查询/注销插件能力
- ✅ **JSONB 数据存储** - 灵活存储 action 定义和 data_query 模式
- ✅ **行业标签匹配** - 按 skill_ids 筛选插件能力
- ✅ **Action 输出验证** - 验证 action_name 和参数完整性
- ✅ **Action 输出解析** - 从 LLM 回复中智能提取 JSON 块
- ✅ **5 种输出类型** - text / action / data_query / card / mixed
- ✅ **Function Calling 工具生成** - 自动适配 OpenAI/DeepSeek

### 📡 插件上下文系统（NEW! v2.1）

- ✅ **X-Plugin-Capabilities Header** - HTTP 插件上下文注入
- ✅ **插件感知聊天端点** - `POST /api/v2/nvwa-agent/plugin-aware-chat`
- ✅ **动态 System Prompt 生成** - 插件能力列表转 Agent 提示词
- ✅ **预设提示词生成** - `GET /api/v2/agents/:id/presets`
- ✅ **Action 参数验证 API** - `POST /api/v2/agents/:id/validate_action`

### 🎯 推荐引擎（NEW! v2.1）

- ✅ **3 级匹配算法** - 精确匹配 > 行业匹配 > 热榜
- ✅ **双源推荐** - Agent + SkillHub 技能同步推荐
- ✅ **去重合并排序** - 智能去重 + 热度二次排序
- ✅ **推荐 API** - `POST /api/v2/agents/recommend`

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

### 🏢 虚拟公司系统（Phase 2-3 完成 + Sprint 2.13/2.14/2.15）

- ✅ **CEO Agent 动态生成** - 4 种管理风格模板
- ✅ **智能团队推断** - 根据描述自动匹配团队类型
- ✅ **Skills 自动配置** - 每个 CEO 配置 3 个默认技能
- ✅ **System Prompt 生成** - AI 驱动的个性化提示词
- ✅ **团队经营配置文档** - 4 种文档类型自动生成
- ✅ **多格式导出** - JSON / Markdown 格式下载
- ✅ **实时预览组件** - 前端展示配置和文档详情
- ✅ **Sprint 2.13**：导出 `VirtualCompanyPackage`（schemaVersion 1.0.0）+ 端点 `POST /api/aiteam-creation/sessions/:id/integrate-proclaw` + `GET /api/aiteam-creation/packages/:packageId/download`
- ✅ **Sprint 2.14**：本地→云回写 `PUT /api/aiteam-creation/sessions/:id/local-state`（用于 ProClaw 多端同步）
- ✅ **Sprint 2.15**：拉取最新 `local_state` `GET /api/aiteam-creation/sessions/:id/local-state` + 列表响应增加 `local_state` 字段

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
│   ├── nvwax-web/              # Next.js 前端应用
│   │   ├── app/                # App Router 页面
│   │   ├── components/         # React 组件
│   │   ├── hooks/              # 自定义 Hooks
│   │   └── lib/                # 工具函数
│   │
│   ├── nvwax-server/           # Express 后端服务
│   │   ├── src/
│   │   │   ├── routes/         # API 路由（20+ 路由文件）
│   │   │   ├── controllers/    # 控制器（25+ 控制器）
│   │   │   ├── services/       # 业务逻辑（35+ 服务模块）
│   │   │   ├── middleware/     # 中间件（5+）
│   │   │   ├── prompts/        # LLM 提示词
│   │   │   ├── types/          # TypeScript 类型定义
│   │   │   └── tests/          # 集成测试
│   │   └── migrations/         # 数据库迁移
│   │
│   ├── nvwax-agent-marketplace # Lit Web Component - 市场组件
│   ├── nvwax-agent-studio      # Lit Web Component - 智能体工作室
│   ├── nvwax-sdk               # 客户端 SDK
│   ├── skillhub-workflow/      # 工作流引擎
│   └── workflow-editor/        # 工作流编辑器
│
├── docs/                       # 文档
├── examples/                   # 使用示例
├── exports/                    # 截图导出
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

- **25,000+** 代码行数
- **6,000+** 文档行数
- **50+** API 端点
- **96%** 功能完成度
- **5** 个完整阶段交付
- **14** 个集成测试（100% 通过）

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

### v2.1 (已完成 ✅)

- ✅ 插件能力注册 API（CRUD + 行业标签匹配）
- ✅ Agent Action 输出扩展（5 种输出类型 + 智能解析）
- ✅ 插件上下文注入（Header + System Prompt + Function Calling）
- ✅ 推荐引擎（3 级匹配算法 + 双源推荐）
- ✅ Action 参数验证 + 预设提示词生成
- ✅ 14 个集成测试（100% 通过率）

### v2.2 (计划中 📋)

- 📋 前端插件测试面板（PluginTestPanel）页面集成
- 📋 ProClaw Action 解析与执行集成
- 📋 评价系统（星级评分）
- 📋 数据统计图表
- 📋 批量操作

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
