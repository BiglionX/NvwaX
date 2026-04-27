# Nvwa 智能体工厂开发计划

> **项目愿景**：让"nvwa"成为第一个智能体，扮演"智能体之母"的角色，通过对话式需求分析来孵化新的智能体。

---

## 📋 项目概述

### 核心目标

将智能体创建从"技术开发任务"转变为**对话式的产品体验**，实现"小白也能轻松创建专属智能体"的愿景。

### 关键特性

1. **对话式需求分析** - 通过多轮对话引导用户明确需求
2. **智能模板匹配** - 自动搜索和推荐现成的智能体模板
3. **技能缺口分析** - 识别模板缺失的技能并自动补全
4. **悬赏生态系统** - 当技能不存在时，发布悬赏让开发者创建
5. **自动化生成** - 一键生成并部署完整的智能体

### 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端交互层 (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 对话引导 UI   │  │ 模板展示卡片  │  │ 悬赏追踪组件  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────────────────┐
│                  后端服务层 (Express)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 模板搜索服务  │  │ 技能分析服务  │  │ 悬赏管理服务  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 nvwa 元智能体 (Skill)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  agent-factory SKILL.md                          │   │
│  │  ├─ 需求采集工作流                                │   │
│  │  ├─ 模板匹配算法                                  │   │
│  │  ├─ 技能缺口分析                                  │   │
│  │  └─ 悬赏发布逻辑                                  │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  数据与集成层                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │PostgreSQL│ │slot-     │ │bounty-   │ │SkillHub  │  │
│  │数据库     │ │starters  │ │net       │ │API       │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🗓️ 开发时间线（13周）

### Phase 1: 需求分析与架构设计（第1周）

**目标**：完成技术方案调研和系统设计

#### 任务清单

- [ ] **调研开源项目**
  - [ ] slot-starters：研究模板发现机制（GitHub/NPM 采集）
  - [ ] bounty-net：评估悬赏网络架构和代币经济模型
  - [ ] MetaGPT：学习多智能体协作模式
  - [ ] Minion Skills / ModelScope Agent Skills：理解技能定义标准

- [ ] **架构设计**
  - [ ] 确定 nvwa 元智能体的技术栈（LangChain.js vs 自研）
  - [ ] 设计 Skill 目录结构和文件组织
  - [ ] 规划与现有系统的集成点（skillhub-workflow、FastbuildAI）

- [ ] **数据库设计**
  - [ ] 扩展 agents 表：增加模板元数据字段
    ```sql
    ALTER TABLE agents ADD COLUMN skills JSONB;          -- 技能列表
    ALTER TABLE agents ADD COLUMN use_cases TEXT[];      -- 适用场景
    ALTER TABLE agents ADD COLUMN data_sources TEXT[];   -- 数据源
    ALTER TABLE agents ADD COLUMN output_types TEXT[];   -- 输出类型
    ```
  - [ ] 新建 templates 表（可选，如果与 agents 分离）
  - [ ] 新建 skills 表（技能本体库）
    ```sql
    CREATE TABLE skills (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      version VARCHAR(20),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    ```
  - [ ] 新建 bounties 表（悬赏系统）
    ```sql
    CREATE TABLE bounties (
      id UUID PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      required_skills JSONB,
      reward_amount DECIMAL(10, 2),
      status VARCHAR(50),  -- open, claimed, submitted, completed, cancelled
      creator_id UUID REFERENCES users(id),
      claimer_id UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    );
    ```

- [ ] **API 设计规范**
  - [ ] 模板搜索 API：`GET /api/templates/search?q={query}&filters={}`
  - [ ] 技能分析 API：`POST /api/skills/analyze`（对比需求与模板）
  - [ ] 悬赏管理 API：
    - `POST /api/bounties` - 创建悬赏
    - `GET /api/bounties` - 查询悬赏列表
    - `POST /api/bounties/:id/claim` - 领取悬赏
    - `POST /api/bounties/:id/submit` - 提交成果
    - `POST /api/bounties/:id/verify` - 验证并支付

**交付物**：
- 技术调研报告（包含开源项目评估）
- 系统架构图
- 数据库 ER 图
- API 接口文档（OpenAPI/Swagger 格式）

---

### Phase 2: 核心 Skill 开发（第2-3周）

**目标**：实现 nvwa 元智能体的核心逻辑

#### 任务清单

- [ ] **创建 agent-factory Skill 结构**
  ```
  .lingma/skills/agent-factory/
  ├── SKILL.md                    # 主指令文件
  ├── README.md                   # 使用指南
  ├── workflow.ts                 # 工作流定义（TypeScript）
  ├── prompts/
  │   ├── requirement-gathering.md # 需求采集提示词
  │   ├── template-matching.md    # 模板匹配提示词
  │   └── skill-analysis.md       # 技能分析提示词
  └── examples.md                 # 使用示例
  ```

- [ ] **编写 SKILL.md 主指令**
  ```yaml
  name: agent-factory
  description: 通过对话引导用户需求，自动组装或生成新的智能体
  version: 1.0.0
  author: NvwaX Team
  license: MIT
  
  triggers:
    - "创建智能体"
    - "我要一个XXX助手"
    - "帮我做一个XXX机器人"
  
  workflow:
    - step: requirement_gathering
      type: conversation
      questions:
        - "您需要什么样的智能体？请描述它的用途。"
        - "这个智能体需要访问哪些数据？"
        - "您希望它输出什么结果？"
        - "您希望它如何得到这个结果？"
    
    - step: template_search
      action: call_api
      endpoint: /api/templates/search
      parameters:
        query: "{{user_requirement}}"
    
    - step: skill_analysis
      action: analyze_gap
      input:
        template_skills: "{{template.skills}}"
        required_skills: "{{analyze_requirements(user_answers)}}"
    
    - step: bounty_creation
      action: create_bounty
      condition: missing_skills.length > 0
  ```

- [ ] **实现需求采集工作流**
  - 使用 LangChain.js 构建多轮对话链
  - 实现问题模板和动态追问逻辑
  - 保存用户回答到上下文

- [ ] **实现模板匹配算法**
  - 基于关键词的相似度计算（TF-IDF 或 Embedding）
  - 支持多维度过滤（场景、数据源、输出类型）
  - 返回 Top-K 匹配结果

- [ ] **实现技能缺口分析**
  - 解析模板的技能列表
  - 从用户需求中提取所需技能
  - 计算差集：`missing_skills = required - available`
  - 生成自然语言报告："该模板包含客服话术技能，还需补充订单查询技能"

**交付物**：
- 完整的 agent-factory Skill
- 可运行的需求采集对话原型
- 模板匹配和技能分析算法实现

---

### Phase 3: 后端服务扩展（第4-5周）

**目标**：扩展后端 API 支持智能体工厂功能

#### 任务清单

- [ ] **数据库迁移**
  - [ ] 创建迁移脚本 `migrations/001_add_template_metadata.sql`
  - [ ] 执行迁移并验证数据结构
  - [ ] 为现有 Agent 数据补充模板元数据（手工标注或 AI 自动生成）

- [ ] **模板搜索服务**
  - [ ] 创建 `TemplateSearchService`
  - [ ] 实现全文搜索（PostgreSQL tsvector）
  - [ ] 实现多维度过滤（星级、语言、场景等）
  - [ ] 添加缓存层（Redis，可选）
  - [ ] 编写单元测试

- [ ] **技能分析服务**
  - [ ] 创建 `SkillAnalysisService`
  - [ ] 实现需求→技能映射算法
  - [ ] 集成 NLP 库（natural.js 或 compromise）提取关键词
  - [ ] 实现技能相似度计算

- [ ] **悬赏管理服务**
  - [ ] 创建 `BountyService`
  - [ ] 实现 CRUD 操作
  - [ ] 实现状态机（open → claimed → submitted → verified → paid）
  - [ ] 添加权限控制（只有创建者能验证，只有未领取能claim）

- [ ] **集成 slot-starters**
  - [ ] Fork 或安装 slot-starters 包
  - [ ] 配置 GitHub 和 NPM 数据源
  - [ ] 设置定时任务定期采集新模板
  - [ ] 用 AI 分析模板并提取元数据
  - [ ] 存储到本地数据库

- [ ] **API 路由实现**
  - [ ] `/api/templates/search` - 模板搜索控制器
  - [ ] `/api/skills/analyze` - 技能分析控制器
  - [ ] `/api/bounties/*` - 悬赏管理控制器
  - [ ] 添加请求验证和错误处理

**交付物**：
- 扩展后的数据库 schema
- 完整的后端 API 服务
- slot-starters 集成和数据采集管道
- API 测试用例（Postman 集合或 Jest 测试）

---

### Phase 4: 前端交互界面（第6-7周）

**目标**：实现用户友好的对话式创建界面

#### 任务清单

- [ ] **创建智能体入口页面** (`/create-agent`)
  - [ ] 设计页面布局（左侧对话区，右侧信息展示区）
  - [ ] 添加"开始创建"按钮和引导文案
  - [ ] 实现响应式设计（移动端适配）

- [ ] **对话式引导 UI 组件**
  - [ ] 创建 `ChatInterface` 组件
    ```tsx
    interface ChatMessage {
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
    }
    ```
  - [ ] 实现消息气泡样式
  - [ ] 添加打字指示器（typing indicator）
  - [ ] 支持快速回复按钮（quick replies）

- [ ] **模板展示卡片组件**
  - [ ] 创建 `TemplateCard` 组件
    ```tsx
    interface TemplateCardProps {
      name: string;
      description: string;
      skills: string[];
      useCases: string[];
      matchScore: number;  // 匹配度百分比
      onSelect: () => void;
    }
    ```
  - [ ] 显示技能标签（带颜色区分）
  - [ ] 显示匹配度进度条
  - [ ] 点击卡片展开详情

- [ ] **技能缺口可视化组件**
  - [ ] 创建 `SkillGapVisualizer` 组件
  - [ ] 用绿色显示"已包含技能"
  - [ ] 用橙色显示"需补充技能"
  - [ ] 用红色显示"无可用技能（需悬赏）"
  - [ ] 添加图例说明

- [ ] **悬赏进度追踪组件**
  - [ ] 创建 `BountyTracker` 组件
  - [ ] 显示状态时间线：
    ```
    已发布 → 有人领取 → 提交中 → 验证中 → 已完成
    ```
  - [ ] 显示倒计时（如果有截止时间）
  - [ ] 显示当前领取者信息

- [ ] **API 集成**
  - [ ] 创建 `useAgentFactory` hook（TanStack Query）
    ```ts
    const { data: templates, isLoading } = useQuery({
      queryKey: ['templates', searchQuery],
      queryFn: () => searchTemplates(searchQuery)
    });
    ```
  - [ ] 实现乐观更新（optimistic updates）
  - [ ] 添加错误处理和重试逻辑
  - [ ] 实现加载状态管理

**交付物**：
- 完整的"创建智能体"前端页面
- 可复用的 UI 组件库
- 流畅的用户交互体验
- 移动端适配

---

### Phase 5: 智能体生成引擎（第8-9周）

**目标**：实现从模板+技能到可运行智能体的自动化流程

#### 任务清单

- [ ] **增强 skillhub-workflow**
  - [ ] 扩展工作流 DSL，支持模板引用
    ```yaml
    workflow:
      template: customer-service-agent-v1
      skills:
        - order-query-skill
        - refund-processing-skill
      config:
        llm_model: gpt-4
        temperature: 0.7
    ```
  - [ ] 实现工作流编译器（YAML → LangChain.js Chain）
  - [ ] 添加技能注入机制（动态加载 Skill 代码）

- [ ] **智能体部署自动化**
  - [ ] 设计部署配置文件格式
  - [ ] 集成 FastbuildAI 部署 API（如果存在）
  - [ ] 或实现简易部署脚本（Docker Compose）
  - [ ] 生成智能体访问 URL 和 API Key

- [ ] **测试和验证流程**
  - [ ] 自动生成测试用例（基于模板的预期行为）
  - [ ] 运行冒烟测试（smoke test）
  - [ ] 验证技能是否正确加载
  - [ ] 生成测试报告

- [ ] **用户确认环节**
  - [ ] 在部署前展示预览（工作流图、技能列表）
  - [ ] 允许用户调整配置（LLM 模型、温度参数等）
  - [ ] 确认后触发部署

**交付物**：
- 增强的 skillhub-workflow 引擎
- 一键部署功能
- 自动化测试框架
- 智能体预览和配置界面

---

### Phase 6: 悬赏系统集成（第10-11周）

**目标**：建立技能悬赏生态系统

#### 任务清单

- [ ] **技术选型决策**
  - [ ] 方案A：集成 bounty-net（去中心化，NOSTR + 代币）
    - 优点：成熟方案，有经济激励
    - 缺点：复杂度高，需要钱包集成
  - [ ] 方案B：自建悬赏系统（中心化，积分制）
    - 优点：简单可控，快速上线
    - 缺点：缺乏外部开发者激励
  - [ ] **推荐**：Phase 1 用方案B（MVP），Phase 2 再考虑方案A

- [ ] **实现悬赏发布功能**
  - [ ] 前端：创建悬赏表单（标题、描述、技能要求、悬赏金额）
  - [ ] 后端：验证输入并创建 bounty 记录
  - [ ] 通知：发送邮件/站内信给潜在开发者

- [ ] **实现悬赏领取流程**
  - [ ] 开发者浏览悬赏列表
  - [ ] 点击"领取任务"（检查资格：技能匹配度）
  - [ ] 锁定悬赏（防止多人同时开发）
  - [ ] 提供开发指南和资源链接

- [ ] **实现技能提交流程**
  - [ ] 开发者上传 Skill 包（SKILL.md + 代码）
  - [ ] 自动运行安全检查（沙箱测试）
  - [ ] 通知悬赏创建者进行验证

- [ ] **实现验证和支付机制**
  - [ ] 创建者测试提交的技能
  - [ ] 点击"验证通过"或"需要修改"
  - [ ] 如果通过：转移积分/代币，标记 bounty 为 completed
  - [ ] 如果失败：返回修改意见，重新提交

- [ ] **积分/代币经济模型**（可选）
  - [ ] 设计积分获取规则（注册送积分、完成任务得积分）
  - [ ] 设计积分消耗规则（发布悬赏消耗积分）
  - [ ] 实现积分排行榜
  - [ ] （远期）集成区块链代币（ERC-20）

**交付物**：
- 完整的悬赏管理系统
- 开发者悬赏市场页面
- 积分经济系统（如果实施）
- 悬赏流程文档

---

### Phase 7: 测试与优化（第12周）

**目标**：确保系统稳定性和用户体验

#### 任务清单

- [ ] **单元测试**
  - [ ] Skill 逻辑测试（Jest）
    - 需求采集工作流
    - 模板匹配算法
    - 技能缺口分析
  - [ ] API 接口测试（Supertest）
    - 模板搜索端点
    - 技能分析端点
    - 悬赏管理端点
  - [ ] 前端组件测试（React Testing Library）
    - ChatInterface 组件
    - TemplateCard 组件
    - SkillGapVisualizer 组件

- [ ] **端到端测试**
  - [ ] 完整创建智能体流程测试（Playwright/Cypress）
    ```
    1. 用户输入需求
    2. 系统展示匹配模板
    3. 用户选择模板
    4. 系统分析技能缺口
    5. 用户确认补充技能
    6. 系统生成并部署智能体
    7. 用户测试智能体
    ```
  - [ ] 悬赏流程测试
    ```
    1. 发布悬赏
    2. 开发者领取
    3. 提交技能
    4. 验证通过
    5. 支付完成
    ```

- [ ] **性能优化**
  - [ ] 数据库查询优化（添加索引、优化 SQL）
  - [ ] API 响应时间优化（目标：<500ms）
  - [ ] 前端加载优化（代码分割、懒加载）
  - [ ] 添加 CDN 缓存静态资源

- [ ] **用户体验优化**
  - [ ] 优化引导话术（更自然、更友好）
  - [ ] 改进错误提示（具体、可操作）
  - [ ] 添加加载动画和骨架屏
  - [ ] 优化移动端触摸体验

**交付物**：
- 测试覆盖率报告（目标：>80%）
- 性能基准测试报告
- 用户体验优化清单
- Bug 修复记录

---

### Phase 8: 文档与部署（第13周）

**目标**：准备生产环境上线

#### 任务清单

- [ ] **用户文档**
  - [ ] 编写《如何使用智能体工厂》指南
    - 步骤图解
    - 常见问题 FAQ
    - 最佳实践案例
  - [ ] 录制演示视频（3-5分钟）
  - [ ] 创建交互式教程（新手引导）

- [ ] **开发者文档**
  - [ ] API 文档（Swagger/OpenAPI）
  - [ ] 《如何扩展 agent-factory Skill》指南
  - [ ] 《如何创建自定义模板》指南
  - [ ] 《如何发布技能悬赏》指南

- [ ] **部署准备**
  - [ ] 编写 Dockerfile 和 docker-compose.yml
  - [ ] 配置环境变量模板（.env.example）
  - [ ] 设置 CI/CD 流水线（GitHub Actions）
  - [ ] 配置监控和日志（Sentry、LogRocket）

- [ ] **安全检查**
  - [ ] 权限控制审计（确保只有授权用户能操作）
  - [ ] 输入验证（防止 SQL 注入、XSS）
  - [ ] API 速率限制（防止滥用）
  - [ ] 敏感数据加密（API Keys、密码）
  - [ ] 依赖漏洞扫描（npm audit）

- [ ] **上线发布**
  - [ ] 预生产环境测试
  - [ ] 灰度发布（10% 用户）
  - [ ] 监控关键指标（错误率、响应时间、用户满意度）
  - [ ] 全量发布

**交付物**：
- 完整的用户和开发者文档
- 生产环境部署配置
- 监控和告警系统
- 上线报告

---

## 📊 里程碑总结

| 阶段 | 时间 | 核心交付物 | 成功标准 |
|------|------|-----------|---------|
| **Phase 1** | 第1周 | 技术方案、数据库设计、API 规范 | 完成技术调研，确定架构方案 |
| **Phase 2** | 第2-3周 | agent-factory Skill | 能完成对话式需求采集 |
| **Phase 3** | 第4-5周 | 后端 API 服务 | 所有 API 端点可用并通过测试 |
| **Phase 4** | 第6-7周 | 前端交互界面 | 用户能流畅完成创建流程 |
| **Phase 5** | 第8-9周 | 智能体生成引擎 | 能一键生成并部署智能体 |
| **Phase 6** | 第10-11周 | 悬赏系统 | 能发布、领取、验证悬赏 |
| **Phase 7** | 第12周 | 测试和优化 | 测试覆盖率>80%，性能达标 |
| **Phase 8** | 第13周 | 文档和部署 | 成功上线生产环境 |

---

## 🎯 MVP 范围（最小可行产品）

如果时间紧张，可以优先实现以下核心功能（Phase 1-5，约9周）：

### ✅ MVP 包含
1. 对话式需求采集（固定4个问题）
2. 本地模板搜索（仅使用现有 Agent 数据）
3. 手工标注的技能列表
4. 简单的技能缺口展示
5. 手动触发智能体生成（非全自动）

### ❌ MVP 不包含
1. slot-starters 全网采集（Phase 3 高级功能）
2. 悬赏系统（Phase 6）
3. 自动化部署（Phase 5 高级功能）
4. 积分经济模型（Phase 6 高级功能）

---

## 🔧 技术栈总览

### 前端
- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: TanStack Query (React Query) + Zustand
- **UI 组件**: Lucide React Icons
- **测试**: Jest + React Testing Library + Playwright

### 后端
- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: PostgreSQL 17
- **ORM**: pg (原生 SQL) + Prisma（可选）
- **缓存**: Redis（可选）
- **测试**: Jest + Supertest

### AI/ML
- **工作流**: LangChain.js
- **NLP**: natural.js 或 compromise
- **Embedding**: OpenAI API 或本地模型
- **Skill 标准**: ModelScope Agent Skills 格式

### DevOps
- **容器化**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **监控**: Sentry + LogRocket
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

# 4. 初始化数据库
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

访问 http://localhost:3000/create-agent 开始体验！

---

## 📝 风险管理

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| slot-starters 集成复杂度高 | 中 | 高 | 先实现本地模板搜索，后期再集成 |
| bounty-net 不适合中国环境 | 高 | 中 | 优先自建悬赏系统，后期再考虑去中心化方案 |
| 技能缺口分析准确率低 | 中 | 中 | 采用混合策略（关键词 + AI + 人工标注） |
| 用户对话流失率高 | 高 | 高 | 优化引导话术，提供快捷选项，减少必填问题 |
| 性能瓶颈（搜索慢） | 低 | 高 | 提前设计缓存层，优化数据库索引 |

---

## 🎉 成功指标

### 定量指标
- **用户转化率**: 访问创建页面 → 完成智能体创建 > 30%
- **平均创建时间**: < 5 分钟
- **模板匹配准确率**: > 70%（用户选择的模板符合预期）
- **API 响应时间**: P95 < 500ms
- **系统可用性**: > 99.5%

### 定性指标
- 用户反馈："比手动配置简单多了"
- 开发者参与：至少有 10 个技能悬赏被领取
- 社区活跃度：GitHub Stars 增长 50%

---

## 🔄 迭代计划（上线后）

### v1.1（上线后1个月）
- 增加更多模板分类
- 优化对话引导话术（基于用户反馈）
- 添加智能体分享功能

### v1.2（上线后3个月）
- 集成 slot-starters 全网采集
- 实现智能体版本管理
- 添加团队协作功能

### v2.0（上线后6个月）
- 集成 bounty-net 去中心化悬赏
- 实现自学习优化（记录成功案例，优化匹配算法）
- 开放 API 供第三方集成

---

## 📞 联系方式

- **项目负责人**: BigLionX
- **Email**: 1055603323@qq.com
- **GitHub**: https://github.com/BigLionX/NvwaX
- **Discord**: [NvwaX Community](https://discord.gg/nvwax)

---

**最后更新**: 2026-04-25  
**版本**: 1.0.0  
**状态**: 待审批
