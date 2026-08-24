# 📝 NvwaX 更新日志

所有重要的项目变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [2.0.0] - 2026-08-23

### 🏢 产品转型：Agent Builder → AI Team Builder（虚拟公司）

NvwaX 从「创建单个智能体」转型为「帮你组建 AI 公司的操作系统」。用户旅程升级为
**注册团队 → 设置岗位（CEO、市场总监、文案...）→ 分配任务 → 产出成果**；创建单个智能体收敛为
「招聘员工」子步骤。完整记录见 [AI-TEAM-BUILDER-TRANSFORMATION.md](./docs/AI-TEAM-BUILDER-TRANSFORMATION.md)。

#### ✨ 新增功能

- **AI 公司创建向导（主功能）**：`/nvwa` 工作台默认进入团队模式；首页直接嵌入创建向导，
  引导语改为「你想成立一家什么类型的公司？（营销、客服、内容创作...）」
- **「我的 AI 公司」管理页（`/my-aiteam`）**：公司卡片列表（岗位/AI 合伙人预览、发布状态）、
  查看详情 / 导出 / 发布 / 解散、统计条；置入用户中心菜单首位
- **创建成功 → 公司详情深链**：成功弹窗新增「前往『我的 AI 公司』」入口，跳转
  `?aiteam=<id>` 自动打开对应公司详情并高亮定位
- **公司内任务分配/执行**：`my-aiteam` 每家公司新增「分配任务」入口，CEO（Leader Agent）
  编排公司内各岗位 AI 合伙人协同执行（对接 skillhub-workflow `orchestrate/leader`）
- **「人才库 · 员工管理」（`/agent-repository` 重构）**：AI 公司 Tab 前置，
  单个 Agent 降级为「员工」，新增产品叙事提示条
- **市场页公司化**：`marketplace` 术语全面替换（AiTeam→AI 公司、智能体→AI 合伙人、岗位等），
  推荐语与创建入口统一为「组建 AI 公司」

#### 🎨 用户体验与话术统一

- 全站术语替换：**你的 AI 团队 / 虚拟公司 / AI 合伙人** 替代 智能体 / Agent / Bots；
  对外定位改为「帮你组建 AI 公司的操作系统」
- 引导重构：公司类型 → 核心目标 → 岗位设置 → 能力匹配 → 方案确认 → 公司构建 → 保存配置
- 后端 CEO Agent 提示词同步「公司优先」叙事
- SEO/GEO 结构化数据（FAQ / Organization / SoftwareApplication）与 README 定位同步更新

#### 🐛 Bug 修复（含审计整改）

- **鉴权修复**：`/my-aiteam` 全部 `aiteamApi` 调用改为 `authedFetch`（`/api/auth/proxy` 注入
  OIDC token）。后端 `/aiteams` 系路由挂载 `userAuthMiddleware`（仅认 Bearer / `?token=`），
  裸 `apiClient` 必然 401
- **统计解包**：`userApi.getStats` 未解 `{success, data}` 双重包裹导致 dashboard/profile
  统计卡恒为 0，已修复
- **导出下载**：`my-aiteam` 导出补全 downloadUrl → Blob 下载链路；`handleExportToShell`
  导出文件名按格式映射（YAML/LangGraph 不再被存为 `.json`）
- **行为回归**：创建成功弹窗「选择落地方式」不再触发真实 ProClaw 集成副作用
- **i18n**：补 `vcChatModal.exportFailed` 缺失键；清理全量旧术语残留
- **eslint**：本轮涉及文件 lint 清零（含 3 个预存错误：未用参数/导入、`icon: any` 类型化）

#### ⚠️ 已知问题 / 技术债

- **统一鉴权改造（待办→已完成）**：`agent-repository`、`aiteam-creation`（含 nvwa 工作台创建流程）、
  `aiteam-state-machine`、`notifications`、`blueprints`、`search.aiSearch`、`teamExecutionApi`、
  `bounty` 变更等受保护端点已全部改为 `authedFetch`（走 `/api/auth/proxy` 注入 OIDC token）。
  残留独立鉴权模型：admin 端点（`authMiddleware`，管理员 HS256 token）、MCP/`/workflows`（API-key），
  后续如需管理员或 MCP 统一登录再单独治理
- **历史遗留路由缺口**：`agent.routes.ts` 未定义 `/agents/search`、`/agents/stats`、`/agents/exports`；
  `aiteam.routes.ts` 未定义 `/aiteams/stats`。前端 `agentApi.searchPublishedAgents/getUserStats/getExportHistory`
  与 `aiteamApi.getUserStats` 仍可能 404（鉴权写法已正确，仅缺后端路由）。如不再使用建议清理调用方
- **环境性类型冲突**：`tsc --noEmit` 仅 `.next/types/*` 报 React 18/19 `ReactNode` 冲突
  （pnpm store 中 `@types/react@18.3.12` 与项目 `@types/react@19.2.6` 并存），
  不影响 `next build`（`ignoreBuildErrors` 预设）
- **验证基线**：`pnpm --filter nvwax-web build` ✅ exit 0（109/109 页）；eslint ✅ 0 错误

---

## [1.6.0] - 2026-06-16

### ✨ 新增功能

#### Account Portal (Sprint 2 — ProClaw 白标)
- **公开账户门户** `account.proclaw.cc`:Next.js 14 静态导出，注册 / 登录 / 激活 全闭环
- **ProClaw 白标** UI:紫色 `#6D4AFF` 主色 + SVG Logo + 中英双语 i18n
- **0 个 NvwaX 字符串** 出现在 portal 静态资源与邮件中
- **跨子域 SSO**：`pc_session` cookie（Domain=`.proclaw.cc`, HttpOnly, Secure(产), SameSite=Lax, 24h TTL）
- **用户注册 + 邮箱激活** 流程：密码强度校验 (≥10 字符 + 字母 + 数字) + 24h 激活链接
- **authorizeGet SSO 快路径**：cookie 命中时直接签 `code` + 302 跳转（无 cookie 仍走原表单，完全 additive）
- **4 个 RP 客户端 seed**：`proclaw-desktop` / `proclaw-web` / `proclaw-mobile` / `skillhub-web`
- **AWS SES 邮件通道**：nodemailer 封装，开发环境 MailPit，生产 SES

#### Kubernetes 部署
- `k8s/account-portal/backend-deploy.yaml`：2 replicas，env 注入 + OIDC 私钥挂载
- `k8s/account-portal/ingress.yaml`：cert-manager annotation + HSTS + TLS 1.2+
- `k8s/account-portal/cert-issuer.yaml`：letsencrypt-prod（Cloudflare DNS-01）+ staging
- `docs/runbooks/account.proclaw.cc.md`：部署 / 验证 / 回滚 / 监控 / 故障排查手册

### 🔧 优化改进

- **Sprint 1 协议契约冻结**：[ADR-004](docs/adr/ADR-004-oidc-contract-freeze.md) 显式声明 6 端点 / 6 错误码 / JWT claims / issuer 全部未动
- 新增端点全部走 `/api/portal/*` 与 `/portal/*` 命名空间，与 OIDC `/oauth/*` 完全分离
- `pc_session` 密钥 `PC_SESSION_SECRET` 独立于 `JWT_SECRET`，旋转不互相影响
- 测试套件 6 套件 / 41 用例全过（Sprint 1 23 + Sprint 2 18 新增）

### 🐛 Bug 修复

- **DeepSeek API key 泄露修复**：`.env.example` L30 历史 commit 包含真 key `sk-859b91e6...`，已在 DeepSeek 后台 rotate 并清空占位符
- `.env.example` 顶部加 WARNING 注释，明确模板与真值区别
- L4 `DB_PASSWORD` 弱密码占位符替换

### 🔒 安全

- **新增 gitleaks CI 扫描**：`.gitleaks.toml` + `.github/workflows/gitleaks.yml`
  - 自定义规则覆盖 DeepSeek / GitHub PAT / AWS / Stripe / Slack / OpenAI
  - fetch-depth: 0 扫全历史
  - SARIF 报告上传到 GitHub Security tab
  - 任何 PR 包含 secret 格式字符串自动阻断
- `.env` / `.env.local` / `.env.production` 全部 gitignore（已确认）

### 📚 文档更新

- `docs/adr/ADR-004-oidc-contract-freeze.md` 协议契约冻结
- `docs/runbooks/account.proclaw.cc.md` 部署运行手册
- `e2e/{oidc-flow,cookie-sso,email-grep,no-nvwax}.spec.ts` Playwright 端到端
- `packages/account-portal/README.md` Portal 开发说明

---

## [1.5.0] - 2026-05-18

### ✨ 新增功能

#### Admin 后台重大升级
- **Agent 管理模块**：查看和管理用户创建的 AI 智能体，支持搜索和分页
- **虚拟公司监控模块**：实时监控 Team Skill 异步打包任务状态和进度
- **通知中心模块**：向全站用户发送系统公告或重要通知，支持优先级设置
- **审计日志模块**：追踪管理员操作记录与系统安全事件，支持详情查看
- **增强系统管理**：新增系统健康检查、缓存清理、数据库备份等功能

#### 技术实现
- 前后端分离架构，React + Next.js 前端界面
- Express.js 后端 API，完整的 RESTful 接口设计
- PostgreSQL 数据库存储，支持复杂查询和分页
- JWT Token 认证机制，确保管理权限安全
- React Query 数据管理，自动缓存和状态同步
- 响应式设计，支持深色模式

### 🔧 优化改进

- 完善管理员权限控制体系
- 优化数据库查询性能，添加必要索引
- 增强错误处理和用户反馈机制
- 统一 UI/UX 设计风格，提升用户体验
- 完善 API 文档和接口注释

### 📚 文档更新

- 创建 Admin 后台功能测试脚本 (test-admin-features.mjs)
- 更新项目文档，记录 Admin 后台升级内容
- 完善部署指南和维护手册

---

## [1.4.0] - 2026-05-18

### ✨ 新增功能

#### 通知系统
- 完整的站内通知功能
- 支持多种通知类型（悬赏、智能体、团队、系统等12种）
- 优先级标识（紧急/高/普通/低）
- 未读数量徽章
- 下拉面板快速查看
- 标记单条/全部为已读
- 删除通知
- 智能时间格式化
- 深色模式支持
- 响应式设计

#### Nvwa Agent API
- 智能体 CRUD 后端 API
- 支持用户管理自己的智能体
- 权限控制与数据隔离

#### 执行监控页面
- 团队执行监控界面
- 实时显示 Leader Agent 执行结果
- 执行历史记录查询
- 错误信息展示

#### 虚拟公司打包系统
- Team Skill 异步打包
- 多平台支持（Windows/macOS/Linux）
- ProClaw 集成导出
- 进度跟踪和状态管理
- 自动清理过期文件

#### Web Component SDK
- 基于 Lit 的可嵌入组件
- @nvwax/agent-marketplace
- @nvwax/agent-studio
- PostMessage 通信
- 主题定制支持

#### 用户中心整合
- 优化"我的Agent仓库"与"虚拟公司"功能入口
- 统一资源管理界面
- 减少功能重叠带来的困惑
- 提升用户体验

### 🔧 优化改进

- 代码质量全面提升：零 TypeScript 错误，零 ESLint 警告
- Tailwind CSS v4 迁移：更新到最新规范，50+ 处修改
- Express 类型安全增强：req.params 类型处理优化
- 数据库索引优化：提升查询性能
- 文档结构清理：归档过时文档，保持核心文档清晰

### 📚 文档更新

- 创建用户中心整合报告 (USER-CENTER-INTEGRATION-REPORT.md)
- 更新开发进展报告 (DEVELOPMENT-PROGRESS-2026-04-26.md)
- 完善部署指南和检查清单
- 更新项目 README 和 CHANGELOG

---

## [Unreleased]

### 计划中

- WebSocket 实时通知推送
- 邮件通知集成
- 评价系统（星级评分）
- 数据统计图表
- 批量操作功能
- 动态技能列表
- 智能推荐算法

---

## [1.2.0] - 2026-04-25

### ✨ 新增功能

#### Nvwa 智能体工厂
- 对话式需求分析（8步引导流程）
- 左右分栏布局（信息面板 + 对话窗口）
- 实时需求信息展示（用途、数据源、输出、实现方式）
- 技能自动推荐和展示
- 进度可视化（7步进度指示器）
- 模板匹配模拟
- 登录验证集成
- 重新开始功能
- 响应式设计（桌面端分栏，移动端堆叠）
- 深色模式完全支持

#### 悬赏系统增强
- 搜索建议（实时下拉提示）
- 搜索历史（本地存储10条）
- 热门搜索（后端统计Top 8）
- 键盘导航（↑↓ Enter Esc）
- 结果高亮显示
- 我的悬赏页面（发布/领取管理）
- Tab 切换视图
- 技能过滤（5个常用技能）
- 导航栏快捷入口

### 🔧 优化改进

- 修复步骤编号跳跃问题（0-7连续）
- 修复右侧面板缩进不一致
- 移除未使用的导入（CheckCircle, AlertCircle, useRouter）
- 添加 RotateCcw 图标（重新开始）
- 统一代码风格和缩进
- 优化页面标题（"Nvwa - 智能体工厂" → "Nvwa"）

### 📚 文档更新

- 创建完整项目总结（PROJECT-SUMMARY-2026-04.md，775行）
- 创建文档索引（docs/README.md，168行）
- 更新 README.md（添加新功能特性）
- 更新 GETTING-STARTED.md（添加数据库初始化）
- 创建 Nvwa 布局优化报告（318行）
- 更新 API 文档（908行）

### 📊 代码统计

- 总代码量：5,350+ 行
- 文档总量：7,100+ 行
- API 端点：14+ 个
- React 组件：12+ 个
- 数据库表：3+ 个

---

## [1.1.0] - 2026-04-24

### ✨ 新增功能

#### 悬赏系统核心
- 发布悬赏（积分扣除）
- 领取任务（权限控制）
- 提交成果（URL+说明）
- 验证审核（批准/拒绝）
- 积分转账（80%奖励+20%平台）
- 状态机管理（5种状态流转）
- 事务保证（数据一致性）

#### 搜索系统
- 全文搜索（PostgreSQL ILIKE）
- 多维度过滤（状态、技能）
- 防抖优化（500ms）
- 分页和排序

### 🔧 优化改进

- React Query 智能缓存
- 数据库索引优化
- 错误处理和用户反馈
- 空状态友好提示

### 📚 文档

- 用户使用指南（497行）
- API 文档（908行）
- 部署指南（666行）
- 功能完善报告（370行）
- 前端完成报告（335行）
- 测试报告（306行）

---

## [1.0.0] - 2026-04-20

### ✨ 初始版本

#### 基础架构
- Monorepo 项目结构
- Next.js 14 前端
- Express.js 后端
- PostgreSQL 数据库
- Docker 容器化

#### 用户系统
- 邮箱注册/登录
- JWT Token 认证
- 密码加密（bcrypt）
- 路由权限保护
- 用户资料管理

#### Agent 搜索
- 全文搜索引擎
- 多维度过滤（来源、星级、语言）
- 实时搜索结果
- 分页和排序

#### 数据源集成
- GitHub（186+ Agent）
- Gitee（15+ Agent）
- 百度（16 Agent）
- 阿里（16 Agent）
- 腾讯（9 Agent）
- 华为（6 Agent）
- 京东（7 Agent）

#### Admin 后台
- 数据看板
- 爬虫管理
- 管理员管理
- 系统设置

#### 自动爬虫
- 定时任务调度
- 多关键词策略
- 数据去重
- 错误重试

### 📚 文档

- README.md（项目说明）
- GETTING-STARTED.md（快速开始）
- PROJECT-STRUCTURE.md（项目结构）
- CONTRIBUTING.md（贡献指南）
- ADMIN-GUIDE.md（管理指南）

---

## 版本说明

### 版本号规则

格式：`MAJOR.MINOR.PATCH`

- **MAJOR**：不兼容的 API 变更
- **MINOR**：向后兼容的功能新增
- **PATCH**：向后兼容的问题修正

### 变更类型

- **Added**：新增功能
- **Changed**：现有功能变更
- **Deprecated**：即将删除的功能
- **Removed**：已删除的功能
- **Fixed**：错误修复
- **Security**：安全性修复

---

## 📮 反馈与建议

如果您发现问题或有建议，欢迎：

- **提交 Issue**: https://github.com/BigLionX/NvwaX/issues
- **提交 PR**: https://github.com/BigLionX/NvwaX/pulls
- **邮件联系**: 1055603323@qq.com

---

<div align="center">

**NvwaX - 让 AI Agent 触手可及！** 🚀

Made with ❤️ by Open Source Community

</div>
