# Marketplace AiTeam 智能搜索与创建引导 - 需求文档

## 1. 问题分析

### 1.1 现状检查结果

通过代码审计，确认以下问题：

| 问题 | 详细说明 | 严重程度 |
|------|---------|---------|
| **AiTeam 搜索路由缺失** | `aiteam.routes.ts` 未注册 `GET /search` 路由，`searchPublishedAiTeams` 控制器不可达 | P0 |
| **认证限制不适当** | `aiteam.routes.ts` 所有路由都应用了 `userAuthMiddleware`，市场搜索不应要求登录 | P0 |
| **Marketplace 未集成 AiTeam 搜索** | `/marketplace/page.tsx` 只搜索 Agent 和 Team Skill，未调用 `aiteamApi.searchPublishedAiTeams()` | P0 |
| **无结果处理不完整** | 空状态弹窗只提供"创建智能体"和"创建虚拟公司"，缺少"创建 AiTeam"选项 | P1 |
| **缺少推荐机制** | 搜索无结果时，没有推荐类似 AiTeam 或推荐可用 Skill 的功能 | P1 |
| **缺少 AI 自动生成** | 无结果时，没有"AI 自动生成 AiTeam"的选项（可复用 `nvwaLeaderService.generateTeamFromNvwa`） | P2 |

### 1.2 当前搜索链路

```
用户输入 "网站运营团队"
  -> Agent 搜索: GET /api/search/agents?q=网站运营团队  (调用 agentSearchService.searchAgents)
     -> 本地数据库 -> GitHub/Gitee/ModelScope
     -> 返回: Agent[] (单个智能体搜索结果)
  -> Team Skill 搜索: GET /api/team-skills?query=网站运营团队
     -> 返回: TeamSkill[] (虚拟公司模板)
  （缺）-> AiTeam 搜索: 不存在! ❌
```

### 1.3 现有可复用资产

| 模块 | 路径 | 用途 |
|------|------|------|
| `searchPublishedAiTeams` 控制器 | `aiteam.controller.ts#L546` | 已实现但未挂载路由 |
| `aiteamService.searchPublishedAiTeams` 服务 | `aiteam.service.ts#L410` | 基于 ILIKE 的模糊搜索 |
| `aiteamApi.searchPublishedAiTeams` 前端 API | `lib/api/aiteams.ts#L168` | 前端 API 调用已定义 |
| `nvwaLeaderService.generateTeamFromNvwa` | `nvwa-leader.service.ts` | 根据自然语言生成完整团队配置 |
| `POST /api/nvwa/generate-team` | `nvwa-leader.routes.ts#L7` | 团队生成 API 端点 |
| `recommendSkills` 推荐搜索 | `search.controller.ts#L65` | 无结果时推荐相关 Skill |
| 虚拟公司创建弹窗 | `virtual-company-chat-modal.tsx` | 对话式团队创建流程（可复用思路） |

## 2. 功能需求

### 2.1 修复 AiTeam 搜索链路 (P0)

#### 2.1.1 注册 `/aiteams/search` 路由

**后端文件**: `packages/nvwax-server/src/routes/aiteam.routes.ts`

- 将 `searchPublishedAiTeams` 导入路由文件
- 在 `userAuthMiddleware` 之前注册 `GET /search` 公开路由
- 允许未登录用户搜索公开的 AiTeam

**路由设计**:
```
GET /api/aiteams/search?q=xxx&category=xxx&tags=xxx&page=1&limit=20
- q: 搜索关键词（模糊匹配 name 和 description）
- category: 按分类筛选
- tags: 按标签筛选（逗号分隔）
- page/limit: 分页参数
- 无需认证
```

#### 2.1.2 Marketplace 集成 AiTeam 搜索

**前端文件**: `packages/nvwax-web/app/marketplace/page.tsx`

在现有搜索中增加 AiTeam 查询：

```typescript
// 新增：搜索已发布的 AiTeam
const { data: aiteamsData, isLoading: loadingAiteams } = useQuery({
  queryKey: ['marketplace-aiteams', debouncedSearch],
  queryFn: () => {
    if (debouncedSearch) {
      return aiteamApi.searchPublishedAiTeams({ q: debouncedSearch, limit: 30 });
    }
    // 无搜索词时不查询，或查询默认热门 AiTeam
    return aiteamApi.searchPublishedAiTeams({ limit: 6 });
  },
  enabled: selectedCategory === 'all' // 或新增 AiTeam 分类
});
```

**搜索整合**：当 `selectedCategory === 'all'` 时，并行发起三路搜索：
- Agent 搜索 (已有)
- Team Skill 搜索 (已有)
- AiTeam 搜索 (新增)

#### 2.1.3 AiTeam 搜索结果展示

在 Marketplace 页面新增 AiTeam 结果区域（位于 Agent 区域之后，虚拟公司区域之前）：

**展示内容**：如果 AiTeam 搜索结果 > 0，则渲染 AiTeam 卡片网格

**AiTeam 卡片**：
- 标题：AiTeam 名称
- 描述：截断两行
- 标签：tags 标签
- 元信息：成员数量、评分、下载次数
- 创建者：userId -> 展示用户名
- 操作按钮："查看详情" -> 跳转 AiTeam 详情页（需要新建页面，或复用现有）
- Badge："AI 团队"

### 2.2 无结果智能推荐 (P1)

#### 2.2.1 推荐机制流程

当搜索无结果时（Agent 0 条 + AiTeam 0 条 + Team Skill 0 条）：

```
步骤 1: 后端推荐相似的 AiTeam
  -> GET /api/aiteams/recommend?q=网站运营团队&limit=5
  -> 基于 tags 和 category 语义匹配
  -> 返回相似的 AiTeam 列表

步骤 2: 前端调用 Skill 推荐
  -> GET /api/search/recommend-skills?q=网站运营团队&limit=5
  -> 返回可用的 Skill 推荐列表

步骤 3: 展示推荐结果 + 创建引导
  -> 优先展示相似的 AiTeam 推荐
  -> 其次展示可用的 Skill 推荐
  -> 底部展示创建引导按钮
```

#### 2.2.2 推荐 API

**后端新增**: `aiteam.controller.ts` + `aiteam.service.ts`

```
GET /api/aiteams/recommend?q=xxx&limit=5
```

推荐逻辑：
1. 解析查询关键词（分词或提取标签）
2. 在 `aiteams` 表中查找相同 category 下的其他 AiTeam
3. 查找 tags 有重叠的其他 AiTeam
4. 按匹配度排序，取 top N

```
POST /api/aiteams/generate-from-query
Body: { query: "网站运营团队" }
```

自动生成逻辑：
1. 接收用户输入的需求描述
2. 调用 `nvwaLeaderService.generateTeamFromNvwa({ description: query })` 生成团队配置
3. 返回生成的 AiTeam 结构供用户预览

#### 2.2.3 前端推荐展示

在空状态区域增加推荐展示：

```tsx
// 推荐区域（位于"未找到匹配结果"文字下方）
{recommendedAiteams.length > 0 && (
  <div className="mb-6">
    <h3>推荐类似的 AiTeam</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {recommendedAiteams.map(aiteam => (
        <AiTeamCard key={aiteam.id} aiteam={aiteam} />
      ))}
    </div>
  </div>
)}

{recommendedSkills.length > 0 && (
  <div className="mb-6">
    <h3>可用 Skill 推荐</h3>
    <div>...</div>
  </div>
)}
```

### 2.3 创建引导弹窗增强 (P1)

#### 2.3.1 弹窗选项

将现有空状态弹窗升级，包含四项创建入口：

| 操作 | 图标 | 说明 | 跳转 |
|------|------|------|------|
| AI 自动生成 | ⚡ | 输入"网站运营团队"，AI 自动编排角色、工作流，预览后一键保存 | 弹窗内预览 + 确认创建 |
| 创建 AiTeam | 🏢 | 创建可发布到市场的 AI 团队，包含成员和工作流 | `/projects` |
| 创建智能体 | 🤖 | 使用 AI 辅助快速构建单个智能体 | `/nvwa` |
| 创建虚拟公司 | 👥 | 构建由多个 AI 角色组成的虚拟公司团队 | `/nvwa` |

#### 2.3.2 AI 自动生成交互流程

```
用户点击 "AI 自动生成" 按钮
  -> 弹窗显示加载状态 "正在为您编排网站运营团队..."
  -> 后端调用 nvwaLeaderService.generateTeamFromNvwa()
  -> 返回生成的团队配置
  -> 前端预览：团队名称、描述、角色列表、工作流、标签
  -> 用户确认
  -> 保存为 AiTeam (draft 状态)
  -> 跳转到 AiTeam 编辑页 / 项目页
```

## 3. 接口汇总

### 3.1 新增/修复接口

| 接口 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/aiteams/search` | GET | 否 | 搜索已发布的 AiTeam（修复已有函数） |
| `/api/aiteams/recommend` | GET | 否 | 推荐相似的 AiTeam（新增） |
| `/api/aiteams/generate-from-query` | POST | 是 | 根据需求描述自动生成 AiTeam（新增） |

### 3.2 数据流图

```
用户输入搜索 -> 防抖 300ms
  |
  +-> GET /api/search/agents?q=xxx         -> agentSearchService (本地+GitHub+国内)
  +-> GET /api/team-skills?query=xxx        -> teamSkillController (数据库)
  +-> GET /api/aiteams/search?q=xxx         -> aiteamService (修复路由后生效)
  |
  +-- 全部无结果?
       |
       +-> GET /api/aiteams/recommend?q=xxx -> 推荐相似 AiTeam
       +-> GET /api/search/recommend-skills  -> 推荐可用 Skill
       |
       +-> 展示推荐 + 创建引导弹窗
            |
            +-> "AI自动生成" -> POST /api/aiteams/generate-from-query -> 预览 -> 保存
            +-> "创建 AiTeam" -> 跳转 /projects
            +-> "创建智能体" -> 跳转 /nvwa
            +-> "创建虚拟公司" -> 跳转 /nvwa
```

## 4. 前端组件结构

```
app/marketplace/page.tsx
  ├── 搜索框（已有）
  ├── 分类筛选器（已有，新增 "AI团队" 分类）
  ├── Agent 搜索结果（已有）
  ├── AiTeam 搜索结果（新增）
  │   └── AiTeamCard 组件（新增）
  ├── Team Skill 搜索结果（已有）
  └── 空状态区域（增强）
      ├── 推荐列表（新增）
      │   ├── 推荐 AiTeam 列表
      │   └── 推荐 Skill 列表
      └── 创建引导弹窗（增强）
          ├── AI 自动生成入口（新增）
          ├── 创建 AiTeam 入口（新增）
          ├── 创建智能体（已有）
          └── 创建虚拟公司（已有）
```

## 5. 非功能需求

1. **搜索性能**：三路并行搜索，任意一路失败不影响其他结果
2. **认证兼容**：市场搜索允许匿名访问，自动生成和保存需要登录
3. **响应式**：推荐列表和创建弹窗适配移动端
4. **错误处理**：推荐接口失败不阻塞页面展示基础空状态
