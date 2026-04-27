# Agent Factory Skill

> 通过对话引导用户需求，自动组装或生成新的智能体

---

## 📖 简介

Agent Factory（智能体工厂）是一个元智能体 Skill，它能够：

1. **对话式需求采集** - 通过 4-5 个结构化问题引导用户明确需求
2. **智能模板匹配** - 从模板库中搜索最相关的智能体模板
3. **技能缺口分析** - 识别模板缺失的技能并推荐补充方案
4. **悬赏发布** - 当技能不存在时，自动发布悬赏任务
5. **一键生成** - 自动组装技能并部署智能体

---

## 🚀 快速开始

### 触发方式

在对话中输入以下任意关键词即可激活：

- "创建一个智能体"
- "我需要一个XXX助手"
- "帮我做一个XXX机器人"
- "想要一个能XXX的智能体"

### 示例对话

```
用户: 我想创建一个客服智能体

nvwa: 好的！我来帮您创建客服智能体。

首先，请描述一下这个智能体的主要用途。

例如：
- "需要一个能自动回复客户咨询的客服智能体"
- "想要一个能处理售后问题的助手"

用户: 需要一个能自动回复客户咨询并查询订单状态的客服智能体

nvwa: 明白了！接下来，这个智能体需要访问哪些数据或系统？

...（继续对话）
```

---

## 📁 文件结构

```
agent-factory/
├── SKILL.md                      # 主指令文件（工作流定义）
├── README.md                     # 本文档
├── prompts/
│   ├── requirement-gathering.md  # 需求采集提示词
│   ├── template-matching.md      # 模板匹配提示词
│   └── skill-analysis.md         # 技能分析提示词
└── utils/
    └── (工具函数，待实现)
```

---

## 🔧 工作流程

### Step 1: 需求采集

通过 4-5 个问题收集用户需求：

1. **用途描述** - 智能体的主要功能
2. **数据源** - 需要访问的数据或系统
3. **输出结果** - 期望的输出类型
4. **实现方式**（可选）- 如何实现功能
5. **特殊要求**（可选）- 其他特殊需求

### Step 2: 模板搜索

调用后端 API 搜索匹配的模板：

```
GET /api/templates/search?q={query}&limit=5
```

展示 Top 3-5 个匹配模板供用户选择。

### Step 3: 技能分析

调用后端 API 分析技能缺口：

```
POST /api/skills/analyze
{
  "userRequirement": "...",
  "templateId": "..."
}
```

显示已包含技能和缺失技能。

### Step 4: 处理缺失技能

- **情况 A**: 所有技能都可找到 → 自动添加
- **情况 B**: 部分技能缺失 → 发布悬赏或手动上传

### Step 5: 生成智能体

确认配置后，调用工作流引擎生成并部署智能体。

---

## 🎯 核心功能

### 1. 需求采集

**文件**: `prompts/requirement-gathering.md`

包含 5 个问题的提示词模板和错误处理逻辑。

**特点**:
- 友好的对话语气
- 提供具体示例
- 允许跳过可选问题
- 即时反馈确认

### 2. 模板匹配

**文件**: `prompts/template-matching.md`

实现三种匹配策略：

1. **关键词匹配**（权重 40%）- Jaccard 相似度
2. **语义相似度**（权重 40%）- Embedding + Cosine Similarity
3. **技能覆盖度**（权重 20%）- 技能交集比例

**性能优化**:
- 缓存搜索结果（5 分钟）
- 预计算模板 Embedding
- 分页加载

### 3. 技能分析

**文件**: `prompts/skill-analysis.md`

四步分析流程：

1. 从需求中提取技能（LLM + 关键词映射）
2. 计算技能缺口（集合运算）
3. 推荐补充技能（Embedding 相似度）
4. 生成分析报告（自然语言）

**准确率目标**: > 85%

---

## 📊 数据结构

### AgentFactoryContext

```typescript
interface AgentFactoryContext {
  // 用户需求
  user_requirement: string;
  data_sources: string[];
  output_types: string[];
  implementation_method?: string;
  special_requirements?: string;
  
  // 模板选择
  selected_template_id?: string;
  selected_template_skills?: string[];
  
  // 技能分析
  required_skills: string[];
  available_skills: string[];
  missing_skills: string[];
  
  // 悬赏
  created_bounties?: Array<{
    id: string;
    title: string;
    rewardAmount: number;
  }>;
  
  // 生成的智能体
  generated_agent?: {
    id: string;
    url: string;
    apiKey: string;
  };
}
```

---

## 🔌 API 依赖

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/templates/search` | GET | 搜索模板 |
| `/api/templates/:id` | GET | 获取模板详情 |
| `/api/skills/analyze` | POST | 分析技能缺口 |
| `/api/skills/search` | GET | 搜索技能 |
| `/api/bounties` | POST | 创建悬赏 |
| `/api/users/:id/points` | GET | 查询积分余额 |

详见 [API 文档](../../docs/API-DOCUMENTATION.md)

---

## 💡 最佳实践

### 1. 引导话术

- ✅ **友好自然**: "好的，已记录" vs "输入已保存"
- ✅ **提供示例**: 每个问题都给出 2-3 个具体示例
- ✅ **允许跳过**: 非必填问题明确标注"可选"
- ❌ **避免术语**: 使用"数据源"而非"DataSource"

### 2. 错误处理

- **API 失败**: "抱歉，服务暂时不可用，请稍后重试"
- **无匹配结果**: "未找到完全匹配的模板，但我们可以从零开始创建"
- **积分不足**: "您的积分余额不足，请先充值或完成每日签到"

### 3. 性能优化

- **缓存**: 相同查询缓存 5 分钟
- **异步**: 先展示列表，再异步加载详情
- **超时**: API 调用超时 10 秒

---

## 🧪 测试

### 单元测试

```bash
# 运行测试
npm test -- agent-factory
```

### 端到端测试

```bash
# 完整流程测试
npm run test:e2e -- --scenario=create-customer-service-agent
```

### 测试用例

1. **创建客服智能体** - 标准流程
2. **创建数据分析助手** - 多数据源场景
3. **无匹配模板** - 从零创建场景
4. **技能缺失** - 悬赏发布场景
5. **积分不足** - 错误处理场景

---

## 📈 监控指标

| 指标 | 目标 | 当前 |
|------|------|------|
| 需求采集完成率 | > 90% | - |
| 模板匹配准确率 | > 70% | - |
| 技能提取准确率 | > 85% | - |
| 平均创建时间 | < 5 分钟 | - |
| 用户满意度 | > 4.5/5 | - |

---

## 🔄 扩展方向

### Phase 2+ 增强功能

1. **智能追问** - 根据用户回答动态调整后续问题
2. **模板推荐** - 基于用户历史选择推荐相似模板
3. **技能组合优化** - 自动推荐最佳技能组合
4. **A/B 测试** - 对比不同配置的智能体效果
5. **自学习** - 记录成功案例，优化匹配算法

---

## 🐛 常见问题

### Q1: Skill 未激活

**问题**: 输入关键词后没有反应

**解决**:
1. 检查文件位置: `.lingma/skills/agent-factory/SKILL.md`
2. 确认触发关键词匹配
3. 查看 Lingma 日志

### Q2: API 调用失败

**问题**: 模板搜索或技能分析返回错误

**解决**:
1. 检查后端服务是否运行（http://localhost:3001）
2. 验证 API 端点是否正确
3. 查看浏览器控制台错误信息

### Q3: 匹配结果不准确

**问题**: 推荐的模板与需求不匹配

**解决**:
1. 优化用户描述的准确性
2. 调整匹配算法权重
3. 提供更多示例训练 LLM

---

## 📞 支持与反馈

- **文档**: [NvwaX 文档中心](https://docs.nvwax.com)
- **Issue**: [GitHub Issues](https://github.com/BigLionX/NvwaX/issues)
- **Email**: 1055603323@qq.com

---

## 📄 许可证

MIT License - 详见 [LICENSE](../../LICENSE)

---

**最后更新**: 2026-04-25  
**版本**: 1.0.0  
**状态**: ✅ 可用
