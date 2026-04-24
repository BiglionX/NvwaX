# SkillHub API 与 Flowise 集成对接方案

## 一、API 可用性评估

### ✅ 结论：**完全可用，且已为 AI Agent 优化**

SkillHub 在线版本 (https://skillhub.proclaw.cc) 的 API **已经具备完整的 Agent 集成能力**，特别是提供了专门的 `/api/tools/discovery` 端点，这正是 Flowise 所需要的。

---

## 二、核心 API 端点清单

### 1. **工具发现接口（最关键）**

```
GET /api/tools/discovery
```

**用途**: 让 Flowise 自动发现可用的技能工具  
**响应示例**:
```json
{
  "platform": "SkillHub",
  "version": "1.0.0",
  "tools": [
    {
      "id": "skillhub-search",
      "name": "Search Skills",
      "description": "在 SkillHub 中搜索 AI 技能、工具和库",
      "endpoint": "/api/search",
      "method": "GET",
      "parameters": [
        { "name": "q", "type": "string", "required": true, "description": "搜索关键词" },
        { "name": "category", "type": "string", "required": false, "description": "分类过滤" }
      ]
    },
    {
      "id": "skillhub-get-detail",
      "name": "Get Skill Details",
      "description": "获取特定技能的详细文档、版本信息和仓库地址",
      "endpoint": "/api/skills/{slug}",
      "method": "GET",
      "parameters": [
        { "name": "slug", "type": "string", "required": true, "description": "技能的唯一标识符" }
      ]
    },
    {
      "id": "skillhub-semantic-search",
      "name": "Semantic Search",
      "description": "使用自然语言进行语义搜索，寻找功能相似的技能",
      "endpoint": "/api/search/semantic",
      "method": "GET",
      "parameters": [
        { "name": "q", "type": "string", "required": true, "description": "自然语言查询" }
      ]
    }
  ],
  "documentation": "/api/openapi"
}
```

**集成价值**: ⭐⭐⭐⭐⭐  
Flowise 可以直接调用此接口动态加载所有可用工具，无需硬编码。

---

### 2. **技能搜索接口**

```
GET /api/search?q={query}&category={category}&page={page}&pageSize={size}&sortBy={sort}
```

**查询参数**:
- `q`: 搜索关键词（必填或与其他条件组合）
- `category`: 分类过滤（可选）
- `subcategory`: 子分类过滤（可选）
- `language`: 语言过滤（可选）
- `minQuality`: 最小质量评分（可选）
- `source`: 数据源过滤（可选）
- `page`: 页码，默认 1
- `pageSize`: 每页数量，默认 20（最大 100）
- `sortBy`: 排序方式 (`relevance|quality|stars|downloads|updated`)，默认 `relevance`

**响应示例**:
```json
{
  "results": [
    {
      "id": "skill_xxx",
      "slug": "drawio-skill",
      "name": "Draw.io Skill",
      "description": "生成流程图和架构图",
      "category": "数据可视化",
      "qualityScore": 0.85,
      "stars": 390,
      "downloads": 1200,
      "repositoryUrl": "https://github.com/...",
      "tags": ["agent-skills", "drawio"],
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 626,
  "page": 1,
  "pageSize": 20,
  "totalPages": 32
}
```

**高级搜索 (POST)**:
```
POST /api/search
Content-Type: application/json

{
  "query": "数据处理",
  "categories": ["AI代理", "开发工具"],
  "languages": ["Python", "TypeScript"],
  "minStars": 100,
  "minQualityScore": 0.7,
  "page": 1,
  "pageSize": 20
}
```

---

### 3. **技能详情接口**

```
GET /api/skills/{slug}
```

**支持通过 slug 或 ID 查询**  
**响应示例**:
```json
{
  "id": "skill_xxx",
  "slug": "drawio-skill",
  "name": "Draw.io Skill",
  "description": "Use when user requests diagrams, flowcharts...",
  "category": "数据可视化",
  "tags": ["agent-skills", "codex", "drawio"],
  "status": "APPROVED",
  "version": "1.2.0",
  "repositoryUrl": "https://github.com/example/drawio-skill",
  "author": {
    "id": "user_xxx",
    "name": "SkillHub System",
    "image": "https://..."
  },
  "namespace": {
    "id": "ns_xxx",
    "slug": "official",
    "name": "Official Skills"
  },
  "versions": [
    {
      "version": "1.2.0",
      "content": "...",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "_count": {
    "versions": 5
  },
  "createdAt": "2023-12-01T08:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

### 4. **技能列表接口**

```
GET /api/skills?page=1&limit=20&search={keyword}&status=APPROVED&sortBy=updatedAt&sortOrder=desc
```

**查询参数**:
- `page`: 页码，默认 1
- `limit`: 每页数量，默认 20
- `search`: 搜索关键词
- `status`: 状态过滤 (`APPROVED/DRAFT/PENDING_REVIEW/ARCHIVED`，支持多个用逗号分隔)
- `namespaceId`: 命名空间 ID
- `authorId`: 作者 ID
- `sortBy`: 排序字段 (`createdAt/updatedAt/name`)，默认 `updatedAt`
- `sortOrder`: 排序方向 (`asc/desc`)，默认 `desc`
- `draft`: 是否为草稿箱模式 (`true/false`)

**响应示例**:
```json
{
  "skills": [
    {
      "id": "skill_xxx",
      "slug": "example-skill",
      "name": "Example Skill",
      "description": "...",
      "category": "AI代理",
      "tags": ["ai", "agent"],
      "status": "APPROVED",
      "author": {
        "id": "user_xxx",
        "name": "Author Name",
        "image": "https://..."
      },
      "namespace": {
        "id": "ns_xxx",
        "slug": "community",
        "name": "Community"
      },
      "_count": {
        "versions": 3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 626,
    "totalPages": 32
  }
}
```

---

### 5. **语义搜索接口**

```
GET /api/search/semantic?q={natural_language_query}
```

**用途**: 使用向量搜索找到语义相关的技能  
**示例**:
```
GET /api/search/semantic?q=如何生成流程图和架构图
```

---

### 6. **相关技能推荐**

```
GET /api/skills/{slug}/related?limit=5
```

**用途**: 基于当前技能推荐相关技能，用于 Agent 工作流扩展

---

## 三、Flowise 集成方案

### 方案 A：使用 OpenAPI Toolkit（推荐）

**步骤**:

1. **获取 OpenAPI 规范**
   ```
   GET https://skillhub.proclaw.cc/api/openapi
   ```

2. **在 Flowise 中添加 OpenAPI 工具**
   - 打开 Flowise 界面
   - 添加 `OpenAPI Toolkit` 节点
   - 输入 OpenAPI spec URL: `https://skillhub.proclaw.cc/api/openapi`
   - Flowise 会自动解析并生成所有可用的 API 工具节点

3. **配置认证（如需要）**
   - 如果 API 需要 API Key，在 OpenAPI spec 中添加 security scheme
   - 或在 Flowise 中配置 Header: `Authorization: Bearer {API_KEY}`

**优势**:
- ✅ 零代码集成
- ✅ 自动同步 API 变更
- ✅ Flowise 原生支持

---

### 方案 B：使用 Custom Tool 节点

**适用场景**: 需要自定义逻辑或预处理

**步骤**:

1. **创建自定义工具类**
   ```typescript
   // skillhub-tool.ts
   import { Tool } from 'langchain/tools';
   
   export class SkillHubSearchTool extends Tool {
     name = 'skillhub_search';
     description = '在 SkillHub 中搜索 AI 技能和工具';
     
     async _call(query: string): Promise<string> {
       const response = await fetch(
         `https://skillhub.proclaw.cc/api/search?q=${encodeURIComponent(query)}&pageSize=5`
       );
       const data = await response.json();
       
       return JSON.stringify(data.results.map(skill => ({
         name: skill.name,
         description: skill.description,
         slug: skill.slug,
         qualityScore: skill.qualityScore
       })));
     }
   }
   
   export class SkillHubDetailTool extends Tool {
     name = 'skillhub_get_detail';
     description = '获取 SkillHub 技能的详细信息';
     
     async _call(slug: string): Promise<string> {
       const response = await fetch(
         `https://skillhub.proclaw.cc/api/skills/${slug}`
       );
       const data = await response.json();
       
       return JSON.stringify({
         name: data.name,
         description: data.description,
         repositoryUrl: data.repositoryUrl,
         versions: data.versions,
         tags: data.tags
       });
     }
   }
   ```

2. **在 Flowise 中注册自定义工具**
   - 使用 `Custom Tool` 节点
   - 导入上述工具类
   - 配置工具描述和参数

**优势**:
- ✅ 完全控制请求逻辑
- ✅ 可以添加缓存、重试等机制
- ✅ 灵活的数据转换

---

### 方案 C：使用 MCP (Model Context Protocol)

**前提**: 部署 `mcp-flowise` Python 包

**步骤**:

1. **安装 mcp-flowise**
   ```bash
   pip install mcp-flowise
   ```

2. **配置 MCP 服务器**
   ```python
   # mcp_server.py
   from mcp_flowise import MCPServer
   
   server = MCPServer()
   
   @server.tool()
   def search_skills(query: str, category: str = None):
       """在 SkillHub 中搜索技能"""
       url = f"https://skillhub.proclaw.cc/api/search?q={query}"
       if category:
           url += f"&category={category}"
       response = requests.get(url)
       return response.json()
   
   @server.tool()
   def get_skill_detail(slug: str):
       """获取技能详情"""
       response = requests.get(f"https://skillhub.proclaw.cc/api/skills/{slug}")
       return response.json()
   
   if __name__ == '__main__':
       server.run()
   ```

3. **在 Flowise 中连接 MCP 服务器**
   - 添加 `MCP Client` 节点
   - 配置 MCP 服务器地址
   - 自动发现所有注册的 tools

**优势**:
- ✅ 标准化的协议
- ✅ 支持多种 LLM 框架
- ✅ 易于扩展新工具

---

## 四、NvwaX 集成架构设计

### 整体架构图

```
┌─────────────────────────────────────────────┐
│           NvwaX Frontend (SkillHub UI)      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  | Skill    |  | Agent    |  | Flowise  |  │
│  | Browser  |  | Builder  |  | Embed    |  │
│  └──────────┘  └──────────┘  └──────────┘  │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│         NvwaX Backend (Flowise Fork)        │
│  ┌──────────────┐  ┌──────────────────┐    │
│  | Agent        |  | Workflow         |    │
│  | Generator    |  | Customizer       |    │
│  └──────────────┘  └──────────────────┘    │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│      SkillHub API Integration Layer         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  | OpenAPI  |  | Custom   |  | MCP      |  │
│  | Toolkit  |  | Tools    |  | Server   |  │
│  └──────────┘  └──────────┘  └──────────┘  │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│      SkillHub Platform (Proclaw.cc)         │
│  /api/tools/discovery                       │
│  /api/search                                │
│  /api/skills/{slug}                         │
│  /api/search/semantic                       │
└─────────────────────────────────────────────┘
```

### 核心工作流程

#### 流程 1：对话式 Agent 生成

```
用户输入: "帮我创建一个能生成流程图的 Agent"
    ↓
NvwaX Backend (LLM 意图识别)
    ↓
调用 SkillHub API: /api/search/semantic?q=生成流程图
    ↓
返回相关技能: drawio-skill, diagram-generator, ...
    ↓
LLM 选择最佳技能并构建 Agent 配置
    ↓
Flowise 生成工作流 (包含选中的技能工具)
    ↓
返回可执行的 Agent 给用户
```

#### 流程 2：技能浏览与集成

```
用户在 SkillHub UI 浏览技能
    ↓
点击"添加到 Agent"按钮
    ↓
调用 /api/skills/{slug} 获取详情
    ↓
将技能作为工具添加到当前 Agent 工作流
    ↓
实时更新 Flowise 画布
```

---

## 五、实施计划（里程碑 1 & 2）

### 第 1 周：环境搭建与 API 调研

**任务清单**:
- [ ] Fork Flowise 代码库并重命名为 NvwaX
- [ ] 本地运行 Flowise 开发环境
- [ ] 测试 SkillHub API 连通性
  ```bash
  curl https://skillhub.proclaw.cc/api/tools/discovery
  curl "https://skillhub.proclaw.cc/api/search?q=drawio"
  curl https://skillhub.proclaw.cc/api/skills/drawio-skill
  ```
- [ ] 确认 API 认证机制（如需）
- [ ] 编写 API 客户端封装（TypeScript）

**产出**:
- ✅ NvwaX 开发环境就绪
- ✅ API 连通性测试报告
- ✅ TypeScript API Client 库

---

### 第 2 周：OpenAPI 集成

**任务清单**:
- [ ] 检查 `/api/openapi` 端点是否可用
  ```bash
  curl https://skillhub.proclaw.cc/api/openapi
  ```
- [ ] 如不可用，生成 OpenAPI spec 文件
- [ ] 在 Flowise 中测试 OpenAPI Toolkit 节点
- [ ] 验证所有工具自动发现功能
- [ ] 配置 CORS 和安全策略

**产出**:
- ✅ OpenAPI spec 文件
- ✅ Flowise OpenAPI 工具节点配置
- ✅ 自动化测试用例

---

### 第 3-4 周：核心功能开发

**任务清单**:
- [ ] 实现"对话式 Agent 生成"工作流
  - 用户输入 → LLM 意图识别 → 调用 SkillHub API → 生成 Agent 配置
- [ ] 创建自定义 Flowise 节点：`SkillHubSearchNode`
- [ ] 创建自定义 Flowise 节点：`SkillHubDetailNode`
- [ ] 实现 Agent 模板系统
- [ ] 单元测试与集成测试

**产出**:
- ✅ 自定义 Flowise 节点
- ✅ Agent 生成工作流
- ✅ 完整测试覆盖

---

### 第 5-6 周：前端集成

**任务清单**:
- [ ] 在 SkillHub UI 中嵌入 Flowise 界面
- [ ] 实现技能浏览器与 Agent 构建器的联动
- [ ] 添加 NvwaX branding 和 footer
- [ ] 用户体验优化
- [ ] 端到端测试

**产出**:
- ✅ 整合的前端应用
- ✅ MVP 演示版本

---

## 六、API 认证与安全

### 当前状态
根据代码分析，SkillHub API **部分端点需要认证**：
- ✅ 公开端点（无需认证）:
  - `GET /api/tools/discovery`
  - `GET /api/search`
  - `GET /api/skills/{slug}`
  - `GET /api/skills` (仅返回 APPROVED 状态)

- 🔒 需要认证的端点:
  - `POST /api/skills` (创建技能)
  - `PUT /api/skills/{slug}` (更新技能)
  - `DELETE /api/skills/{slug}` (删除技能)

### NvwaX 集成建议

**方案 1：使用只读 API（推荐初期）**
- 仅调用公开端点
- 无需处理认证
- 快速启动 MVP

**方案 2：API Key 认证**
- 在 SkillHub 后台生成 API Key
- 在 Flowise 中配置 Header: `Authorization: Bearer {API_KEY}`
- 适用于需要写入操作的场景

**方案 3：OAuth 2.0**
- 完整的用户授权流程
- 适合企业级部署
- 实施复杂度较高

---

## 七、性能优化建议

### 1. 缓存策略

```typescript
// Redis 缓存示例
const cache = new RedisCache();

async function searchSkillsWithCache(query: string) {
  const cacheKey = `search:${query}`;
  
  // 尝试从缓存读取
  const cached = await cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 调用 API
  const result = await fetchSkillHubAPI(query);
  
  // 写入缓存（TTL: 5分钟）
  await cache.set(cacheKey, JSON.stringify(result), 300);
  
  return result;
}
```

### 2. 批量请求

```typescript
// 批量获取技能详情
async function getSkillsBatch(slugs: string[]) {
  const promises = slugs.map(slug => 
    fetch(`https://skillhub.proclaw.cc/api/skills/${slug}`)
  );
  
  const responses = await Promise.all(promises);
  return Promise.all(responses.map(r => r.json()));
}
```

### 3. 请求限流

```typescript
// 使用 p-limit 控制并发
import pLimit from 'p-limit';

const limit = pLimit(5); // 最多 5 个并发请求

async function searchMultipleQueries(queries: string[]) {
  const results = await Promise.all(
    queries.map(query => 
      limit(() => searchSkills(query))
    )
  );
  
  return results;
}
```

---

## 八、错误处理与监控

### 常见错误码

| 状态码 | 含义 | 处理建议 |
|--------|------|----------|
| 200 | 成功 | 正常处理响应 |
| 400 | 请求参数错误 | 检查参数格式 |
| 401 | 未授权 | 检查 API Key |
| 403 | 禁止访问 | 检查权限 |
| 404 | 资源不存在 | 检查 slug/ID |
| 429 | 请求过于频繁 | 实施退避策略 |
| 500 | 服务器错误 | 重试或联系支持 |

### 重试策略

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status === 429) {
        // 限流，等待后重试
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      
      if (response.status >= 500) {
        // 服务器错误，重试
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      
      // 其他错误，不重试
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

---

## 九、测试计划

### 1. API 连通性测试

```bash
# 测试工具发现
curl https://skillhub.proclaw.cc/api/tools/discovery | jq

# 测试搜索
curl "https://skillhub.proclaw.cc/api/search?q=drawio&pageSize=3" | jq

# 测试详情
curl https://skillhub.proclaw.cc/api/skills/drawio-skill | jq

# 测试语义搜索
curl "https://skillhub.proclaw.cc/api/search/semantic?q=生成流程图" | jq
```

### 2. Flowise 集成测试

- [ ] OpenAPI Toolkit 能正确加载所有工具
- [ ] 自定义工具节点能正常调用 API
- [ ] Agent 工作流能正确使用技能工具
- [ ] 错误处理符合预期

### 3. 端到端测试

- [ ] 用户输入自然语言 → 生成可用 Agent
- [ ] Agent 能正确调用 SkillHub 技能
- [ ] 前端界面流畅无卡顿

---

## 十、下一步行动

### 立即执行（今天）

1. **验证 API 可用性**
   ```bash
   curl https://skillhub.proclaw.cc/api/tools/discovery
   curl https://skillhub.proclaw.cc/api/openapi
   ```

2. **Fork Flowise 仓库**
   - 访问 https://github.com/FlowiseAI/Flowise
   - Fork 到 BiglionX 组织
   - 重命名为 NvwaX

3. **搭建本地开发环境**
   ```bash
   git clone https://github.com/BiglionX/NvwaX.git
   cd NvwaX
   npm install
   npm run dev
   ```

### 本周内完成

- [ ] 完成 API 连通性测试报告
- [ ] 确定集成方案（推荐 OpenAPI Toolkit）
- [ ] 创建第一个自定义 Flowise 节点原型
- [ ] 更新项目计划文档

---

## 十一、风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| SkillHub API 不稳定 | 高 | 低 | 实施缓存和重试机制 |
| Flowise 定制难度大 | 中 | 中 | 优先使用现有节点，必要时才自定义 |
| API 认证复杂 | 中 | 低 | 初期使用公开端点 |
| 性能瓶颈 | 中 | 中 | 实施缓存、批处理、限流 |
| 时间不足 | 高 | 中 | 聚焦 MVP 核心功能，延后高级特性 |

---

## 十二、总结

✅ **SkillHub API 完全可用且已为 AI Agent 优化**  
✅ **推荐使用 OpenAPI Toolkit 方案，零代码集成**  
✅ **2 个月 MVP 时间线可行，但需严格控制范围**  
✅ **优先实现只读功能，认证和写入操作可延后**  

**关键成功因素**:
1. 充分利用 Flowise 现有能力，避免重复造轮子
2. 聚焦核心功能：技能搜索 → Agent 生成 → 工作流执行
3. 快速迭代，每周都有可演示的成果
4. 建立完善的测试和监控机制

---

**文档版本**: v1.0  
**最后更新**: 2026-04-24  
**负责人**: NvwaX 开发团队
