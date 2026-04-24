---
name: multi-agent-orchestrator
description: Coordinate multiple specialized agents to complete complex tasks. Decompose large tasks into subtasks, assign them to appropriate agents (frontend, backend, database, testing, documentation), and integrate results. Use when handling full-stack development, complex feature implementation, or when the user mentions multi-agent collaboration, parallel task execution, or distributed work.
---

# Multi-Agent Orchestrator

协调多个专业 agent 并行完成复杂任务。将大型任务分解为子任务，分配给合适的专业 agent（前端、后端、数据库、测试、文档），并整合结果。

## 核心工作流程

### 1. 任务分析与分解

当接收到复杂任务时：

```
用户请求: "构建一个完整的用户管理系统"
    ↓
分析任务范围和需求
    ↓
识别独立的子任务模块
    ↓
创建任务依赖图
```

**任务分解原则**:
- **独立性**: 子任务之间尽量减少依赖
- **专业性**: 每个子任务对应一个专业领域
- **可验证性**: 每个子任务有明确的完成标准
- **并行性**: 最大化可并行执行的子任务

### 2. Agent 类型与职责

| Agent 类型 | 专长领域 | 触发关键词 |
|-----------|---------|-----------|
| **frontend-agent** | React/Vue 组件、UI/UX、状态管理 | 前端、界面、组件、UI、样式 |
| **backend-agent** | API 设计、业务逻辑、认证授权 | 后端、API、服务器、接口 |
| **database-agent** | 数据模型、查询优化、迁移脚本 | 数据库、表结构、SQL、Prisma |
| **test-agent** | 单元测试、集成测试、E2E 测试 | 测试、用例、jest、cypress |
| **docs-agent** | API 文档、README、技术文档 | 文档、说明、注释、README |
| **review-agent** | 代码审查、安全检查、最佳实践 | 审查、检查、优化、重构 |

### 3. 任务分配策略

#### 策略 A：并行执行（无依赖）

```markdown
任务: "创建用户登录功能"

并行子任务:
- [frontend-agent] 实现登录表单 UI 组件
- [backend-agent] 开发登录 API 端点
- [database-agent] 设计用户表结构和索引
- [test-agent] 编写登录功能的测试用例

所有任务完成后整合
```

#### 策略 B：串行执行（有依赖）

```markdown
任务: "实现用户资料页面"

执行顺序:
1. [database-agent] 设计用户资料表结构
2. [backend-agent] 开发获取用户资料的 API
3. [frontend-agent] 实现资料展示页面
4. [test-agent] 编写端到端测试
5. [docs-agent] 更新 API 文档
```

#### 策略 C：混合执行（部分依赖）

```markdown
任务: "构建博客系统"

第一阶段（并行）:
- [database-agent] 设计文章表和评论表
- [backend-agent] 搭建基础 API 框架

第二阶段（并行）:
- [backend-agent] 实现文章 CRUD API
- [frontend-agent] 开发文章列表页
- [test-agent] 编写数据库迁移测试

第三阶段（并行）:
- [backend-agent] 实现评论 API
- [frontend-agent] 开发文章详情页
- [docs-agent] 编写 API 文档

第四阶段:
- [review-agent] 全面代码审查
- [test-agent] 运行完整测试套件
```

### 4. 通信协议

#### 标准化输出格式

每个 agent 完成任务后必须输出：

```json
{
  "agent": "frontend-agent",
  "task": "实现登录表单",
  "status": "completed",
  "artifacts": [
    {
      "type": "file",
      "path": "components/LoginForm.tsx",
      "description": "登录表单组件"
    },
    {
      "type": "file",
      "path": "styles/login.css",
      "description": "登录页面样式"
    }
  ],
  "dependencies": ["backend-api-login"],
  "notes": "需要后端提供 /api/auth/login 端点",
  "validation": {
    "tests_passed": true,
    "lint_passed": true,
    "build_passed": true
  }
}
```

#### 依赖声明

每个子任务必须明确声明：
- **前置依赖**: 需要哪些其他任务先完成
- **后置影响**: 完成后会影响哪些其他任务
- **接口契约**: 与其他模块的交互接口定义

### 5. 冲突解决

当多个 agent 的结果存在冲突时：

1. **命名冲突**: 
   - 检查变量名、函数名、类名是否重复
   - 使用命名空间或前缀区分

2. **接口冲突**:
   - API 参数不匹配
   - 数据类型不一致
   - 通过接口定义文件（TypeScript interfaces）统一

3. **版本冲突**:
   - 依赖包版本不一致
   - 使用统一的 package.json 管理

4. **风格冲突**:
   - 代码风格不统一
   - 运行 linter 和 formatter 自动修复

### 6. 结果整合流程

```
收集所有 agent 的输出
    ↓
验证接口契约一致性
    ↓
合并代码到主分支
    ↓
运行集成测试
    ↓
生成整合报告
    ↓
通知用户完成
```

## 实际使用示例

### 示例 1：全栈功能开发

**用户请求**: "帮我实现一个待办事项应用"

**Orchestrator 响应**:

```markdown
我将协调多个 agent 来完成这个任务。

## 任务分解

### 数据库层
- [database-agent] 设计 todos 表结构（id, title, completed, created_at）
- [database-agent] 创建 Prisma schema 和迁移脚本

### 后端层
- [backend-agent] 实现 GET /api/todos（获取所有待办）
- [backend-agent] 实现 POST /api/todos（创建待办）
- [backend-agent] 实现 PUT /api/todos/:id（更新待办）
- [backend-agent] 实现 DELETE /api/todos/:id（删除待办）

### 前端层
- [frontend-agent] 创建 TodoList 组件（展示待办列表）
- [frontend-agent] 创建 TodoItem 组件（单个待办项）
- [frontend-agent] 创建 AddTodo 组件（添加新待办）
- [frontend-agent] 实现状态管理（Redux/Zustand）

### 测试层
- [test-agent] 编写 API 单元测试
- [test-agent] 编写组件单元测试
- [test-agent] 编写 E2E 测试流程

### 文档层
- [docs-agent] 编写 API 文档
- [docs-agent] 更新 README 使用说明

## 执行计划

**阶段 1**（并行）: 数据库 + 后端基础
- [database-agent] 开始设计表结构
- [backend-agent] 搭建 Express/Fastify 框架

**阶段 2**（并行）: API 实现 + 前端组件
- [backend-agent] 实现 CRUD API
- [frontend-agent] 开发 UI 组件

**阶段 3**（并行）: 测试 + 文档
- [test-agent] 编写测试用例
- [docs-agent] 编写文档

**阶段 4**: 整合与审查
- [review-agent] 代码审查
- 运行完整测试套件

预计总时间: 约 2-3 小时（并行执行）
```

### 示例 2：Bug 修复协作

**用户请求**: "登录功能有问题，用户反馈无法登录"

**Orchestrator 响应**:

```markdown
我将协调多个 agent 来诊断和修复这个问题。

## 诊断流程

### 第一步：问题定位
- [backend-agent] 检查登录 API 日志和错误信息
- [frontend-agent] 检查前端登录表单的网络请求
- [database-agent] 检查用户表数据和密码哈希

### 第二步：根因分析
根据诊断结果确定问题类型：
- API 错误 → [backend-agent] 修复
- 前端错误 → [frontend-agent] 修复
- 数据错误 → [database-agent] 修复

### 第三步：修复实施
- 相关 agent 实施修复
- [test-agent] 编写回归测试防止复发

### 第四步：验证
- [test-agent] 运行登录相关的完整测试套件
- [review-agent] 审查修复代码

请提供更多错误信息以便更精准地分配任务。
```

## 工具与脚本

### 任务跟踪脚本

创建 `scripts/task-tracker.py` 来跟踪多 agent 任务进度：

```python
#!/usr/bin/env python3
"""
Multi-Agent Task Tracker
跟踪多 agent 任务的执行状态
"""

import json
from datetime import datetime

class TaskTracker:
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.tasks = []
        self.start_time = datetime.now()
    
    def add_task(self, agent: str, description: str, dependencies: list = None):
        self.tasks.append({
            "id": f"{self.task_id}-{len(self.tasks)}",
            "agent": agent,
            "description": description,
            "status": "pending",
            "dependencies": dependencies or [],
            "started_at": None,
            "completed_at": None,
            "artifacts": []
        })
    
    def start_task(self, task_id: str):
        for task in self.tasks:
            if task["id"] == task_id:
                task["status"] = "in_progress"
                task["started_at"] = datetime.now().isoformat()
                break
    
    def complete_task(self, task_id: str, artifacts: list = None):
        for task in self.tasks:
            if task["id"] == task_id:
                task["status"] = "completed"
                task["completed_at"] = datetime.now().isoformat()
                task["artifacts"] = artifacts or []
                break
    
    def get_progress(self) -> dict:
        total = len(self.tasks)
        completed = sum(1 for t in self.tasks if t["status"] == "completed")
        in_progress = sum(1 for t in self.tasks if t["status"] == "in_progress")
        
        return {
            "task_id": self.task_id,
            "total": total,
            "completed": completed,
            "in_progress": in_progress,
            "pending": total - completed - in_progress,
            "progress_percent": (completed / total * 100) if total > 0 else 0,
            "elapsed_time": str(datetime.now() - self.start_time)
        }
    
    def export_report(self) -> str:
        report = {
            "task_id": self.task_id,
            "summary": self.get_progress(),
            "tasks": self.tasks,
            "generated_at": datetime.now().isoformat()
        }
        return json.dumps(report, indent=2)

# 使用示例
if __name__ == "__main__":
    tracker = TaskTracker("user-auth-system")
    tracker.add_task("database-agent", "设计用户表结构")
    tracker.add_task("backend-agent", "实现登录 API", dependencies=["db-0"])
    tracker.add_task("frontend-agent", "开发登录表单", dependencies=["backend-1"])
    tracker.add_task("test-agent", "编写测试用例")
    
    print(tracker.export_report())
```

### 依赖检查脚本

创建 `scripts/check-dependencies.py` 验证任务依赖：

```python
#!/usr/bin/env python3
"""
Dependency Checker
检查任务依赖是否满足
"""

def check_dependencies(tasks: list) -> dict:
    """
    检查所有任务的依赖是否已满足
    返回: {can_proceed: bool, blocked_tasks: list}
    """
    completed_tasks = {t["id"] for t in tasks if t["status"] == "completed"}
    blocked_tasks = []
    
    for task in tasks:
        if task["status"] == "pending":
            unmet_deps = [dep for dep in task["dependencies"] if dep not in completed_tasks]
            if unmet_deps:
                blocked_tasks.append({
                    "task_id": task["id"],
                    "unmet_dependencies": unmet_deps
                })
    
    can_proceed = len(blocked_tasks) == 0
    
    return {
        "can_proceed": can_proceed,
        "blocked_tasks": blocked_tasks,
        "ready_tasks": [t["id"] for t in tasks if t["status"] == "pending" and t["id"] not in [b["task_id"] for b in blocked_tasks]]
    }
```

## 最佳实践

### 1. 明确边界

- 每个 agent 的职责范围要清晰
- 避免任务重叠导致重复工作
- 使用接口契约明确模块边界

### 2. 早期集成

- 不要等到所有任务完成才整合
- 每完成一个阶段就进行小范围集成
- 尽早发现接口不匹配问题

### 3. 持续沟通

- agent 之间通过标准化的消息格式通信
- 及时通报进度和阻塞情况
- 遇到问题立即升级给 orchestrator

### 4. 自动化验证

- 每个 agent 完成后自动运行验证
- 使用 CI/CD 管道确保质量
- 自动生成整合报告

### 5. 文档同步

- 代码变更时同步更新文档
- 维护最新的接口文档
- 记录架构决策和权衡

## 常见问题

### Q: 如何处理 agent 之间的循环依赖？

**A**: 
1. 识别循环依赖链
2. 打破循环：提取共享接口或抽象层
3. 重新设计任务分解策略
4. 必要时合并相关任务到一个 agent

### Q: 如果某个 agent 任务失败怎么办？

**A**:
1. 分析失败原因（技术障碍、需求不清、依赖问题）
2. 尝试重试或调整任务描述
3. 如仍失败，考虑更换实现方案
4. 通知 orchestrator 重新规划后续任务

### Q: 如何平衡并行度和依赖关系？

**A**:
1. 优先最大化独立任务的并行度
2. 对于有依赖的任务，使用桩（stub）或 mock 提前开始
3. 定期同步进度，动态调整执行计划
4. 预留缓冲时间处理意外依赖

## 附加资源

- 详细的 agent 职责说明：[agents-reference.md](agents-reference.md)
- 通信协议规范：[communication-protocol.md](communication-protocol.md)
- 示例项目：[examples.md](examples.md)
- 任务模板库：[templates.md](templates.md)
