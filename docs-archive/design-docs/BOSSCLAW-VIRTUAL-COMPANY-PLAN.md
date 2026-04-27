# BossClaw 虚拟公司功能开发计划

## 📋 项目背景

基于 [BossClaw.md](./BossClaw.md) 文档，将 BossClaw 从"智能体管理平台"升级为"虚拟公司孵化器"。本次开发聚焦于实现三个典型虚拟公司场景实例，并通过打包测试验证功能完整性。

**开发时间**: 2026-04-26  
**目标**: 在 Agent 广场发布"虚拟公司"类目，包含三个可打包的虚拟公司实例

---

## 🔍 需求分析与技术甄别

### 1. BossClaw.md 中提到的技术 vs 现有实现对比

| 文档中的技术 | 现状 | 是否采用 | 说明 |
|------------|------|---------|------|
| **ChatDev框架** | ❌ 未集成 | ⚠️ 部分参考 | 参考其多智能体协作理念，但使用现有的 Leader Agent 架构 |
| **Agent-nvwax** | ❌ 不存在 | ❌ 不采用 | 文档混淆，实际应为本项目 NvwaX |
| **GoSCIM身份系统** | ❌ 未实现 | ❌ 暂不采用 | 当前使用简单的用户认证，链上身份留待后续阶段 |
| **LangFlow工作流** | ❌ 未集成 | ⚠️ 部分参考 | 使用现有的 Team Skills workflow 结构 |
| **JoyAgent模板** | ❌ 未导入 | ❌ 暂不采用 | 先实现基础模板，后续可扩展 |
| **BYOVD数据源** | ❌ 未实现 | ❌ 暂不采用 | Phase 3 功能，本次仅实现基础模板 |
| **Eko干预机制** | ❌ 未集成 | ❌ 暂不采用 | Human-in-the-loop 留待后续优化 |
| **HiMarket** | ✅ 已有 | ✅ 采用 | 对应现有的 `/marketplace` 页面和 Team Skills API |
| **FastbuildAI** | ✅ 已有 | ✅ 采用 | 对应现有的项目管理界面 |
| **Team Skills** | ✅ 已实现 | ✅ 核心采用 | 作为虚拟公司模板的数据载体 |
| **Leader Agent** | ✅ 已实现 | ✅ 核心采用 | `packages/skillhub-workflow/src/agents/leader-agent.js` |
| **Package Export** | ✅ 已实现 | ✅ 核心采用 | 用于虚拟公司打包分发 |

### 2. 核心技术选型结论

**采用现有技术栈**：
- ✅ **Team Skills 数据库表** - 存储虚拟公司模板
- ✅ **Leader Agent 架构** - 协调多智能体协作
- ✅ **Package Build Service** - 打包为可执行文件
- ✅ **Agent 广场页面** - 展示虚拟公司模板

**需要新增/扩展**：
- ➕ 虚拟公司专用分类 (`virtual-company`)
- ➕ 三个典型场景的模板数据
- ➕ 前端分类筛选功能
- ➕ 虚拟公司专属元数据（角色定义、协作流程等）

---

## 🎯 开发目标

### 主要目标
1. 创建三个虚拟公司模板实例：
   - **智能营销策划公司** (marketing)
   - **虚拟开发团队** (development)
   - **定制设计工作室** (design)

2. 在 Agent 广场增加"虚拟公司"分类，展示这三个实例

3. 通过打包测试验证虚拟公司的完整性和可用性

### 验收标准
- [ ] 三个虚拟公司模板成功插入数据库
- [ ] Agent 广场可按"虚拟公司"分类筛选
- [ ] 每个虚拟公司可成功打包为可执行文件
- [ ] 打包后的程序能正常启动并显示团队信息

---

## 📐 技术方案设计

### 1. 虚拟公司模板数据结构

基于现有的 `team_skills` 表结构，扩展以下字段：

```sql
-- team_skills 表已有字段
id                  TEXT PRIMARY KEY
name                TEXT NOT NULL              -- 公司名称
description         TEXT                       -- 公司描述
category            TEXT                       -- 分类: 'virtual-company'
leader_config       JSONB                      -- CEO/领导者配置
roles               JSONB                      -- 员工角色列表
workflow            JSONB                      -- 协作工作流程
binding_rules       JSONB                      -- 协作规则
author_id           TEXT                       -- 创建者ID
is_public           BOOLEAN DEFAULT true       -- 是否公开
version             TEXT DEFAULT '1.0.0'       -- 版本号
created_at          TIMESTAMP
updated_at          TIMESTAMP

-- 需要扩展的元数据（存储在 description 或新增 metadata 字段）
metadata {
  "companyType": "marketing|development|design",
  "scenario": "应用场景描述",
  "dataSources": ["支持的数据源类型"],
  "outputs": ["产出物类型"],
  "estimatedCost": "预估成本范围",
  "suitableFor": ["适用人群"]
}
```

### 2. 三个虚拟公司实例设计

#### 实例 1: 智能营销策划公司

```json
{
  "id": "virtual-company-marketing-001",
  "name": "智能营销策划公司",
  "description": "专业的营销活动策划团队，从策略制定到内容生成全流程覆盖",
  "category": "virtual-company",
  "metadata": {
    "companyType": "marketing",
    "scenario": "电商促销、品牌活动、内容营销",
    "dataSources": ["品牌知识库", "历史营销数据", "竞品分析"],
    "outputs": ["营销策略", "营销文案", "视觉设计", "数据分析报告"],
    "estimatedCost": "¥5,000-20,000/次",
    "suitableFor": ["电商店主", "市场专员", "创业者"]
  },
  "leaderConfig": {
    "name": "策划总监",
    "responsibilities": ["需求分析", "策略制定", "质量把控", "进度管理"]
  },
  "teammates": [
    {
      "role": "数据分析师",
      "specialty": "市场数据挖掘和用户洞察",
      "agent_type": "backend-agent",
      "responsibilities": ["历史数据分析", "目标人群画像", "竞品调研"]
    },
    {
      "role": "文案专员",
      "specialty": "营销文案和话术创作",
      "agent_type": "backend-agent",
      "responsibilities": ["广告文案", "社交媒体内容", "邮件营销"]
    },
    {
      "role": "设计专员",
      "specialty": "视觉设计和物料制作",
      "agent_type": "frontend-agent",
      "responsibilities": ["活动海报", "详情页设计", "品牌视觉"]
    }
  ],
  "workflow": {
    "steps": [
      {"step": 1, "action": "需求分析和目标设定", "performed_by": "策划总监", "output": "brief"},
      {"step": 2, "action": "历史数据分析和市场洞察", "performed_by": "数据分析师", "output": "insights"},
      {"step": 3, "action": "营销策略制定", "performed_by": "策划总监", "output": "strategy"},
      {"step": 4, "action": "营销文案生成", "performed_by": "文案专员", "output": "copywriting"},
      {"step": 5, "action": "视觉设计", "performed_by": "设计专员", "output": "visual_assets"},
      {"step": 6, "action": "最终审核和优化", "performed_by": "策划总监", "output": "final_campaign"}
    ]
  },
  "bindingRules": {
    "communication_protocol": "每个环节完成后提交策划总监审核",
    "conflict_resolution": "由策划总监决定最终方案",
    "quality_standards": "符合品牌调性，数据驱动决策"
  }
}
```

#### 实例 2: 虚拟开发团队

```json
{
  "id": "virtual-company-dev-001",
  "name": "虚拟开发团队",
  "description": "全栈软件开发团队，从需求到部署一站式服务",
  "category": "virtual-company",
  "metadata": {
    "companyType": "development",
    "scenario": "小程序开发、网站搭建、API开发",
    "dataSources": ["产品需求文档", "设计稿", "技术文档"],
    "outputs": ["完整代码", "API文档", "测试报告", "部署指南"],
    "estimatedCost": "¥10,000-50,000/项目",
    "suitableFor": ["产品经理", "创业者", "小企业主"]
  },
  "leaderConfig": {
    "name": "技术负责人",
    "responsibilities": ["技术选型", "架构设计", "代码审查", "进度管理"]
  },
  "teammates": [
    {
      "role": "产品经理",
      "specialty": "需求分析和产品设计",
      "agent_type": "backend-agent",
      "responsibilities": ["需求梳理", "原型设计", "用户故事"]
    },
    {
      "role": "后端开发",
      "specialty": "API开发和业务逻辑",
      "agent_type": "backend-agent",
      "responsibilities": ["数据库设计", "API开发", "性能优化"]
    },
    {
      "role": "前端开发",
      "specialty": "界面开发和用户体验",
      "agent_type": "frontend-agent",
      "responsibilities": ["UI组件", "交互逻辑", "响应式设计"]
    },
    {
      "role": "测试工程师",
      "specialty": "质量保证和测试",
      "agent_type": "test-agent",
      "responsibilities": ["单元测试", "集成测试", "Bug修复"]
    }
  ],
  "workflow": {
    "steps": [
      {"step": 1, "action": "需求分析和系统设计", "performed_by": "产品经理", "output": "requirements"},
      {"step": 2, "action": "技术架构设计", "performed_by": "技术负责人", "output": "architecture"},
      {"step": 3, "action": "数据库设计", "performed_by": "后端开发", "output": "db_schema"},
      {"step": 4, "action": "API接口开发", "performed_by": "后端开发", "output": "api_code"},
      {"step": 5, "action": "前端界面开发", "performed_by": "前端开发", "output": "ui_code"},
      {"step": 6, "action": "集成测试", "performed_by": "测试工程师", "output": "test_report"},
      {"step": 7, "action": "部署和文档", "performed_by": "技术负责人", "output": "deployment_guide"}
    ]
  },
  "bindingRules": {
    "communication_protocol": "每日站会同步进度，代码提交前需审查",
    "conflict_resolution": "由技术负责人最终决策",
    "quality_standards": "代码覆盖率>80%，API符合RESTful规范"
  }
}
```

#### 实例 3: 定制设计工作室

```json
{
  "id": "virtual-company-design-001",
  "name": "定制设计工作室",
  "description": "专业的设计团队，提供品牌视觉、UI/UX、3D建模等服务",
  "category": "virtual-company",
  "metadata": {
    "companyType": "design",
    "scenario": "Logo设计、包装设计、UI设计、3D建模",
    "dataSources": ["品牌色板", "历史作品", "设计规范"],
    "outputs": ["设计稿", "源文件", "使用指南", "品牌手册"],
    "estimatedCost": "¥3,000-15,000/项目",
    "suitableFor": ["创业者", "市场人员", "产品经理"]
  },
  "leaderConfig": {
    "name": "创意总监",
    "responsibilities": ["创意方向", "风格把控", "客户沟通", "质量审核"]
  },
  "teammates": [
    {
      "role": "平面设计师",
      "specialty": "品牌视觉和平面设计",
      "agent_type": "frontend-agent",
      "responsibilities": ["Logo设计", "海报设计", "包装设计"]
    },
    {
      "role": "UI/UX设计师",
      "specialty": "界面设计和用户体验",
      "agent_type": "frontend-agent",
      "responsibilities": ["APP界面", "网页设计", "交互原型"]
    },
    {
      "role": "3D建模师",
      "specialty": "三维建模和渲染",
      "agent_type": "frontend-agent",
      "responsibilities": ["产品建模", "场景渲染", "动画制作"]
    }
  ],
  "workflow": {
    "steps": [
      {"step": 1, "action": "需求沟通和创意构思", "performed_by": "创意总监", "output": "creative_brief"},
      {"step": 2, "action": "市场调研和灵感收集", "performed_by": "平面设计师", "output": "mood_board"},
      {"step": 3, "action": "初稿设计", "performed_by": "平面设计师", "output": "draft_design"},
      {"step": 4, "action": "UI界面设计", "performed_by": "UI/UX设计师", "output": "ui_mockup"},
      {"step": 5, "action": "3D建模和渲染", "performed_by": "3D建模师", "output": "3d_models"},
      {"step": 6, "action": "整合和优化", "performed_by": "创意总监", "output": "final_design"},
      {"step": 7, "action": "交付和反馈", "performed_by": "创意总监", "output": "delivery_package"}
    ]
  },
  "bindingRules": {
    "communication_protocol": "每个设计阶段需客户确认后再进入下一阶段",
    "conflict_resolution": "由创意总监协调不同设计风格",
    "quality_standards": "符合品牌规范，输出高清源文件"
  }
}
```

---

## 🛠️ 实施步骤

### Phase 1: 数据库准备（预计 1 小时）

#### 1.1 创建迁移脚本

文件: `packages/nvwax-server/migrations/004_virtual_company_templates.sql`

```sql
-- ============================================
-- 虚拟公司模板迁移 v1.0.0
-- 创建三个虚拟公司实例
-- ============================================

-- 插入示例 1: 智能营销策划公司
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'virtual-company-marketing-001',
  '智能营销策划公司',
  '专业的营销活动策划团队，从策略制定到内容生成全流程覆盖。适用于电商促销、品牌活动、内容营销等场景。',
  'virtual-company',
  '{"name": "策划总监", "responsibilities": ["需求分析", "策略制定", "质量把控", "进度管理"]}',
  '[
    {"role": "数据分析师", "specialty": "市场数据挖掘和用户洞察", "agent_type": "backend-agent", "responsibilities": ["历史数据分析", "目标人群画像", "竞品调研"]},
    {"role": "文案专员", "specialty": "营销文案和话术创作", "agent_type": "backend-agent", "responsibilities": ["广告文案", "社交媒体内容", "邮件营销"]},
    {"role": "设计专员", "specialty": "视觉设计和物料制作", "agent_type": "frontend-agent", "responsibilities": ["活动海报", "详情页设计", "品牌视觉"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "需求分析和目标设定", "performed_by": "策划总监", "output": "brief"},
      {"step": 2, "action": "历史数据分析和市场洞察", "performed_by": "数据分析师", "output": "insights"},
      {"step": 3, "action": "营销策略制定", "performed_by": "策划总监", "output": "strategy"},
      {"step": 4, "action": "营销文案生成", "performed_by": "文案专员", "output": "copywriting"},
      {"step": 5, "action": "视觉设计", "performed_by": "设计专员", "output": "visual_assets"},
      {"step": 6, "action": "最终审核和优化", "performed_by": "策划总监", "output": "final_campaign"}
    ]
  }',
  '{
    "communication_protocol": "每个环节完成后提交策划总监审核",
    "conflict_resolution": "由策划总监决定最终方案",
    "quality_standards": "符合品牌调性，数据驱动决策"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 插入示例 2: 虚拟开发团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'virtual-company-dev-001',
  '虚拟开发团队',
  '全栈软件开发团队，从需求到部署一站式服务。适用于小程序开发、网站搭建、API开发等场景。',
  'virtual-company',
  '{"name": "技术负责人", "responsibilities": ["技术选型", "架构设计", "代码审查", "进度管理"]}',
  '[
    {"role": "产品经理", "specialty": "需求分析和产品设计", "agent_type": "backend-agent", "responsibilities": ["需求梳理", "原型设计", "用户故事"]},
    {"role": "后端开发", "specialty": "API开发和业务逻辑", "agent_type": "backend-agent", "responsibilities": ["数据库设计", "API开发", "性能优化"]},
    {"role": "前端开发", "specialty": "界面开发和用户体验", "agent_type": "frontend-agent", "responsibilities": ["UI组件", "交互逻辑", "响应式设计"]},
    {"role": "测试工程师", "specialty": "质量保证和测试", "agent_type": "test-agent", "responsibilities": ["单元测试", "集成测试", "Bug修复"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "需求分析和系统设计", "performed_by": "产品经理", "output": "requirements"},
      {"step": 2, "action": "技术架构设计", "performed_by": "技术负责人", "output": "architecture"},
      {"step": 3, "action": "数据库设计", "performed_by": "后端开发", "output": "db_schema"},
      {"step": 4, "action": "API接口开发", "performed_by": "后端开发", "output": "api_code"},
      {"step": 5, "action": "前端界面开发", "performed_by": "前端开发", "output": "ui_code"},
      {"step": 6, "action": "集成测试", "performed_by": "测试工程师", "output": "test_report"},
      {"step": 7, "action": "部署和文档", "performed_by": "技术负责人", "output": "deployment_guide"}
    ]
  }',
  '{
    "communication_protocol": "每日站会同步进度，代码提交前需审查",
    "conflict_resolution": "由技术负责人最终决策",
    "quality_standards": "代码覆盖率>80%，API符合RESTful规范"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 插入示例 3: 定制设计工作室
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'virtual-company-design-001',
  '定制设计工作室',
  '专业的设计团队，提供品牌视觉、UI/UX、3D建模等服务。适用于Logo设计、包装设计、UI设计等场景。',
  'virtual-company',
  '{"name": "创意总监", "responsibilities": ["创意方向", "风格把控", "客户沟通", "质量审核"]}',
  '[
    {"role": "平面设计师", "specialty": "品牌视觉和平面设计", "agent_type": "frontend-agent", "responsibilities": ["Logo设计", "海报设计", "包装设计"]},
    {"role": "UI/UX设计师", "specialty": "界面设计和用户体验", "agent_type": "frontend-agent", "responsibilities": ["APP界面", "网页设计", "交互原型"]},
    {"role": "3D建模师", "specialty": "三维建模和渲染", "agent_type": "frontend-agent", "responsibilities": ["产品建模", "场景渲染", "动画制作"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "需求沟通和创意构思", "performed_by": "创意总监", "output": "creative_brief"},
      {"step": 2, "action": "市场调研和灵感收集", "performed_by": "平面设计师", "output": "mood_board"},
      {"step": 3, "action": "初稿设计", "performed_by": "平面设计师", "output": "draft_design"},
      {"step": 4, "action": "UI界面设计", "performed_by": "UI/UX设计师", "output": "ui_mockup"},
      {"step": 5, "action": "3D建模和渲染", "performed_by": "3D建模师", "output": "3d_models"},
      {"step": 6, "action": "整合和优化", "performed_by": "创意总监", "output": "final_design"},
      {"step": 7, "action": "交付和反馈", "performed_by": "创意总监", "output": "delivery_package"}
    ]
  }',
  '{
    "communication_protocol": "每个设计阶段需客户确认后再进入下一阶段",
    "conflict_resolution": "由创意总监协调不同设计风格",
    "quality_standards": "符合品牌规范，输出高清源文件"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 迁移完成
-- ============================================

COMMENT ON SCHEMA public IS 'NvwaX 虚拟公司模板迁移 v1.0.0 已完成';
```

#### 1.2 执行迁移

```bash
cd packages/nvwax-server
psql -U postgres -d nvwax -f migrations/004_virtual_company_templates.sql
```

---

### Phase 2: 后端 API 扩展（预计 2 小时）

#### 2.1 扩展 Team Skill Controller

文件: `packages/nvwax-server/src/controllers/team-skill.controller.ts`

在现有方法基础上，确保 `getMarketplaceTeamSkills` 支持按分类筛选：

```typescript
/**
 * 获取公开的 Team Skills（市场展示）
 * GET /api/team-skills/marketplace?category=virtual-company
 */
async getMarketplaceTeamSkills(req: Request, res: Response) {
  try {
    const { page = 1, limit = 20, category } = req.query;

    let result;
    if (category) {
      // 按分类筛选
      result = await teamSkillService.getTeamSkillsByCategory(
        category as string,
        parseInt(page as string),
        parseInt(limit as string)
      );
    } else {
      // 获取所有公开的
      result = await teamSkillService.getPublicTeamSkills(
        parseInt(page as string),
        parseInt(limit as string)
      );
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching marketplace team skills:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch marketplace team skills' });
  }
}
```

#### 2.2 添加虚拟公司专用 API（可选）

如果需要更细粒度的控制，可以添加专用端点：

```typescript
// GET /api/team-skills/virtual-companies
router.get('/virtual-companies', teamSkillController.getVirtualCompanies);

async getVirtualCompanies(req: Request, res: Response) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await teamSkillService.getTeamSkillsByCategory(
      'virtual-company',
      parseInt(page as string),
      parseInt(limit as string)
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching virtual companies:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch virtual companies' });
  }
}
```

---

### Phase 3: 前端页面改造（预计 3 小时）

#### 3.1 扩展 Agent 广场页面

文件: `packages/nvwax-web/app/marketplace/page.tsx`

增加分类筛选功能：

```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi, Agent } from '@/lib/api/search';
import { teamSkillApi, TeamSkill } from '@/lib/api/team-skills';
import { Star, Download, ExternalLink, Users } from 'lucide-react';
import Link from 'next/link';

type Category = 'all' | 'virtual-company' | 'development' | 'analysis' | 'content';

export default function MarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');

  // 查询 Team Skills（包括虚拟公司）
  const { data: teamSkillsData, isLoading: loadingTeamSkills } = useQuery({
    queryKey: ['team-skills', selectedCategory],
    queryFn: () => {
      if (selectedCategory === 'all') {
        return teamSkillApi.getMarketplaceTeamSkills(1, 30);
      } else {
        return teamSkillApi.getTeamSkillsByCategory(selectedCategory, 1, 30);
      }
    }
  });

  // 分类选项
  const categories: { value: Category; label: string; icon?: any }[] = [
    { value: 'all', label: '全部' },
    { value: 'virtual-company', label: '虚拟公司', icon: Users },
    { value: 'development', label: '开发团队' },
    { value: 'analysis', label: '数据分析' },
    { value: 'content', label: '内容创作' },
  ];

  if (loadingTeamSkills) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12 text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Agent 广场</h1>
        <p className="text-gray-600 dark:text-gray-300">发现和探索优秀的 AI Agent 和虚拟公司</p>
      </div>

      {/* 分类筛选器 */}
      <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              selectedCategory === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat.icon && <cat.icon size={18} />}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Featured Section for Virtual Companies */}
      {selectedCategory === 'virtual-company' && (
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
          <h2 className="text-2xl font-bold mb-2">🏢 虚拟公司</h2>
          <p>组建你的 AI 团队，像真实公司一样协作工作</p>
        </div>
      )}

      {/* Team Skills Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamSkillsData?.data?.data?.map((skill: TeamSkill) => (
          <Link
            key={skill.id}
            href={`/marketplace/team-skills/${skill.id}`}
            className="block bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
                  {skill.name}
                </h3>
                {skill.category === 'virtual-company' && (
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    虚拟公司
                  </span>
                )}
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3 h-12">
                {skill.description}
              </p>
              
              {/* 显示团队成员数量 */}
              {skill.roles && Array.isArray(skill.roles) && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <Users size={16} />
                  <span>{skill.roles.length} 个角色</span>
                </div>
              )}

              {skill.category && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded">
                    {skill.category}
                  </span>
                </div>
              )}

              <div className="inline-flex items-center justify-center w-full gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
                查看详情
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!teamSkillsData?.data?.data?.length && (
        <div className="text-center py-12 text-gray-500">
          暂无数据
        </div>
      )}
    </div>
  );
}
```

#### 3.2 创建虚拟公司详情页（可选增强）

文件: `packages/nvwax-web/app/marketplace/team-skills/[id]/page.tsx`

展示虚拟公司的详细信息，包括：
- 公司简介
- 团队成员列表
- 工作流程
- 适用场景
- 打包按钮

---

### Phase 4: 打包测试（预计 2 小时）

#### 4.1 准备工作

确保环境就绪：

```bash
# 1. 安装 Python 依赖
cd packages/skillhub-workflow
pip install pyinstaller

# 2. 创建输出目录
mkdir -p packages/nvwax-server/exports
mkdir -p packages/downloads

# 3. 启动后端服务
cd packages/nvwax-server
npm run dev

# 4. 启动前端服务
cd packages/nvwax-web
npm run dev
```

#### 4.2 测试流程

对每个虚拟公司实例执行以下步骤：

**测试用例 1: 智能营销策划公司**

1. 访问 http://localhost:3000/marketplace?category=virtual-company
2. 点击"智能营销策划公司"卡片
3. 查看详细信息，确认团队成员和工作流程正确显示
4. 点击"打包下载"按钮
5. 选择平台（Windows/macOS/Linux）
6. 等待打包完成（5-10分钟）
7. 下载可执行文件
8. 运行可执行文件，验证：
   - 欢迎信息显示正确
   - 团队成员列表正确
   - 交互式对话能正常启动

**测试用例 2: 虚拟开发团队**

重复上述步骤，测试"虚拟开发团队"

**测试用例 3: 定制设计工作室**

重复上述步骤，测试"定制设计工作室"

#### 4.3 验证清单

- [ ] 三个虚拟公司都能在 Agent 广场正确显示
- [ ] 分类筛选功能正常工作
- [ ] 每个虚拟公司都能成功打包
- [ ] 打包后的可执行文件大小合理（< 100MB）
- [ ] 可执行文件能正常启动
- [ ] 团队配置信息正确加载
- [ ] 交互式对话界面正常工作

---

## 📊 预期成果

### 1. 数据库层面
- 新增 3 条 `team_skills` 记录，分类为 `virtual-company`
- 每条记录包含完整的团队配置、工作流程和协作规则

### 2. API 层面
- `/api/team-skills/marketplace?category=virtual-company` 返回虚拟公司列表
- 支持按分类筛选和分页

### 3. 前端层面
- Agent 广场页面增加分类筛选器
- "虚拟公司"分类展示三个实例
- 每个实例可查看详情并打包下载

### 4. 打包层面
- 三个虚拟公司都能成功打包为可执行文件
- 打包后的程序能独立运行，无需安装 Python
- 用户体验流畅，从浏览到下载一气呵成

---

## ⚠️ 风险与应对

### 风险 1: 数据库迁移失败

**原因**: SQL 语法错误或字段冲突

**应对**:
- 先在测试环境执行迁移
- 备份现有数据
- 检查 `team_skills` 表结构是否与迁移脚本匹配

### 风险 2: 打包时间过长

**原因**: PyInstaller 打包整个 Python 运行时

**应对**:
- 提前告知用户预计时间（5-10分钟）
- 显示实时进度条
- 考虑使用 Nuitka 替代（后续优化）

### 风险 3: 前端 React Hooks 警告

**原因**: PackageModal 中存在 useEffect 级联渲染

**应对**:
- 使用 useCallback 包裹函数
- 不影响功能，可后续优化

### 风险 4: 跨平台兼容性问题

**原因**: 在当前平台只能生成对应平台的可执行文件

**应对**:
- 明确标注平台限制
- 第二阶段实现 GitHub Actions 多平台构建

---

## 📅 时间规划

| 阶段 | 任务 | 预计时间 | 状态 |
|------|------|---------|------|
| Phase 1 | 数据库迁移 | 1 小时 | ⏳ 待开始 |
| Phase 2 | 后端 API 扩展 | 2 小时 | ⏳ 待开始 |
| Phase 3 | 前端页面改造 | 3 小时 | ⏳ 待开始 |
| Phase 4 | 打包测试 | 2 小时 | ⏳ 待开始 |
| **总计** | | **8 小时** | |

---

## 🎓 经验总结

### 成功经验（来自 BossClaw 打包功能）

1. **分层架构清晰**: 后端服务、Python 打包器、前端界面职责分明
2. **异步设计合理**: 避免阻塞主线程，提升用户体验
3. **配置与运行时分离**: 便于调试和维护
4. **文档完善**: 集成指南和故障排查降低使用门槛

### 本次开发的创新点

1. **虚拟公司概念落地**: 将抽象的多智能体协作转化为具体的"公司"形态
2. **场景化模板**: 针对营销、开发、设计三个典型场景提供开箱即用的解决方案
3. **分类筛选体验**: 在 Agent 广场中突出"虚拟公司"特色，方便用户发现

---

## 📞 技术支持

- **设计文档**: [BossClaw.md](./BossClaw.md)
- **打包指南**: [BOSSCLAW-PACKAGE-INTEGRATION.md](./BOSSCLAW-PACKAGE-INTEGRATION.md)
- **完成报告**: [BOSSCLAW-PACKAGE-COMPLETION.md](./BOSSCLAW-PACKAGE-COMPLETION.md)
- **问题反馈**: https://github.com/BigLionX/NvwaX/issues

---

**计划制定时间**: 2026-04-26  
**计划状态**: 📝 待执行  
**下一步**: 开始 Phase 1 - 数据库迁移
