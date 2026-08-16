# NvwaX SEO / GEO 优化说明（Sprint SEO-1）

本文档记录 `packages/nvwax-web`（主站点，Next.js 15 + next-intl 中英双语）的
SEO（搜索引擎优化）与 GEO（Generative Engine Optimization，生成式引擎优化）改造内容。

> GEO 目标：让 ChatGPT / Perplexity / Gemini / Copilot / AI Overviews 等生成式引擎
> 能够抓取、理解并引用 NvwaX 的内容（结构化数据、llms.txt、可引用的事实性描述）。

---

## 1. 核心问题与修复

### 1.1 内容页登录墙（最大障碍）✅ 已修复
- **问题**：`middleware.ts` 要求登录后才能访问 `/marketplace`、`/faq`、`/nvwa`、
  `/developer`、`/team-skills`、`/search`、`/bounties` 等全部目录/内容页，
  所有搜索引擎与 AI 爬虫都会被 302 弹到 `/login`，页面无法收录。
- **修复**：`middleware.ts` 中这些公开目录/内容页从受保护列表移除，对所有人开放；
  仅保留用户私有页面（`/dashboard`、`/profile`、`/user-center`、`/admin`、
  `/projects`、`/bounties/create`、`/test-*`）的登录保护。

### 1.2 sitemap 动态 URL 错误 ✅ 已修复
- **问题**：旧 sitemap 生成 `/marketplace/agents/:id` 与 `/marketplace/aiteams/:id`，
  这些路由并不存在（实际详情路由为 `/marketplace/team-skills/:id`），全部是死链。
- **修复**：`app/sitemap.ts` 从公开接口 `/api/team-skills/marketplace` 拉取已发布
  Team Skill，生成真实可访问的详情页 URL；同时移除用户私有页 `/projects`。

### 1.3 多语言 canonical / hreflang 错误 ✅ 已修复
- **问题**：zh 为默认语言（URL 不带前缀），但 layout 的 canonical 错误地写成
  `https://nvwax.proclaw.cc/zh`；各页面 canonical 也未区分语言。
- **修复**：新增 `lib/seo.ts`，统一通过 `alternatesFor(path, locale)` 生成
  canonical + hreflang（zh → 根路径，en → `/en/...`），所有页面接入。
- **注意**：`.env.local` 中 `NEXT_PUBLIC_SITE_URL=http://localhost:3000` 会覆盖
  生产配置，`lib/seo.ts` 已在 `NODE_ENV=production` 时强制使用正式域名
  `https://nvwax.proclaw.cc`。

### 1.4 robots.txt 缺少 AI 爬虫策略 ✅ 已修复
- `app/robots.ts`：全站允许抓取；显式放行 GPTBot / OAI-SearchBot / ChatGPT-User /
  ClaudeBot / Claude-Web / anthropic-ai / PerplexityBot / Google-Extended /
  Applebot-Extended / cohere-ai / Amazonbot / Meta-ExternalAgent / Diffbot /
  CCBot / Bytespider / YouBot / ExaBot / DuckAssistBot 等；私有路径 disallow。

### 1.5 私有页面防误收录 ✅ 已修复
- `robots.txt` disallow + `next.config.ts` 为 `/admin`、`/dashboard`、`/profile`、
  `/settings`、`/token-*`、`/agent-repository`、`/my-bounties`、`/microbiz`、
  `/projects/*`、`/bounties/create`、`/oauth/*`、`/portal/*`、`/test-*`
  下发 `X-Robots-Tag: noindex, nofollow`。
- `/projects` 页面 metadata 增加 `robots.index=false`。

---

## 2. GEO 专项（生成式引擎优化）

### 2.1 llms.txt（llmstxt.org 规范）✅ 新增
- `public/llms.txt`（中文默认语言）与 `public/llms-en.txt`（英文）：
  LLM 可直接抓取的站点索引，含站点简介、关键页面、开始使用、API/开发者、联系方式。
- 访问地址：`https://nvwax.proclaw.cc/llms.txt`、`https://nvwax.proclaw.cc/llms-en.txt`
- `next.config.ts` 为两者设置 `Content-Type: text/markdown; charset=utf-8` 与缓存策略。
- 建议向 OpenAI（GPTBot 提交）/ Anthropic / Perplexity 等提交站点后生效。

### 2.2 结构化数据（JSON-LD）✅ 新增/完善
- `app/[locale]/layout.tsx`：全站注入
  - `Organization`（含 logo、GitHub 链接）
  - `SoftwareApplication`（应用类别/价格/描述）
  - `WebSite` + `SearchAction`（原有，保留）
- `app/[locale]/faq/page.tsx`：FAQPage 结构化数据（21 个问答，原有，保留）。
- 详情页新增 `BreadcrumbList`（`/marketplace/team-skills/:id`、`/team-skills/:id`）。
- 工具：`lib/seo.ts`（构建器）+ `components/JsonLd.tsx`（注入组件）。

### 2.3 页面级 metadata ✅ 完善
- 首页、marketplace、nvwa、search、faq、bounties、login、register、team-skills 列表
  均改为按语言（zh/en）生成 title/description/OG/canonical。
- Team Skill 详情页（`/marketplace/team-skills/:id`、`/team-skills/:id`）改为服务端
  包装：`generateMetadata` 服务端拉取公开详情，title/description 使用真实技能名称
  与描述（接口失败时降级为通用文案）。

---

## 3. 文件清单

| 文件 | 变更 |
| --- | --- |
| `packages/nvwax-web/lib/seo.ts` | 新增：站点 URL、多语言路径、alternates、JSON-LD 构建器 |
| `packages/nvwax-web/components/JsonLd.tsx` | 新增：JSON-LD 注入组件 |
| `packages/nvwax-web/public/llms.txt` / `llms-en.txt` | 新增：GEO LLM 索引 |
| `packages/nvwax-web/middleware.ts` | 公开目录/内容页移除登录墙 |
| `packages/nvwax-web/app/robots.ts` | AI 爬虫规则 + 私有路径 disallow |
| `packages/nvwax-web/app/sitemap.ts` | 修复动态 URL、双语 hreflang、移除私有页 |
| `packages/nvwax-web/next.config.ts` | 私有路径 noindex 头 + llms.txt 类型 |
| `packages/nvwax-web/app/[locale]/layout.tsx` | JSON-LD 三件套 + canonical 修正 |
| `packages/nvwax-web/app/[locale]/page.tsx` | 首页多语言 metadata |
| `packages/nvwax-web/app/[locale]/{faq,marketplace,nvwa,search,bounties,login,register,projects}/page.tsx` | 多语言 metadata + canonical |
| `packages/nvwax-web/app/[locale]/team-skills/page.tsx` | 服务端包装（列表页 metadata） |
| `packages/nvwax-web/app/[locale]/team-skills/TeamSkillsView.tsx` | 原列表页客户端代码（迁移） |
| `packages/nvwax-web/app/[locale]/{team-skills,[id],marketplace/team-skills/[id]}/page.tsx` | 服务端包装（详情 metadata + Breadcrumb） |
| `packages/nvwax-web/app/[locale]/{team-skills/[id],marketplace/team-skills/[id]}/TeamSkillDetailView.tsx` | 原详情页客户端代码（迁移） |

---

## 4. 验证方式（已实测通过）

```bash
# 1) 构建（已验证：Next.js 15.5.23 完整构建通过，96 个静态页 + 动态路由全部生成）
pnpm --filter nvwax-web build

# 2) 本地启动并检查关键端点（已实测）
pnpm --filter nvwax-web start
```

实测结果（`next start` + curl，2026 版）：

| 检查项 | 结果 |
| --- | --- |
| `GET /robots.txt` | ✅ 含 `*` 兜底 + 30+ 个搜索引擎/AI/社交爬虫规则，私有路径 disallow，`Sitemap` 指向正式域名 |
| `GET /llms.txt` | ✅ `Content-Type: text/markdown; charset=utf-8`，内容为站点索引 |
| `GET /sitemap.xml` | ✅ 90 条 URL：首页/`/en`、各目录页双语 hreflang、`/marketplace/team-skills/:id` 动态详情，全部为正式域名 |
| `GET /marketplace`（未登录） | ✅ 200（原 302 → /login，登录墙已移除） |
| `GET /en/faq` | ✅ 200；`<title>`/`description` 英文、`canonical=https://nvwax.proclaw.cc/en/faq`、hreflang zh/en、FAQPage + WebSite + Organization + SoftwareApplication JSON-LD |
| `GET /`（zh） | ✅ title/description 正确，`canonical=https://nvwax.proclaw.cc`（根路径） |
| `GET /marketplace/team-skills/xxx` | ✅ 200（公开）；canonical 正确、BreadcrumbList JSON-LD、标题降级逻辑生效 |
| `GET /admin`（未登录） | ✅ 307 → 登录页（仍受保护），且 `X-Robots-Tag: noindex, nofollow` |

---

## 5. 后续建议（不在本次范围）

1. 向 Google Search Console / Bing Webmaster 提交 sitemap 与 llms.txt；
   申请 AI 爬虫收录（GPTBot / PerplexityBot 等）。
2. 详情页动态内容建议 SSR/ISR 预渲染（当前为客户端拉取，爬虫可见 HTML 较薄）。
3. 为 `/bounties/:id` 详情页补充服务端 metadata（本次保留通用文案）。
4. 补充英文版 FAQPage 结构化数据（当前 FAQ JSON-LD 随语言自动生成）。
5. 在 `llms-full.txt` 中沉淀完整的产品说明文档，进一步增强 GEO 引用率。
6. **上线前必做**：替换 `NEXT_PUBLIC_GOOGLE_VERIFICATION`（当前为占位符
   `YOUR_GOOGLE_VERIFICATION_CODE`，layout 会输出对应 meta 标签）。
7. 建议修正 FAQ 中英文文案里的 `localhost:3000` 示例链接（i18n 文件
   `messages/zh.json` / `messages/en.json`），避免生成式引擎引用本地地址。
