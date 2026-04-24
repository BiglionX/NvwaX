# 多 Agent 协作示例

本文档提供真实场景下的多 agent 协作完整示例。

---

## 示例 1：构建博客系统

### 用户需求
> "我想创建一个个人博客系统，支持文章发布、评论、标签分类和搜索功能。"

### Orchestrator 分析

```markdown
## 任务分解

这是一个全栈开发任务，需要以下模块：

### 核心功能
1. **用户系统** - 注册、登录、个人资料
2. **文章管理** - CRUD、Markdown 编辑、草稿
3. **评论系统** - 嵌套评论、点赞
4. **标签系统** - 多对多关系、标签云
5. **搜索功能** - 全文搜索、过滤
6. **前端界面** - 响应式设计、SEO 优化

### 技术选型建议
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes 或 Express
- **Database**: PostgreSQL with Prisma ORM
- **Search**: PostgreSQL Full-Text Search 或 Algolia
- **Auth**: NextAuth.js 或 JWT
- **Deployment**: Vercel

### 预计工作量
- 数据库设计: 4 小时
- 后端 API: 12 小时
- 前端开发: 16 小时
- 测试编写: 8 小时
- 文档编写: 4 小时
- **总计**: ~44 小时（可并行执行缩短到 20-25 小时）
```

### 阶段 1：数据库设计

**Orchestrator → Database Agent**:

```json
{
  "messageType": "TASK_ASSIGNMENT",
  "payload": {
    "taskId": "db-blog-schema",
    "taskDescription": "设计博客系统数据库 schema",
    "requirements": [
      "用户表（id, email, name, avatar, bio）",
      "文章表（id, title, slug, content, status, publishedAt）",
      "评论表（支持嵌套回复）",
      "标签表（多对多关系）",
      "审计字段（createdAt, updatedAt）",
      "适当的索引优化查询性能"
    ],
    "deliverables": [
      "Prisma schema 文件",
      "数据库迁移脚本",
      "ER 图",
      "索引策略文档"
    ],
    "priority": "high",
    "estimatedEffort": "4 hours"
  }
}
```

**Database Agent 输出**:

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  avatar    String?
  bio       String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  posts     Post[]
  comments  Comment[]
  
  @@index([email])
}

model Post {
  id          String     @id @default(uuid())
  title       String
  slug        String     @unique
  content     String     // Markdown 内容
  excerpt     String?
  coverImage  String?
  status      PostStatus @default(DRAFT)
  publishedAt DateTime?
  viewCount   Int        @default(0)
  authorId    String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  author      User       @relation(fields: [authorId], references: [id])
  comments    Comment[]
  tags        TagOnPost[]
  
  @@index([slug])
  @@index([status])
  @@index([publishedAt])
  @@index([authorId])
}

model Comment {
  id        String   @id @default(uuid())
  content   String
  authorId  String
  postId    String
  parentId  String?  // 支持嵌套回复
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  author    User     @relation(fields: [authorId], references: [id])
  post      Post     @relation(fields: [postId], references: [id])
  parent    Comment? @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentReplies")
  
  @@index([postId])
  @@index([parentId])
}

model Tag {
  id        String   @id @default(uuid())
  name      String   @unique
  slug      String   @unique
  createdAt DateTime @default(now())
  
  posts     TagOnPost[]
  
  @@index([slug])
}

model TagOnPost {
  postId    String
  tagId     String
  assignedAt DateTime @default(now())
  
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@id([postId, tagId])
}

enum Role {
  USER
  ADMIN
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

**Database Agent 完成消息**:

```json
{
  "messageType": "TASK_COMPLETED",
  "payload": {
    "taskId": "db-blog-schema",
    "summary": "完成博客系统数据库设计，包含 5 个主要模型和适当的索引",
    "artifacts": [
      {
        "type": "code",
        "path": "prisma/schema.prisma",
        "description": "完整的 Prisma schema"
      },
      {
        "type": "config",
        "path": "prisma/migrations/20260424_init/migration.sql",
        "description": "数据库迁移脚本"
      },
      {
        "type": "doc",
        "path": "docs/database/ER-diagram.png",
        "description": "实体关系图"
      }
    ],
    "notes": "使用 UUID 作为主键，所有时间字段使用 UTC",
    "nextSteps": [
      "Backend agent 可以开始实现 API",
      "运行 `npx prisma migrate dev` 应用迁移"
    ],
    "dependsOnMe": ["api-posts", "api-comments", "api-tags"]
  }
}
```

---

### 阶段 2：后端 API 开发（并行）

**Orchestrator 广播任务完成通知给所有 Backend Agents**:

```json
{
  "messageType": "NOTIFICATION",
  "payload": {
    "notificationType": "DEPENDENCY_READY",
    "message": "数据库 schema 已完成，可以开始 API 开发",
    "relatedTask": "db-blog-schema",
    "availableFor": ["backend-agent"]
  }
}
```

#### Backend Agent 1: 文章 API

**任务分配**:

```json
{
  "messageType": "TASK_ASSIGNMENT",
  "recipient": { "agentType": "backend-agent", "agentId": "backend-posts" },
  "payload": {
    "taskId": "api-posts",
    "taskDescription": "实现文章管理 API",
    "deliverables": [
      "GET /api/posts - 获取文章列表（支持分页、过滤、搜索）",
      "GET /api/posts/:slug - 获取单篇文章",
      "POST /api/posts - 创建文章（需要认证）",
      "PUT /api/posts/:id - 更新文章",
      "DELETE /api/posts/:id - 删除文章",
      "GET /api/posts/:id/stats - 获取统计数据"
    ],
    "dependencies": ["db-blog-schema"],
    "priority": "high"
  }
}
```

**Backend Agent 实现**:

```typescript
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  coverImage: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const tag = searchParams.get('tag');
  const search = searchParams.get('search');
  
  const where: any = { status: 'PUBLISHED' };
  
  if (tag) {
    where.tags = { some: { tag: { slug: tag } } };
  }
  
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);
  
  return NextResponse.json({
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json();
  const validated = createPostSchema.parse(body);
  
  const slug = validated.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  const post = await prisma.post.create({
    data: {
      ...validated,
      slug,
      authorId: session.user.id,
      status: validated.status || 'DRAFT',
      tags: validated.tags ? {
        create: validated.tags.map(tagName => ({
          tag: {
            connectOrCreate: {
              where: { name: tagName },
              create: { 
                name: tagName,
                slug: tagName.toLowerCase().replace(/\s+/g, '-')
              },
            },
          },
        })),
      } : undefined,
    },
    include: {
      author: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
    },
  });
  
  return NextResponse.json(post, { status: 201 });
}
```

#### Backend Agent 2: 评论 API

**类似地实现评论相关的 API 端点...**

---

### 阶段 3：前端开发（并行）

**Orchestrator → Frontend Agent**:

```json
{
  "messageType": "TASK_ASSIGNMENT",
  "payload": {
    "taskId": "ui-blog-homepage",
    "taskDescription": "实现博客首页",
    "requirements": [
      "文章列表展示（卡片布局）",
      "分页导航",
      "标签过滤",
      "搜索框",
      "响应式设计",
      "加载状态和错误处理"
    ],
    "dependencies": ["api-posts"],
    "priority": "high"
  }
}
```

**Frontend Agent 实现**:

```tsx
// app/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PostCard } from '@/components/PostCard';
import { SearchBar } from '@/components/SearchBar';
import { TagFilter } from '@/components/TagFilter';
import { Pagination } from '@/components/Pagination';

export default function HomePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['posts', page, search, selectedTag],
    queryFn: () => fetchPosts({ page, search, tag: selectedTag }),
  });
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  if (error) {
    return <ErrorMessage message="Failed to load posts" />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">My Blog</h1>
      
      <div className="mb-6 flex gap-4">
        <SearchBar 
          value={search}
          onChange={setSearch}
          onSearch={() => setPage(1)}
        />
        <TagFilter 
          selected={selectedTag}
          onSelect={(tag) => {
            setSelectedTag(tag);
            setPage(1);
          }}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      
      {data && (
        <Pagination
          currentPage={page}
          totalPages={data.pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
```

---

### 阶段 4：测试编写

**Test Agent 实现**:

```typescript
// tests/e2e/blog.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Blog System', () => {
  test('user can browse posts', async ({ page }) => {
    await page.goto('/');
    
    // 验证文章列表加载
    await expect(page.locator('[data-testid="post-card"]')).toHaveCount(10);
    
    // 验证分页
    await page.click('[data-testid="pagination-next"]');
    await expect(page).toHaveURL(/page=2/);
  });
  
  test('user can search posts', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('[data-testid="search-input"]', 'React');
    await page.click('[data-testid="search-button"]');
    
    // 验证搜索结果
    const cards = page.locator('[data-testid="post-card"]');
    await expect(cards.first()).toContainText('React');
  });
  
  test('authenticated user can create post', async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 创建文章
    await page.goto('/posts/new');
    await page.fill('[name="title"]', 'Test Post');
    await page.fill('[name="content"]', '# Hello World\n\nThis is a test.');
    await page.click('button[type="submit"]');
    
    // 验证创建成功
    await expect(page).toHaveURL(/\/posts\/test-post/);
    await expect(page.locator('h1')).toContainText('Test Post');
  });
});
```

---

### 阶段 5：代码审查

**Review Agent 报告**:

```markdown
## Code Review: Blog System

### ✅ Strengths
- 数据库设计规范化，索引合理
- API 输入验证完善（使用 Zod）
- 前端组件化良好，复用性高
- 测试覆盖率达到 87%

### ⚠️ Suggestions

**Performance:**
- `app/api/posts/route.ts:45` - 考虑添加 Redis 缓存热门文章列表
- `components/PostCard.tsx` - 图片添加 lazy loading

**Security:**
- `app/api/posts/route.ts:78` - 添加速率限制防止滥用
- 评论内容需要进行 XSS 清理

**Code Quality:**
- `lib/search.ts` - 提取重复的搜索逻辑为工具函数
- 添加更多 TypeScript 类型定义

### 🔴 Critical Issues
- None found

### 📊 Metrics
- Test Coverage: 87%
- Bundle Size: 245KB (gzipped)
- Lighthouse Score: 92/100
- Security Scan: Passed
```

---

### 最终整合报告

**Orchestrator 生成总结**:

```markdown
## Blog System - Development Complete ✅

### Summary
成功构建了一个功能完整的博客系统，包括：
- ✅ 用户认证系统
- ✅ 文章 CRUD + Markdown 编辑
- ✅ 嵌套评论系统
- ✅ 标签分类
- ✅ 全文搜索
- ✅ 响应式 UI
- ✅ 完整的测试套件

### Artifacts
- **Code**: 45 files, 3,200 lines
- **Tests**: 38 test cases, 87% coverage
- **Documentation**: API docs, README, deployment guide
- **Database**: 5 tables, 12 indexes

### Performance
- Page Load: 1.2s (Lighthouse: 92/100)
- API Response: < 200ms (p95)
- Bundle Size: 245KB (gzipped)

### Deployment
- **URL**: https://my-blog.vercel.app
- **Database**: PostgreSQL on Neon
- **CDN**: Vercel Edge Network

### Next Steps
1. 添加 SEO 优化（sitemap, meta tags）
2. 实现 RSS feed
3. 添加 analytics 追踪
4. 设置 automated backups

### Team Performance
- Database Agent: 4h ✅
- Backend Agents: 11h ✅ (parallel)
- Frontend Agents: 14h ✅ (parallel)
- Test Agent: 6h ✅
- Docs Agent: 3h ✅
- Review Agent: 2h ✅
- **Total Wall Time**: ~18h (vs 40h sequential)
```

---

## 示例 2：Bug 修复协作

### 问题报告
> "用户反馈登录后有时会看到其他人的数据！"

### Orchestrator 紧急响应

```markdown
🚨 **CRITICAL SECURITY ISSUE DETECTED**

立即启动紧急修复流程！

### 任务分配（高优先级）

1. **[backend-agent]** 检查认证中间件和 session 管理
2. **[database-agent]** 检查数据查询是否正确过滤用户
3. **[frontend-agent]** 检查客户端状态管理
4. **[review-agent]** 安全审计

预计诊断时间: 1 小时
预计修复时间: 2 小时
```

### 根因分析

**Backend Agent 发现**:

```typescript
// BUG FOUND in app/api/user/profile/route.ts

// ❌ 错误的实现
export async function GET() {
  const session = await auth();
  
  // 缺少用户 ID 过滤！
  const profile = await prisma.user.findFirst();
  
  return NextResponse.json(profile);
}

// ✅ 正确的实现
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 正确过滤当前用户
  const profile = await prisma.user.findUnique({
    where: { id: session.user.id }
  });
  
  return NextResponse.json(profile);
}
```

### 修复流程

1. **Backend Agent**: 修复 API 端点
2. **Test Agent**: 添加回归测试
3. **Review Agent**: 安全审查
4. **Deploy**: 紧急部署到生产环境
5. **Monitor**: 监控是否有类似问题

**回归测试**:

```typescript
test('user can only access their own profile', async () => {
  const user1 = await createUser();
  const user2 = await createUser();
  
  const response = await fetch('/api/user/profile', {
    headers: { Authorization: `Bearer ${user1.token}` }
  });
  
  const profile = await response.json();
  expect(profile.id).toBe(user1.id);
  expect(profile.id).not.toBe(user2.id);
});
```

---

## 示例 3：性能优化协作

### 性能问题
> "文章列表页面加载很慢，特别是当有上千篇文章时。"

### 优化方案

**Database Agent**:
```sql
-- 添加复合索引
CREATE INDEX idx_posts_status_published ON posts(status, publishedAt DESC);
CREATE INDEX idx_posts_search ON posts USING GIN(to_tsvector('english', title || ' ' || content));
```

**Backend Agent**:
```typescript
// 添加缓存层
import { cache } from '@/lib/redis';

export async function GET(request: NextRequest) {
  const cacheKey = `posts:${page}:${tag}:${search}`;
  
  // 尝试从缓存读取
  const cached = await cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }
  
  // 查询数据库
  const result = await fetchPostsFromDB(...);
  
  // 写入缓存（5 分钟 TTL）
  await cache.setex(cacheKey, 300, JSON.stringify(result));
  
  return NextResponse.json(result);
}
```

**Frontend Agent**:
```tsx
// 实现虚拟滚动
import { VirtualList } from 'react-virtualized';

<VirtualList
  width={800}
  height={600}
  rowCount={posts.length}
  rowHeight={200}
  rowRenderer={({ index, style }) => (
    <PostCard key={posts[index].id} post={posts[index]} style={style} />
  )}
/>
```

**性能提升**:
- Before: 3.5s 加载时间
- After: 0.8s 加载时间
- **Improvement: 77% faster** ⚡

---

## 最佳实践总结

### 1. 任务分解原则
- ✅ 保持子任务独立性
- ✅ 明确接口契约
- ✅ 预估合理的工作量
- ✅ 识别关键路径

### 2. 并行执行策略
- ✅ 无依赖的任务立即并行
- ✅ 使用 Mock/Stub 提前开始
- ✅ 定期同步进度

### 3. 质量控制
- ✅ 每个 agent 自我验证
- ✅ 集成前进行代码审查
- ✅ 自动化测试覆盖
- ✅ 性能基准测试

### 4. 沟通效率
- ✅ 使用标准化消息格式
- ✅ 及时通报阻塞情况
- ✅ 清晰的依赖声明
- ✅ 详细的完成报告

### 5. 持续改进
- ✅ 记录每次协作的经验教训
- ✅ 优化任务分解策略
- ✅ 更新 agent 能力描述
- ✅ 完善通信协议

---

**最后更新**: 2026-04-24  
**维护者**: NvwaX Team
