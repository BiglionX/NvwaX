# Multi-Agent Orchestrator - 快速参考

## 🚀 快速开始

### 触发关键词
```
"多 agent 协作" | "并行开发" | "全栈功能" | "构建系统" | "协调任务"
```

### 基本命令
```bash
# 查看任务进度
python .lingma/skills/multi-agent-orchestrator/scripts/task_tracker.py demo

# 创建新任务跟踪
python task_tracker.py create my-task-id

# 加载已有任务
python task_tracker.py load task-report.json
```

---

## 🤖 Agent 类型速查

| Agent | 专长 | 触发词 |
|-------|------|--------|
| **frontend** | React/Vue, UI, CSS | 界面、组件、样式、前端 |
| **backend** | API, 业务逻辑, Auth | 接口、服务器、中间件 |
| **database** | Schema, 迁移, SQL | 表结构、数据库、Prisma |
| **test** | 单元/E2E 测试 | 测试、用例、覆盖率 |
| **docs** | API 文档, README | 文档、说明、注释 |
| **review** | 代码审查, 安全 | 审查、检查、优化 |

---

## 📋 任务分解模板

### 全栈功能
```
1. [database] 设计数据模型
2. [backend] 实现 API
3. [frontend] 开发 UI
4. [test] 编写测试
5. [docs] 更新文档
6. [review] 代码审查
```

### Bug 修复
```
1. [backend] 诊断问题
2. [database] 检查数据
3. [frontend] 验证 UI
4. [相关 agent] 实施修复
5. [test] 回归测试
6. [review] 安全审计
```

---

## 💬 消息格式速查

### 任务分配
```json
{
  "messageType": "TASK_ASSIGNMENT",
  "payload": {
    "taskId": "task-id",
    "description": "任务描述",
    "deliverables": ["交付物列表"],
    "dependencies": ["依赖任务ID"],
    "priority": "high"
  }
}
```

### 任务完成
```json
{
  "messageType": "TASK_COMPLETED",
  "payload": {
    "taskId": "task-id",
    "artifacts": [{"path": "文件路径"}],
    "testResults": {"passed": 25, "coverage": 92},
    "dependsOnMe": ["后续任务ID"]
  }
}
```

---

## ⚡ 执行策略

### 完全并行（无依赖）
```
[frontend] ──┐
[backend]  ──┼──→ [整合]
[database] ──┘
```

### 串行执行（有依赖）
```
[database] → [backend] → [frontend] → [test]
```

### 混合执行
```
Phase 1: [db] + [backend-setup]     (parallel)
Phase 2: [api] + [frontend-ui]      (parallel)
Phase 3: [test] + [docs]            (parallel)
Phase 4: [review]                   (sequential)
```

---

## 🎯 常见场景

### 场景 1：博客系统
```
用户: "创建博客系统"

分解:
- [db] posts, comments, tags 表
- [backend] CRUD APIs
- [frontend] 列表页、详情页、编辑器
- [test] API + E2E 测试
- [docs] API 文档

时间: 20-25h (并行) vs 44h (串行)
```

### 场景 2：用户认证
```
用户: "实现登录注册"

分解:
- [db] users 表
- [backend] auth API, JWT
- [frontend] 登录/注册表单
- [test] 安全测试
- [review] 安全审计

重点: 密码哈希、速率限制、XSS 防护
```

### 场景 3：性能优化
```
用户: "页面加载慢"

分解:
- [db] 添加索引
- [backend] 实现缓存
- [frontend] 虚拟滚动、懒加载
- [review] 性能审计

目标: 加载时间 < 1s
```

---

## ⚠️ 注意事项

### 常见陷阱
- ❌ 循环依赖 → 提取共享接口
- ❌ 接口不匹配 → 早期定义契约
- ❌ 资源竞争 → 明确文件所有权
- ❌ 过度并行 → 限制并发 ≤ 5

### 最佳实践
- ✅ 早期定义接口契约
- ✅ 每个任务明确验收标准
- ✅ 定期小范围集成
- ✅ 保持沟通畅通
- ✅ 记录架构决策

---

## 📊 性能指标

### 时间节省
| 规模 | 串行 | 并行 | 提升 |
|------|------|------|------|
| 小型 | 8h | 3h | 62% |
| 中型 | 40h | 18h | 55% |
| 大型 | 120h | 50h | 58% |

### 质量标准
- Test Coverage: ≥ 80%
- Lighthouse Score: ≥ 90
- Security Scan: Passed
- Code Review: Approved

---

## 🔗 相关文档

- **完整指南**: `README.md`
- **工作流程**: `SKILL.md`
- **Agent 详情**: `agents-reference.md`
- **通信协议**: `communication-protocol.md`
- **实战示例**: `examples.md`
- **API 集成**: `../../SkillHub-API-Integration-Plan.md`

---

## 💻 常用命令

```bash
# 运行示例
cd .lingma/skills/multi-agent-orchestrator
python scripts/task_tracker.py demo

# 导出报告
python scripts/task_tracker.py load task.json
# 然后调用 tracker.export_report(format="markdown")

# 检查依赖
python scripts/check_dependencies.py
```

---

**版本**: 1.0.0  
**更新**: 2026-04-24  
**项目**: NvwaX
