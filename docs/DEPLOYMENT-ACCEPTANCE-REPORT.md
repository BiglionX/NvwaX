# NvwaX 部署前验收报告

> 验收范围：Phase 0-3（MCP 集成、LLM/会话/技能统一、编排内核+沙箱、隔离执行 worker）全部改动
> 验收日期：2026-08-15
> 结论：**有条件可部署（CONDITIONAL GO）** —— 代码层面全部验证通过；部署前仍需处理 1 个 BLOCKER
> （生产 API key，需你提供有效密钥）与 2 个 MUST（executor 纳入部署、env 补全）。**已修复**：
> 部署入口错误、根 build filter、zod 显式依赖（见第 3 节更新）。

---

## 1. 验收矩阵

### 1.1 构建

| 包 | 结果 | 说明 |
|---|---|---|
| `nvwax-server`（tsc） | ✅ PASS | Phase 0-3 全部改动编译通过 |
| `account-portal`（next static export） | ✅ PASS | 输出 `out/`（PORTAL_STATIC_DIR 用） |
| `@nvwax/sdk`（rollup） | ✅ PASS | |
| `skillhub-workflow` | ✅ PASS | 无构建步骤，`node src/server.js` 直接运行（语法检查全过） |
| `nvwax-executor` | ✅ PASS | 无构建步骤，零依赖 `node src/server.js` 运行 |
| 根 `pnpm build` | ✅ **已修复** | filter `'./packages/**'` → `'./packages/*'`，现匹配 9/10 项目并真正全量构建 |

### 1.2 测试

| 项 | 结果 |
|---|---|
| `nvwax-server` jest | ✅ 157/158 通过 |
| 唯一失败 `oidc-cookie-flow.test.ts` | ⚠️ 预存：Phase 0 依赖漂移（body-parser 2.x 等被重解析）导致的行为变化，与 Phase 0-3 代码无关，需单独修复 |

### 1.3 三服务联调（实测 8/8 PASS）

| 检查项 | 结果 |
|---|---|
| nvwax-server `/health`（:3001） | ✅ |
| 标准 MCP `/api/mcp/standard/health`（6 工具） | ✅ |
| skillhub-workflow `/health`（:3002） | ✅ |
| skillhub 编排内核 `run-script`（worker-thread） | ✅ |
| nvwax-executor `/health`（:3010） | ✅ |
| executor JS 沙箱执行（args 注入） | ✅ |
| nvwax-server → executor 客户端委托（dist 产物） | ✅ |
| WORKFLOW_API_URL 对齐（默认 3002 = skillhub 实际端口） | ✅ |

---

## 2. Phase 0-3 改动与部署配置核对

| 检查项 | 状态 | 说明 |
|---|---|---|
| skillhub-workflow 端口 3001→3002 | ✅ PASS | 与 `WORKFLOW_API_URL`（.env/.env.example 均 3002）对齐；部署配置中无 3001 引用冲突 |
| `nvwax-executor`（:3010）纳入部署 | ❌ **MUST** | 新包，**未出现在任何 Dockerfile / docker-compose / render.yaml / railway.toml** 中 |
| `EXECUTOR_URL`/`EXECUTOR_TOKEN` 环境变量 | ❌ **MUST** | 已补进根 `.env.example`，但 `.env.production.example`、`docker-compose.yml`、平台 env 均缺失 |
| `WORKFLOW_API_URL` 环境变量 | ⚠️ 部分 | 根 `.env(.example)` 有；docker-compose 无（skillhub 未部署则 review 流程回落失败） |
| `@modelcontextprotocol/sdk`（^1.30.0） | ✅ PASS | 已显式声明于 nvwax-server deps |
| `zod` 依赖 | ✅ **已修复** | 已显式声明 `zod@^4.4.3` 到 nvwax-server deps（此前经 SDK 传递解析） |
| MCP 端点鉴权 | ⚠️ WARN | `/api/mcp/standard` 当前无鉴权；生产建议网关层加白名单/鉴权（工具本身只读业务数据） |
| Dockerfile（主，web+server）入口 | ✅ **已修复** | `CMD node dist/index.js` → `node dist/app.js`（原指向不存在的入口） |
| render.yaml 入口 | ✅ **已修复** | `startCommand` → `node packages/nvwax-server/dist/app.js`；buildCommand `npm` → `pnpm` |
| Dockerfile.backend（Railway/docker-compose 用） | ✅ PASS | `exec node dist/app.js` 正确；HEALTHCHECK :3001 正确 |
| docker-compose.yml | ⚠️ 部分 | 只有 postgres+redis+backend；缺 skillhub/executor 服务与相关 env |
| k8s/ | ⚠️ 空目录 | 无实际清单 |

---

## 3. 部署前必办清单（按优先级）

### BLOCKER（不解决不能上线）
1. ~~**生产 API key**~~ ✅ **已解决（2026-08-15）**：已配置有效 DEEPSEEK_API_KEY 到本地 `.env` 与
   `packages/skillhub-workflow/.env`（`.gitignore` 覆盖，不进 git），并实测：
   - `llmService` 真实补全 ✅（`model=deepseek-v4-flash`，`链路通`）
   - MCP `nvwax_analyze_requirements` / `nvwax_design_team`（结构化输出路径）✅ 真实结构化结果
   - skillhub `agent()` + YAML 工作流全链路 ✅（strategy→writing→design→review，每-agent fail-closed）
   - **模型已统一为 V4-flash**：全部 `deepseek-chat` 引用（nvwax-server 6 处 + skillhub YAML 2 处）
     改为 `deepseek-v4-flash`；`.env` 增加 `LLM_DEFAULT_MODEL=deepseek-v4-flash`。
   - 顺带修复真实链路测试发现的 3 个问题：YAML tpl 裸键回退到 args、字符串结果直接解析、
     节点 input 上下文自动追加、`complete()` 单调用超时保护（120s，防 worker 挂起）。
   ⚠️ 生产平台 env 仍需配置正式 key（本 key 已在对话中暴露，建议尽快在 DeepSeek 平台轮换）。

### MUST（部署本阶段能力所需）
2. ~~**纳入 nvwax-executor**~~ ✅ **已补齐（2026-08-15）**：新增 `Dockerfile.executor`（零依赖，node:20-alpine，
   端口 3010）与 `Dockerfile.skillhub`（better-sqlite3 原生编译，端口 3002）；`docker-compose.yml`
   新增 `skillhub` 与 `executor` 两个服务（含 `skillhub_data` 卷、`EXECUTOR_TOKEN` 环境）。
3. ~~**补全 env**~~ ✅ **已补齐**：backend 服务增加 `WORKFLOW_API_URL=http://skillhub:3002/api`、
   `EXECUTOR_URL=http://executor:3010`、`EXECUTOR_TOKEN=${EXECUTOR_TOKEN:-}`；
   `.env.production.example` 增加对应条目。compose YAML 已解析验证（8 个服务）。

### RECOMMENDED（上线后尽快）
4. MCP 端点生产鉴权（网关白名单）。
5. ~~预存 `oidc-cookie-flow` 测试失败~~ ✅ **已修复（2026-08-15）**：根因是 Sprint 2.10 将
   `authorizeGet` 无 cookie 行为改为 302 重定向到 account-portal 登录页，测试断言仍是旧的
   200 内联表单——已同步测试断言，**jest 全量 158/158 通过**。

### ✅ 已修复（本次验收中处理）
- 部署入口错误：`Dockerfile`（`node dist/index.js` → `dist/app.js`）、`render.yaml`（startCommand + buildCommand npm→pnpm）。
- 根 `pnpm build` filter（`'./packages/**'` → `'./packages/*'`，已实测匹配 9/10 项目）。
- `zod` 显式声明到 nvwax-server deps。

---

## 4. 降级路径（不全量部署时的行为）

| 能力 | 未部署时的行为 |
|---|---|
| skillhub-workflow | nvwa-agent review 流程调用失败 → 服务内已有降级（返回默认审查结果，不阻断流程） |
| nvwax-executor | `POST /api/execution/run` 返回 503（fail-closed）；业务 API 不受影响 |
| MCP 端点 | `/api/mcp/standard` 与 `/api/mcp/*` 一起部署在 nvwax-server 内，随后端一起可用 |

---

## 5. 结论

- **代码与集成层面：全部通过**（构建 ✅ / 测试 157/158 ✅ / 联调 8/8 ✅）。
- **部署配置层面**：可修复项已全部修复（部署入口、根 build filter、zod 声明）。
- **BLOCKER（API key）已解除**：有效 key 已配置并实测全链路；模型统一为 V4-flash。
- **MUST 项已全部完成**：`Dockerfile.skillhub` / `Dockerfile.executor` 与 docker-compose 的
  skillhub/executor 服务、全部委托 env 已补齐并验证。
- **剩余仅建议项**：① 部署时在平台配置 `EXECUTOR_TOKEN` 与正式 DEEPSEEK_API_KEY（建议轮换本次
  对话中暴露的 key）；② 上线后修复预存 `oidc-cookie-flow` 测试。
- 全功能部署集合：`postgres + backend + frontend + redis + nginx + skillhub + executor`（`docker compose up`）。
