# NvwaX × DeepSeek Harness 模块迁移评估与实施计划

> 结论先行：**DSH 替代不了 NvwaX 的产品层（市场、账户、计费、状态机、反思学习），
> 但可以替代/接管 NvwaX 的"Agent 执行层"**——即所有"裸调 LLM + JSON 解析"的服务，
> 统一换成 DSH 的 agent-loop / 工具系统 / 会话持久化 / 沙箱 / 子代理编排。
> 本文件给出逐服务清单、迁移策略、分阶段计划和风险提示。
>
> 关联文档：[DSH-MCP-INTEGRATION.md](./DSH-MCP-INTEGRATION.md)（MCP 互补集成，
> 建议先做，成本最低、风险最小）。

---

## 1. 迁移判定标准

对 `packages/nvwax-server` 与 `packages/skillhub-workflow` 中每个涉及 LLM 的服务，按四条标准判定：

| 标准 | 判定 |
|---|---|
| 是否只是"裸调 `openai.chat.completions` + JSON 解析" | 是 → 可被 DSH agent-loop / LLM 服务替代 |
| 是否执行代码 / 命令 / 需要沙箱 | 是 → DSH 沙箱 + shell 工具是现成替代 |
| 是否深度依赖 PostgreSQL 业务表（用户/计费/市场/记忆） | 是 → 业务层，DSH 无对应物，不可替代 |
| 是否对外暴露 HTTP 端点（B2B API / 计费面） | 是 → 端点保留，可只换背后执行引擎 |

判定组合 → 四种结论：**替代 / 部分替代（换执行后端）/ 不可替代 / 互补（MCP）**。

---

## 2. 逐服务清单与判定

> 表内"DSH 对应能力"指 `@deepseek-ai/dsh-*` 包，例如：agent-loop、dsh-session、
> dsh-tools、dsh-llm、dsh-sandbox、dsh-workflow、dsh-subagent、dsh-skill、
> dsh-session-persistence-jsonl、dsh-session-query-sqlite。

### 2.1 可替代（LLM 编排层，迁移收益最大）

| NvwaX 模块 | 现状（已核实） | 迁移方式 |
|---|---|---|
| `services/ai-search-agent.service.ts` | **标准 agent-loop 形态**（意图分析→搜索→推荐），会话在内存 Map；裸 `chat.completions` 无 tools | agent-loop 与会话持久化迁 DSH（`dsh-agent-loop` + `dsh-session`）；`agentSearchService`/`aiteamService`/配额作为业务工具注册给 DSH 调用 |
| `services/ceo-agent.service.ts` | 裸调用 + 正则 JSON 解析 + 会话内 phase 状态机 | 会话状态机迁 `dsh-session`，LLM 走 `dsh-llm`；AiTeam 创建与配额保留为业务工具 |
| `services/nvwa-agent.service.ts` 的审查流程 | 实为 HTTP 调 skillhub-workflow（`WORKFLOW_API_URL`）执行评审 | 迁移后由 DSH 内联执行评审流程，消除跨服务 HTTP 跳 |
| `skillhub-workflow` 的 LLM 节点（`orchestrator` / `leader` / `reviewer` / `agent_router`，LangChain 裸调用 + 正则） | LangChain 直调 + 手写 prompt 路由 | Phase 2：用 `dsh-workflow` + subagent fan-out 重写；YAML DSL 写 loader 翻译成 workflow 脚本 |
| 新功能："Agent 对话/会话记录" | （现有各 service 无统一会话持久化） | 直接建在 `dsh-session` + `dsh-session-persistence-jsonl` + `dsh-session-query-sqlite`（FTS5），获得断点续跑与全文检索 |

### 2.2 部分替代（保留业务外壳，换执行内核）

| NvwaX 模块 | 现状（已核实） | 保留部分 | 可替代部分 |
|---|---|---|---|
| `services/nvwax-agent.service.ts`（需求分析→团队设计→Agent 匹配→技能匹配→CEO→文档） | 裸 `chat.completions` + `structuredOutputService`（3 级降级）+ `tokenQuotaService` + 多表事务 | 业务管线、结构化输出、PostgreSQL 数据 | LLM 调用层统一走 `dsh-llm`（重试/计量/模型路由） |
| `services/nvwa-leader.service.ts` | 需求→LLM 生成团队配置（结构化 schema）→写库 | 团队配置落库、配额 | LLM 生成步骤同上 |
| `services/reflection-learning.service.ts` | 定期分析 `success_score<0.5` 案例→失败模式→注入 system prompt | 失败模式提取与注入的业务逻辑 | 分析步骤的 LLM 调用走 `dsh-llm` |
| `services/marketing-agent.service.ts` + `controllers/chat.controller.ts`（`POST /v1/chat/completions`） | OpenAI 兼容 B2B API：API Key 鉴权 + token 配额扣减 + 转发 LLM | **OpenAI 兼容端点、鉴权、配额计费网关必须保留** | 背后模型引擎可换 DSH headless worker（配额校验后转发） |
| `services/microbiz-agent-runtime.service.ts`（10 个 Agent 执行） | LLM 调用 + 外部平台 API 集成 + 配额；**⚠ 全仓无任何 import，属未接线死代码** | 外部 API 适配、业务编排（如未来启用） | 启用后：命令/脚本类动作放入 `dsh-sandbox` + shell 工具族 |
| `skillhub-workflow` 整体（Express 4 + LangChain + better-sqlite3，YAML DSL） | 多 Agent 团队模拟；`condition` 节点用 `eval()`、`testing-agent-enhanced` 用 `child_process` 跑真实测试（**当前无沙箱**）；better-sqlite3 仅存 workflow 定义（非业务表） | YAML DSL 生态、`/api/workflows` CRUD 面 | 编排内核（`/api/orchestrate*`、`/api/workflows/:id/execute`）迁 DSH workflow + subagents；真实执行放 `dsh-sandbox` |

### 2.3 不可替代（NvwaX 独有业务层）

| NvwaX 模块 | 为什么不可替代 |
|---|---|
| 用户认证 / OIDC / RBAC / 租户 / 计费 / token 配额（`user-auth`、`oidc`、`rbac`、`billing`、`token-quota`、`account-portal`） | DSH 是单操作员 local-first 设计，无用户/租户/计费模型 |
| 市场与搜索（`agent-registry`、`agent-search`、`agent-crawler`、`chinese-agent-crawler`、`skill-search`、`skill-matching`、`recommendation`） | NvwaX 独有数据源集成与推荐引擎，DSH 无对应物 |
| 业务状态机（`creation-state-machine.service.ts`，7 步创建 / checkpoint / 回退） | 深度绑定业务表与审批流，DSH 的 goal/session 是不同抽象 |
| 业务记忆（`nvwax-memory.service.ts`，`nvwax_memories` 表 + 最佳实践提取） | 按用户/团队类型的业务记忆，DSH session 是会话级日志，不同层 |
| 仓储与控制器（`agent.service.ts`、`chat.controller.ts`、`ai-search.controller.ts`、`ceo-agent-generator.service.ts`） | 纯 CRUD/API 面/模板层，无执行语义可迁移 |
| 前端全家（`nvwax-web`、`account-portal`、`@nvwax/agent-studio`、`@nvwax/agent-marketplace`） | 产品 UI 与可嵌入 Web Component，DSH 的 Web GUI 是另一种界面，不替代 |

### 2.4 互补（保留 NvwaX 资产，与 DSH 协同）

| NvwaX 模块 | 现状 | 协同方式 |
|---|---|---|
| `mcp/nvwax-mcp-server.ts`（6 个能力工具） | 自定义 HTTP JSON 端点（**非标准 MCP**，协议缺口） | 按 [DSH-MCP-INTEGRATION.md](./DSH-MCP-INTEGRATION.md) 加标准适配层后，DSH Agent 直接调用 `mcp__nvwax__*` |
| `structured-output.service.ts`（3 级降级引擎） | 与 DSH 工具 schema 同构（同为 JSON Schema） | **保留**（DSH 无 3 级降级能力）；可做薄封装把降级策略暴露给 DSH 复用 |
| `agent-translation.service.ts` | 原子翻译能力（批量、缓存、去重） | **保留为工具**：注册为 DSH 工具或由 DSH 批量任务调用，不删除 |
| NvwaX 技能体系（skillhub） | 技能市场/元数据匹配 | 分层互补：NvwaX 管技能发现与元数据，DSH 管运行时加载与注入（`dsh-skill` + `dsh-agent-instructions`） |

---

## 3. 分阶段实施计划

### Phase 0 — 试点验证（✅ 已完成）
- 按 [DSH-MCP-INTEGRATION.md](./DSH-MCP-INTEGRATION.md) 完成 NvwaX 标准 MCP 适配层
  （`packages/nvwax-server/src/mcp/standard-mcp-server.ts`，挂载 `/api/mcp/standard`）。
- 已实测通过标准 MCP 协议全流程：`initialize` / `notifications/initialized` / `tools/list`（6 个工具）/
  `tools/call`（真实调用 agent-registry），`pnpm --filter nvwax-server build` 全绿。
- 实施要点沉淀：stateless 模式须每请求新建 server+transport；SDK registerTool 只收 zod schema
  （详见 MCP 指南第 2.3 节）；全量重装依赖暴露的两个预存类型错误（sessionUser 增强、stripe apiVersion）已顺手修复。
- ✅ DSH 侧也已激活：插件已装入 `%DSH_HOME%\profiles\web`，`cordis.patch.yml` 已写入 `mcp-nvwax`
  条目；用 MCP 官方 SDK 客户端实测连接/列工具/调用全部通过。下一步即可进入 Phase 1。

### Phase 1 — 替换低风险执行件（✅ 已完成）
- ✅ **① LLM 调用统一**：新增 `src/services/llm/llm.service.ts`（provider-neutral 统一 LLM 服务，
  镜像 dsh-llm 的重试策略/计量/模型路由），迁移全部 12 处裸 `chat.completions.create` 调用
  （agent-translation、ai-search-agent ×2、ceo-agent、marketing-agent、microbiz ×2、nvwax-agent、
  reflection-learning、structured-output ×3），各服务自建的 `new OpenAI(...)` 全部移除。
- ✅ **② 会话持久化**：新增 `src/services/session/session-store.service.ts`（JSONL 事件溯源，
  镜像 dsh-session + dsh-session-persistence-jsonl），ai-search-agent 的内存 `SearchSession` Map
  迁移为 store 持久化（缓存加速热路径、重启后自动重放重建、过期清理与删除同步 store）；
  ceo-agent 会话本已由 `aiteam_creation_sessions` 表持久化，无需迁移。
- ✅ **③ 技能/提示词注入**：新增 `src/services/skill/skill-registry.service.ts`（镜像 dsh-skill）
  与 `src/services/skill/prompt-skills.bootstrap.ts`（启动注册 9 个内置提示词技能），
  `skillRegistry.loadInstructions()` 镜像 dsh-agent-instructions（AGENTS.md/CLAUDE.md 加载）；
  ceo-agent / nvwax-agent 已改用注册表解析提示词。
- **实现决策（dsh 包接口不匹配的落地方式）**：dsh-llm 的 `stream()` 是流式 chunk 协议、
  dsh-llm-retry 只作用于 agent loop 的 `agent/request-error` 瀑布、dsh-llm-deepseek 不透传
  `response_format`（structured-output 的 3 级降级依赖），故采用镜像其接口的 in-repo 实现，
  公共 API 与 dsh-* 对齐，未来接入 DSH 运行时只需替换内部实现（替换路径见
  [DSH-MCP-INTEGRATION.md](./DSH-MCP-INTEGRATION.md) 与各文件头注释）。
- **验证**：`pnpm --filter nvwax-server build` 全绿；jest 156/158 通过（2 个失败中 1 个为
  structured-output 测试断言旧错误消息——已更新断言后通过；另 1 个 `oidc-cookie-flow` 是
  Phase 0 依赖漂移暴露的预存问题，与 Phase 1 代码无关）；服务冒烟正常，4 个服务启动日志
  均为 "(via LlmService)"；会话存储/技能注册表功能脚本验证通过。

### Phase 2 — 替换 skillhub-workflow 编排（✅ 已完成）
- ✅ **编排内核**：新增 `packages/skillhub-workflow/src/engine/`：
  - `workflow-engine.js` — 镜像 dsh-workflow：JS 编排脚本 + `pipeline`/`parallel`/`phase`/`log`/`agent` 原语；
  - `worker-thread.js` — 脚本在 worker 线程隔离执行（镜像 dsh-workflow-worker-thread），
    `agent()` 实现 fresh-child 子代理语义（一次性 LLM 补全 + 可选 JSON Schema 校验，失败返回 null）；
  - `yaml-to-script.js` — 把 YAML 工作流定义按依赖拓扑分层翻译为编排脚本；
  - `yaml-loader.js` — 纯 JS YAML 加载器（替代预存缺陷 `loaders/yaml-agent-loader.js`：
    该文件含 TS 语法 `export interface`，在 ESM 下无法被 Node 加载）；
  - `sandbox.js` — 镜像 dsh-sandbox：`evaluateCondition`（受限 vm 求值替代裸 `eval`，
    拦截 process/require/超时，fail-closed）+ `execCommand`（cwd 白名单/env 清洗/超时/输出截断）；
  - `nodes.js` — 节点实现从 server.js 抽取（condition 节点已改安全求值、llm 节点统一走 llm-client）；
  - `llm-client.js` — 统一 LLM 客户端（无 key 时 mock 降级）。
- ✅ **路由**：新增 `POST /api/workflows/run-script`（任意编排脚本）、`GET /api/workflows/yaml`、
  `POST /api/workflows/yaml/:id/execute`（YAML → 脚本 → worker 执行）；原 `/api/workflows` CRUD
  与 `/api/orchestrate*` 保持兼容。
- ✅ **端口收口**：skillhub-workflow 默认端口 3001 → **3002**，与 nvwax-server 的
  `WORKFLOW_API_URL`（默认 `http://localhost:3002/api`，.env/.env.example 一致）对齐，
  消除同机 3001 冲突与"引用 3002 但服务默认 3001"的失配。
- **安全收益**：condition 节点的裸 `eval()` → 受限求值（实测拦截 `process.exit`/`require`/死循环）；
  编排脚本在 worker 线程运行，与宿主进程隔离。
- **验证**：服务在 3002 启动正常；`/health`、`/api/workflows`（CRUD）、`/api/workflows/yaml`
  （列出 content-pipeline）、`run-script`（pipeline/parallel/phase 语义正确、并行失败降 null）、
  YAML workflow 全链路（phase 分组、子代理 401 → null 按设计降级）全部通过；沙箱求值/超时验证通过。
- **注意**：`skillhub-workflow/.env` 中的 DEEPSEEK_API_KEY（\*\*\*\*506a）同样无效（401），
  与 nvwax-server 的 key 情况一致，需更换有效 key 后子代理才能返回真实内容。

### Phase 3 — 让 DSH 接管"真 Agent 干活"（✅ 已完成）
- ✅ **隔离执行 worker**：新增 `packages/nvwax-executor`（零依赖 node:http，镜像 dsh-headless + dsh-sandbox）：
  - `POST /api/exec/run`（Bearer token 鉴权，未配置 `EXECUTOR_TOKEN` 时 fail-closed 503/401），
    `GET /health`；
  - `kind=js`：worker 线程 + vm 受限上下文执行（无 process/require/fs/globalThis 逃逸面，
    console 受限输出回传、args 注入、超时终止）；
  - `kind=shell`/`python`：execFile（默认无 shell 解释器）+ cwd 白名单（仅工作区）、
    env 清洗（剔除 *_KEY/*_SECRET/*TOKEN/*PASSWORD）、强制超时与输出截断。
- ✅ **nvwax-server 委托**：`src/services/execution/executor-client.service.ts`（EXECUTOR_URL/EXECUTOR_TOKEN），
  业务层不直接执行代码；演示路由 `POST /api/execution/run`（authMiddleware + 仅管理员）委托执行；
  全部业务 API（计费/配额/RBAC）保持不变。
- **验证**：executor 实测——鉴权 401 ✅、JS（args 注入 + console 捕获）✅、JS 逃逸（process）被拦截 ✅、
  shell（node -e / cmd echo）✅、python ✅、越权 cwd 拒绝 ✅、死循环超时终止（1500ms）✅；
  nvwax-server 客户端端到端委托（js + shell）✅；`pnpm --filter nvwax-server build` 全绿。
- **替换路径**：可把 nvwax-executor 换成 dsh-headless worker（dsh-sandbox Windows ACL / landlock
  提供 OS 级隔离），HTTP 契约与 executor-client 保持兼容。
- **注意**：执行 worker 需独立于沙箱运行（本会话验证时 shell/python 的 spawn 被 workspace-write
  沙箱拦截，属验证环境限制）；`EXECUTOR_TOKEN` 需在 nvwax-server 与 executor 两侧一致配置。

### 明确不做的迁移
- 用户认证 / OIDC / RBAC / Stripe / token 配额 / 账户门户：DSH 是单操作员设计，无多租户。
- 市场搜索 / 爬虫 / 多数据源：DSH 无对应物。
- 创建状态机（creation-state-machine）与结构化输出引擎：NvwaX 工程资产，保留。

---

## 4. 风险与成本

| 风险 | 说明 | 缓解 |
|---|---|---|
| DSH 处于 0.1.0-rc 阶段 | API 可能变动 | 锁定版本（`^0.1.0-rc.6`），先只做 Phase 0 验证 |
| Cordis 插件学习成本 | 需要理解 realm/scope/服务注入 | 用官方 agent-preset 作为模板，最小化自写插件 |
| 单操作员设计 | DSH 无用户/租户/计费 | 只把 DSH 当内嵌执行引擎，业务边界留在 nvwax-server |
| 数据模型不同 | DSH 用 JSONL+SQLite，NvwaX 用 PostgreSQL | 集成点放在调用边界（HTTP/MCP/进程），不共享数据层 |
| 协议缺口 | NvwaX 现有 MCP 端点是自定义协议 | Phase 0 必须先加标准适配层（见 MCP 指南） |
| **端口不一致（已核实）** | skillhub-workflow 默认 `PORT=3001`，而 nvwax-server 的 `WORKFLOW_API_URL` 默认指向 `localhost:3002`（且 nvwax-server 自身也默认 3001）→ 同机部署时端口冲突 + 评审调用连不上 | 同机部署需显式设置两边 `PORT` 与 `WORKFLOW_API_URL`；迁移 DSH 内联后该依赖彻底消除 |
| 死代码 | `microbiz-agent-runtime.service.ts` 全仓无 import，未接线 | 迁移评估中按"不迁移"处理；启用前先接线 |

---

## 5. 建议路线图（按性价比排序）

1. **先做 MCP 互补集成**（Phase 0）——零业务改动，两周内可见价值。
2. **再做低风险执行件迁移**（Phase 1）——翻译、会话持久化、技能注入。
3. **最后评估** skillhub-workflow 替换（Phase 2）与真执行沙箱（Phase 3）——以产品是否需要"Agent 真干活"为决策前提。
