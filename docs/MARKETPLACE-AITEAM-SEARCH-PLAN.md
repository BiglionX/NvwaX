# Marketplace AiTeam 智能搜索 - 开发计划

## 概述

本计划基于现有代码复用，实现 AiTeam 搜索集成、智能推荐和创建引导功能。分为 3 个阶段共 7 个任务，估计工时合计约 5-7 天。

---

## 阶段 1：修复 AiTeam 搜索链路 (P0) — 预估 2-3 天

### 任务 1.1：修复 AiTeam 路由 — 注册搜索路由

**文件**: `packages/nvwax-server/src/routes/aiteam.routes.ts`

**改动内容**：
1. 导入 `searchPublishedAiTeams` 控制器
2. 将 `userAuthMiddleware` 改为选择性应用，而非全局应用
3. 在中间件之前注册 `GET /search` 公开路由

**关键代码**（改动指引）：

```typescript
// 现有：全局应用中间件
// router.use(userAuthMiddleware);

// 改为：选择性应用
// 公开路由（无需认证）
router.get('/search', searchPublishedAiTeams);

// 需要认证的路由
router.use(userAuthMiddleware);
router.post('/', createAiTeam);
router.get('/', getUserAiTeams);
// ... 其余 CRUD 路由不变
```

**验证方式**：
- 启动后端服务后，访问 `GET /api/aiteams/search?q=test` 应返回 `{ success: true, data: {...} }`
- 无需 token 即可访问

---

### 任务 1.2：Marketplace 页面集成 AiTeam 搜索

**文件**: `packages/nvwax-web/app/marketplace/page.tsx`
**依赖**: 任务 1.1 完成后端路由

**改动内容**：
1. 引入 `aiteamApi` 和 `AiTeam` 类型
2. 新增 `useQuery` 调用 `aiteamApi.searchPublishedAiTeams()`
3. 在 `selectedCategory` 中增加 `'aiteams'` 分类（可选）
4. 修改 `isLoading` 加入 `loadingAiteams`

**关键代码**（改动指引）：

```typescript
// 新增 import
import { aiteamApi, AiTeam } from '@/lib/api/aiteams';

// 新增类型
type Category = 'all' | 'agents' | 'aiteams' | 'virtual-company';

// 新增查询
const { data: aiteamsData, isLoading: loadingAiteams } = useQuery({
  queryKey: ['marketplace-aiteams', selectedCategory, debouncedSearch],
  queryFn: () => {
    if (debouncedSearch) {
      return aiteamApi.searchPublishedAiTeams({ q: debouncedSearch, limit: 30 });
    }
    return aiteamApi.searchPublishedAiTeams({ limit: 6 });
  },
  enabled: selectedCategory === 'all' || selectedCategory === 'aiteams'
});
```

---

### 任务 1.3：AiTeam 搜索结果卡片展示

**文件**: `packages/nvwax-web/app/marketplace/page.tsx`

**改动内容**：
1. 在 Agent 结果区和 Team Skill 结果区之间，新增 AiTeam 结果区
2. 创建 AiTeam 卡片渲染逻辑（复用 Agent 卡片的样式风格）
3. 显示成员数量、评分、标签等元信息

**卡片模板**（样式指引）：

```tsx
// AiTeam 搜索结果区域
{(selectedCategory === 'all' || selectedCategory === 'aiteams') && aiteamsData?.data?.aiteams?.length > 0 && (
  <>
    <h2>AI 团队 ({aiteamsData.data.aiteams.length} 个)</h2>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {aiteamsData.data.aiteams.map((aiteam: AiTeam) => (
        <Card key={aiteam.id}>
          <h3>{aiteam.name}</h3>
          <p>{aiteam.description}</p>
          <div>
            <Users size={16} /> {aiteam.members?.length || 0} 个成员
            <Star size={16} /> {aiteam.rating?.toFixed(1) || '-'}
          </div>
          <Badge>AI 团队</Badge>
          <Button>查看详情</Button>
        </Card>
      ))}
    </div>
  </>
)}
```

---

## 阶段 2：智能推荐机制 (P1) — 预估 2-3 天

### 任务 2.1：后端推荐 API

**新增文件**: 在 `aiteam.controller.ts` 和 `aiteam.service.ts` 中新增

**`aiteam.service.ts` 新增方法**：

```typescript
/**
 * 推荐相似的 AiTeam
 * 基于分类和标签进行语义匹配
 */
async recommendAiTeams(options: {
  query: string;
  limit?: number;
}): Promise<{ aiteams: AiTeam[]; total: number }> {
  const { query, limit = 5 } = options;
  
  // 1. 先按关键词搜索已发布的 AiTeam（与 searchPublishedAiTeams 相同逻辑）
  // 2. 如果结果不足 limit，基于 tags/category 扩展搜索
  // 3. 去重后按匹配度排序
  // 4. 返回结果
}
```

**`aiteam.controller.ts` 新增方法**：

```typescript
export const recommendAiTeams = async (req: Request, res: Response) => {
  const { q, limit = 5 } = req.query;
  const result = await aiteamService.recommendAiTeams({
    query: q as string,
    limit: parseInt(limit as string)
  });
  res.json({ success: true, data: result });
};
```

**路由注册**：在 `aiteam.routes.ts` 中注册（需在中间件之前，公开访问）

---

### 任务 2.2：前端集成推荐

**文件**: `packages/nvwax-web/app/marketplace/page.tsx`

**改动内容**：
1. 在空状态区域增加推荐展示
2. 搜索无结果时，调用推荐 API：
   - `POST /api/aiteams/recommend?q=xxx` — 推荐 AiTeam
   - `GET /api/search/recommend-skills?q=xxx` — 推荐 Skill（已有 API）
3. 推荐区域渲染在空状态卡片内

**推荐展示区域**：

```tsx
{/* 推荐区域 */}
{recommendedAiteams.length > 0 && (
  <div className="mb-6">
    <h3 className="text-lg font-semibold">推荐类似的 AI 团队</h3>
    <div className="grid md:grid-cols-3 gap-4">
      {recommendedAiteams.map(aiteam => (
        <AiTeamCard aiteam={aiteam} />
      ))}
    </div>
  </div>
)}
{recommendedSkills.length > 0 && (
  <div className="mb-6">
    <h3 className="text-lg font-semibold">推荐可用的 Skill</h3>
    {recommendedSkills.map(skill => (
      <div>{skill.name} - {skill.description}</div>
    ))}
  </div>
)}
```

---

## 阶段 3：创建引导弹窗增强 (P1-P2) — 预估 1-2 天

### 任务 3.1：升级创建引导弹窗

**文件**: `packages/nvwax-web/app/marketplace/page.tsx`

**改动内容**：
1. 升级现有 `Modal` 组件，增加"创建 AiTeam"选项
2. 增加"AI 自动生成 AiTeam"入口
3. 增加生成预览 + 确认保存流程

**弹窗结构指引**：

```tsx
<Modal open={showCreateModal} onClose={...} title={`创建 "${debouncedSearch}"`}>
  <div className="space-y-4">
    {/* AI 自动生成（新增-优先展示） */}
    <Card variant="clickable" onClick={handleAutoGenerate}>
      <Sparkles /> AI 自动生成 "{debouncedSearch}" AiTeam
      <p>输入需求，AI 自动编排角色和工作流，预览后一键保存</p>
    </Card>
    
    {/* 创建 AiTeam（新增） */}
    <Link href="/projects">
      <Card variant="clickable">
        <Users /> 创建 AiTeam
        <p>创建可发布到市场的 AI 团队，包含成员和工作流</p>
      </Card>
    </Link>
    
    {/* 创建智能体（已有） */}
    {/* 创建虚拟公司（已有） */}
  </div>
</Modal>
```

---

### 任务 3.2：AI 自动生成 AiTeam 功能

**文件**:
- `packages/nvwax-server/src/controllers/aiteam.controller.ts` — 新增 `generateAiTeamFromQuery`
- `packages/nvwax-server/src/services/aiteam.service.ts` — 新增 `generateAiTeamFromQuery`
- `packages/nvwax-web/app/marketplace/page.tsx` — 前端调用和预览

**后端生成逻辑**：复用 `nvwaLeaderService.generateTeamFromNvwa()`

```typescript
async generateAiTeamFromQuery(query: string, userId: string): Promise<AiTeamPreview> {
  // Step 1: 调用 Leader Service 生成团队配置
  const teamConfig = await nvwaLeaderService.generateTeamFromNvwa({
    description: query,
    dataSources: [],
    outputs: [],
    implementation: '',
    skills: []
  });
  
  // Step 2: 将配置映射为 AiTeam 结构
  return {
    name: teamConfig.teamName,
    description: teamConfig.teamDescription,
    category: teamConfig.category,
    tags: this.extractTags(teamConfig),
    members: teamConfig.roles?.map(role => ({
      role: role.roleName,
      responsibilities: role.description,
      agentId: null // 用户后续可绑定实际的 Agent
    })) || [],
    workflow: teamConfig.workflow || { steps: [] }
  };
}
```

**前端交互流程**：

```
用户点击 "AI 自动生成"
  -> 显示加载状态 (loading spinner)
  -> POST /api/aiteams/generate-from-query { query: "网站运营团队" }
  -> 后端调用 nvwaLeaderService.generateTeamFromNvwa()
  -> 返回团队配置预览
  -> 弹窗切换为预览模式
     - 团队名称: 网站运营团队
     - 描述: 专业的网站运营团队...
     - 角色: SEO专员、内容编辑、数据分析师...
     - 工作流步骤: 5 个
  -> 用户确认
  -> 保存为 AiTeam (draft)
  -> 跳转到项目页或显示成功提示
```

---

## 代码复用清单

| 要实现的 | 复用何处 | 复用方式 |
|---------|---------|---------|
| `searchPublishedAiTeams` 路由 | `aiteam.controller.ts#L546` 已有实现 | 直接导入使用 |
| AiTeam 市场搜索逻辑 | `aiteam.service.ts#L410` 已有实现 | 直接调用 |
| 前端 `searchPublishedAiTeams` API | `lib/api/aiteams.ts#L168` 已有定义 | 直接调用 |
| AI 自动生成团队 | `nvwaLeaderService.generateTeamFromNvwa()` | 复用生成逻辑 |
| Skill 推荐 | `searchController.recommendSkills` 已有 API | 直接调用 |
| 弹窗 UI 风格 | Agent 卡片和虚拟公司弹窗的样式 | 复用 Card/Button 组件 |

---

## 任务优先级与依赖关系

```
任务 1.1 [P0] ← 修复路由
  |
  v
任务 1.2 [P0] ← 集成搜索（依赖 1.1）
  |
  v
任务 1.3 [P0] ← 结果展示（依赖 1.2）
  |
  v
任务 2.1 [P1] ← 推荐 API（独立）
  |
  v
任务 2.2 [P1] ← 推荐展示（依赖 2.1）
  |
  v
任务 3.1 [P1] ← 弹窗升级（独立）
  |
  v
任务 3.2 [P2] ← AI 自动生成（依赖 3.1）
```

---

## 验证清单

| 阶段 | 验证项 | 预期结果 |
|------|-------|---------|
| 1.1 | `GET /api/aiteams/search?q=运营` | 返回已发布且匹配的 AiTeam 列表 |
| 1.1 | `GET /api/aiteams/search` 不带 token | 正常返回（无需登录） |
| 1.2 | Marketplace 输入"运营" | 同时搜索 Agent + AiTeam + Team Skill |
| 1.3 | AiTeam 结果展示 | 正确渲染 AiTeam 卡片，显示成员数/评分 |
| 2.1 | `GET /api/aiteams/recommend?q=运营` | 返回相似类目的 AiTeam 推荐 |
| 2.2 | 搜索无结果时展示推荐 | 显示推荐 AiTeam 和推荐 Skill |
| 3.1 | 弹窗含"创建 AiTeam"选项 | 点击跳转到 `/projects` |
| 3.2 | "AI 自动生成"按钮 | 生成预览 → 确认 → 保存成功 |

---

## 回滚方案

- 阶段 1 改动较小（仅路由和前端查询），可快速回滚
- 阶段 2 新增的推荐 API 不影响现有功能
- 阶段 3 弹窗升级不影响搜索核心逻辑
- 各阶段改动互不阻塞，可独立部署
