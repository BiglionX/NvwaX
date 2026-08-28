# NvwaX UI/UX 评估报告（2026-08 复评）

> 评估对象：`packages/nvwax-web`（主站，Next.js 15 + Tailwind v4 + next-intl + React 19）、`account-portal`（账号门户）。
> 评估方法：源码静态审查 + 本地启动 Next.js dev server + Playwright 实际渲染（17 张截图，见 `ui-eval-shots/`）+ DOM 级自动审计（`ui-eval-shots/audit-report.json`、`console-errors.json`）+ 控制台错误采集。
> 说明：评估环境无法连通远程 PostgreSQL，后端 API 不可用，因此「数据依赖型页面」以空数据/加载态形式呈现；凡标注「模拟数据」的页面为源码层确认，与本次运行环境无关。

---

## 一、总体结论

**结论：需要优化，且存在必须优先修复的问题。**

视觉层面（布局、色彩、组件库）已有相当基础：设计令牌系统（`globals.css` v2.0）、约 30 个基础 UI 组件（`components/UI`）、明暗双主题样式、渐变品牌色体系都已就位；公共页面（登录、市场、FAQ、条款页）的观感整体达标，无桌面端横向溢出，移动端除分类横滑外无布局破损。

但在「产品可信度」「交互完整性」「国际化一致性」「状态与反馈」四个维度存在系统性缺陷，其中 **5 个是用户可见的运行期缺陷**，另有 **1 处登录后首屏展示伪造数据** 的严重信任问题。

---

## 二、必须优先修复的问题（P0 / P1）

### 1. [P0] 登录后落地页 `/dashboard` 是纯模拟数据（伪造数据）
`app/[locale]/dashboard/page.tsx` 整页使用 `setTimeout` + 硬编码假数据（注释自认「模拟数据 (实际项目中从 API 获取)」），展示「全栈开发团队示例项目」、伪造的任务趋势、团队角色分布等。而登录流程默认 `returnTo = '/dashboard'`（`login/Client.tsx` L41），**用户登录后第一屏看到的是假数据** —— 这是信任层面的严重问题。

- 建议：要么接入真实 API 展示用户自己的项目/团队数据，要么把该页从登录落地路径移除（改跳 `projects` 或 `/`）。

### 2. [P0] 悬赏市场页显示原始 i18n key（`bountyList.statusOpen` 等）
`bounties/Client.tsx` L91–95 以 `useTranslations('bountyList')` 引用 `statusOpen/statusClaimed/statusSubmitted/statusCompleted/statusCancelled`，但 `bountyList` 命名空间在 `zh.json`/`en.json` 中**均无这些 key**（它们存在于 `bountyCard`/`bountyDetail` 命名空间）。
- 实机效果：状态筛选下拉显示 `bountyList.statusOpen` 等裸 key，控制台抛 5 个 `IntlError: MISSING_MESSAGE`。
- 修复：向 `bountyList` 命名空间补 key，或将代码改为引用 `bountyCard.*`。

### 3. [P1] 开发者门户页 i18n 格式化错误导致内容渲染崩溃
`developer/page.tsx` L49 `t('step1Desc').split('{consoleUrl}')`、L202 `t('rateLimitDesc').replace('{code}', '')` —— 调用 `t()` 时未提供消息所需的 `consoleUrl` / `code` 变量，next-intl 直接抛 `FORMATTING_ERROR`，该区块渲染为「Server Error」。
- 修复：改为 `t('step1Desc', { consoleUrl: ... })`，去掉手工 `.split/.replace` hack。

### 4. [P1] 用户中心「个人资料」页展示伪造活动数据 + 死链 + 无功能按钮
`app/[locale]/(user-center)/profile/page.tsx`：
- `RecentActivity` 硬编码三条假活动（「创建了新项目…2 小时前」等）—— 伪造用户行为记录；
- 「查看全部」链接指向 `/activity`，该路由 **404**；
- 「修改密码」按钮无 `onClick`，点击无反应；
- 注销账号确认弹窗的「确认注销」仅 `console.log('确认注销')`，**不执行任何删除**；
- 以硬编码邮箱列表 `['1055603323@qq.com','admin']` 判定管理员并强制跳转 `/admin/dashboard`；
- 页面遗留 6 处 `console.log` 调试输出。

### 5. [P1] 设置页存在多个「假交互」
`app/[locale]/(user-center)/settings/page.tsx`：
- 通知设置两个 `Switch` 均 `onChange={() => {}}` 且恒为 `checked={true}` —— 用户拨动开关无任何效果（无状态、无持久化）；
- 「修改密码」按钮无处理函数；
- 「注销账号」确认后仅打印日志，无实际注销逻辑。

### 6. [P1] 暗色模式是「死代码」
全站 42+ 文件使用 `dark:` 样式类、`globals.css` 有完整暗色令牌，但**全仓库没有任何代码给 `<html>` 添加 `.dark` 类，也没有主题切换器**（已用 grep 确认无 `classList.add('dark')` / theme 逻辑）。
- 后果：用户永远看不到暗色主题；大量样式代码失效且成为维护负担。
- 建议：要么实现主题切换（`next-themes` + 系统偏好默认），要么移除暗色变体收敛样式。

---

## 三、中等问题（P2）

| # | 问题 | 位置 | 说明 |
|---|------|------|------|
| 1 | **原生 `confirm()` 弹窗** 11 处 | `nvwa/Client.tsx`×2、`projects/Client.tsx`、`microbiz/page.tsx`、`SandboxChat.tsx`、`admin/*`×5、`ChatInput.tsx` | 破坏品牌一致性、无 i18n、阻塞式；应替换为应用内确认对话框（已有 `Modal`/`ConfirmDialog` 组件可用） |
| 2 | **用户中心整体无 i18n** | `(user-center)/layout.tsx` 及 profile/settings/token-usage/token-purchase/agent-repository/microbiz/my-bounties | 全部硬编码中文；英文用户访问这些页面看到中文 |
| 3 | **API 不可用时不显示错误态，永久「加载中…」** | `agent-repository`、`token-purchase`、`microbiz` 等数据页 | react-query 失败后无错误/重试 UI（部分页面无 error 分支）；对最终用户表现为无限 spinner |
| 4 | **`/dashboard`、`/projects`、`/profile` 未登录直接跳外部 ProClaw 门户** | `middleware.ts` / OIDC 流程 | 从站内点击即被弹到外部域名，无「即将跳转」中间页或说明，体验突兀（有 `?return=` 回跳，但无提示） |
| 5 | **工作台 `NvwaClient` 遗留调试输出与硬编码文案** | `nvwa/Client.tsx` | 4 处 `console.log`；「创建模式」切换处使用 `bg-muted`/`text-muted-foreground` 等未定义类名；「状态机/对话式」文案未走 i18n |
| 6 | **Navbar/Footer 中 `isHome = false` 硬编码** | `Navbar.tsx` L31、`Footer.tsx` L13 | 透明导航栏/星空页脚分支全部为死代码，样式逻辑徒增复杂度 |
| 7 | **首页无 `<h1>`** | `app/[locale]/page.tsx`（Nvwa 工作台） | 审计显示 `h1: null`；SEO 与无障碍结构不完整 |
| 8 | **空目录路由 `/my-aiteam` 404** | `app/[locale]/(user-center)/my-aiteam/` | 目录存在但无 `page.tsx`；若曾计划上线需补页或删除 |
| 9 | **页面上 `<button>` 无可访问名**（每页 1–2 个） | 全局 | 移动端菜单按钮等缺 `aria-label`/`title`（`Navbar` 汉堡按钮有 title 但缺 aria-label 的实例存在） |
| 10 | **生产代码遗留 21 处 `console.log/debug`** | profile×6、nvwa×4、test-v22×3、admin dashboard×2 等 10 个文件 | 应清理（可引入 lint 规则禁止） |
| 11 | **`globals.css` 中星空背景（`.stars-bg`）动画样式疑似废弃** | `globals.css` L214–301 | 首页已改为工作台，若不再使用应删除；`scroll-behavior` 与 `role="log"` 并存时无冲突但需复核 |

---

## 四、运行期错误（已实机复现）

来自 `ui-eval-shots/console-errors.json` 与 DOM 审计：

| 页面 | 错误 | 影响 |
|------|------|------|
| `/` 与 `/nvwa` | `Functions are not valid as a React child`（`<span>` 内传入函数） | 非致命（页面可渲染），但为 React 渲染错误，需用 DevTools 定位（怀疑 `nvwa` 消息中的富文本标签经普通 `t()` 渲染，或某图标组件被当子节点传入） |
| `/marketplace` | SSR 水合不一致（hydration mismatch） | 客户端/服务端渲染差异（如 `Date.now()`/`Math.random()` 或条件分支），会导致交互态不一致 |
| `/bounties` | 5 个 `IntlError: MISSING_MESSAGE` | 见 P0 #2，用户可见裸 key |
| `/search` | 401（`Failed to load resource`） | 未登录时的 API 资源加载失败，页面应优雅降级 |
| `/developer` | 2 个 `IntlError: FORMATTING_ERROR` | 见 P1 #3，区块渲染为错误内容 |

---

## 五、做得好的部分（保留并强化）

1. **设计系统有基础**：`globals.css` 定义完整色彩令牌（品牌/状态/中性/阴影），`components/UI` 提供 30 个可复用组件（Button/Card/Modal/Toast/EmptyState/Skeleton 等），整体视觉语言统一。
2. **公共页面观感良好**：登录页（渐变卡片 + 品牌图标）、市场页（搜索 + 分类 + 推荐位 + 加载骨架）、FAQ（分组手风琴）在桌面端布局规整，无横向溢出。
3. **国际化框架已就位**：`next-intl` + `zh/en` 双语言包 + `[locale]` 路由 + `LocaleSwitcher`，大部分公共页面文案已走 i18n。
4. **响应式基础扎实**：桌面/移动断点覆盖完整；移动端仅市场分类横滑（容器 `overflow-x-auto`，属预期行为）。
5. **无障碍基础元素**：全局 `:focus-visible` 焦点样式、`aria-live` 聊天日志、部分图片有 `alt`；聊天工作台（Nvwa 对话式创建）流程设计完整（进度步骤、快捷建议、滚动到底、键盘提示）。
6. **SEO 投入**：布局层 JSON-LD 结构化数据、OG/Twitter 卡片、`robots`/`noindex` 细分、`llms.txt` 输出。

---

## 六、优先级建议路线图

**第一阶段（本周，必须）**
- 替换 `/dashboard` 为真实数据页或调整登录落地路径（P0）
- 修复 `bountyList.status*` 缺失 key（P0）
- 修复 developer 页 `FORMATTING_ERROR`（P1）
- profile 页删除伪造活动数据 + 修复死链 + 补「修改密码/注销」真实逻辑（P1）
- settings 页开关/按钮接入真实状态（P1）

**第二阶段（本月）**
- 用户中心整体接入 i18n（P2）
- 引入 `next-themes` 实现暗色模式切换（P1）
- 数据页补齐 loading/error/empty 三态 + 重试按钮（P2）
- 以应用内确认框替换全部原生 `confirm()`（P2）
- 清理 21 处 `console.log` 与死代码（`isHome` 分支、`.stars-bg`）

**第三阶段（持续）**
- 排查水合不一致与首页 React 渲染告警
- 补齐无访问名按钮的 `aria-label`、首页 `<h1>`
- 建立 UI/UX 回归清单（截图对比 + Lighthouse CI 阈值）

---

## 附：证据产物

- 截图：`ui-eval-shots/*.png`（17 张：桌面/移动/整页）
- DOM 审计：`ui-eval-shots/audit-report.json`
- 控制台错误：`ui-eval-shots/console-errors.json`
- 截图脚本（可复跑）：`scripts/uieval-shots.mjs`、`scripts/uieval-audit.mjs`、`scripts/uieval-console.mjs`

---

## 附：修复记录（2026-08 复评后已实施）

> 已按 P0/P1 优先级完成以下修复，并在本地 dev server + Playwright 实机验证通过。

### 已修复（P0/P1）
| # | 问题 | 修复内容 | 验证 |
|---|------|----------|------|
| 1 | `/dashboard` 全页模拟数据 | 整页重写为真实数据总览（`userApi.getStats` + `projectApi.getProjects`），含加载/错误(可重试)/空三态；登录默认落地页从 `/dashboard` 改为 `/` | tsc 通过；登录保护流程不变 |
| 2 | `bountyList.status*` 缺失 i18n key | `zh.json`/`en.json` 的 `bountyList` 命名空间补齐 5 个状态 key | 实机验证：下拉显示「开放中/已领取/待验证…」，无 MISSING_MESSAGE |
| 3 | developer 页 `FORMATTING_ERROR` | `step1Desc`/`rateLimitDesc` 改为 `t.rich()` 富文本（消息改为成对标签），移除 `.split/.replace` hack | 实机验证：链接与 429 代码正常渲染，无 FORMATTING_ERROR |
| 4 | profile 页伪造活动 + 死链 + 假按钮 | 移除硬编码活动数据（改诚实空状态）、删除 `/activity` 死链、`修改密码` 接入账号中心引导弹窗、移除硬编码管理员跳转与全部 `console.log` | tsc 通过 |
| 5 | settings 页假开关/假注销 | 通知开关改为真实状态（localStorage 持久化）；`修改密码`/`注销账号` 改为账号中心引导（不再假装执行） | tsc 通过 |
| 6 | 暗色模式死代码 | 新增 `ThemeProvider` + `ThemeSwitcher`（Navbar 桌面/移动端）+ `@custom-variant dark` + layout 内联脚本防闪烁；默认跟随系统、可手动切换并持久化 | 实机验证：切换生效、刷新后保留、导航栏背景实际变暗 |

### 一并清理
- 生产代码 `console.log/debug`：profile、nvwa、admin dashboard、admin layout、marketplace、TeamSkillDetailView、aiteam-creator-modal、ProtectedRoute 等 10 处文件（保留 `console.error/warn`）
- `nvwa/Client.tsx`：未定义类名 `bg-muted`/`text-muted-foreground` 改为标准色阶；「创建模式/对话式/状态机」文案接入 i18n

### 尚未修复（P2，建议下一步）
- 用户中心整体 i18n（`(user-center)` 全硬编码中文）
- 11 处原生 `confirm()` 替换为应用内确认框
- 数据页 API 失败时的统一错误/重试态（部分页面仍会无限 loading）
- 首页 `<h1>` 缺失、无访问名按钮的 `aria-label` 补齐
- 水合不一致（marketplace）与首页 React 渲染告警（dev 控制台，非致命）排查
