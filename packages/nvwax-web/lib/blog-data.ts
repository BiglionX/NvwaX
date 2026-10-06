/**
 * NvwaX Blog - 内容数据层
 *
 * 存储所有博客文章数据，支持静态生成与 SEO。
 * 每篇文章包含：slug、标题、摘要、正文、分类、标签、作者、发布时间、封面图等。
 *
 * SEO 策略：
 * - 每个 slug 对应一个唯一 URL（/blog/[slug]）
 * - 每篇文章有完整的 Open Graph 和 Article JSON-LD
 * - 自动生成阅读时间估算
 */

export interface BlogPost {
  slug: string;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  contentZh: string;   // Markdown 格式正文
  contentEn: string;   // 英文正文
  category: string;
  categoryZh: string;
  categoryEn: string;
  tags: string[];
  author: string;
  publishedAt: string; // ISO date string
  updatedAt?: string;
  coverImage?: string;
  featured?: boolean;
}

/** 阅读速度（字/分钟），用于估算阅读时间 */
const WORDS_PER_MINUTE = 300;

/** 估算阅读时间（分钟） */
function estimateReadTime(content: string): number {
  const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = (content.match(/[a-zA-Z]+/g) || []).length;
  const totalWords = chineseChars + englishWords * 2; // 英文单词约等于2个汉字
  return Math.max(1, Math.ceil(totalWords / WORDS_PER_MINUTE));
}

// ─────────────────────── 文章数据 ───────────────────────

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "nvwax-vs-crewai-langgraph",
    titleZh: "NvwaX vs CrewAI vs LangGraph：多智能体框架全面对比",
    titleEn: "NvwaX vs CrewAI vs LangGraph: Comprehensive Multi-Agent Framework Comparison",
    summaryZh: "本文从架构设计、团队协作能力、导出格式、技术门槛、生态支持五大维度，对比 NvwaX、CrewAI 和 LangGraph 三大多智能体开发框架，帮你选择最适合的工具。",
    summaryEn: "This article compares NvwaX, CrewAI, and LangGraph across five dimensions: architecture design, team collaboration capabilities, export formats, technical barriers, and ecosystem support, helping you choose the right tool.",
    contentZh: `## 引言

在 AI Agent 开发领域，CrewAI 和 LangGraph 是两个被广泛使用的框架。而 NvwaX 作为后起之秀，以"AI 虚拟公司"理念切入，提供了不同的解决思路。本文从五大维度进行客观对比。

## 一、架构设计对比

### CrewAI：角色驱动型
CrewAI 以"角色（Role）"为核心，每个 Agent 有明确的角色定义（CEO、工程师、设计师），通过定义角色之间的任务流转实现协作。

\`\`\`python
from crewai import Agent, Task, Crew

engineer = Agent(role="工程师", goal="编写高质量代码", backstory="资深全栈工程师")
task = Task(description="实现用户登录功能", agent=engineer)
\`\`\`

### LangGraph：图状态机型
LangGraph 基于有向图，每个节点是一个 Agent 或工具，边定义状态转换。适合需要复杂流程控制的场景。

\`\`\`python
from langgraph.graph import StateGraph
graph = StateGraph(AgentState)
graph.add_node("agent", agent_node)
graph.add_edge("agent", "tools")
\`\`\`

### NvwaX：AI 公司 OS 型
NvwaX 将整个团队视为一家"虚拟公司"，CEO Agent 自动编排工作流，无需手动定义任务流转。

**核心差异：** CrewAI 需要手动编排任务，LangGraph 需要设计状态图，NvwaX 由 AI 自动编排。

## 二、团队协作能力

| 特性 | CrewAI | LangGraph | NvwaX |
|------|--------|-----------|-------|
| 多 Agent 协作 | ✅ 基础 | ✅ 高级 | ✅ 自动编排 |
| CEO 角色 | ❌ | ❌ | ✅ |
| 任务分配 | 手动 | 手动 | AI 自动 |
| 上下文管理 | 基础 | 高级 | 高级 |

## 三、导出与集成

**CrewAI：** 支持导出为 CrewAI 格式，生态较为封闭。

**LangGraph：** 导出为 LangGraph JSON/YAML，与 LangChain 生态深度绑定。

**NvwaX：** 支持导出为 ProClaw / CrewAI / LangGraph / JSON / YAML 五种格式，灵活度最高。

## 四、技术门槛

- **CrewAI：** 中等，需要 Python 基础和 Agent 概念理解
- **LangGraph：** 较高，需要状态机思维和 LangChain 经验
- **NvwaX：** 低，通过对话式 UI 和向导流程降低门槛

## 五、生态与社区

| 维度 | CrewAI | LangGraph | NvwaX |
|------|--------|-----------|-------|
| GitHub Stars | 30k+ | 20k+ | 快速增长中 |
| 插件生态 | 一般 | 丰富（LangChain） | 发展中 |
| MCP 协议支持 | ❌ | ❌ | ✅ |
| 中国区支持 | 一般 | 一般 | 优秀（Gitee/ModelScope） |

## 结论

- **选 CrewAI：** 如果你需要快速原型，团队熟悉 Python
- **选 LangGraph：** 如果你需要复杂流程控制和 LangChain 生态
- **选 NvwaX：** 如果你想用对话式方式创建 AI 团队，需要 MCP 集成，或需要 CrewAI/LangGraph 格式导出`,
    contentEn: `## Introduction

In the AI Agent development space, CrewAI and LangGraph are two widely used frameworks. NvwaX, as a rising star, takes a different approach with the "AI Virtual Company" concept. This article provides an objective comparison across five dimensions.

## 1. Architecture Comparison

### CrewAI: Role-Driven
CrewAI centers on "roles" — each Agent has a clear role definition (CEO, Engineer, Designer), with collaboration defined through task flows between roles.

### LangGraph: Graph State Machine
LangGraph is based on directed graphs, where each node is an Agent or tool, and edges define state transitions. Suitable for scenarios requiring complex flow control.

### NvwaX: AI Company OS
NvwaX treats the entire team as a "virtual company," with the CEO Agent automatically orchestrating workflows without manual task flow definition.

## 2. Team Collaboration

| Feature | CrewAI | LangGraph | NvwaX |
|---------|--------|-----------|-------|
| Multi-Agent | ✅ Basic | ✅ Advanced | ✅ Auto |
| CEO Role | ❌ | ❌ | ✅ |
| Task Assignment | Manual | Manual | AI Auto |
| Context Management | Basic | Advanced | Advanced |

## 3. Export & Integration

- **CrewAI:** Export to CrewAI format, relatively closed ecosystem
- **LangGraph:** Export to LangGraph JSON/YAML, deeply integrated with LangChain
- **NvwaX:** Export to ProClaw/CrewAI/LangGraph/JSON/YAML — highest flexibility

## 4. Technical Barrier

- **CrewAI:** Medium — requires Python basics and Agent concept understanding
- **LangGraph:** Higher — requires state machine thinking and LangChain experience
- **NvwaX:** Low — conversational UI and wizard process lower the barrier

## 5. Ecosystem & Community

| Dimension | CrewAI | LangGraph | NvwaX |
|-----------|--------|-----------|-------|
| GitHub Stars | 30k+ | 20k+ | Growing |
| Plugin Ecosystem | Average | Rich | Developing |
| MCP Support | ❌ | ❌ | ✅ |
| China Region | Average | Average | Excellent |

## Conclusion

- **Choose CrewAI:** For rapid prototyping, Python-familiar teams
- **Choose LangGraph:** For complex workflow control and LangChain ecosystem
- **Choose NvwaX:** For conversational AI team creation, MCP integration, or multi-format export`,
    category: "comparison",
    categoryZh: "框架对比",
    categoryEn: "Framework Comparison",
    tags: ["CrewAI", "LangGraph", "NvwaX", "多智能体", "Multi-Agent"],
    author: "NvwaX Team",
    publishedAt: "2026-09-15",
    featured: true,
  },
  {
    slug: "how-to-build-ai-marketing-team",
    titleZh: "5分钟搭建营销 AI 团队：从 0 到 1 的完整指南",
    titleEn: "Build a Marketing AI Team in 5 Minutes: A Complete Guide from Zero to One",
    summaryZh: "手把手教你使用 NvwaX 创建一支营销 AI 团队，包含市场总监、文案、设计师等多个角色，自动完成内容策划、社交媒体运营、数据分析等工作。",
    summaryEn: "Learn how to create a marketing AI team using NvwaX, with multiple roles including Marketing Director, Copywriter, and Designer, automatically handling content planning, social media operations, and data analysis.",
    contentZh: `## 为什么需要营销 AI 团队？

传统营销需要聘请多个角色：市场总监、文案、设计师、数据分析师。AI 时代，一支虚拟 AI 团队可以 7×24 小时运转，成本仅为人工的 1/10。

## 使用 NvwaX 创建营销团队

### 步骤 1：选择公司类型
登录 NvwaX，进入"Nvwa 工厂"，选择"营销公司"模板。

### 步骤 2：描述核心目标
输入："我是电商品牌，需要在抖音、小红书、微信三个平台做日常运营"

### 步骤 3：AI 自动编排
NvwaX CEO Agent 会自动设计团队结构：
- 🏢 **CEO**：统筹全局，制定营销策略
- 📊 **市场总监**：制定渠道策略、竞品分析
- ✍️ **文案专员**：撰写各平台营销文案
- 📸 **设计师**：生成配图和视觉素材
- 📈 **数据分析师**：追踪投放效果、优化策略

### 步骤 4：分配任务
以"新品上市"为例，向团队下达任务：
"我们下周要上新一款蓝牙耳机，目标用户是 25-35 岁女性，请制定完整的上市推广方案"

CEO Agent 会自动将任务分解并分配给各 Agent 执行，实时反馈进度和结果。

## 输出成果

- 📋 30 天营销日历
- 📝 各平台种草文案（小红书/抖音/公众号）
- 📊 投放预算分配方案
- 📈 KPI 追踪表

## 立即开始

访问 [nvwax.proclaw.cc](https://nvwax.proclaw.cc)，点击"开始组建 AI 公司"，5 分钟拥有你的专属营销团队。`,
    contentEn: `## Why Do You Need a Marketing AI Team?

Traditional marketing requires hiring multiple roles: Marketing Director, Copywriter, Designer, Data Analyst. In the AI era, a virtual AI team can run 24/7 at 1/10 the cost.

## Create Your Marketing Team with NvwaX

### Step 1: Choose Company Type
Log in to NvwaX, go to "Nvwa Factory," and select the "Marketing Company" template.

### Step 2: Describe Core Goals
Input: "I'm an e-commerce brand, need daily operations across Douyin, Xiaohongshu, and WeChat"

### Step 3: AI Auto-Orchestration
NvwaX CEO Agent automatically designs team structure with CEO, Marketing Director, Copywriter, Designer, and Data Analyst roles.

### Step 4: Assign Tasks
For "New Product Launch," the CEO Agent automatically decomposes tasks and assigns them to agents with real-time progress feedback.

## Output Results

- 30-day marketing calendar
- Platform-specific content (Xiaohongshu/Douyin/WeChat)
- Budget allocation plan
- KPI tracking dashboard`,
    category: "tutorial",
    categoryZh: "教程",
    categoryEn: "Tutorial",
    tags: ["营销", "AI 团队", "教程", "Marketing", "AI Team"],
    author: "NvwaX Team",
    publishedAt: "2026-09-10",
    featured: true,
  },
  {
    slug: "mcp-protocol-integration-guide",
    titleZh: "MCP 协议接入指南：让 NvwaX 连接任意 AI Agent 框架",
    titleEn: "MCP Protocol Integration Guide: Connect NvwaX with Any AI Agent Framework",
    summaryZh: "Model Context Protocol（MCP）是 AI Agent 互操作的标准协议。本文详细讲解如何在 NvwaX 中使用 MCP 工具，以及如何与 CrewAI、LangGraph 等框架集成。",
    summaryEn: "Model Context Protocol (MCP) is the standard protocol for AI Agent interoperability. This article explains how to use MCP tools in NvwaX and integrate with frameworks like CrewAI and LangGraph.",
    contentZh: `## 什么是 MCP 协议？

MCP（Model Context Protocol）是由 Anthropic 提出的 AI Agent 互操作标准，让不同的 AI 系统可以互相调用工具和共享上下文。

## NvwaX 的 MCP 工具

NvwaX v2.2.0 暴露了 6 个 MCP Tools：

\`\`\`json
{
  "tools": [
    "nvwax_search_agents",
    "nvwax_design_team",
    "nvwax_match_skills",
    "nvwax_analyze_requirements",
    "nvwax_get_best_practices",
    "nvwax_register_agent"
  ]
}
\`\`\`

## 与 CrewAI 集成

\`\`\`python
from crewai import Agent
from langchain.tools import tool

@tool
def nvwax_design_team(team_type: str, responsibilities: list):
    """通过 NvwaX MCP 设计 AI 团队"""
    # 调用 NvwaX API
    pass

crewai_agent = Agent(
    role="AI 架构师",
    goal="使用 NvwaX 设计最优团队",
    tools=[nvwax_design_team]
)
\`\`\`

## 与 LangGraph 集成

\`\`\`python
from langgraph.graph import StateGraph

def agent_node(state):
    # 调用 nvwax_search_agents 搜索合适的 Agent
    result = nvwax_search_agents(query=state["query"])
    return {"agents": result}

graph = StateGraph(AgentState)
graph.add_node("search", agent_node)
\`\`\`

## 最佳实践

1. **权限控制**：生产环境建议使用 API Key + 权限分级
2. **错误处理**：MCP 调用失败时应降级到本地 Agent
3. **缓存优化**：高频查询结果建议本地缓存`,
    contentEn: `## What is MCP Protocol?

MCP (Model Context Protocol) is a standard for AI Agent interoperability proposed by Anthropic.

## NvwaX MCP Tools

NvwaX v2.2.0 exposes 6 MCP Tools: nvwax_search_agents, nvwax_design_team, nvwax_match_skills, nvwax_analyze_requirements, nvwax_get_best_practices, nvwax_register_agent.

## Integration with CrewAI

\`\`\`python
from crewai import Agent

@tool
def nvwax_design_team(team_type: str, responsibilities: list):
    """Design AI team via NvwaX MCP"""
    pass
\`\`\`

## Integration with LangGraph

Use nvwax_search_agents in LangGraph nodes for semantic agent matching and team design.

## Best Practices

1. **Permission Control:** Use API Key + permission levels in production
2. **Error Handling:** Fallback to local agents when MCP calls fail
3. **Cache Optimization:** Cache high-frequency query results locally`,
    category: "technical",
    categoryZh: "技术教程",
    categoryEn: "Technical Tutorial",
    tags: ["MCP", "CrewAI", "LangGraph", "集成", "Integration"],
    author: "NvwaX Team",
    publishedAt: "2026-09-05",
  },
  {
    slug: "ai-agent-101-beginners-guide",
    titleZh: "AI Agent 入门：从单 Agent 到多 Agent 协作",
    titleEn: "AI Agent 101: From Single Agent to Multi-Agent Collaboration",
    summaryZh: "什么是 AI Agent？单 Agent 和多 Agent 的区别是什么？本文用通俗易懂的语言解释 AI Agent 的核心概念，以及为什么多 Agent 协作是未来趋势。",
    summaryEn: "What is an AI Agent? What's the difference between single Agent and multi-Agent? This article explains core AI Agent concepts in accessible language and why multi-Agent collaboration is the future.",
    contentZh: `## 什么是 AI Agent？

AI Agent（智能体）是能够自主感知环境、做出决策并执行行动的 AI 系统。与简单的问答不同，Agent 可以：

- 🔍 感知环境（读取文件、搜索网络）
- 🧠 理解目标（LLM 推理）
- 🎯 制定计划（分解任务）
- ⚡ 执行行动（调用工具、生成内容）
- 🔄 反思改进（评估结果，调整策略）

## 单 Agent vs 多 Agent

### 单 Agent
单个 Agent 完成所有任务。优点是简单，缺点是：
- 能力有限（一个 Agent 不可能擅长所有事情）
- 上下文过长（所有信息都堆在一个 Agent 里）
- 缺乏专业分工

### 多 Agent 协作
多个 Agent 各司其职，协作完成复杂任务。

**类比：** 就像一家公司，不是 CEO 一个人做所有事，而是 CEO、市场、研发、销售各司其职。

## 多 Agent 协作的价值

1. **专业化**：每个 Agent 深耕自己的领域（如文案 Agent 专注写文案，数据 Agent 专注分析）
2. **可扩展**：增加新角色即可扩展能力
3. **更稳定**：单个 Agent 出错不影响全局
4. **更真实**：模拟真实公司的协作模式

## NvwaX 的创新

NvwaX 提出了"AI 虚拟公司"理念：

> 不是让你"创建一个 Agent"，而是让你"注册一家 AI 公司，招聘员工，设置岗位，下达任务"

这种范式让复杂 AI 应用的门槛大幅降低。`,
    contentEn: `## What is an AI Agent?

An AI Agent is a system that can autonomously perceive its environment, make decisions, and take actions. Unlike simple Q&A, an Agent can:

- Perceive environment (read files, search web)
- Understand goals (LLM reasoning)
- Make plans (decompose tasks)
- Take actions (call tools, generate content)
- Reflect and improve (evaluate results, adjust strategy)

## Single Agent vs Multi-Agent

### Single Agent
One Agent does everything. Pros: simple. Cons: limited capability, long context, no specialization.

### Multi-Agent Collaboration
Multiple Agents, each with a role, collaborate on complex tasks.

**Analogy:** Like a real company — CEO, Marketing, Engineering, Sales each have their own responsibilities.

## The Value of Multi-Agent Collaboration

1. **Specialization:** Each Agent masters its domain
2. **Scalability:** Add new roles to expand capabilities
3. **Stability:** Single Agent failure doesn't affect the whole
4. **Realism:** Simulates real company collaboration patterns

## NvwaX Innovation

NvwaX introduces the "AI Virtual Company" concept: instead of "creating one Agent," you "register an AI company, hire employees, set roles, and assign tasks."`,
    category: "guide",
    categoryZh: "入门指南",
    categoryEn: "Beginner's Guide",
    tags: ["AI Agent", "多智能体", "入门", "Multi-Agent", "Beginner"],
    author: "NvwaX Team",
    publishedAt: "2026-08-28",
  },
  {
    slug: "structured-output-engine-deep-dive",
    titleZh: "深入解析 NvwaX v2.2 Structured Output 引擎：99% 可靠性背后的技术",
    titleEn: "Deep Dive: NvwaX v2.2 Structured Output Engine — The Tech Behind 99% Reliability",
    summaryZh: "v2.2.0 引入的 Structured Output 引擎将 LLM 输出可靠性从 80% 提升到 99%。本文深入解析 3 级降级策略的实现原理，以及如何应用到你的项目中。",
    summaryEn: "The Structured Output engine in v2.2.0 boosts LLM output reliability from 80% to 99%. This article deeply analyzes the 3-level fallback strategy and how to apply it in your projects.",
    contentZh: `## 问题背景

LLM 的输出格式不稳定是 Agent 开发中的常见痛点：

\`\`\`
# LLM 可能输出（不稳定）
输出1: {"name": "张三", "role": "工程师"}
输出2: {"name": "张三", "role": "工程师"}  // 多余空格
输出3: 让我帮你创建...{"name": "张三"...}  // 混乱上下文
输出4: ERROR: 格式不合法  // 完全失败
\`\`\`

## 3 级降级策略

### Level 1：json_schema（最高优先级）
使用 OpenAI 的 \`response_format: { type: "json_schema" }\` 强制结构化输出。这是成功率最高的方式（~95%）。

\`\`\`typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: prompt }],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "AgentDefinition",
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          capabilities: { type: "array", items: { type: "string" } }
        },
        required: ["name", "role"]
      }
    }
  }
});
\`\`\`

### Level 2：json_object（降级方案）
如果 Level 1 不支持该模型，降级到 \`response_format: { type: "json_object" }\`。

### Level 3：正则提取 + 重试（兜底）
如果 Level 1 和 2 都失败，使用正则从原始输出中提取 JSON，并最多重试 2 次。

## 实现代码

\`\`\`typescript
async function structuredOutput<T>(
  prompt: string,
  schema: ZodSchema<T>,
  options?: { maxRetries?: number }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 2;

  // Level 1: json_schema
  try {
    const result = await openaiWithJsonSchema(prompt, schema);
    return schema.parse(result);
  } catch {
    // Level 2: json_object
    try {
      const result = await openaiWithJsonObject(prompt, schema);
      return schema.parse(result);
    } catch {
      // Level 3: regex + retry
      for (let i = 0; i < maxRetries; i++) {
        const raw = await openaiRaw(prompt);
        const extracted = extractJson(raw);
        try {
          return schema.parse(extracted);
        } catch {
          continue;
        }
      }
      throw new Error("All fallback levels failed");
    }
  }
}
\`\`\`

## 效果验证

在 NvwaX v2.2.0 测试集上：

| 策略 | 成功率 |
|------|--------|
| 仅用 json_schema | 94.7% |
| 2级降级 | 97.8% |
| 3级降级 | **99.2%** |`,
    contentEn: `## Problem Background

LLM output format instability is a common pain point in Agent development.

## 3-Level Fallback Strategy

### Level 1: json_schema
Use OpenAI's \`response_format: { type: "json_schema" }\` for forced structured output (~95% success).

### Level 2: json_object
Fallback to \`response_format: { type: "json_object" }\` for models without json_schema support.

### Level 3: Regex + Retry
If Levels 1 and 2 fail, extract JSON with regex and retry up to 2 times.

## Results

| Strategy | Success Rate |
|----------|-------------|
| json_schema only | 94.7% |
| 2-level fallback | 97.8% |
| 3-level fallback | **99.2%** |`,
    category: "technical",
    categoryZh: "技术深度",
    categoryEn: "Technical Deep Dive",
    tags: ["Structured Output", "v2.2", "LLM", "TypeScript"],
    author: "NvwaX Team",
    publishedAt: "2026-08-20",
  },
  {
    slug: "agent-marketplace-ecosystem",
    titleZh: "AI Agent 市场生态：为什么 NvwaX 的 Marketplace 值得开发者关注",
    titleEn: "AI Agent Marketplace Ecosystem: Why NvwaX's Marketplace Deserves Developer Attention",
    summaryZh: "NvwaX Marketplace 汇聚了 240+ AI Agent，覆盖开发、设计、营销、客服等多个领域。本文介绍 Marketplace 的设计理念和开发者如何从中受益。",
    summaryEn: "NvwaX Marketplace brings together 240+ AI Agents covering development, design, marketing, and customer service. This article introduces the Marketplace design philosophy and how developers can benefit.",
    contentZh: `## Marketplace 概览

NvwaX Marketplace 是一个开放的 AI Agent 发现与分发平台：

- 🔍 **多数据源聚合**：GitHub（200+）、Gitee、ModelScope、百度、阿里、腾讯等
- 🏷️ **智能分类**：开发、设计、营销、客服、数据分析、内容创作等
- ⭐ **评分系统**：用户评价 + 下载量 + 实际使用数据
- 🔄 **一键导入**：选中 Agent 后可直接导入团队

## 开发者价值

### 作为 Agent 使用者
- **快速发现**：不用自己从零创建，通过自然语言搜索找到合适的 Agent
- **质量保障**：经过平台审核的 Agent 有质量背书
- **持续更新**：Agent 作者可以更新版本，使用者自动同步

### 作为 Agent 开发者
- **分发渠道**：将你的 Agent 发布到市场，被动获客
- **收入来源**：未来支持付费 Agent 订阅
- **社区反馈**：通过评价系统了解用户需求

## Marketplace 技术架构

\`\`\`
用户搜索 → 语义匹配 → 智能推荐 → Agent 详情 → 导入团队
                ↓
         多源并行搜索
    GitHub / Gitee / ModelScope
\`\`\`

## 未来规划

- 🔧 插件化 Agent（支持自定义工具）
- 💰 付费 Agent 订阅
- 📊 使用数据分析仪表板
- 🌐 国际化多语言市场`,
    contentEn: `## Marketplace Overview

NvwaX Marketplace is an open AI Agent discovery and distribution platform:

- Multi-source aggregation: GitHub (200+), Gitee, ModelScope, Baidu, Alibaba, Tencent
- Smart categorization: Development, Design, Marketing, Customer Service, Data Analysis, Content Creation
- Rating system: User reviews + downloads + usage data
- One-click import: Import selected agents directly into your team

## Developer Value

### As Agent User
- Quick discovery: Find suitable agents through natural language search
- Quality assurance: Platform-reviewed agents have quality backing
- Continuous updates: Agent authors can update versions, users auto-sync

### As Agent Developer
- Distribution channel: Publish your agents to the marketplace for passive customer acquisition
- Revenue stream: Paid agent subscriptions (future)
- Community feedback: Understand user needs through ratings`,
    category: "insights",
    categoryZh: "产品洞察",
    categoryEn: "Product Insights",
    tags: ["Marketplace", "Agent", "生态系统", "Ecosystem"],
    author: "NvwaX Team",
    publishedAt: "2026-08-15",
  },
  {
    slug: "team-skill-templates-deep-dive",
    titleZh: "Team Skills 模板市场：让 AI 团队协作开箱即用",
    titleEn: "Team Skills Template Marketplace: Ready-to-Use AI Team Collaboration",
    summaryZh: "Team Skills 是 NvwaX 的核心创新之一——预定义的 AI 团队协作模板。本文深入解析 Team Skills 的设计理念、如何创建和分享，以及最佳实践案例。",
    summaryEn: "Team Skills are one of NvwaX's core innovations — predefined AI team collaboration templates. This deep dive covers design philosophy, creation, sharing, and best practices.",
    contentZh: `## 什么是 Team Skills？

Team Skills 是预定义的 AI 团队协作模板，包含：

- 👥 **团队角色**：定义团队中有哪些岗位（如 CEO、文案、数据分析师）
- 🔄 **工作流**：定义任务如何在角色之间流转
- 📋 **协作规则**：定义角色之间的互动规范（如数据分析师出报告 → CEO 审核 → 文案撰写推广内容）

## 为什么需要 Team Skills？

### 痛点
- 每次创建团队都需要重新设计角色和工作流
- 好的团队结构无法复用
- 不同场景需要不同的团队配置

### Team Skills 解决方案
浏览市场 → 选择模板 → 一键应用 → 个性化调整 → 开始工作

## 如何创建 Team Skill

在 NvwaX 中，创建 Team Skill 非常简单：

1. 完成一次 AI 公司的创建流程
2. 点击"保存为 Team Skill"
3. 填写模板名称、描述、适用场景
4. 发布到市场

## 最佳实践案例

### 电商运营团队
- CEO：统筹运营策略
- 选品专员：分析市场数据，推荐爆款
- 推广文案：生成小红书/抖音种草内容
- 客服 Agent：处理用户咨询

### 软件开发团队
- CTO（CEO）：技术架构决策
- 前端工程师：实现 UI
- 后端工程师：实现 API
- 测试工程师：自动化测试

## 与其他格式的对比

| 特性 | Team Skills | CrewAI | LangGraph |
|------|-------------|--------|-----------|
| 可视化编辑 | ✅ | ❌ | 部分 |
| 开箱即用 | ✅ | 需配置 | 需配置 |
| 版本管理 | ✅ | ❌ | 基础 |
| 市场分发 | ✅ | ❌ | ❌ |`,
    contentEn: `## What are Team Skills?

Team Skills are predefined AI team collaboration templates containing team roles, workflow definitions, and collaboration rules.

## Why Team Skills?

- Avoid redesigning roles and workflows from scratch every time
- Good team structures can be reused
- Different scenarios require different team configurations

## Best Practice Cases

### E-commerce Operations Team
CEO oversees strategy, Product Selector analyzes data, Copywriter creates content, Customer Service handles inquiries.

### Software Development Team
CTO makes architecture decisions, Frontend Engineer implements UI, Backend Engineer builds APIs, QA Engineer automates testing.

## Comparison

| Feature | Team Skills | CrewAI | LangGraph |
|---------|-------------|--------|-----------|
| Visual editing | ✅ | ❌ | Partial |
| Ready to use | ✅ | Config needed | Config needed |
| Version control | ✅ | ❌ | Basic |
| Marketplace | ✅ | ❌ | ❌ |`,
    category: "guide",
    categoryZh: "功能解析",
    categoryEn: "Feature Deep Dive",
    tags: ["Team Skills", "模板", "协作", "Template", "Collaboration"],
    author: "NvwaX Team",
    publishedAt: "2026-08-10",
  },
  {
    slug: "nvwax-roadmap-2026",
    titleZh: "NvwaX 2026 路线图：AI Agent 平台的下一个十年",
    titleEn: "NvwaX 2026 Roadmap: The Next Decade of AI Agent Platforms",
    summaryZh: "本文分享 NvwaX 的 2026 年技术路线图，包括 v2.3 的插件市场、API 开放平台、多语言支持，以及 v3.0 的可视化工作流编辑器和 AI Agent 执行引擎。",
    summaryEn: "This article shares NvwaX's 2026 technical roadmap, including v2.3's plugin marketplace, API open platform, multilingual support, and v3.0's visual workflow editor and AI Agent execution engine.",
    contentZh: `## 2026 技术路线图

### Q3 2026 — v2.3

#### 插件市场
- 开发者可发布和售卖插件
- 插件能力注册 API 完善
- 行业插件推荐引擎升级

#### API 开放平台
- 完整的 REST API 开放
- API Key 管理和权限分级
- API 使用统计和计费

#### 多语言支持
- 日语、韩语、西班牙语、法语、德语
- 本地化 SEO 优化

### Q4 2026 — v3.0

#### 可视化工作流编辑器
- 拖拽式创建 Agent 工作流
- 实时预览和调试
- 导出为 YAML / JSON

#### AI Agent 执行引擎
- 云端一键运行 AI 团队
- 执行过程可视化追踪
- 错误自动重试和回退

### 2027 展望

- 🤖 Agent-to-Agent 通信协议
- 🌐 去中心化 Agent 网络
- 💰 DeFi 激励模型

## 社区共建

NvwaX 是开源项目，欢迎所有形式的贡献：
- 🐛 Bug 报告和修复
- 📖 文档完善
- 🌐 翻译支持
- 💡 新功能提案
- ⭐ 代码贡献

访问 [GitHub](https://github.com/BigLionX/NvwaX) 参与贡献。`,
    contentEn: `## 2026 Technical Roadmap

### Q3 2026 — v2.3
- Plugin Marketplace
- API Open Platform
- Multilingual Support (Japanese, Korean, Spanish, French, German)

### Q4 2026 — v3.0
- Visual Workflow Editor
- AI Agent Execution Engine

### 2027 Vision
- Agent-to-Agent Communication Protocol
- Decentralized Agent Network
- DeFi Incentive Model

## Community Contribution

NvwaX is an open source project. All forms of contribution are welcome. Visit [GitHub](https://github.com/BigLionX/NvwaX) to get involved.`,
    category: "roadmap",
    categoryZh: "路线图",
    categoryEn: "Roadmap",
    tags: ["路线图", "2026", "v2.3", "v3.0", "Roadmap"],
    author: "NvwaX Team",
    publishedAt: "2026-07-01",
  },
];

/** 获取所有文章（按发布时间倒序） */
export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

/** 获取精选文章 */
export function getFeaturedPosts(): BlogPost[] {
  return getAllPosts().filter((p) => p.featured);
}

/** 按 slug 获取单篇文章 */
export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

/** 按分类获取文章 */
export function getPostsByCategory(category: string): BlogPost[] {
  return getAllPosts().filter((p) => p.category === category);
}

/** 获取所有分类 */
export function getAllCategories(): { slug: string; nameZh: string; nameEn: string; count: number }[] {
  const map = new Map<string, { nameZh: string; nameEn: string; count: number }>();
  for (const post of BLOG_POSTS) {
    const existing = map.get(post.category);
    if (existing) {
      existing.count++;
    } else {
      map.set(post.category, { nameZh: post.categoryZh, nameEn: post.categoryEn, count: 1 });
    }
  }
  return Array.from(map.entries()).map(([slug, data]) => ({ slug, ...data }));
}

/** 获取所有标签 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const post of BLOG_POSTS) {
    for (const tag of post.tags) tags.add(tag);
  }
  return Array.from(tags).sort();
}

/** 估算阅读时间 */
export function getReadTime(post: BlogPost, locale: string): number {
  const content = locale === 'en' ? post.contentEn : post.contentZh;
  return estimateReadTime(content);
}

/** 获取相关文章（同一分类，或共享标签） */
export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  return getAllPosts()
    .filter((p) => p.slug !== post.slug)
    .map((p) => {
      let score = 0;
      if (p.category === post.category) score += 3;
      for (const tag of p.tags) {
        if (post.tags.includes(tag)) score += 1;
      }
      return { post: p, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.post);
}
