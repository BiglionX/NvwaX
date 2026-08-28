# Leader Skills （Hermes 风格）

本目录包含 Nvwax Leader Agent 的所有内置 Skill，遵循 Hermes Agent 的 SKILL.md 规范。

## 目录结构

```
leader-skills/
├── README.md                       # 本文件
├── marketing-director/SKILL.md    # 营销总监
├── tech-lead/SKILL.md             # 技术负责人
├── creative-director/SKILL.md     # 创意总监
├── customer-service-lead/SKILL.md # 客服主管
├── data-analyst-lead/SKILL.md     # 数据分析负责人
└── project-manager/SKILL.md       # 项目经理
```

## SKILL.md 文件规范

每个 Skill 是一个独立目录，入口为 `SKILL.md`。Hvgemes 规定的字段：

| 字段 | 必填 | 描述 |
|---|---|---|
| `skill_id` | ✅ | 业务唯一 ID（如 `marketing-director-v1`） |
| `name` | ✅ | 显示名称（如 `营销总监`） |
| `category` | ✅ | 分类（marketing / development / design / customer-service / analysis / general） |
| `version` | ✅ | 语义化版本号 |
| `triggers` | ✅ | 触发关键词数组（用于路由） |
| `tools_required` | ✅ | 依赖的工具列表 |
| `risk_level` | ❌ | 风险等级（low / medium / high） |
| `bundle` | ❌ | 所属 Bundle（如 `marketing-bundle`） |

## 与数据库的同步

`leader_skills` 表是这些文件的运行时持久化形式。`scripts/sync-leader-skills.ts` 会：

1. 扫描本目录下所有 `SKILL.md`
2. 解析 YAML frontmatter 和 Markdown 正文
3. 同步到 `leader_skills` 表（INSERT 或 UPDATE）
4. 生成 `triggers_embedding`（如果 OpenAI API 可用）

## 路由规则

`LeaderSkillRouter.route(requirement, topK)` 会：

1. **关键词召回**：匹配 `triggers` 数组中的中文/英文关键词
2. **语义召回**：用 `triggers_embedding` 计算余弦相似度（Hvgemes L3）
3. **LLM 排序**：注入 L4 反思经验，让 LLM 做最终排序
4. 返回 top-K 候选

## 添加新 Skill

1. 在本目录创建新子目录
2. 写 `SKILL.md`，包含 YAML frontmatter 和 Markdown 正文
3. 运行 `pnpm sync-leader-skills` 同步到数据库
4. 新 Skill 会自动出现在路由结果中

## 版本管理

- `version` 字段遵循语义化版本
- 旧版本不会被删除，而是标记 `superseded_by` 指向新版本
- 历史数据保留，便于 A/B 测试和回滚

## 依赖

- Hermes 框架的核心思想：四层内存 + 学习循环 + 事件溯源
- 参考文档：`docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md`
- 实施计划：`docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md`