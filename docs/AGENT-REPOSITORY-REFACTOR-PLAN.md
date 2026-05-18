# NvwaX Agent 仓库重构开发计划

> **项目定位**：NvwaX 是智能体（Agent）与智能体团队（AiTeam）的**制造工厂**，负责创建、配置、发布智能体资产，但不提供运行环境。用户创建的 Agent 和 AiTeam 可发布至 NvwaX 市场，或下载/集成到 ProClaw 本地桌面端使用。

---

## 📋 核心重构目标

### 当前问题
1. ❌ "我的项目"命名模糊，与传统项目管理混淆
2. ❌ "我的AiTeam"功能重叠，包含项目列表导致重复
3. ❌ 用户不清楚两个页面的不同使用场景
4. ❌ 缺少明确的 ProClaw 集成路径

### 重构目标
1. ✅ **"我的项目" → "我的 Agent 仓库"**：专注 Agent/AiTeam 资产管理
2. ✅ **"我的AiTeam" → "虚拟公司"**：AI 驱动的自动化创作中心
3. ✅ 明确两层架构：NvwaX（制造）vs ProClaw（运行）
4. ✅ 完善导出/集成流程，无缝对接 ProClaw

---

## 🎯 产品架构设计

### 新的导航结构

```
用户中心
├── 个人信息 (/profile)
├── 我的 Agent 仓库 (/agent-repository) ⭐ 重命名
│   ├── Agent 列表 Tab
│   └── AiTeam 列表 Tab
├── 我的悬赏 (/my-bounties)
├── 虚拟公司 (/virtual-company) ⭐ 重命名
│   ├── CEO 对话
│   ├── 快速生成
│   └── 灵感市场
└── 账号设置 (/settings)
```

---

## 🗓️ 开发时间线（8周）

### Phase 1: 数据库与 API 层重构（第1-2周）

**目标**：调整数据结构，支持 Agent/AiTeam 独立管理

#### 任务清单

- [ ] **数据库 Schema 调整**
  
  - [ ] 分析现有 `agents`、`aiteams`、`projects` 表结构
  - [ ] 设计新的关系模型：
    ```sql
    -- Agent 表（独立存在）
    agents (
      id UUID PRIMARY KEY,
      name VARCHAR(255),
      description TEXT,
      type VARCHAR(50),  -- 'single' | 'team_member'
      config JSONB,       -- Agent 配置（角色、提示词、能力等）
      version VARCHAR(20),
      status VARCHAR(20), -- 'draft' | 'published' | 'private'
      owner_id UUID REFERENCES users(id),
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
    
    -- AiTeam 表（组合多个 Agent）
    aiteams (
      id UUID PRIMARY KEY,
      name VARCHAR(255),
      description TEXT,
      members JSONB,      -- [{agent_id, role, responsibilities}]
      workflow JSONB,     -- 协作流程定义
      status VARCHAR(20), -- 'draft' | 'published' | 'private'
      owner_id UUID REFERENCES users(id),
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
    
    -- 可选：保留 projects 作为工作空间/集合
    projects (
      id UUID PRIMARY KEY,
      name VARCHAR(255),
      description TEXT,
      owner_id UUID REFERENCES users(id),
      created_at TIMESTAMP
    )
    
    -- 关联表（Project 可以包含多个 Agent/AiTeam）
    project_agents (
      project_id UUID REFERENCES projects(id),
      agent_id UUID REFERENCES agents(id),
      PRIMARY KEY (project_id, agent_id)
    )
    
    project_aiteams (
      project_id UUID REFERENCES projects(id),
      aiteam_id UUID REFERENCES aiteams(id),
      PRIMARY KEY (project_id, aiteam_id)
    )
    ```
  
  - [ ] 创建迁移脚本 `migrations/002_refactor_agent_repository.sql`
  - [ ] 数据迁移策略：
    * 现有 `projects` → 转换为工作空间概念
    * 现有 `agents` → 保持独立
    * 新增 `aiteams` 表

- [ ] **API 端点设计与实现**
  
  - [ ] **Agent 管理 API**
    ```typescript
    GET    /api/agents              // 获取用户的 Agent 列表
    POST   /api/agents              // 创建新 Agent
    GET    /api/agents/:id          // 获取 Agent 详情
    PUT    /api/agents/:id          // 更新 Agent
    DELETE /api/agents/:id          // 删除 Agent
    POST   /api/agents/:id/publish  // 发布到市场
    POST   /api/agents/:id/export   // 导出为 JSON/YAML
    ```
  
  - [ ] **AiTeam 管理 API**
    ```typescript
    GET    /api/aiteams             // 获取用户的 AiTeam 列表
    POST   /api/aiteams             // 创建新 AiTeam
    GET    /api/aiteams/:id         // 获取 AiTeam 详情
    PUT    /api/aiteams/:id         // 更新 AiTeam
    DELETE /api/aiteams/:id         // 删除 AiTeam
    POST   /api/aiteams/:id/publish // 发布到市场
    POST   /api/aiteams/:id/export  // 导出为 JSON/YAML
    ```
  
  - [ ] **ProClaw 集成 API**
    ```typescript
    POST   /api/export/proclaw      // 生成 ProClaw 专用格式
    GET    /api/integration-guide   // 获取集成指南
    ```

- [ ] **后端服务实现**
  - [ ] 创建 `AgentService`（CRUD + 业务逻辑）
  - [ ] 创建 `AiTeamService`（CRUD + 成员管理）
  - [ ] 创建 `ExportService`（导出逻辑）
    * JSON 格式（通用）
    * YAML 格式（人类可读）
    * ProClaw 专用格式（包含运行时配置）
  - [ ] 添加权限控制（只能操作自己的 Agent/AiTeam）
  - [ ] 编写单元测试（Jest + Supertest）

**交付物**：
- ✅ 新的数据库 Schema
- ✅ 完整的 API 端点
- ✅ 后端服务层实现
- ✅ API 测试用例

---

### Phase 2: 前端页面重构 - "我的 Agent 仓库"（第3-4周）

**目标**：重新设计并实现 Agent 资产管理界面

#### 任务清单

- [ ] **路由与布局调整**
  
  - [ ] 重命名路由：`/projects` → `/agent-repository`
  - [ ] 更新左侧导航菜单文案和图标
  - [ ] 添加面包屑导航

- [ ] **页面结构设计**
  
  ```tsx
  // app/(user-center)/agent-repository/page.tsx
  <div className="space-y-6">
    {/* 顶部操作栏 */}
    <div className="flex justify-between items-center">
      <h1>我的 Agent 仓库</h1>
      <div className="flex gap-3">
        <button>创建 Agent</button>
        <button>创建 AiTeam</button>
      </div>
    </div>
    
    {/* Tab 切换 */}
    <Tabs defaultValue="agents">
      <TabList>
        <Tab value="agents">Agent 列表</Tab>
        <Tab value="aiteams">AiTeam 列表</Tab>
      </TabList>
      
      <TabContent value="agents">
        <AgentListView />
      </TabContent>
      
      <TabContent value="aiteams">
        <AiTeamListView />
      </TabContent>
    </Tabs>
  </div>
  ```

- [ ] **Agent 列表组件** (`AgentListView`)
  
  - [ ] 网格/列表视图切换
  - [ ] 筛选器：
    * 类型（单个 Agent / 团队成员）
    * 状态（草稿 / 已发布 / 私有）
    * 创建时间
  - [ ] 搜索框（按名称、描述）
  - [ ] 排序选项（最新、最旧、名称）
  - [ ] Agent 卡片设计：
    ```tsx
    interface AgentCard {
      name: string;
      description: string;
      type: 'single' | 'team_member';
      version: string;
      status: 'draft' | 'published' | 'private';
      createdAt: Date;
      updatedAt: Date;
      actions: ['编辑', '发布', '导出', '删除'];
    }
    ```
  - [ ] 批量操作（多选删除、批量发布）

- [ ] **AiTeam 列表组件** (`AiTeamListView`)
  
  - [ ] 类似 Agent 列表的布局
  - [ ] AiTeam 卡片设计：
    ```tsx
    interface AiTeamCard {
      name: string;
      description: string;
      memberCount: number;
      members: Array<{name, role}>;
      status: 'draft' | 'published' | 'private';
      createdAt: Date;
      actions: ['编辑', '发布', '导出', '删除'];
    }
    ```
  - [ ] 可视化展示团队成员角色分布

- [ ] **创建/编辑 Agent 表单**
  
  - [ ] 复用现有的 agent-factory Skill 对话式引导
  - [ ] 或提供传统表单模式（高级用户）
  - [ ] 字段：
    * 名称（必填）
    * 描述
    * 角色定义
    * 能力配置
    * 提示词模板
    * 数据源配置
  - [ ] 实时预览面板

- [ ] **创建/编辑 AiTeam 表单**
  
  - [ ] 选择成员 Agent（从已有 Agent 中选择）
  - [ ] 定义角色分工
  - [ ] 配置协作流程（简单的工作流编辑器）
  - [ ] 设置触发条件

- [ ] **导出功能实现**
  
  - [ ] 导出对话框：
    ```tsx
    <ExportModal
      item={agentOrAiteam}
      formats={['json', 'yaml', 'proclaw']}
      onExport={(format) => handleExport(format)}
    />
    ```
  - [ ] JSON 格式示例：
    ```json
    {
      "type": "agent",
      "name": "客服助手",
      "version": "1.0.0",
      "config": {...},
      "skills": [...],
      "metadata": {...}
    }
    ```
  - [ ] ProClaw 格式示例：
    ```json
    {
      "proclaw_version": "1.0",
      "agent": {...},
      "runtime_config": {
        "api_keys": ["OPENAI_API_KEY"],
        "environment": {...}
      },
      "integration_guide": "..."
    }
    ```

- [ ] **统计卡片**
  
  - [ ] Agent 总数
  - [ ] 已发布数量
  - [ ] AiTeam 总数
  - [ ] 下载次数统计

**交付物**：
- ✅ 完整的 Agent 仓库页面
- ✅ Agent/AiTeam 列表视图
- ✅ 创建/编辑表单
- ✅ 导出功能
- ✅ 响应式设计

---

### Phase 3: 前端页面重构 - "虚拟公司"（第5周）

**目标**：打造 AI 驱动的自动化创作中心

#### 任务清单

- [ ] **路由与布局调整**
  
  - [ ] 重命名路由：`/my-aiteam` → `/virtual-company` (已整合到Agent仓库)
  - [ ] 更新左侧导航菜单
  - [ ] 页面标题改为"虚拟公司"或"CEO 工作室"

- [ ] **页面结构设计**
  
  ```tsx
  // app/(user-center)/virtual-company/page.tsx
  <div className="space-y-6">
    {/* 快速操作区 */}
    <QuickActionsSection />
    
    {/* CEO 对话区（核心功能） */}
    <CEOChatSection />
    
    {/* 最近生成的项目 */}
    <RecentCreationsSection />
    
    {/* 灵感市场 */}
    <InspirationMarketSection />
  </div>
  ```

- [ ] **快速操作区** (`QuickActionsSection`)
  
  - [ ] 保留现有的两个按钮：
    * "与 CEO 对话"（主要入口）
    * "新建项目"（快速创建）
  - [ ] 优化视觉设计，突出 CEO 对话

- [ ] **CEO 对话区** (`CEOChatSection`) ⭐ 核心功能
  
  - [ ] 聊天界面组件：
    ```tsx
    <ChatInterface
      messages={messages}
      onSendMessage={handleSendMessage}
      suggestions={[
        "帮我创建一个电商客服团队",
        "我需要一个数据分析助手",
        "创建一个内容营销团队"
      ]}
    />
    ```
  - [ ] 对话流程：
    1. 用户描述需求："我需要做一个电商数据分析系统"
    2. CEO Agent 追问澄清：
       * "需要分析哪些数据？"
       * "输出什么格式的报告？"
       * "需要哪些角色参与？"
    3. CEO Agent 生成方案：
       * 推荐 Agent 组合
       * 定义协作流程
       * 预估完成时间
    4. 用户确认并生成
  - [ ] 集成现有的 VirtualCompanyChatModal 组件
  - [ ] 保存对话历史

- [ ] **最近生成区** (`RecentCreationsSection`)
  
  - [ ] 显示最近通过 CEO 对话生成的 Agent/AiTeam
  - [ ] 快速操作：查看、编辑、导出
  - [ ] 空状态引导

- [ ] **灵感市场** (`InspirationMarketSection`)
  
  - [ ] 展示热门的 Team Skills 模板
  - [ ] 分类浏览：
    * 客服团队
    * 开发团队
    * 营销团队
    * 数据分析团队
  - [ ] "一键 Fork"功能（复制到自己的仓库）
  - [ ] 链接到 `/team-skills` 市场页面

**交付物**：
- ✅ 虚拟公司页面
- ✅ CEO 对话功能
- ✅ 灵感市场
- ✅ 流畅的用户体验

---

### Phase 4: ProClaw 集成增强（第6周）

**目标**：完善与 ProClaw 的集成流程

#### 任务清单

- [ ] **导出格式标准化**
  
  - [ ] 定义 ProClaw 集成规范文档
  - [ ] 实现导出转换器：
    ```typescript
    interface ProClawExport {
      version: string;
      type: 'agent' | 'aiteam';
      metadata: {
        name: string;
        version: string;
        author: string;
      };
      config: {
        runtime: {...};
        dependencies: [...];
        environment_variables: [...];
      };
      assets: {
        prompts: [...];
        skills: [...];
        workflows: [...];
      };
      integration: {
        import_instructions: string;
        example_code: string;
      };
    }
    ```

- [ ] **一键导出到 ProClaw**
  
  - [ ] 检测本地是否安装 ProClaw
  - [ ] 如果已安装：直接调用 ProClaw API 导入
  - [ ] 如果未安装：提供下载链接和安装指南
  - [ ] 实现 deep link：`proclaw://import?url=...`

- [ ] **集成指南页面**
  
  - [ ] 创建 `/docs/integration/proclaw` 页面
  - [ ] 内容包括：
    * ProClaw 简介
    * 安装步骤
    * 导入 Agent/AiTeam 教程
    * 常见问题 FAQ
    * 视频教程

- [ ] **示例项目**
  
  - [ ] 创建 3-5 个示例 Agent/AiTeam
  - [ ] 提供完整的导出文件
  - [ ] 在 ProClaw 中运行的截图/视频

**交付物**：
- ✅ ProClaw 导出格式
- ✅ 一键导入功能
- ✅ 集成指南文档
- ✅ 示例项目

---

### Phase 5: 测试与优化（第7周）

**目标**：确保系统稳定性和用户体验

#### 任务清单

- [ ] **单元测试**
  
  - [ ] 后端 API 测试（Jest + Supertest）
    * Agent CRUD 操作
    * AiTeam CRUD 操作
    * 导出功能
  - [ ] 前端组件测试（React Testing Library）
    * AgentListView
    * AiTeamListView
    * ExportModal
    * ChatInterface

- [ ] **端到端测试**
  
  - [ ] 完整流程测试（Playwright）：
    ```
    1. 创建 Agent
    2. 编辑 Agent
    3. 导出为 ProClaw 格式
    4. 创建 AiTeam
    5. 通过 CEO 对话生成 AiTeam
    ```

- [ ] **性能优化**
  
  - [ ] 数据库查询优化（添加索引）
  - [ ] API 响应时间优化（目标：<300ms）
  - [ ] 前端加载优化（代码分割、懒加载）

- [ ] **用户体验优化**
  
  - [ ] 优化引导文案
  - [ ] 改进错误提示
  - [ ] 添加加载动画
  - [ ] 移动端适配测试

**交付物**：
- ✅ 测试覆盖率报告（目标：>80%）
- ✅ 性能基准测试
- ✅ Bug 修复记录

---

### Phase 6: 文档与部署（第8周）

**目标**：准备生产环境上线

#### 任务清单

- [ ] **用户文档**
  
  - [ ] 《如何使用 Agent 仓库》指南
  - [ ] 《如何使用虚拟公司》指南
  - [ ] 《如何导出到 ProClaw》教程
  - [ ] 录制演示视频

- [ ] **开发者文档**
  
  - [ ] API 文档（Swagger/OpenAPI）
  - [ ] 《ProClaw 集成规范》
  - [ ] 《自定义导出格式》指南

- [ ] **部署准备**
  
  - [ ] 数据库迁移脚本
  - [ ] 环境变量配置
  - [ ] CI/CD 流水线更新
  - [ ] 监控和日志配置

- [ ] **上线发布**
  
  - [ ] 预生产环境测试
  - [ ] 灰度发布
  - [ ] 全量发布
  - [ ] 用户通知（邮件、站内信）

**交付物**：
- ✅ 完整的用户和开发者文档
- ✅ 生产环境部署配置
- ✅ 上线报告

---

## 📊 里程碑总结

| 阶段 | 时间 | 核心交付物 | 成功标准 |
|------|------|-----------|---------|
| **Phase 1** | 第1-2周 | 数据库重构、API 实现 | 所有 API 端点可用并通过测试 |
| **Phase 2** | 第3-4周 | Agent 仓库页面 | 用户能流畅管理 Agent/AiTeam |
| **Phase 3** | 第5周 | 虚拟公司页面 | CEO 对话功能正常工作 |
| **Phase 4** | 第6周 | ProClaw 集成 | 能成功导出并导入 ProClaw |
| **Phase 5** | 第7周 | 测试和优化 | 测试覆盖率>80%，性能达标 |
| **Phase 6** | 第8周 | 文档和部署 | 成功上线生产环境 |

---

## 🎯 MVP 范围（最小可行产品）

如果时间紧张，可以优先实现以下核心功能（Phase 1-3，约5周）：

### ✅ MVP 包含
1. 数据库 Schema 调整
2. Agent/AiTeam 基本 CRUD API
3. Agent 仓库列表页面（仅列表，无高级筛选）
4. 简单的导出功能（JSON 格式）
5. 虚拟公司页面基础版（CEO 对话）

### ❌ MVP 不包含
1. ProClaw 深度集成（Phase 4）
2. 高级筛选和搜索（Phase 2 高级功能）
3. 批量操作（Phase 2 高级功能）
4. 灵感市场（Phase 3 高级功能）
5. 完整的测试覆盖（Phase 5）

---

## 🔧 技术栈总览

### 前端
- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: TanStack Query + Zustand
- **UI 组件**: Lucide React Icons, Radix UI
- **测试**: Jest + React Testing Library + Playwright

### 后端
- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: PostgreSQL 17
- **ORM**: pg (原生 SQL)
- **测试**: Jest + Supertest

### DevOps
- **容器化**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **部署**: Vercel (前端) + Railway/Render (后端)

---

## 🚀 快速开始（开发环境）

```bash
# 1. 克隆仓库
git clone https://github.com/BigLionX/NvwaX.git
cd NvwaX

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp packages/nvwax-server/.env.example packages/nvwax-server/.env
cp packages/nvwax-web/.env.local.example packages/nvwax-web/.env.local

# 4. 执行数据库迁移
cd packages/nvwax-server
npm run db:migrate

# 5. 启动开发服务器
# 终端 1: 后端
cd packages/nvwax-server
npm run dev

# 终端 2: 前端
cd packages/nvwax-web
npm run dev
```

访问 http://localhost:3000/agent-repository 开始体验！

---

## 📝 风险管理

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 数据迁移复杂度高 | 中 | 高 | 提前备份数据，分步迁移，提供回滚方案 |
| ProClaw API 不稳定 | 低 | 中 | 先实现文件导出，后期再集成 API |
| 用户不适应新命名 | 中 | 低 | 添加过渡期提示，提供清晰的引导 |
| CEO 对话准确率低 | 中 | 中 | 采用固定模板 + AI 生成的混合策略 |
| 性能瓶颈（列表加载慢） | 低 | 高 | 提前设计分页和缓存机制 |

---

## 🎉 成功指标

### 定量指标
- **用户转化率**: 访问 Agent 仓库 → 创建 Agent > 40%
- **平均创建时间**: < 3 分钟
- **导出成功率**: > 95%
- **API 响应时间**: P95 < 300ms
- **系统可用性**: > 99.5%

### 定性指标
- 用户反馈："现在清楚知道该去哪里创建和管理 Agent 了"
- ProClaw 集成：至少有 50 个 Agent 被成功导入
- 社区活跃度：GitHub Stars 增长 30%

---

## 🔄 迭代计划（上线后）

### v1.1（上线后1个月）
- 增加高级筛选和搜索功能
- 优化 CEO 对话体验
- 添加 Agent 版本管理

### v1.2（上线后3个月）
- 实现批量操作
- 添加团队协作功能（共享 Agent）
- 集成更多导出格式（Docker、Kubernetes）

### v2.0（上线后6个月）
- 实现 Agent 市场交易功能
- 开放 API 供第三方集成
- 自学习优化（基于用户行为优化推荐）

---

## 📞 联系方式

- **项目负责人**: BigLionX
- **Email**: 1055603323@qq.com
- **GitHub**: https://github.com/BigLionX/NvwaX

---

**最后更新**: 2026-05-17  
**版本**: 1.0.0  
**状态**: 待审批
