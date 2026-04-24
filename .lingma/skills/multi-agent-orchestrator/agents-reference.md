# Agent 类型参考手册

本文档详细说明 NvwaX 项目中各专业 agent 的职责、能力和使用场景。

---

## Frontend Agent

### 职责范围
- React/Vue/Angular 组件开发
- UI/UX 实现与优化
- 状态管理（Redux、Zustand、Context API）
- 响应式设计与跨浏览器兼容
- 前端性能优化
- 用户交互逻辑

### 技术栈
- **框架**: React 18+, Next.js 14+
- **样式**: Tailwind CSS, CSS Modules, Styled Components
- **状态管理**: Zustand, Redux Toolkit, React Query
- **测试**: Jest, React Testing Library, Cypress
- **工具**: Vite, Webpack, ESLint, Prettier

### 触发场景
- "创建一个登录表单"
- "实现响应式导航栏"
- "优化页面加载速度"
- "添加深色模式支持"
- "修复 UI 布局问题"

### 输出标准
```typescript
// 组件文件结构
components/
├── ComponentName.tsx          // 主组件
├── ComponentName.test.tsx     // 单元测试
├── ComponentName.stories.tsx  // Storybook 故事（可选）
└── index.ts                   // 导出文件

// 样式文件
styles/
└── component-name.module.css
```

### 代码规范
- 使用 TypeScript 严格模式
- 函数组件 + Hooks
- 遵循 SOLID 原则
- 组件单一职责
- Props 类型完整定义

---

## Backend Agent

### 职责范围
- RESTful API 设计与实现
- GraphQL API 开发
- 业务逻辑实现
- 认证与授权（JWT、OAuth）
- 中间件开发
- API 性能优化
- 错误处理与日志记录

### 技术栈
- **运行时**: Node.js 18+, TypeScript
- **框架**: Express, Fastify, NestJS
- **数据库 ORM**: Prisma, TypeORM
- **认证**: JWT, Passport, NextAuth
- **验证**: Zod, Joi, Yup
- **测试**: Jest, Supertest
- **文档**: Swagger/OpenAPI

### 触发场景
- "创建用户注册 API"
- "实现 JWT 认证中间件"
- "优化数据库查询性能"
- "添加请求速率限制"
- "设计 RESTful 接口"

### 输出标准
```typescript
// API 路由结构
api/
├── routes/
│   ├── users.ts
│   ├── auth.ts
│   └── index.ts
├── controllers/
│   ├── userController.ts
│   └── authController.ts
├── middleware/
│   ├── auth.ts
│   └── validation.ts
├── services/
│   ├── userService.ts
│   └── authService.ts
└── types/
    └── api.types.ts
```

### 最佳实践
- 统一的错误响应格式
- 输入验证（使用 Zod）
- 适当的 HTTP 状态码
- API 版本控制
- 速率限制和防抖
- 详细的日志记录

---

## Database Agent

### 职责范围
- 数据模型设计
- 数据库迁移脚本
- 查询优化
- 索引策略
- 数据验证规则
- 种子数据生成
- 数据库性能监控

### 技术栈
- **数据库**: PostgreSQL, MySQL, SQLite
- **ORM**: Prisma, TypeORM, Drizzle
- **迁移**: Prisma Migrate, Knex
- **缓存**: Redis, Upstash
- **测试**: 集成测试套件

### 触发场景
- "设计用户表结构"
- "创建数据库迁移"
- "优化慢查询"
- "添加全文搜索索引"
- "设计多对多关系"

### 输出标准
```prisma
// Prisma Schema 示例
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  posts     Post[]
  profile   Profile?
  
  @@index([email])
  @@index([createdAt])
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

### 设计原则
- 第三范式（3NF）规范化
- 适当的反规范化以提升性能
- 外键约束保证数据完整性
- 软删除支持（deletedAt 字段）
- 审计字段（createdAt, updatedAt）
- 合理的索引策略

---

## Test Agent

### 职责范围
- 单元测试编写
- 集成测试开发
- E2E 测试流程
- 测试覆盖率分析
- Mock 数据生成
- 性能测试
- 回归测试维护

### 技术栈
- **单元测试**: Jest, Vitest
- **组件测试**: React Testing Library
- **E2E 测试**: Cypress, Playwright
- **API 测试**: Supertest, Axios
- **Mock 工具**: MSW, Faker
- **覆盖率**: Istanbul, c8

### 触发场景
- "为登录功能编写测试"
- "增加测试覆盖率到 80%"
- "创建 E2E 测试流程"
- "Mock 外部 API 调用"
- "修复失败的测试用例"

### 测试金字塔
```
       /\
      /  \     E2E Tests (10%)
     /----\
    /      \   Integration Tests (20%)
   /--------\
  /          \ Unit Tests (70%)
 /------------\
```

### 输出标准
```typescript
// 单元测试示例
describe('UserService', () => {
  let service: UserService;
  
  beforeEach(() => {
    service = new UserService(mockRepository);
  });
  
  it('should create a new user', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'secure123',
      name: 'Test User'
    };
    
    const user = await service.create(userData);
    
    expect(user).toHaveProperty('id');
    expect(user.email).toBe(userData.email);
    expect(user.password).not.toBe(userData.password); // 应该已哈希
  });
  
  it('should throw error for duplicate email', async () => {
    await expect(service.create(existingUser)).rejects.toThrow('Email already exists');
  });
});
```

### 最佳实践
- AAA 模式（Arrange-Act-Assert）
- 测试隔离（每个测试独立）
- 有意义的测试描述
- 边界条件测试
- 错误路径测试
- 保持测试简洁

---

## Docs Agent

### 职责范围
- API 文档编写
- README 维护
- 技术架构文档
- 代码注释规范
- 用户指南
- 部署文档
- Changelog 管理

### 技术栈
- **文档框架**: Docusaurus, GitBook, MkDocs
- **API 文档**: Swagger/OpenAPI, Postman
- **图表**: Mermaid, Draw.io
- **静态站点**: Next.js, VitePress

### 触发场景
- "更新 API 文档"
- "编写安装指南"
- "创建架构图"
- "添加代码注释"
- "更新 CHANGELOG"

### 文档结构
```markdown
# Project Name

## Overview
简要介绍项目目标和核心价值

## Quick Start
5 分钟内上手的步骤

## Installation
详细的安装说明

## Usage
使用示例和最佳实践

## API Reference
完整的 API 文档

## Architecture
系统架构说明

## Contributing
贡献指南

## License
许可证信息
```

### 质量标准
- 清晰的标题层级
- 代码示例可运行
- 截图和图表辅助理解
- 链接有效
- 术语一致
- 定期更新

---

## Review Agent

### 职责范围
- 代码质量审查
- 安全漏洞检查
- 性能问题分析
- 最佳实践遵循
- 代码风格统一
- 技术债务识别
- 重构建议

### 检查清单

#### 安全性
- [ ] SQL 注入防护
- [ ] XSS 攻击防护
- [ ] CSRF 令牌验证
- [ ] 敏感信息加密
- [ ] 认证授权正确性
- [ ] 输入验证完整

#### 性能
- [ ] 避免 N+1 查询
- [ ] 适当的缓存策略
- [ ] 异步操作优化
- [ ] 内存泄漏检查
- [ ]  bundle 大小合理
- [ ] 懒加载实现

#### 代码质量
- [ ] 单一职责原则
- [ ] DRY 原则（不重复自己）
- [ ] 函数长度适中（< 50 行）
- [ ] 圈复杂度合理（< 10）
- [ ] 错误处理完善
- [ ] 日志记录充分

#### 可维护性
- [ ] 命名清晰有意义
- [ ] 注释解释"为什么"而非"是什么"
- [ ] 类型定义完整
- [ ] 依赖关系清晰
- [ ] 配置外部化
- [ ] 测试覆盖充分

### 反馈格式

```markdown
## Code Review: [Feature Name]

### ✅ Strengths
- 代码结构清晰，易于理解
- 测试覆盖率达到 85%
- 错误处理完善

### ⚠️ Suggestions
**Medium Priority:**
- `src/utils/helper.ts:45` - 考虑提取重复逻辑为独立函数
- `api/users.ts:120` - 添加输入验证防止无效数据

**Low Priority:**
- 变量名 `data` 可以更具体，如 `userData`
- 添加 JSDoc 注释说明复杂算法

### 🔴 Critical Issues
- `auth.middleware.ts:30` - JWT 密钥硬编码，应使用环境变量
- `upload.handler.ts:65` - 缺少文件大小限制，可能导致 DoS

### 📊 Metrics
- Cyclomatic Complexity: 8 (Good)
- Code Coverage: 85% (Target: 80%)
- Bundle Size: +12KB (Acceptable)
```

### 自动化工具
- **Linting**: ESLint, TSLint
- **Security**: Snyk, npm audit, SonarQube
- **Quality**: CodeClimate, Codacy
- **Performance**: Lighthouse, WebPageTest

---

## Agent 协作示例

### 场景：实现用户评论功能

#### 1. Database Agent
```prisma
model Comment {
  id        String   @id @default(uuid())
  content   String
  authorId  String
  postId    String
  parentId  String?  // 支持回复
  
  author    User     @relation(fields: [authorId], references: [id])
  post      Post     @relation(fields: [postId], references: [id])
  parent    Comment? @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentReplies")
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([postId])
  @@index([authorId])
}
```

#### 2. Backend Agent
```typescript
// POST /api/posts/:postId/comments
async function createComment(req: Request, res: Response) {
  const { postId } = req.params;
  const { content, parentId } = req.body;
  const userId = req.user.id;
  
  // 验证输入
  const validated = commentSchema.parse({ content, parentId });
  
  // 创建评论
  const comment = await prisma.comment.create({
    data: {
      content: validated.content,
      authorId: userId,
      postId,
      parentId: validated.parentId
    },
    include: {
      author: { select: { id: true, name: true } }
    }
  });
  
  res.status(201).json(comment);
}
```

#### 3. Frontend Agent
```tsx
// components/CommentForm.tsx
export function CommentForm({ postId, onSuccess }: CommentFormProps) {
  const [content, setContent] = useState('');
  const mutation = useCreateComment(postId);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await mutation.mutateAsync({ content });
    setContent('');
    onSuccess?.();
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
      />
      <button type="submit" disabled={mutation.isPending}>
        Post Comment
      </button>
    </form>
  );
}
```

#### 4. Test Agent
```typescript
// tests/e2e/comment.spec.ts
test('user can add a comment', async ({ page }) => {
  await page.goto('/posts/123');
  
  await page.fill('textarea', 'Great article!');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('.comment')).toContainText('Great article!');
  await expect(page.locator('textarea')).toHaveValue('');
});
```

#### 5. Docs Agent
```markdown
## Comments API

### POST /api/posts/:postId/comments

Create a new comment on a post.

**Request Body:**
```json
{
  "content": "Great article!",
  "parentId": "optional-parent-comment-id"
}
```

**Response:**
```json
{
  "id": "comment-uuid",
  "content": "Great article!",
  "author": {
    "id": "user-uuid",
    "name": "John Doe"
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```
```

#### 6. Review Agent
```markdown
## Review Summary

✅ **Database**: 表结构设计合理，索引完善
✅ **Backend**: 输入验证完整，错误处理得当
✅ **Frontend**: 组件复用性好，状态管理清晰
⚠️ **Testing**: 建议添加并发评论的竞态条件测试
🔴 **Security**: 需要添加评论内容长度限制（防止滥用）
```

---

## 扩展新 Agent 类型

如需添加新的专业 agent，请遵循以下模板：

```markdown
## [Agent Name]

### 职责范围
- 核心职责 1
- 核心职责 2
- 核心职责 3

### 技术栈
- 工具/框架 1
- 工具/框架 2

### 触发场景
- "关键词 1"
- "关键词 2"

### 输出标准
[具体的文件结构和代码规范]

### 最佳实践
[该领域的最佳实践列表]
```

---

**最后更新**: 2026-04-24  
**维护者**: NvwaX Team
