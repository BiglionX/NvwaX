# Phase 1: 技术调研与架构设计报告

**日期**: 2026-04-25  
**阶段**: Phase 1 - 需求分析与架构设计  
**状态**: 进行中

---

## 📊 开源项目调研结果

### 1. slot-starters（模板发现引擎）

**调研结论**: ❌ **未找到确切项目**

经过广泛搜索，未能找到名为 "slot-starters" 的开源项目。这可能是 Nvwa-design.md 中的概念性描述，或者项目名称不准确。

**替代方案**:
基于现有生态，我们可以采用以下方案实现模板发现功能：

#### 方案 A: 自建模板采集引擎（推荐）
- **数据源**:
  - GitHub API（搜索 `agent`, `ai-agent`, `llm-agent` 等关键词）
  - Gitee API（国内镜像）
  - HuggingFace Spaces（AI 应用托管平台）
  - NPM Registry（搜索 `agent-*`, `ai-*` 包）
  
- **技术实现**:
  ```typescript
  // 伪代码示例
  class TemplateCollector {
    async collectFromGitHub() {
      const repos = await githubAPI.searchRepositories({
        q: 'agent OR ai-agent OR llm-agent',
        sort: 'stars',
        order: 'desc',
        per_page: 100
      });
      
      return repos.map(repo => ({
        name: repo.name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language,
        topics: repo.topics,
        // 使用 AI 分析 README 提取技能列表
        skills: await this.analyzeReadme(repo.readme)
      }));
    }
    
    async analyzeReadme(readmeContent: string): Promise<string[]> {
      // 调用 LLM 分析 README，提取技能标签
      const prompt = `从以下 README 中提取该 Agent 具备的技能列表：\n${readmeContent}`;
      const response = await llm.generate(prompt);
      return JSON.parse(response);
    }
  }
  ```

- **优势**:
  - ✅ 完全可控，可定制化
  - ✅ 与现有系统无缝集成
  - ✅ 可利用现有的 GitHub/Gitee 爬虫基础设施
  
- **劣势**:
  - ⚠️ 需要自行维护数据采集逻辑
  - ⚠️ 需要处理 API 速率限制

#### 方案 B: 集成 Awesome Lists
- 利用现有的 Awesome Agent 列表：
  - https://github.com/e2b-dev/awesome-ai-agents
  - https://github.com/homanp/awesome-llm-apps
  
- **优势**: 已有 curated 列表，质量高
- **劣势**: 更新频率低，覆盖面有限

**最终决策**: ✅ **采用方案 A**，自建模板采集引擎，复用现有的 GitHub/Gitee 爬虫基础设施。

---

### 2. bounty-net（去中心化悬赏网络）

**调研结论**: ❌ **未找到确切项目**

同样未能找到名为 "bounty-net" 的项目。Nvwa-design.md 中提到的可能是概念设计或尚未公开的项目。

**Nostr 协议调研**:
虽然未找到 bounty-net，但调研了 Nostr 协议（Notes and Other Stuff Transmitted by Relays）：
- **特点**: 去中心化社交协议，基于公钥密码学
- **应用场景**: 抗审查社交网络、内容打赏（Zap）
- **与悬赏系统的关联**: 可通过 Nostr 实现去中心化的身份和支付

**替代方案**:

#### 方案 A: 自建中心化悬赏系统（MVP 推荐）
- **核心功能**:
  - 悬赏发布（标题、描述、技能要求、悬赏金额/积分）
  - 悬赏领取（开发者 claim task）
  - 成果提交（上传 Skill 包）
  - 验证与支付（创建者验证后释放赏金）
  
- **技术栈**:
  - 数据库: PostgreSQL（已有）
  - 身份: JWT（已有用户系统）
  - 支付: 积分系统（虚拟币，后期可接区块链）
  
- **优势**:
  - ✅ 快速上线（1-2周开发）
  - ✅ 简单可控
  - ✅ 无需钱包集成
  
- **劣势**:
  - ⚠️ 缺乏外部激励（仅限平台内用户）
  - ⚠️ 中心化架构

#### 方案 B: 集成 Gitcoin（开源 Bounty 平台）
- **Gitcoin**: https://gitcoin.co/
- **特点**: 专注于开源项目的 Bounty 平台，支持加密货币支付
- **集成方式**: 通过 Gitcoin API 发布 Bounty
  
- **优势**: 成熟的生态系统，有真实开发者参与
- **劣势**: 
  - ⚠️ 需要加密货币钱包
  - ⚠️ 国内访问可能受限
  - ⚠️ 合规风险

#### 方案 C: 基于 Nostr 的去中心化 Bounty（远期规划）
- **技术架构**:
  - 身份: Nostr 公钥/私钥
  - 通信: Nostr Relay 网络
  - 支付: Lightning Network（闪电网络）
  
- **优势**: 真正去中心化，抗审查
- **劣势**: 
  - ⚠️ 技术复杂度高
  - ⚠️ 用户门槛高（需要管理密钥）
  - ⚠️ 生态不成熟

**最终决策**: 
- **Phase 1-2 (MVP)**: ✅ **采用方案 A**，自建中心化悬赏系统，使用积分制
- **Phase 3+ (扩展)**: 考虑集成 Gitcoin 或自建 Nostr-based 系统

---

### 3. MetaGPT（多智能体协作框架）

**调研结论**: ✅ **项目存在且成熟**

- **GitHub**: https://github.com/geekan/MetaGPT
- **Stars**: 58k+ (截至 2026-04)
- **语言**: Python
- **核心理念**: "Code = SOP(Team)" - 将软件开发流程编码为标准操作程序（SOP），由多个 LLM 智能体协作执行

**关键特性**:
1. **角色分工**: 产品经理、架构师、工程师、QA 等
2. **SOP 驱动**: 预定义的工作流程
3. **自动化输出**: PRD、设计文档、代码仓库

**对 nvwa 的启示**:
- ✅ **可借鉴的设计模式**:
  - 角色化智能体（nvwa 可以扮演"产品经理"角色）
  - 工作流编排（需求采集 → 模板匹配 → 技能分析 → 生成）
  - 结构化输出（JSON 格式的中间结果）
  
- ⚠️ **不直接采用的原因**:
  - MetaGPT 是 Python 生态，而 NvwaX 是 TypeScript/Node.js
  - MetaGPT 侧重代码生成，而 nvwa 侧重智能体组装
  - 引入 Python 依赖会增加系统复杂度

**最终决策**: 
- ✅ **借鉴设计理念**，但不直接集成 MetaGPT
- 使用 LangChain.js 实现类似的多轮对话工作流
- 参考 MetaGPT 的角色分工和 SOP 思想设计 nvwa 的工作流

---

### 4. ModelScope Agent Skills / Minion Skills

**调研结论**: ✅ **技能定义标准可参考**

- **ModelScope Agent Skills**: 阿里云魔搭社区的智能体技能标准
- **Minion Skills**: OpenAI 提出的技能格式

**技能定义格式参考**:
```yaml
# SKILL.md 示例
name: customer-service-skill
version: 1.0.0
description: 处理客户咨询的智能体技能

capabilities:
  - intent_recognition: 识别用户意图
  - knowledge_retrieval: 从知识库检索答案
  - response_generation: 生成自然语言回复

dependencies:
  - llm: gpt-4
  - vector_db: pinecone
  
config:
  temperature: 0.7
  max_tokens: 500
```

**最终决策**: 
- ✅ **采用简化的 YAML/JSON 格式**定义技能
- 兼容 ModelScope Agent Skills 标准（便于未来扩展）

---

## 🏗️ nvwa 元智能体架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     前端交互层 (Next.js)                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /create-agent 页面                                   │   │
│  │  ├─ ChatInterface (对话引导)                          │   │
│  │  ├─ TemplateGallery (模板展示)                        │   │
│  │  ├─ SkillGapVisualizer (技能缺口可视化)               │   │
│  │  └─ BountyTracker (悬赏进度追踪)                      │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API (TanStack Query)
┌──────────────────────▼──────────────────────────────────────┐
│                   后端服务层 (Express)                        │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Template     │  │ Skill        │  │ Bounty       │      │
│  │ Controller   │  │ Controller   │  │ Controller   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐      │
│  │ Template     │  │ Skill        │  │ Bounty       │      │
│  │ Service      │  │ Analyzer     │  │ Service      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
┌─────────▼─────────────────▼─────────────────▼──────────────┐
│                  nvwa 元智能体 (Skill)                       │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  agent-factory/                                       │   │
│  │  ├─ SKILL.md (主指令文件)                             │   │
│  │  ├─ workflow.ts (LangChain.js 工作流)                 │   │
│  │  ├─ prompts/                                          │   │
│  │  │   ├─ requirement-gathering.md                     │   │
│  │  │   ├─ template-matching.md                         │   │
│  │  │   └─ skill-analysis.md                            │   │
│  │  └─ utils/                                            │   │
│  │      ├─ keyword-extractor.ts                         │   │
│  │      └─ similarity-calculator.ts                     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   数据与集成层                               │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │ Template     │  │ SkillHub     │      │
│  │ Database     │  │ Collector    │  │ API          │      │
│  │              │  │ (GitHub/     │  │              │      │
│  │ • agents     │  │  Gitee/      │  │ • skills     │      │
│  │ • templates  │  │  HuggingFace)│  │ • workflows  │      │
│  │ • skills     │  │              │  │              │      │
│  │ • bounties   │  │              │  │              │      │
│  │ • users      │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 技术选型

| 模块 | 技术方案 | 理由 |
|------|---------|------|
| **前端框架** | Next.js 14 (App Router) | 已有技术栈，SSR 支持 |
| **状态管理** | TanStack Query + Zustand | 已有使用，适合服务端状态 |
| **UI 组件** | Tailwind CSS + Lucide Icons | 已有技术栈 |
| **后端框架** | Express.js | 已有技术栈 |
| **数据库** | PostgreSQL 17 | 已有，支持 JSONB 和全文搜索 |
| **ORM** | pg (原生 SQL) | 已有，保持简单 |
| **工作流引擎** | LangChain.js | TypeScript 生态，灵活 |
| **NLP 处理** | natural.js | 轻量级中文分词和关键词提取 |
| **Embedding** | OpenAI API / 本地模型 | 语义相似度计算 |
| **缓存** | Redis (可选) | 提升搜索性能 |
| **定时任务** | node-cron | 模板采集调度 |

---

## 📐 数据库扩展方案设计

### 1. 扩展现有 `agent_metadata` 表

```sql
-- 添加模板相关字段
ALTER TABLE agent_metadata 
ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,  -- 技能列表
ADD COLUMN IF NOT EXISTS use_cases TEXT[] DEFAULT ARRAY[]::TEXT[],  -- 适用场景
ADD COLUMN IF NOT EXISTS data_sources TEXT[] DEFAULT ARRAY[]::TEXT[],  -- 支持的数据源
ADD COLUMN IF NOT EXISTS output_types TEXT[] DEFAULT ARRAY[]::TEXT[],  -- 输出类型
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,  -- 是否为模板
ADD COLUMN IF NOT EXISTS template_version VARCHAR(20),  -- 模板版本
ADD COLUMN IF NOT EXISTS compatibility JSONB,  -- 兼容性信息
ADD COLUMN IF NOT EXISTS installation_guide TEXT;  -- 安装指南
```

**字段说明**:
- `skills`: `["customer-service", "order-query", "refund-processing"]`
- `use_cases`: ["电商客服", "售后支持", "订单管理"]
- `data_sources`: ["订单数据库", "商品库存 API", "用户信息表"]
- `output_types`: ["文本回复", "JSON 数据", "报表"]

### 2. 新建 `skills` 表（技能本体库）

```sql
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,  -- 技能名称（唯一）
  slug VARCHAR(255) NOT NULL UNIQUE,  -- URL 友好名称
  description TEXT,  -- 技能描述
  category VARCHAR(100),  -- 分类：communication, data_processing, integration, etc.
  version VARCHAR(20) DEFAULT '1.0.0',  -- 版本号
  author_id TEXT REFERENCES users(id),  -- 创建者
  repository_url TEXT,  -- 代码仓库地址
  documentation_url TEXT,  -- 文档地址
  dependencies JSONB DEFAULT '[]'::jsonb,  -- 依赖的其他技能
  config_schema JSONB,  -- 配置项 schema（JSON Schema 格式）
  metadata JSONB DEFAULT '{}'::jsonb,  -- 额外元数据
  download_count INTEGER DEFAULT 0,  -- 下载次数
  rating DECIMAL(3, 2) DEFAULT 0.00,  -- 评分（0-5）
  status VARCHAR(50) DEFAULT 'active',  -- active, deprecated, pending_review
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 索引
  CONSTRAINT skills_name_unique UNIQUE (name),
  CONSTRAINT skills_slug_unique UNIQUE (slug)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_author ON skills(author_id);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
CREATE INDEX IF NOT EXISTS idx_skills_name_trgm ON skills USING gin(name gin_trgm_ops);  -- 全文搜索
```

**示例数据**:
```json
{
  "id": "uuid-1",
  "name": "订单查询技能",
  "slug": "order-query-skill",
  "description": "从订单数据库中查询订单状态和详情",
  "category": "data_processing",
  "version": "1.2.0",
  "author_id": "user-123",
  "repository_url": "https://github.com/example/order-query-skill",
  "dependencies": ["database-connector", "authentication"],
  "config_schema": {
    "type": "object",
    "properties": {
      "database_url": {"type": "string"},
      "timeout": {"type": "integer", "default": 5000}
    }
  },
  "download_count": 1523,
  "rating": 4.7
}
```

### 3. 新建 `bounties` 表（悬赏系统）

```sql
CREATE TABLE IF NOT EXISTS bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,  -- 悬赏标题
  description TEXT,  -- 详细描述
  required_skills JSONB NOT NULL,  -- 需要的技能列表
  reward_amount DECIMAL(10, 2) NOT NULL,  -- 悬赏金额（积分）
  currency VARCHAR(20) DEFAULT 'points',  -- 货币类型：points, tokens, CNY
  status VARCHAR(50) DEFAULT 'open',  -- open, claimed, submitted, verified, completed, cancelled
  creator_id TEXT NOT NULL REFERENCES users(id),  -- 发布者
  claimer_id TEXT REFERENCES users(id),  -- 领取者
  submission_url TEXT,  -- 提交的成果链接
  verification_notes TEXT,  -- 验证意见
  deadline TIMESTAMP,  -- 截止时间（可选）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed_at TIMESTAMP,  -- 领取时间
  submitted_at TIMESTAMP,  -- 提交时间
  verified_at TIMESTAMP,  -- 验证时间
  completed_at TIMESTAMP,  -- 完成时间
  
  -- 约束
  CONSTRAINT valid_status CHECK (status IN ('open', 'claimed', 'submitted', 'verified', 'completed', 'cancelled'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_bounties_creator ON bounties(creator_id);
CREATE INDEX IF NOT EXISTS idx_bounties_claimer ON bounties(claimer_id);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_created_at ON bounties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bounties_required_skills ON bounties USING gin(required_skills);
```

**状态流转**:
```
open → claimed → submitted → verified → completed
                ↓
            cancelled (超时或放弃)
```

### 4. 新建 `user_points` 表（积分系统）

```sql
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) UNIQUE,  -- 用户 ID
  balance DECIMAL(10, 2) DEFAULT 0.00,  -- 当前余额
  total_earned DECIMAL(10, 2) DEFAULT 0.00,  -- 累计获得
  total_spent DECIMAL(10, 2) DEFAULT 0.00,  -- 累计花费
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 积分流水表
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,  -- 正数为收入，负数为支出
  type VARCHAR(50) NOT NULL,  -- register_bonus, bounty_reward, bounty_payment, system_adjustment
  reference_id TEXT,  -- 关联的 Bounty ID 或其他引用
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(created_at DESC);
```

**积分规则**:
- 注册赠送: 100 积分
- 发布悬赏: 扣除相应积分
- 完成悬赏: 获得 80% 积分（平台抽成 20%）
- 每日签到: +5 积分

### 5. 新建 `template_collections` 表（模板集合）

```sql
CREATE TABLE IF NOT EXISTS template_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,  -- 集合名称
  description TEXT,
  curator_id TEXT REFERENCES users(id),  -- 策展人
  templates JSONB NOT NULL,  -- 模板 ID 列表
  is_public BOOLEAN DEFAULT true,  -- 是否公开
  view_count INTEGER DEFAULT 0,  -- 浏览次数
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 示例：热门客服智能体集合
{
  "name": "热门客服智能体",
  "templates": ["agent-id-1", "agent-id-2", "agent-id-3"],
  "is_public": true
}
```

---

## 🔌 API 接口设计规范

### 1. 模板搜索 API

#### `GET /api/templates/search`

**请求参数**:
```typescript
interface TemplateSearchParams {
  q?: string;              // 搜索关键词
  category?: string;       // 分类过滤
  skills?: string[];       // 技能过滤
  minStars?: number;       // 最低星级
  source?: string[];       // 数据源过滤 ['github', 'gitee', 'huggingface']
  page?: number;           // 页码（默认 1）
  limit?: number;          // 每页数量（默认 20）
  sortBy?: 'relevance' | 'stars' | 'downloads' | 'created_at';  // 排序
  order?: 'asc' | 'desc';  // 排序方向
}
```

**响应格式**:
```typescript
interface TemplateSearchResponse {
  success: boolean;
  data: {
    templates: Array<{
      id: string;
      name: string;
      description: string;
      source: string;
      url: string;
      stars: number;
      downloads: number;
      skills: string[];
      useCases: string[];
      dataSources: string[];
      outputTypes: string[];
      matchScore?: number;  // 匹配度（0-100）
      createdAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

**示例请求**:
```
GET /api/templates/search?q=客服&skills=["customer-service"]&minStars=100&page=1&limit=10
```

---

### 2. 技能分析 API

#### `POST /api/skills/analyze`

**请求体**:
```typescript
interface SkillAnalyzeRequest {
  userRequirement: string;  // 用户需求描述
  templateId?: string;      // 选中的模板 ID（可选）
  templateSkills?: string[]; // 模板包含的技能（如果未提供 templateId）
}
```

**响应格式**:
```typescript
interface SkillAnalyzeResponse {
  success: boolean;
  data: {
    requiredSkills: string[];  // 从需求中提取的所需技能
    availableSkills: string[];  // 模板已包含的技能
    missingSkills: string[];    // 缺失的技能
    suggestedSkills: Array<{   // 推荐的补充技能
      name: string;
      description: string;
      matchScore: number;
      source: 'skillhub' | 'community';
    }>;
    analysis: {
      confidence: number;  // 分析置信度（0-1）
      reasoning: string;   // 分析理由（自然语言）
    };
  };
}
```

**示例请求**:
```json
{
  "userRequirement": "我需要一个能自动回复客户咨询并查询订单状态的客服智能体",
  "templateId": "agent-123"
}
```

**示例响应**:
```json
{
  "success": true,
  "data": {
    "requiredSkills": ["customer-service", "order-query", "intent-recognition"],
    "availableSkills": ["customer-service", "intent-recognition"],
    "missingSkills": ["order-query"],
    "suggestedSkills": [
      {
        "name": "订单查询技能",
        "description": "从订单数据库中查询订单状态和详情",
        "matchScore": 95,
        "source": "skillhub"
      }
    ],
    "analysis": {
      "confidence": 0.92,
      "reasoning": "用户需求包含两个核心功能：客服回复和订单查询。模板已具备客服能力，但缺少订单查询技能。"
    }
  }
}
```

---

### 3. 悬赏管理 API

#### `POST /api/bounties` - 创建悬赏

**请求体**:
```typescript
interface CreateBountyRequest {
  title: string;
  description: string;
  requiredSkills: string[];
  rewardAmount: number;
  deadline?: string;  // ISO 8601 格式
}
```

**响应**:
```typescript
interface CreateBountyResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    status: 'open';
    rewardAmount: number;
    creatorId: string;
    createdAt: string;
  };
}
```

#### `GET /api/bounties` - 查询悬赏列表

**请求参数**:
```typescript
interface ListBountiesParams {
  status?: 'open' | 'claimed' | 'submitted' | 'completed';
  creatorId?: string;
  claimerId?: string;
  skill?: string;  // 按技能过滤
  page?: number;
  limit?: number;
}
```

#### `POST /api/bounties/:id/claim` - 领取悬赏

**响应**:
```typescript
interface ClaimBountyResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: 'claimed';
    claimerId: string;
    claimedAt: string;
  };
}
```

#### `POST /api/bounties/:id/submit` - 提交成果

**请求体**:
```typescript
interface SubmitBountyRequest {
  submissionUrl: string;  // 成果链接（GitHub repo、文档等）
  description?: string;   // 提交说明
}
```

#### `POST /api/bounties/:id/verify` - 验证并支付

**请求体**:
```typescript
interface VerifyBountyRequest {
  approved: boolean;   // 是否通过
  notes?: string;      // 验证意见
}
```

**逻辑**:
- 如果 `approved=true`: 
  - 转移积分给领取者（80%）
  - 平台抽成（20%）
  - 状态改为 `completed`
- 如果 `approved=false`:
  - 状态改回 `open`
  - 返回验证意见

---

### 4. 用户积分 API

#### `GET /api/users/:id/points` - 查询积分余额

**响应**:
```typescript
interface UserPointsResponse {
  success: boolean;
  data: {
    userId: string;
    balance: number;
    totalEarned: number;
    totalSpent: number;
  };
}
```

#### `GET /api/users/:id/points/transactions` - 查询积分流水

**响应**:
```typescript
interface PointTransactionsResponse {
  success: boolean;
  data: {
    transactions: Array<{
      id: string;
      amount: number;
      type: string;
      description: string;
      createdAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}
```

---

## 📋 实施计划调整

基于调研结果，对原计划进行以下调整：

### 调整 1: 模板采集引擎
- **原计划**: 集成 slot-starters
- **调整后**: 自建模板采集引擎，复用现有 GitHub/Gitee 爬虫
- **影响**: 增加 1 周开发时间（Phase 3）

### 调整 2: 悬赏系统
- **原计划**: 集成 bounty-net（去中心化）
- **调整后**: Phase 1-2 使用自建中心化系统（积分制），Phase 3+ 再考虑去中心化方案
- **影响**: 简化初期实现，加快 MVP 上线

### 调整 3: 技术栈
- **原计划**: 可能引入 Python（MetaGPT）
- **调整后**: 坚持 TypeScript 全栈，使用 LangChain.js
- **影响**: 降低系统复杂度，便于维护

---

## ✅ Phase 1 交付物清单

- [x] 开源项目调研报告（本文档）
- [ ] 数据库迁移脚本（SQL 文件）
- [ ] API 接口文档（OpenAPI/Swagger 格式）
- [ ] 系统架构图（Mermaid 或 Draw.io）
- [ ] 技术选型决策记录

---

## 🎯 下一步行动

1. **立即开始**: 编写数据库迁移脚本
2. **并行进行**: 设计 API 接口详细规范
3. **准备 Phase 2**: 创建 agent-factory Skill 目录结构

---

**报告作者**: AI Assistant  
**审核状态**: 待审核  
**最后更新**: 2026-04-25
