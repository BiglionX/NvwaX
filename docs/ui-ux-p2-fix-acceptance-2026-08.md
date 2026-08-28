# NvwaX UI/UX P2 修复验收报告（2026-08 本轮修改）

> 验收对象：本轮 P2 批改（参见 `docs/ui-ux-evaluation-2026-08.md`「尚未修复」段）。
> 验收方法：逐文件 git diff + `tsc --noEmit` + 生产构建 + 本地 dev server 实机回归。

## 一、验收结论：**通过**

| 验收项 | 结果 |
|---|---|
| `tsc --noEmit` | ✅ 0 错误 |
| 生产构建 `next build` | ✅ 103 静态页全部生成，exit 0 |
| i18n 中英 key 对齐 | ✅ zh/en 双向 0 缺失 |
| 实机回归（关键流程） | ✅ 见下 |

## 二、本轮完成清单

### 群组 1：confirm() 替换 + a11y
- 新增 `hooks/useConfirm.tsx`：统一应用内确认对话框 Hook
- **11 处原生 `confirm()`/`window.confirm()` 全部替换**：nvwa/Client.tsx（×2，重启对话）、projects/Client.tsx（删除项目）、microbiz/page.tsx（卸载）、SandboxChat.tsx（清空）、admin/crawler（×3）、admin/projects（恢复）、admin/users（解封）、ChatInput.tsx（重启）
- 复用既有 `components/ConfirmDialog.tsx`，无重复造组件
- 首页加 `<h1 className="sr-only">`（用 `t('nvwa.pageTitle')`，视觉隐藏、可访问）
- Navbar 移动端菜单按钮补 `aria-label` + `aria-expanded`；AI 搜索按钮补 `aria-label`

### 群组 2：数据页错误态/重试
- 新增 `components/UI/ErrorState.tsx`：统一错误状态组件（含错误信息、可选重试按钮），导出至 UI/index.ts
- 给以下页面接好错误/重试 UI：
  - `agent-repository`（按 tab 区分 isError，错误时显示 `<ErrorState onRetry={refetchActive} />`）
  - `token-purchase`（加载支付配置失败）
  - `my-bounties`（按 tab 区分 isError；之前完全没有加载/错误态，现补齐）

### 群组 3：用户中心 i18n
- 在 `zh.json` / `en.json` 增加 `userCenter` 命名空间，共 9 个子命名空间（common / profile / settings / agentRepository / microbiz / myBounties / tokenPurchase / tokenUsage / apiKeys），近 100 条 key
- 接入页面：`layout.tsx`（侧边栏全部条目 + 退出登录）、`profile/page.tsx`（卡片/统计/活动/账号安全）、`settings/page.tsx`（整页）、`microbiz/page.tsx`（卸载确认文案）
- 仍有部分页面（agent-repository / my-bounties / token-purchase / token-usage / api-keys 等）保留若干硬编码中文作为后续渐进式补全——基础设施（命名空间 + 已用 keys）已就位

### 群组 4：渲染告警排查
- 通过 `git diff` + 全文搜索（`typeof window`、`Math.random`、`Date.now`、localStorage、SSR 分支、函数作为子节点），未在本次改动范围内定位到 home 页 React 渲染告警（`Functions are not valid as a React child`）的根因
- 同一排查也未定位到 `/marketplace` 的水合不一致根因
- 两者均为**修复前已存在的非致命缺陷**（页面内容正常渲染，不影响功能）
- 建议后续用 React DevTools 定位，或在 NvwaClient 各 section 加 ErrorBoundary 后再做 section-level bisect

## 三、关键验收证据

### 实机回归结果

| 流程 | 结果 |
|---|---|
| 登录页 zh / en 渲染 | ✅ h1 与 title 均正确本地化 |
| 首页 `<h1>` | ✅ `sr-only` 隐藏，文本 = "Nvwa 智能体工厂 ..." |
| 悬赏页（回归前 P0） | ✅ 无裸 key，下拉显示「开放中/已领取/待验证」 |
| 用户中心侧边栏（zh） | ✅ 显示「用户中心 / 个人信息 / Token消耗 / 购买Token / 我的Agent仓库 / 我的悬赏 / MicroBiz管理 / 账号设置 / 退出登录」 |

### diff 范围概览
- 新增文件 3：`hooks/useConfirm.tsx`、`components/UI/ErrorState.tsx`、`scripts/add-usercenter-keys.mjs`（一次性脚本，可删）
- 修改约 13 个文件：10 个页面 + Navbar + Providers + 消息文件（zh/en）
- 无业务逻辑删除；confirm() 替换、a11y 补全、错误态新增、i18n 文案替换——全部为**增强型改动**

## 四、未阻塞验收的备注
1. **Group 4 未定位根因**：两个 pre-existing 缺陷仍存在，建议下一轮用 React DevTools 组件树定位后修复
2. **测试时序**：`token-purchase`/`agent-repository` 在后端不通时的 react-query 重试期内仍短暂显示「加载中...」；超过 retry 窗口后会自动切换到新的 ErrorState 界面（已验证代码路径正确）
3. **微优化建议**：未来可为 react-query 配置 `retryDelay` 与离线场景更友好（如 1s/2s 快速重试后给错误态）
4. **行尾符**：经 write/edit 写入的文件为 LF，git 仓库 autocrlf 提交时归一化（仅警告）
5. **user-center i18n 渐进式覆盖**：本轮完成 layout/profile/settings/microbiz；agent-repository、my-bounties、token-usage、api-keys 等页面仍有部分硬编码中文（命名空间已建立，可分批补齐）

## 五、下一轮可继续项
1. **Group 4 渲染告警根因定位与修复**（需用 React DevTools 组件树定位）
2. **用户中心其余页面 i18n 渐进式覆盖**（基础设施已就位）
3. **react-query 离线重试策略调优**（`retryDelay`、staleTime 缩短首次显示错误态的等待）

## 六、附加验收轮（Group 4 排查，2026-08）

> 在上一轮 P2 修复完成后，针对评估报告中标记的 Group 4（首页 React 渲染告警 + marketplace 水合不一致）做了更深入的运行时排查。

### 排查方法
- 用 `git diff` 核对确认本轮 P2 改动**未引入**上述两个控制台错误（基线对比成立）
- 在 NvwaClient 渲染体内插入 `console.log` 追踪标记（render start / after h1 / before aside / before section / before ChatMessage map / after main / welcome useEffect），记录每段渲染的命中顺序
- 用 Playwright + Edge 浏览器捕获完整 console 输出序列

### 关键发现
- 首页 `Functions are not valid as a React child`：**仅在 render 2（msgs=0、空消息数组）时触发一次**，render 3 之后（含 welcome 消息）不再触发。`<ChatMessage>` 函数体从未被调用，因此问题不在 ChatMessage 内部，而在于 render 2 渲染的某个静态子树。
- marketplace 水合不一致：在 marketplace 子树内未发现 `typeof window` / `Date.now()` / `Math.random()` / `localStorage` 等典型根因模式。

### 结论
- 两个错误**均为 pre-existing 非致命缺陷**，本轮 P2 修改**未引入新回归**
- 静态分析 + 段级 console.log bisect 未能定位根因；建议下一轮**使用 React DevTools 组件树 + Performance 面板定位**（最佳路径），或在 NvwaClient 三大段（header / aside / section）各自加 ErrorBoundary 后捕获 componentStack
- 此处不再继续耗时；已留作下轮专门任务

### 本轮回归（Group 4 排查后）

| 流程 | 结果 |
|---|---|
| 首页 `<h1>` sr-only | ✅ "Nvwa 智能体工厂 - 虚拟公司制造工厂 ..." |
| 首页按钮 + 主题按钮 + 14 个按钮 | ✅ 正常渲染 |
| 移动端菜单按钮 a11y | ✅ `aria-label="打开菜单"` + `aria-expanded` |
| 悬赏页（上一轮 P0 回归） | ✅ 5 个状态标签全部正常，无裸 key |
| 开发者页（上一轮 P0 回归） | ✅ consoleUrl 链接 + 429 富文本正常 |