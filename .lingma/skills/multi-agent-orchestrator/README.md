# Multi-Agent Orchestrator Skill

> 协调多个专业 AI agent 并行完成复杂的全栈开发任务

## 📋 概述

这个 skill 教会 AI assistant 如何协调多个专业化 agent（前端、后端、数据库、测试、文档、审查）来高效完成复杂的软件开发任务。通过智能的任务分解、并行执行和结果整合，可以将原本需要数天的工作缩短到几小时。

## 🎯 适用场景

- **全栈应用开发** - 从数据库到前端的完整功能实现
- **复杂特性开发** - 需要多个专业领域协作的功能
- **Bug 修复协作** - 跨模块的问题诊断和修复
- **性能优化** - 多层次的系统性优化
- **代码重构** - 大规模代码改进项目

## 🚀 快速开始

### 触发关键词

当用户提到以下内容时，自动激活此 skill：
- "多 agent 协作"
- "并行开发"
- "全栈功能"
- "构建完整系统"
- "协调多个任务"

### 基本用法

```
用户: "帮我构建一个待办事项应用"

AI (激活 orchestrator):
"我将协调多个 agent 来完成这个任务。

任务分解:
1. [database-agent] 设计 todos 表结构
2. [backend-agent] 实现 CRUD API
3. [frontend-agent] 开发 UI 组件
4. [test-agent] 编写测试用例
5. [docs-agent] 编写文档

预计总时间: 约 2-3 小时（并行执行）"
```

## 📚 文档结构

```
multi-agent-orchestrator/
├── SKILL.md                    # 主指令文件（本文件）
├── agents-reference.md         # 各 agent 类型详细说明
├── communication-protocol.md   # Agent 间通信协议规范
└── examples.md                 # 真实场景示例
```

## 🤖 支持的 Agent 类型

| Agent | 专长 | 触发场景 |
|-------|------|---------|
| **frontend-agent** | React/Vue, UI/UX, 状态管理 | 界面、组件、样式 |
| **backend-agent** | API, 业务逻辑, 认证 | 服务器、接口、中间件 |
| **database-agent** | 数据模型, 迁移, 优化 | 数据库、表结构、SQL |
| **test-agent** | 单元/集成/E2E 测试 | 测试、用例、覆盖率 |
| **docs-agent** | API 文档, README | 文档、说明、注释 |
| **review-agent** | 代码审查, 安全检查 | 审查、优化、重构 |

详细职责说明见 [agents-reference.md](agents-reference.md)

## 🔄 工作流程

### 1. 任务分析与分解

```
用户需求 → 分析范围 → 识别子任务 → 创建依赖图
```

**分解原则**:
- 独立性：减少子任务间依赖
- 专业性：每个任务对应专业领域
- 可验证性：明确的完成标准
- 并行性：最大化并行执行

### 2. Agent 分配

根据任务类型自动选择合适的 agent：

```typescript
if (task involves UI/components) → frontend-agent
if (task involves API/business logic) → backend-agent
if (task involves data models/schema) → database-agent
if (task involves testing) → test-agent
if (task involves documentation) → docs-agent
if (task involves review/audit) → review-agent
```

### 3. 执行策略

#### 策略 A：完全并行（无依赖）
```
[frontend] ──┐
[backend]  ──┼──→ [整合]
[database] ──┘
```

#### 策略 B：串行执行（有依赖）
```
[database] → [backend] → [frontend] → [test]
```

#### 策略 C：混合执行
```
Phase 1: [database] + [backend-setup]  (parallel)
Phase 2: [backend-api] + [frontend-ui] (parallel)
Phase 3: [test] + [docs]               (parallel)
Phase 4: [review]                      (sequential)
```

### 4. 通信与协调

使用标准化消息格式进行 agent 间通信：

```json
{
  "messageType": "TASK_COMPLETED",
  "payload": {
    "taskId": "api-auth",
    "artifacts": [...],
    "dependsOnMe": ["login-form", "protected-routes"]
  }
}
```

详见 [communication-protocol.md](communication-protocol.md)

### 5. 结果整合

```
收集所有输出 → 验证接口一致性 → 合并代码 → 
运行集成测试 → 生成报告 → 通知用户
```

## 💡 使用示例

### 示例 1：博客系统

```
用户: "创建一个支持评论和标签的博客系统"

Orchestrator:
"任务分解:

数据库层:
- [database-agent] 设计 posts, comments, tags 表

后端层:
- [backend-agent] 文章 CRUD API
- [backend-agent] 评论 API
- [backend-agent] 标签管理 API

前端层:
- [frontend-agent] 文章列表页
- [frontend-agent] 文章详情页
- [frontend-agent] 评论组件

测试层:
- [test-agent] API 测试
- [test-agent] E2E 测试

文档层:
- [docs-agent] API 文档

执行计划:
阶段 1 (并行): 数据库设计 + 后端框架搭建
阶段 2 (并行): API 实现 + 前端组件开发
阶段 3 (并行): 测试编写 + 文档更新
阶段 4: 代码审查 + 集成测试

预计时间: 20-25 小时（并行）vs 44 小时（串行）"
```

### 示例 2：紧急 Bug 修复

```
用户: "登录后有时看到其他人的数据！"

Orchestrator:
"🚨 CRITICAL SECURITY ISSUE

启动紧急修复流程:

1. [backend-agent] 检查认证中间件和 session
2. [database-agent] 检查查询过滤逻辑
3. [frontend-agent] 检查客户端状态
4. [review-agent] 安全审计

优先级: CRITICAL
预计诊断: 1 小时
预计修复: 2 小时"
```

更多示例见 [examples.md](examples.md)

## 📊 性能优势

### 时间节省对比

| 任务类型 | 串行执行 | 并行执行 | 提升 |
|---------|---------|---------|------|
| 小型功能 | 8 小时 | 3 小时 | 62% |
| 中型系统 | 40 小时 | 18 小时 | 55% |
| 大型应用 | 120 小时 | 50 小时 | 58% |

### 质量提升

- ✅ 专业化分工 → 更高的代码质量
- ✅ 并行测试 → 更早发现问题
- ✅ 自动化审查 → 减少人为疏漏
- ✅ 标准化流程 → 一致性保证

## 🛠️ 工具与脚本

### 任务跟踪器

```bash
python scripts/task-tracker.py --task-id blog-system
```

输出实时进度：
```
Task: blog-system
Progress: ████████░░ 80%
Completed: 8/10 tasks
In Progress: 1 task
Pending: 1 task
Elapsed: 16h 23m
```

### 依赖检查器

```bash
python scripts/check-dependencies.py
```

验证所有任务依赖是否满足。

## ⚠️ 注意事项

### 常见陷阱

1. **循环依赖**
   - 症状：Task A 依赖 B，B 又依赖 A
   - 解决：提取共享接口或合并任务

2. **接口不匹配**
   - 症状：前后端数据类型不一致
   - 预防：早期定义接口契约

3. **资源竞争**
   - 症状：多个 agent 修改同一文件
   - 解决：明确文件所有权

4. **过度并行**
   - 症状：太多任务同时开展导致混乱
   - 建议：限制并发任务数 ≤ 5

### 最佳实践

✅ **DO**:
- 早期定义清晰的接口契约
- 每个任务有明确的验收标准
- 定期进行小范围集成
- 保持沟通渠道畅通
- 记录架构决策

❌ **DON'T**:
- 不要等到最后才整合
- 不要忽略失败的测试
- 不要跳过代码审查
- 不要硬编码配置
- 不要忽视文档更新

## 🔧 扩展与定制

### 添加新 Agent 类型

1. 在 `agents-reference.md` 中定义新 agent
2. 指定专长领域和触发场景
3. 定义输出标准和代码规范
4. 添加到 orchestrator 的路由逻辑

### 自定义工作流

根据团队需求调整：
- 修改任务分解策略
- 调整并行度限制
- 定制通信协议
- 添加特定的验证步骤

## 📖 相关资源

- [Agent 参考手册](agents-reference.md) - 详细的 agent 职责和能力
- [通信协议](communication-protocol.md) - 消息格式和交互模式
- [使用示例](examples.md) - 真实场景的完整案例
- [SkillHub API 集成方案](../../SkillHub-API-Integration-Plan.md) - 与 SkillHub 的对接

## 🤝 贡献

欢迎提交改进建议和新示例！

1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License - 详见项目根目录 LICENSE 文件

---

**版本**: 1.0.0  
**最后更新**: 2026-04-24  
**维护者**: NvwaX Team  
**项目**: [NvwaX](https://github.com/BiglionX/NvwaX)
