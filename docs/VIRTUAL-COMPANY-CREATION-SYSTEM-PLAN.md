# 虚拟公司智能创建系统 - 需求分析与实现计划

## 📋 文档信息

- **文档版本**: v1.0.0
- **创建时间**: 2026-05-16
- **作者**: NvwaX 开发团队
- **状态**: 📝 需求分析阶段

---

## 🎯 核心需求概述

用户希望通过**对话式交互**创建虚拟公司，系统自动分析需求、推荐角色、搜索开源 Agent、必要时创建新 Agent，最终生成可打包的 AI 团队。

### 用户旅程（User Journey）

```
用户点击"创建虚拟公司"
    ↓
打开对话框，CEO Leader Agent 主动询问："您需要创建的是什么团队？"
    ↓
系统推荐 AI 团队角色列表（带功能说明）
    ↓
用户增减角色或修改角色功能说明
    ↓
NvwaX 虚拟公司创建工具分析需求并与用户确认
    ↓
搜索 SkillHub 查找可用的开源 Agent/角色
    ↓
┌─ 有现成 Agent ─→ 直接集成到团队
│
└─ 无现成 Agent ─→ 启动 Nvwa 按需求创建智能体
                    ├─ 自动使用 SkillHub 搜索适用 Skill
                    ├─ 缺少 Skill → 弹窗说明并提供替代方案
                    └─ 或直接编写新 Skill
    ↓
显示创建进度（动态步骤和文字说明）
    ↓
AI 团队创建完成
    ↓
用户后台打开虚拟公司页面（需登录）
    ↓
Leader Agent 自动启动 Chat 窗口
    ↓
请示用户：
  1. 使用场景配置
  2. 是否 API 导出
  3. 是否打包到 ProClaw (proclaw.cc)
  4. 下载到本地使用
```

---

## 🔍 需求详细分析

### 1. 对话式创建流程

#### 1.1 CEO Leader Agent 引导

**当前状态**: ❌ 未实现  
**目标状态**: ✅ 实现交互式对话引导

**功能要求**:
- 用户点击"创建虚拟公司"后，不是简单的表单输入
- 而是启动一个 **CEO Leader Agent** 作为对话助手
- CEO Agent 主动询问用户需求："您好！我是您的虚拟公司 CEO，请问您需要创建什么类型的团队？"
- 支持多轮对话，逐步明确需求

**技术实现**:
```typescript
interface VirtualCompanyCreationSession {
  sessionId: string;
  userId: string;
  status: 'initiated' | 'requirements_gathering' | 'role_selection' | 
          'agent_searching' | 'skill_matching' | 'confirming' | 'building' | 'completed';
  
  // 对话历史
  conversationHistory: Array<{
    role: 'user' | 'ceo_agent';
    content: string;
    timestamp: Date;
  }>;
  
  // 收集的需求信息
  requirements: {
    companyType?: string;        // 公司类型（营销/开发/设计等）
    description?: string;        // 详细描述
    dataSources?: string[];      // 数据源
    outputs?: string[];          // 期望产出
    skills?: string[];           // 所需技能
  };
  
  // 选定的角色列表
  selectedRoles: Array<{
    role: string;
    specialty: string;
    agentType: string;
    responsibilities: string[];
    sourceAgentId?: string;      // 如果来自开源 Agent
    isNewlyCreated?: boolean;    // 是否新创建的 Agent
  }>;
  
  // 进度追踪
  progress: {
    step: number;
    totalSteps: number;
    currentAction: string;
    message: string;
  };
}
```

#### 1.2 智能角色推荐

**当前状态**: ⚠️ 部分实现（静态模板）  
**目标状态**: ✅ 动态智能推荐

**功能要求**:
- 根据用户需求描述，智能推荐合适的团队角色
- 每个角色附带详细说明：
  - 角色名称（如"前端开发工程师"）
  - 专业领域（如"React/Vue 界面开发"）
  - 主要职责（如"UI 组件开发、交互逻辑实现"）
  - 推荐理由（如"根据您的 Web 应用需求推荐"）
- 用户可以：
  - ✅ 添加推荐的角色
  - ❌ 删除不需要的角色
  - ✏️ 修改角色的功能说明
  - ➕ 手动添加自定义角色

**技术实现**:
```typescript
// 角色推荐引擎
class RoleRecommendationEngine {
  async recommendRoles(requirements: Requirements): Promise<RoleRecommendation[]> {
    // Step 1: 分析需求关键词
    const keywords = this.extractKeywords(requirements.description);
    
    // Step 2: 匹配预设角色模板
    const matchedTemplates = await this.matchRoleTemplates(keywords);
    
    // Step 3: 查询 SkillHub 获取真实 Agent 数据
    const availableAgents = await skillhubApi.searchAgents({
      categories: keywords,
      limit: 50
    });
    
    // Step 4: LLM 智能排序和补充
    const recommendations = await llm.analyzeAndRank({
      requirements,
      templates: matchedTemplates,
      availableAgents
    });
    
    return recommendations;
  }
}
```

### 2. Agent 搜索与复用机制

#### 2.1 SkillHub 集成搜索

**当前状态**: ✅ 已有 SkillHub API 集成  
**需要增强**: 🔧 深度集成到创建流程

**功能要求**:
- 在确定角色列表后，自动搜索 SkillHub
- 查找是否有现成的开源 Agent 可以直接使用
- 搜索结果展示：
  - Agent 名称和描述
  - 评分和使用量
  - 兼容性评估（是否适合当前团队）
  - 来源链接（GitHub/HuggingFace）

**技术实现**:
```typescript
interface AgentSearchResult {
  agentId: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  usageCount: number;
  compatibilityScore: number;  // 0-100，与当前团队的匹配度
  sourceUrl?: string;
  installCommand?: string;     // 如何安装此 Agent
}

async function searchMatchingAgents(roles: SelectedRole[]): Promise<AgentSearchResult[]> {
  const results = [];
  
  for (const role of roles) {
    // 搜索 SkillHub
    const agents = await skillhubApi.searchAgents({
      query: `${role.role} ${role.specialty}`,
      category: role.agentType,
      minRating: 3.5
    });
    
    // 计算兼容性分数
    const scoredAgents = agents.map(agent => ({
      ...agent,
      compatibilityScore: calculateCompatibility(agent, role)
    }));
    
    results.push(...scoredAgents);
  }
  
  return results.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}
```

#### 2.2 Agent 复用决策树

```
对于每个需要的角色：
  ↓
搜索 SkillHub
  ↓
┌─ 找到高匹配度 Agent (compatibilityScore > 80)
│   ↓
│   展示给用户确认
│   ↓
│   用户同意 → 直接集成（记录 sourceAgentId）
│   用户拒绝 → 进入创建流程
│
└─ 未找到合适 Agent 或匹配度低
    ↓
    启动 Nvwa 创建新 Agent
    ↓
    自动生成 Agent 配置
    ↓
    保存到用户的 Agent 库
```

### 3. Skill 自动采集与生成

#### 3.1 SkillHub Skill 搜索

**当前状态**: ✅ 已有 SkillHub Skill 搜索 API  
**需要增强**: 🔧 自动化集成

**功能要求**:
- 在创建 Agent 过程中，自动搜索适用的 Skills
- Skills 包括：
  - 工具调用能力（如 web-search, code-execution）
  - 专业知识库（如 marketing-strategies, react-best-practices）
  - 工作流模板（如 agile-development, content-review）

**技术实现**:
```typescript
async function collectSkillsForAgent(agentConfig: AgentConfig): Promise<Skill[]> {
  const requiredSkills = [];
  
  // 1. 根据 Agent 类型推荐基础 Skills
  const baseSkills = await skillhubApi.getRecommendedSkills({
    agentType: agentConfig.type,
    category: agentConfig.category
  });
  requiredSkills.push(...baseSkills);
  
  // 2. 根据职责搜索专用 Skills
  for (const responsibility of agentConfig.responsibilities) {
    const specificSkills = await skillhubApi.searchSkills({
      query: responsibility,
      limit: 3
    });
    requiredSkills.push(...specificSkills);
  }
  
  // 3. 去重和优先级排序
  return deduplicateAndRank(requiredSkills);
}
```

#### 3.2 Skill 缺失处理

**当前状态**: ❌ 未实现  
**目标状态**: ✅ 智能提示和自动生成

**功能要求**:
- 如果找不到合适的 Skill，系统应：
  1. **弹窗提示用户**：
     ```
     ⚠️ 未找到适合的 Skill
  
     我们未能找到满足以下需求的 Skill：
     - [具体需求描述]
     
     您可以选择：
     ○ 使用替代方案（推荐相似的 Skill）
     ○ 跳过此 Skill（Agent 将使用通用能力）
     ○ 创建新 Skill（我们将帮您生成）
     ```
  
  2. **提供替代方案**：
     - 展示 2-3 个最接近的 Skills
     - 说明差异和适用场景
  
  3. **自动生成 Skill**（高级功能）：
     - 使用 LLM 根据需求生成 Skill 定义
     - 用户确认后保存到 SkillHub
     - 标记为"用户自定义"

**技术实现**:
```typescript
interface SkillMissingHandler {
  async handleMissingSkill(requirement: string): Promise<SkillResolution> {
    // Step 1: 搜索替代方案
    const alternatives = await skillhubApi.searchSkills({
      query: requirement,
      fuzzyMatch: true,
      limit: 3
    });
    
    if (alternatives.length > 0) {
      return {
        type: 'alternative',
        alternatives,
        recommendation: alternatives[0]
      };
    }
    
    // Step 2: 无替代方案，建议创建
    return {
      type: 'create_new',
      suggestedDefinition: await this.generateSkillDefinition(requirement),
      canAutoCreate: true
    };
  }
  
  async generateSkillDefinition(requirement: string): Promise<SkillDefinition> {
    const prompt = `
      根据以下需求生成 Skill 定义：
      需求：${requirement}
      
      请生成包含以下内容的 JSON：
      - name: Skill 名称
      - description: 功能描述
      - tools: 需要的工具列表
      - knowledge_base: 相关知识
      - workflow: 工作流程
    `;
    
    const definition = await llm.generate(prompt);
    return JSON.parse(definition);
  }
}
```

### 4. 创建进度动态显示

#### 4.1 进度追踪系统

**当前状态**: ⚠️ 简单加载动画  
**目标状态**: ✅ 详细步骤展示

**功能要求**:
- 实时显示创建进度（0-100%）
- 展示当前步骤和总步骤数
- 每个步骤有清晰的文字说明
- 支持步骤回退和重试

**进度步骤示例**:
```
📊 创建进度: 45% (步骤 3/7)

✅ 步骤 1: 需求分析完成
   └─ 已识别公司类型：营销团队
   
✅ 步骤 2: 角色推荐完成
   └─ 推荐了 4 个角色，用户选择了 3 个
   
🔄 步骤 3: 搜索开源 Agent... (进行中)
   └─ 正在 SkillHub 搜索匹配的 Agent...
   
⏳ 步骤 4: 等待中 - 创建缺失的 Agent
⏳ 步骤 5: 等待中 - 收集和绑定 Skills
⏳ 步骤 6: 等待中 - 生成工作流程
⏳ 步骤 7: 等待中 - 保存虚拟公司配置
```

**技术实现**:
```typescript
interface CreationProgress {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  steps: Array<{
    stepNumber: number;
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    message: string;
    details?: string;
    startedAt?: Date;
    completedAt?: Date;
  }>;
}

// WebSocket 或 Server-Sent Events 推送进度更新
const progressStream = new EventSource(`/api/virtual-company/${sessionId}/progress`);

progressStream.onmessage = (event) => {
  const progress: CreationProgress = JSON.parse(event.data);
  updateUI(progress);
};
```

### 5. 创建完成后的交互流程

#### 5.1 用户后台虚拟公司页面

**当前状态**: ✅ 已有 Team Skill 详情页  
**需要增强**: 🔧 添加 Leader Agent Chat 窗口

**功能要求**:
- 创建完成后，自动跳转到虚拟公司详情页
- 页面右侧或底部自动弹出 **Leader Agent Chat 窗口**
- Chat 窗口由 CEO Agent 主导，主动询问：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 CEO Agent (策划总监)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

您好！您的虚拟公司"智能营销策划公司"已创建成功！🎉

接下来我们可以：

1️⃣ 配置使用场景
   - 您打算将这个团队用于什么项目？
   - 需要接入哪些数据源？

2️⃣ API 导出
   - 生成 API Key，供其他系统调用
   - 提供 RESTful API 文档

3️⃣ 打包到 ProClaw
   - 封装为桌面应用 (proclaw.cc)
   - 支持离线使用和私有化部署

4️⃣ 下载到本地
   - 打包为可执行文件
   - Windows / macOS / Linux

请问您想先进行哪一步？
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 5.2 ProClaw 集成

**当前状态**: ❌ 未集成  
**目标状态**: ✅ 一键打包到 ProClaw

**背景**: ProClaw (proclaw.cc) 是同一团队开发的桌面端平台，用于封装虚拟公司并支持本地化使用。

**功能要求**:
- 在 Chat 窗口中提供"打包到 ProClaw"选项
- 点击后：
  1. 检查用户是否已登录 ProClaw
  2. 如未登录，引导用户登录或注册
  3. 调用 ProClaw API 上传虚拟公司配置
  4. 在 ProClaw 中生成桌面应用
  5. 提供下载链接或直接在 ProClaw 中打开

**技术实现**:
```typescript
async function exportToProClaw(virtualCompanyId: string, userId: string): Promise<ProClawExportResult> {
  // Step 1: 获取虚拟公司配置
  const companyConfig = await getVirtualCompanyConfig(virtualCompanyId);
  
  // Step 2: 调用 ProClaw API
  const response = await fetch('https://api.proclaw.cc/v1/import-team', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getProClawToken(userId)}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      teamName: companyConfig.name,
      teamConfig: companyConfig.config,
      metadata: {
        source: 'nvwax',
        createdAt: new Date().toISOString()
      }
    })
  });
  
  const result = await response.json();
  
  return {
    success: result.success,
    proClawAppId: result.appId,
    downloadUrl: result.downloadUrl,
    message: result.message
  };
}
```

#### 5.3 API 导出功能

**功能要求**:
- 生成专属 API Key
- 提供 API 文档和示例代码
- 支持多种调用方式：
  - RESTful API
  - WebSocket 实时对话
  - SDK（Python/JavaScript/Go）

**技术实现**:
```typescript
interface ApiExportConfig {
  apiKey: string;
  apiEndpoint: string;
  documentation: string;
  examples: {
    curl: string;
    python: string;
    javascript: string;
  };
  rateLimit: {
    requestsPerMinute: number;
    maxTokensPerRequest: number;
  };
}

async function generateApiExport(virtualCompanyId: string): Promise<ApiExportConfig> {
  const apiKey = generateSecureKey();
  
  // 保存到数据库
  await db.apiKeys.create({
    virtualCompanyId,
    apiKey,
    permissions: ['chat', 'execute_workflow'],
    rateLimit: {
      requestsPerMinute: 60,
      maxTokensPerRequest: 4000
    }
  });
  
  return {
    apiKey,
    apiEndpoint: `https://api.nvwax.cc/v1/teams/${virtualCompanyId}`,
    documentation: generateApiDocs(virtualCompanyId),
    examples: generateCodeExamples(virtualCompanyId, apiKey),
    rateLimit: {
      requestsPerMinute: 60,
      maxTokensPerRequest: 4000
    }
  };
}
```

---

## 🏗️ 技术架构设计

### 1. 系统架构图

```
┌─────────────────────────────────────────────────────┐
│                  前端层 (Next.js)                     │
├─────────────────────────────────────────────────────┤
│  • 虚拟公司创建向导                                   │
│  • CEO Agent Chat 界面                               │
│  • 进度追踪 UI                                        │
│  • 角色选择和编辑                                     │
│  • ProClaw 集成界面                                   │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP/WebSocket
┌──────────────────▼──────────────────────────────────┐
│              API 网关层 (Express)                     │
├─────────────────────────────────────────────────────┤
│  • POST /api/virtual-company/create                  │
│  • GET  /api/virtual-company/:id/progress            │
│  • POST /api/virtual-company/:id/export/proclaw      │
│  • POST /api/virtual-company/:id/export/api          │
│  • POST /api/virtual-company/:id/export/package      │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│            业务逻辑层 (Services)                      │
├─────────────────────────────────────────────────────┤
│  • VirtualCompanyCreationService                    │
│    ├─ RequirementAnalyzer (需求分析)                 │
│    ├─ RoleRecommendationEngine (角色推荐)            │
│    ├─ AgentSearchService (Agent 搜索)                │
│    ├─ SkillCollector (Skill 采集)                    │
│    ├─ ProgressTracker (进度追踪)                     │
│    └─ ExportManager (导出管理)                       │
│                                                       │
│  • NvwaLeaderService (复用现有)                       │
│    └─ generateTeamFromNvwa()                         │
│                                                       │
│  • SkillHubIntegrationService                        │
│    ├─ searchAgents()                                 │
│    ├─ searchSkills()                                 │
│    └─ installAgent()                                 │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              外部服务集成层                           │
├─────────────────────────────────────────────────────┤
│  • SkillHub API (agent/skill 搜索)                   │
│  • ProClaw API (桌面应用打包)                        │
│  • LLM Provider (OpenAI/Anthropic)                   │
│  • Package Build Service (PyInstaller)               │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              数据存储层 (PostgreSQL)                  │
├─────────────────────────────────────────────────────┤
│  • team_skills (虚拟公司模板)                        │
│  • agents (Agent 配置)                               │
│  • skills (Skill 定义)                               │
│  • virtual_company_sessions (创建会话)               │
│  • api_keys (API 密钥)                               │
└─────────────────────────────────────────────────────┘
```

### 2. 数据库扩展

#### 2.1 新增表：virtual_company_sessions

```sql
CREATE TABLE virtual_company_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'initiated',
  
  -- 对话历史
  conversation_history JSONB DEFAULT '[]'::jsonb,
  
  -- 收集的需求
  requirements JSONB DEFAULT '{}'::jsonb,
  
  -- 选定的角色
  selected_roles JSONB DEFAULT '[]'::jsonb,
  
  -- 进度信息
  progress JSONB DEFAULT '{
    "currentStep": 0,
    "totalSteps": 7,
    "percentage": 0,
    "steps": []
  }'::jsonb,
  
  -- 关联的最终虚拟公司 ID
  final_team_skill_id TEXT REFERENCES team_skills(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_vcs_user_id ON virtual_company_sessions(user_id);
CREATE INDEX idx_vcs_status ON virtual_company_sessions(status);
```

#### 2.2 扩展现有表

```sql
-- team_skills 表增加字段
ALTER TABLE team_skills 
ADD COLUMN creation_session_id TEXT REFERENCES virtual_company_sessions(id),
ADD COLUMN source_agents JSONB DEFAULT '[]'::jsonb,  -- 引用的开源 Agent IDs
ADD COLUMN custom_skills JSONB DEFAULT '[]'::jsonb;  -- 自定义 Skills

-- agents 表增加字段（如果需要存储创建的 Agent）
ALTER TABLE agents
ADD COLUMN created_from_session TEXT REFERENCES virtual_company_sessions(id),
ADD COLUMN is_from_marketplace BOOLEAN DEFAULT false,  -- 是否来自 SkillHub
ADD COLUMN marketplace_agent_id TEXT;  -- SkillHub 中的原始 ID
```

---

## 📋 实施计划

### Phase 1: 基础架构搭建（预计 3 天）

#### 1.1 数据库迁移
- [ ] 创建 `virtual_company_sessions` 表
- [ ] 扩展 `team_skills` 和 `agents` 表
- [ ] 编写迁移脚本和回滚脚本

#### 1.2 后端服务框架
- [ ] 创建 `VirtualCompanyCreationService` 类
- [ ] 实现会话管理（创建、更新、查询）
- [ ] 实现进度追踪器（ProgressTracker）
- [ ] 添加 WebSocket/SSE 支持用于实时推送

#### 1.3 API 端点
- [ ] `POST /api/virtual-company/sessions` - 创建新会话
- [ ] `GET /api/virtual-company/sessions/:id` - 获取会话状态
- [ ] `POST /api/virtual-company/sessions/:id/message` - 发送消息给 CEO Agent
- [ ] `GET /api/virtual-company/sessions/:id/progress` - 获取进度（SSE）

### Phase 2: 对话式创建流程（预计 5 天）

#### 2.1 CEO Agent 实现
- [ ] 创建 CEO Agent Prompt 模板
- [ ] 实现多轮对话逻辑
- [ ] 集成 LLM API（OpenAI/Anthropic）
- [ ] 实现需求提取和分析

#### 2.2 角色推荐引擎
- [ ] 实现关键词提取
- [ ] 集成角色模板匹配
- [ ] 连接 SkillHub Agent 搜索
- [ ] 实现智能排序算法

#### 2.3 前端创建向导
- [ ] 设计对话式 UI 组件
- [ ] 实现 Chat 界面（类似聊天应用）
- [ ] 实现角色选择和编辑界面
- [ ] 添加进度展示组件

### Phase 3: Agent 搜索与复用（预计 4 天）

#### 3.1 SkillHub 深度集成
- [ ] 增强 `SkillHubIntegrationService`
- [ ] 实现 Agent 兼容性评分算法
- [ ] 实现批量搜索和过滤
- [ ] 添加缓存机制减少 API 调用

#### 3.2 Agent 安装和配置
- [ ] 实现 Agent 导入逻辑
- [ ] 自动配置 Agent 参数
- [ ] 测试 Agent 兼容性
- [ ] 保存引用关系

#### 3.3 Nvwa Agent 创建
- [ ] 复用现有 `nvwa-leader.service.ts`
- [ ] 适配虚拟公司创建场景
- [ ] 自动生成 Agent 配置文件
- [ ] 保存到用户 Agent 库

### Phase 4: Skill 自动采集（预计 3 天）

#### 4.1 Skill 搜索和匹配
- [ ] 实现 Skill 推荐算法
- [ ] 集成 SkillHub Skill 搜索
- [ ] 实现去重和优先级排序
- [ ] 绑定 Skill 到 Agent

#### 4.2 Skill 缺失处理
- [ ] 实现替代方案推荐
- [ ] 创建 Skill 缺失提示 UI
- [ ] 实现 Skill 自动生成（LLM）
- [ ] 保存到 SkillHub（可选）

### Phase 5: 进度追踪和 UI（预计 3 天）

#### 5.1 后端进度系统
- [ ] 实现详细的步骤定义
- [ ] 实现进度更新逻辑
- [ ] 添加 SSE 实时推送
- [ ] 错误处理和重试机制

#### 5.2 前端进度展示
- [ ] 设计进度条和步骤列表
- [ ] 实现实时更新（SSE 客户端）
- [ ] 添加步骤详情展开/收起
- [ ] 错误提示和重试按钮

### Phase 6: 导出和集成功能（预计 4 天）

#### 6.1 Leader Agent Chat 窗口
- [ ] 在虚拟公司详情页添加 Chat 组件
- [ ] 实现自动弹出逻辑
- [ ] 集成 CEO Agent 对话
- [ ] 添加快捷操作按钮

#### 6.2 ProClaw 集成
- [ ] 研究 ProClaw API 文档
- [ ] 实现 OAuth 登录流程
- [ ] 实现配置上传接口
- [ ] 测试端到端流程

#### 6.3 API 导出
- [ ] 实现 API Key 生成
- [ ] 生成 API 文档
- [ ] 提供代码示例
- [ ] 实现速率限制

#### 6.4 本地打包
- [ ] 复用现有 `PackageBuildService`
- [ ] 优化打包速度
- [ ] 添加平台选择 UI
- [ ] 测试跨平台兼容性

### Phase 7: 测试和优化（预计 3 天）

#### 7.1 端到端测试
- [ ] 测试完整创建流程
- [ ] 测试各种边界情况
- [ ] 性能测试和优化
- [ ] 用户体验测试

#### 7.2 文档和示例
- [ ] 编写用户指南
- [ ] 创建视频教程
- [ ] 提供示例模板
- [ ] FAQ 和故障排查

---

## ⚠️ 风险评估

### 高风险项

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| LLM API 成本高 | 高 | 中 | 使用缓存、限流、降级策略 |
| SkillHub API 限流 | 中 | 中 | 实现请求队列和重试机制 |
| ProClaw API 不稳定 | 低 | 高 | 提供备用导出方案 |
| 创建流程复杂度高 | 高 | 中 | 分阶段发布，先 MVP 后完善 |

### 中风险项

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| 用户不理解对话流程 | 中 | 中 | 提供引导教程和示例 |
| Agent 兼容性问题 | 中 | 中 | 加强测试和验证 |
| 进度推送延迟 | 中 | 低 | 优化 SSE 连接和fallback |

### 低风险项

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| 数据库性能瓶颈 | 低 | 中 | 添加索引和缓存 |
| 前端兼容性问题 | 低 | 低 | 主流浏览器测试 |

---

## 📊 成功指标

### 功能性指标
- [ ] 90% 的用户能在 5 分钟内完成虚拟公司创建
- [ ] 80% 的角色能找到匹配的开源 Agent
- [ ] 创建成功率 ≥ 95%
- [ ] 平均创建时间 < 3 分钟

### 用户体验指标
- [ ] 用户满意度评分 ≥ 4.5/5
- [ ] 首次使用完成率 ≥ 85%
- [ ] 用户留存率（7天）≥ 40%

### 技术指标
- [ ] API 响应时间 < 500ms（不含 LLM）
- [ ] SSE 推送延迟 < 1s
- [ ] 系统可用性 ≥ 99.9%

---

## 🎓 经验借鉴

### 从现有功能中学习

1. **BossClaw 打包功能**（已完成）
   - ✅ 异步任务队列设计
   - ✅ 进度追踪机制
   - ✅ 错误处理和重试
   - ⚠️ 需要改进：更细粒度的进度展示

2. **Nvwa Leader Service**（已实现）
   - ✅ 团队配置生成逻辑
   - ✅ Mock 数据降级策略
   - ⚠️ 需要增强：支持对话式交互

3. **SkillHub 集成**（已有）
   - ✅ Agent 和 Skill 搜索 API
   - ⚠️ 需要增强：兼容性评分和智能推荐

### 行业最佳实践

1. **对话式 AI 产品**
   - GitHub Copilot Chat
   - Cursor IDE
   - Replit AI
   
   **借鉴点**：
   - 主动引导而非被动等待
   - 上下文感知和记忆
   - 即时反馈和进度展示

2. **低代码/无代码平台**
   - Zapier
   - Make (Integromat)
   - Bubble
   
   **借鉴点**：
   - 模板化和预设选项
   - 可视化配置界面
   - 一键部署和分享

---

## 📞 下一步行动

### 立即执行（本周）
1. ✅ 将此需求文档提交团队评审
2. 📝 召开技术方案讨论会
3. 🎯 确定 MVP 范围（可能裁剪部分功能）
4. 📅 制定详细的项目时间表

### 短期计划（下周）
1. 🏗️ 开始 Phase 1：数据库迁移和基础架构
2. 👥 分配开发任务
3. 🧪 搭建测试环境
4. 📚 研究 ProClaw API 文档

### 中期计划（本月）
1. 💻 完成 Phase 1-3 开发
2. 🧪 内部测试和迭代
3. 📝 编写用户文档
4. 🎥 制作演示视频

---

## 📝 附录

### A. 相关文档链接
- [BossClaw 虚拟公司计划](./BOSSCLAW-VIRTUAL-COMPANY-PLAN.md)
- [Nvwa Agent Factory 计划](./NVWA-AGENT-FACTORY-PLAN.md)
- [BossClaw 打包集成指南](../BOSSCLAW-PACKAGE-INTEGRATION.md)
- [ProClaw 官网](https://proclaw.cc)

### B. 技术栈总结
- **前端**: Next.js 14, React, TypeScript, TailwindCSS
- **后端**: Express, TypeScript, PostgreSQL
- **AI**: OpenAI GPT-4, Anthropic Claude
- **集成**: SkillHub API, ProClaw API
- **打包**: PyInstaller, Python

### C. 团队成员
- **产品经理**: [待指定]
- **前端开发**: [待指定]
- **后端开发**: [待指定]
- **AI 工程师**: [待指定]
- **测试工程师**: [待指定]

---

**文档状态**: 📝 需求分析完成，等待评审  
**最后更新**: 2026-05-16  
**下次评审**: [待安排]
