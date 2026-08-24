# NvwaX AI Team Builder 转型记录（v2.0.0）

> **范围**：本轮「Agent Builder → AI Team Builder（虚拟公司）」产品转型的完整记录，
> 含三项后续迭代、审计验收结论，以及 S2 **统一鉴权改造**（2026-08-23 完成）。
> **日期**：2026-08-23 ｜ **验证**：`pnpm --filter nvwax-web build` ✅ exit 0（109/109 页）；eslint ✅ 0 错误

---

## 1. 转型目标

| 维度 | 转型前 (Agent Builder) | 转型后 (AI Team Builder / 虚拟公司) |
|------|------------------------|-------------------------------------|
| 核心产品 | 单个、功能强大的「智能体」 | 由多个智能体构成的、能协作的「虚拟公司」 |
| 用户旅程 | 创建 → 调试 → 部署 | 注册团队 → 设置岗位 → 分配任务 → 产出成果 |
| 核心价值 | 提供一个「好用的工具」 | 交付一个「能干的团队」，直接解决业务问题 |
| 技术重心 | 提示词工程、工具调用、单 Agent 优化 | 多 Agent 编排、任务分配、协作流程、记忆与状态 |
| 成功标准 | 「这个 Agent 好聪明」 | 「这支团队帮我搞定了整个项目」 |

对外定位：**「帮你组建 AI 公司的操作系统」**。
话术统一：**你的 AI 团队 / 虚拟公司 / AI 合伙人** 替代 智能体 / Agent / Bots。

---

## 2. 本轮改动清单

### 2.1 入口与主界面

| 文件 | 改动 |
|------|------|
| `app/[locale]/nvwa/Client.tsx` | 新增 `defaultMode` prop，默认进入 aiteam（AI 公司）模式；模式切换器改为「🏢 AI 公司｜🤖 招聘员工」 |
| `app/[locale]/page.tsx` | 首页重写为「AI 虚拟公司操作系统」叙事，主 CTA「开始组建 AI 公司」→ `/nvwa`，直接嵌入团队创建向导（`<NvwaClient embedded defaultMode="aiteam" />`） |
| `components/Layout/Navbar.tsx` | 导航新增主入口「组建 AI 公司」(`nav.buildCompany`)；市场更名为「AI 团队市场」 |

### 2.2 引导重构

- **`messages/{zh,en}.json`**：`vcChatModal`/`nvwa` 命名空间欢迎语改为
  「**你想成立一家什么类型的公司？**（营销、客服、内容创作...）」；7 步流程重命名为
  公司类型 → 核心目标 → 岗位设置 → 能力匹配 → 方案确认 → 公司构建 → 保存配置
- **`packages/nvwax-server/src/prompts/ceo-agent-prompt.ts`**：CEO Agent 系统提示词与初始消息同步「AI 公司架构师」叙事

### 2.3 用户中心

| 路由 | 说明 |
|------|------|
| `/my-aiteam`（新建） | 「我的 AI 公司」管理页：公司卡片列表、岗位/AI 合伙人预览、发布状态、统计条；操作：查看详情 / 导出 / 发布 / 解散 / **分配任务**；深链 `?aiteam=<id>` 自动打开详情并高亮 |
| `/agent-repository`（重构） | 「人才库 · 员工管理」：AI 公司 Tab 前置，Agent 降级为「员工」；顶部叙事提示条 |
| `(user-center)/layout.tsx` | 菜单首位新增「我的 AI 公司」(`userCenter.common.myAiCompanies`) |

### 2.4 三项后续迭代

1. **创建成功 → 公司详情深链**
   - `components/creation/CreateSuccessDialog.tsx`：新增可选 `onViewCompany`，动作区首位
     「前往『我的 AI 公司』」按钮（有 `aiteamId` 时显示）
   - `components/aiteam-creator-modal.tsx`：`handleViewCompany` 跳转 `/{locale}/my-aiteam?aiteam=<id>`
   - `my-aiteam/page.tsx`：读取 `?aiteam=`，自动打开详情弹窗、滚动定位并高亮；命中后
     `history.replaceState` 清理参数；未命中保留待重试
2. **公司内任务分配/执行**
   - `my-aiteam` 新增 `CompanyTaskModal`：任务需求 → `leaderAgentApi.orchestrateWithLeader(requirement, workspace)`
     （workspace 携带 `aiteamId/companyName/roles`），展示执行结果（参与岗位/工作流步数/耗时）
   - 说明：后端 `POST /teams/:teamId/execute` 查询 `agent_teams` 表（与 `aiteams` 无关联），
     故复用现有执行页同款 `orchestrateWithLeader`（skillhub-workflow 服务）
3. **市场页公司化**
   - `marketplace` 命名空间：`virtualCompany`→AI 公司、`aiteams`→AI 公司、`agents`→AI 合伙人、
     `createAiTeam`→组建 AI 公司、`memberCount`→X 位 AI 合伙人、`roleCount`→X 个岗位 等
   - `marketplace/team-skills/[id]/TeamSkillDetailView.tsx`：硬编码 "AiTeam" 徽章 → "AI 公司"

### 2.5 其他

- `lib/seo.ts`：FAQ / Organization / SoftwareApplication JSON-LD 公司化（搜索引擎 + AI 爬虫可见）
- `README.md`：定位与核心亮点更新
- 术语残留清理：`vcChat/vcCreate/detailModal/project/teamExecution/bountyCreate/admin/nvwa/shareModal/searchChat` 等命名空间

---

## 3. 鉴权模式说明（重要）

后端 `/aiteams`、`/agents`、`/teams`、`/notifications`、`/blueprints`、`/microbiz`、`/bounties`（变更类）、
`/aiteam-creation`、`/aiteam-state-machine`、`/ai-search` 等业务路由分别挂载
`userAuthMiddleware` / `universalAuthMiddleware`（`packages/nvwax-server/src/middleware/`），
**只认 `Authorization: Bearer` 头或 `?token=` 参数，不读 cookie**。

前端正确模式：

```ts
import { authedFetch } from '@/lib/oidc/authed-fetch';
// authedFetch('/aiteams') → GET /api/auth/proxy?path=/aiteams → Next API Route 注入 token → 转发后端
```

`lib/oidc/authed-fetch.ts` 提供两个助手：
- `buildQuery(params?)`：序列化查询串（丢弃 undefined/null/空，数组逗号连接）
- `authedJson<T>(path, options?)`：fetch + 解析 + 非 2xx 抛带 `status` 的错误

### 3.1 统一鉴权改造（S2）

`v2.0.0` 审计指出 `/agent-repository` 两个 Tab 及全站多客户端走裸 `apiClient`（无鉴权头）→ 必然 401。
已在本轮完成统一改造，受保护端点的前端客户端**全部改用 `authedFetch` / `authedJson`**：

| 客户端 | 改动 |
|--------|------|
| `lib/api/agents.ts` | 全部方法 → `authedJson` |
| `lib/api/aiteams.ts` | 受保护方法 → `authedJson`；`/aiteams/search`（公开）保持直连 |
| `lib/api/notifications.ts` | 全部方法 → `authedJson`；`getUnreadCount` 静默降级保留 |
| `lib/api/bounty.ts` | 变更类（create/claim/submit/verify/cancel）→ `authedJson`；GET 公开保留直连 |
| `lib/api/blueprints.ts` | 全部方法 → `authedJson` |
| `lib/api/team-skills.ts` | `teamExecutionApi`（executeTeam/getExecutionHistory/getExecutionDetails）→ `authedJson`；`teamSkillApi` / `leaderAgentApi` 保持原样 |
| `lib/api/aiteam-creation.ts` | 全部方法 → `authedJson`（含错误处理 `handleAxiosError` 适配 `Error.status`） |
| `lib/api/aiteam-state-machine.ts` | 全部方法 → `authedJson` |
| `lib/api/search.ts` | `aiSearchApi` 受保护方法 → `authedJson`；`searchApi`（`/search/*`）保持公开直连 |
| `app/[locale]/(user-center)/my-aiteam/page.tsx` | 移除本地鉴权包装（fetchAiTeams/publishAiTeamAuthed/deleteAiTeamAuthed），改用 `aiteamApi`；保留本地 `exportAiTeamAuthed`（处理 downloadUrl → Blob 下载） |

**保留裸 `apiClient` 直连**的客户端（公开路由，未登录需可访问）：
- `lib/api/projects.ts`（`/projects*` 用 `userId` 查询参数，无鉴权）
- `lib/api/users.ts`（`/user/*` 用 `userId` 查询参数，无鉴权）
- `lib/api/aiteams.ts` 的 `searchPublishedAiTeams`（`/aiteams/search`）
- `lib/api/bounty.ts` 的 GET 类（`/bounties`、`/bounties/:id`、`/bounties/popular-searches`、`/bounties/suggestions`）
- `lib/api/search.ts` 的 `searchApi`（`/search/*`）
- `lib/api/team-skills.ts` 的 `teamSkillApi`（`/team-skills*` 无鉴权）

**独立鉴权模型（不在本轮范围）**：
- `/admin/*`：管理员 HS256 token（`auth.middleware.ts`），admin 客户端流程独立
- `/mcp/tools/call`、`/workflows`：API-key（`apiKeyAuthMiddleware`，SDK 端点）

### 3.2 历史遗留路由缺口（独立问题）

`agent.routes.ts` 与 `aiteam.routes.ts` 缺少若干路由：
- `agent.routes.ts`：无 `/search`、`/stats`、`/exports` → 前端 `agentApi.searchPublishedAgents/getUserStats/getExportHistory` 命中 `/:id` 必然 404
- `aiteam.routes.ts`：无 `/stats` → 前端 `aiteamApi.getUserStats` 同理 404

鉴权写法已正确；如不再使用建议清理前端调用方，或补充后端路由。

---

## 4. 审计验收结论

| 项目 | 结果 |
|------|------|
| 独立子代理交叉评审 | 9 组文件 + API/后端契约交叉验证 |
| 统一鉴权改造（S2） | ✅ 完成（详见 §3.1）；`my-aiteam` / `agent-repository` 及其他 9 个客户端已切 `authedFetch` |
| i18n 键对等（17 命名空间 zh/en） | ✅ 完全对等 |
| 术语残留扫描 | ✅ 用户可见面已清理（技术语境保留：DSH 集成、开发者门户、FAQ、AI 搜索面板） |
| 路由/链接审计 | ✅ 全部目标路由存在 |
| eslint（13 个改动文件） | ✅ exit 0（含修复 3 个预存错误） |
| tsc --noEmit | ✅ 改动文件零错误（仅剩 `.next/types` 环境性 React 18/19 冲突） |
| `pnpm --filter nvwax-web build` | ✅ exit 0，109/109 页生成 |

**审计发现并已修复的问题**：

- 🔴 S1 鉴权缺失（my-aiteam 整页 401）→ 改 `authedFetch`
- 🔴 S2 统一鉴权改造（agent-repository 及全站 9 个客户端受保护端点 401）→ ✅ 完成
- 🔴 S3 统计双重包裹恒为 0（`users.ts` 未解包）→ `return response.data.data`
- 🟠 M1 落地方式按钮触发真实 ProClaw 集成副作用 → 移除
- 🟠 M2 导出文件名错误（YAML/LangGraph 存成 `.json`）→ 按格式映射
- 🟠 M3 深链未命中即丢弃 + 列表 limit=20 → 保留重试 + limit=100
- 🟠 M4 导出不触发下载 → downloadUrl → Blob 下载链路
- 🟠 M5 分享链接指向无深链处理的 `/agent-repository` → 改 `/my-aiteam`
- 🟠 M6 `exportFailed` i18n 键缺失 → 补键
- 🟡 L1/L3/L7/L8/L12 等轻微问题 → 全部修复

---

## 5. 相关文档

- 更新日志：[CHANGELOG.md](../CHANGELOG.md)
- 项目说明：[README.md](../README.md)
- 历史计划（已被本转型部分取代）：[AGENT-REPOSITORY-REFACTOR-PLAN.md](./AGENT-REPOSITORY-REFACTOR-PLAN.md)
