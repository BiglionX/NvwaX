# Phase 2 调整计划 - 基于现有 skillhub-workflow

**日期**: 2026-04-25  
**状态**: ✅ 重复代码已删除，方向已调整

---

## 🗑️ 已删除的重复代码

### 删除的文件列表

1. ❌ `.lingma/skills/agent-factory/workflow.ts` (504行) - 与 orchestrator.js 功能重叠
2. ❌ `.lingma/skills/agent-factory/utils/helpers.ts` (228行) - 工具函数（可后续补充）
3. ❌ `.lingma/skills/agent-factory/prompts/requirement-gathering.md` (254行) - 提示词模板
4. ❌ `.lingma/skills/agent-factory/prompts/template-matching.md` (303行) - 提示词模板
5. ❌ `.lingma/skills/agent-factory/prompts/skill-analysis.md` (424行) - 提示词模板
6. ❌ `.lingma/skills/agent-factory/package.json` - 依赖配置
7. ❌ `.lingma/skills/agent-factory/tsconfig.json` - TypeScript 配置
8. ❌ `docs/PHASE2-COMPLETION-REPORT.md` - 错误的完成报告
9. ❌ `docs/PHASE2-PROGRESS-REPORT.md` - 错误的进度报告

**总计删除**: ~2,000 行重复代码

### 保留的文件

✅ `.lingma/skills/agent-factory/SKILL.md` - 已更新为指向 skillhub-workflow  
✅ `.lingma/skills/agent-factory/README.md` - 使用指南

---

## ✅ 现有系统验证

### skillhub-workflow 服务状态

```bash
✅ 服务已启动: http://localhost:3002
✅ 健康检查: GET /health → 200 OK
✅ 数据库: SQLite (./data/workflows.db)
✅ 端口: 3002（已从 3001 修改）
```

### 现有 API 端点

| 端点 | 方法 | 状态 | 说明 |
|------|------|------|------|
| `/health` | GET | ✅ 可用 | 健康检查 |
| `/api/workflows` | GET | ✅ 可用 | 列出所有工作流 |
| `/api/workflows/:id` | GET | ✅ 可用 | 获取工作流详情 |
| `/api/workflows` | POST | ✅ 可用 | 创建工作流 |
| `/api/workflows/:id` | PUT | ✅ 可用 | 更新工作流 |
| `/api/workflows/:id` | DELETE | ✅ 可用 | 删除工作流 |
| `/api/workflows/:id/execute` | POST | ✅ 可用 | 执行工作流 |
| `/api/multi-agent/orchestrate` | POST | ✅ 可用 | 多 Agent 协调 |
| `/api/workflows/templates` | GET | ❌ **缺失** | 需要实现 |

### 现有核心模块

1. ✅ **Agent Orchestrator** (`src/agents/orchestrator.js`)
   - 任务分解
   - Agent 分配
   - 并行/串行执行
   
2. ✅ **Agent Templates** (`src/workflows/agent-templates.js`)
   - CRUD 应用生成模板
   - Skill 研究工作流模板
   
3. ✅ **Workflow Engine** (`src/server.js`)
   - 工作流 CRUD
   - 工作流执行引擎
   - 节点类型支持（LLM、SkillHub Search/Detail、Data Transform）

---

## 🎯 下一步行动计划

### 优先级 1: 实现缺失的 API（本周内）

#### 1.1 添加模板搜索 API

**文件**: `packages/skillhub-workflow/src/server.js`

**需要添加的路由**:
```javascript
// 导入模板
import agentWorkflowTemplates from './workflows/agent-templates.js';

// 获取所有模板
app.get('/api/workflows/templates', (req, res) => {
  const { q } = req.query;
  
  let templates = Object.entries(agentWorkflowTemplates).map(([key, template]) => ({
    id: key,
    name: template.name,
    description: template.description,
    nodes: template.nodes.length,
    edges: template.edges.length
  }));
  
  // 如果有关键词，进行过滤
  if (q) {
    const query = q.toLowerCase();
    templates = templates.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    );
  }
  
  res.json({ success: true, data: templates });
});

// 获取特定模板详情
app.get('/api/workflows/templates/:id', (req, res) => {
  const template = agentWorkflowTemplates[req.params.id];
  
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  res.json({ success: true, data: { id: req.params.id, ...template } });
});
```

**工作量**: ⭐⭐（简单，30分钟）

---

#### 1.2 完善 CreateAgentModal 后端连接

**文件**: `packages/nvwax-web/components/Search/CreateAgentModal.tsx`

**当前问题**:
```tsx
const handleCreateAgent = () => {
  // TODO: 实现创建 Agent 的逻辑
  console.log('Creating agent:', { name: agentName, query, selectedSkills });
  alert('Agent 创建功能即将上线！');  // ❌ 占位符
};
```

**需要实现**:
```tsx
const handleCreateAgent = async () => {
  try {
    // 1. 创建工作流
    const workflowResponse = await fetch('http://localhost:3002/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: agentName,
        description: `Agent for: ${query}`,
        nodes: generateWorkflowNodes(selectedSkills),
        edges: []
      })
    });
    
    const workflow = await workflowResponse.json();
    
    // 2. 执行工作流
    const executionResponse = await fetch(
      `http://localhost:3002/api/workflows/${workflow.id}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { requirement: query }
        })
      }
    );
    
    const result = await executionResponse.json();
    
    // 3. 显示成功
    alert('Agent 创建成功！');
    onClose();
  } catch (error) {
    console.error('Failed to create agent:', error);
    alert('创建失败，请重试');
  }
};
```

**工作量**: ⭐⭐⭐（中等，2-3小时）

---

### 优先级 2: 实现技能分析功能（下周）

#### 2.1 创建 Skill Analysis Service

**文件**: `packages/skillhub-workflow/src/services/skill-analysis.service.js`（新建）

**核心功能**:
```javascript
import { skillhubClient } from '../nodes/skillhub-client.js';

class SkillAnalysisService {
  /**
   * 从用户需求中提取所需技能
   */
  async extractSkillsFromRequirement(requirement) {
    // 方法 1: 使用 LLM
    // 方法 2: 关键词映射表
    
    // 示例关键词映射
    const keywordToSkillMap = {
      '客服': ['customer-service', 'intent-recognition'],
      '查询': ['database-query', 'data-retrieval'],
      '订单': ['order-management'],
      '报表': ['data-analysis', 'report-generation']
    };
    
    const skills = [];
    for (const [keyword, skillList] of Object.entries(keywordToSkillMap)) {
      if (requirement.includes(keyword)) {
        skills.push(...skillList);
      }
    }
    
    return [...new Set(skills)]; // 去重
  }
  
  /**
   * 分析技能缺口
   */
  async analyzeSkillGap(userRequirement, templateId) {
    // 1. 提取所需技能
    const requiredSkills = await this.extractSkillsFromRequirement(userRequirement);
    
    // 2. 获取模板技能（需要从模板元数据中获取）
    const availableSkills = await this.getTemplateSkills(templateId);
    
    // 3. 计算缺口
    const missingSkills = requiredSkills.filter(
      skill => !availableSkills.includes(skill)
    );
    
    // 4. 推荐补充技能
    const recommendations = await Promise.all(
      missingSkills.map(async skill => {
        const searchResult = await skillhubClient.searchSkills(skill, 1, 3);
        return {
          skillName: skill,
          recommendations: searchResult.data
        };
      })
    );
    
    return {
      requiredSkills,
      availableSkills,
      missingSkills,
      coverageRate: (availableSkills.length / requiredSkills.length) * 100,
      recommendations
    };
  }
}

export const skillAnalysisService = new SkillAnalysisService();
```

**工作量**: ⭐⭐⭐⭐（较复杂，1-2天）

---

#### 2.2 添加技能分析 API

**文件**: `packages/skillhub-workflow/src/server.js`

```javascript
import { skillAnalysisService } from './services/skill-analysis.service.js';

// 分析技能缺口
app.post('/api/skills/analyze', async (req, res) => {
  try {
    const { userRequirement, templateId } = req.body;
    
    if (!userRequirement) {
      return res.status(400).json({ 
        error: 'userRequirement is required' 
      });
    }
    
    const analysis = await skillAnalysisService.analyzeSkillGap(
      userRequirement,
      templateId
    );
    
    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Skill analysis failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

**工作量**: ⭐⭐（简单，30分钟）

---

### 优先级 3: 实现悬赏系统（下下周）

这是真正需要全新开发的部分，因为现有系统中没有悬赏功能。

#### 3.1 数据库扩展

需要在 nvwax-server 的 PostgreSQL 中添加表（已在 Phase 1 设计中）：
- `bounties` - 悬赏任务
- `user_points` - 用户积分
- `point_transactions` - 积分流水

**迁移脚本**: `packages/nvwax-server/migrations/002_agent_factory.sql`（已存在）

---

#### 3.2 创建 Bounty Service

**文件**: `packages/nvwax-server/src/services/bounty.service.ts`（新建）

**核心功能**:
- CRUD 操作
- 状态机管理（open → claimed → submitted → verified → completed）
- 积分转账逻辑
- 权限控制

**工作量**: ⭐⭐⭐⭐⭐（复杂，3-5天）

---

## 📊 工作量估算

| 任务 | 工作量 | 预计时间 |
|------|--------|---------|
| **1.1 模板搜索 API** | ⭐⭐ | 30分钟 |
| **1.2 CreateAgentModal 连接** | ⭐⭐⭐ | 2-3小时 |
| **2.1 Skill Analysis Service** | ⭐⭐⭐⭐ | 1-2天 |
| **2.2 技能分析 API** | ⭐⭐ | 30分钟 |
| **3.1 数据库迁移** | ⭐ | 15分钟 |
| **3.2 Bounty Service** | ⭐⭐⭐⭐⭐ | 3-5天 |
| **总计** | - | **约 1 周** |

---

## 🚀 立即行动

### 今天完成

1. ✅ 删除重复代码（已完成）
2. ✅ 启动 skillhub-workflow 服务（已完成，端口 3002）
3. ⏸️ 实现模板搜索 API（30分钟）
4. ⏸️ 测试模板 API

### 明天完成

5. ⏸️ 完善 CreateAgentModal 后端连接
6. ⏸️ 前端测试创建 Agent 流程

### 本周内完成

7. ⏸️ 实现技能分析功能
8. ⏸️ 执行数据库迁移
9. ⏸️ 开始开发悬赏系统

---

## 📝 关键决策

### ✅ 正确的方向

- **复用现有代码**: skillhub-workflow 已经实现了核心的工作流引擎
- **避免重复开发**: 不再重新实现 orchestrator 逻辑
- **增量扩展**: 在现有基础上添加缺失功能（模板搜索、技能分析、悬赏系统）

### ❌ 错误的方向（已纠正）

- ~~重新实现 workflow.ts~~ - 已删除
- ~~创建独立的 Agent Factory~~ - 改为扩展现有系统
- ~~忽略现有代码~~ - 现在充分理解和利用

---

## 🔗 相关文档

- [深度代码分析报告](./DEEP-CODE-ANALYSIS-AGENT-EXISTING.md)
- [skillhub-workflow README](../packages/skillhub-workflow/README.md)
- [skillhub-workflow API](../packages/skillhub-workflow/API.md)
- [Agent Orchestrator](../packages/skillhub-workflow/src/agents/orchestrator.js)

---

**报告作者**: AI Assistant  
**最后更新**: 2026-04-25  
**下一步**: 实现模板搜索 API
