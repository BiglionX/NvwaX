# NvwaX 管理后台使用指南

## 📋 目录

- [快速开始](#快速开始)
- [功能介绍](#功能介绍)
- [API 接口](#api-接口)
- [安全建议](#安全建议)

---

## 🚀 快速开始

### 1. 启动后端服务

```bash
cd packages/nvwax-server
npm run dev
```

### 2. 启动前端服务

```bash
cd packages/nvwax-web
npm run dev
```

### 3. 访问管理后台

打开浏览器访问：http://localhost:3000/admin/login

### 4. 登录凭证

**默认管理员账户：**
- 用户名：`admin`
- 密码：`admin123`
- 邮箱：`admin@nvwax.com`

⚠️ **重要提示**：首次登录后请立即修改默认密码！

---

## ✨ 功能介绍

### 1. 数据看板 (`/admin/dashboard`)

系统运行概况和实时统计：
- 📊 管理员总数
- 👥 用户总数
- 📁 项目总数
- ⏱️ 系统运行时间
- 📝 最近系统日志

### 2. 管理员管理 (`/admin/admins`)

管理系统管理员账户：
- ➕ 添加新管理员
- 👤 查看管理员列表
- 🗑️ 删除管理员
- 🔍 查看管理员详细信息（最后登录时间、角色等）

### 3. 系统设置 (`/admin/settings`)

系统配置和个人账户设置：
- 🔐 修改密码
- ℹ️ 系统信息查看
- 📖 关于 NvwaX

---

## 🔌 API 接口

### 认证相关

#### 管理员登录
```
POST /api/admin/login
Body: { "username": "admin", "password": "admin123" }
Response: { "message": "Login successful", "data": { "admin": {...}, "token": "..." } }
```

### 管理员信息

#### 获取当前管理员信息
```
GET /api/admin/profile
Headers: Authorization: Bearer <token>
Response: { "data": { ...admin info... } }
```

#### 更新管理员信息
```
PUT /api/admin/profile
Headers: Authorization: Bearer <token>
Body: { "name": "新名称", "email": "new@email.com", "avatar": "url" }
```

#### 修改密码
```
POST /api/admin/change-password
Headers: Authorization: Bearer <token>
Body: { "oldPassword": "旧密码", "newPassword": "新密码" }
```

### 管理员管理

#### 获取所有管理员
```
GET /api/admin/admins
Headers: Authorization: Bearer <token>
Response: { "data": [...admins...] }
```

#### 创建管理员
```
POST /api/admin/admins
Headers: Authorization: Bearer <token>
Body: { "username": "newadmin", "password": "pass123", "email": "new@admin.com", "role": "admin" }
```

#### 删除管理员
```
DELETE /api/admin/admins/:id
Headers: Authorization: Bearer <token>
```

### 系统管理

#### 获取系统统计
```
GET /api/admin/system/stats
Headers: Authorization: Bearer <token>
Response: { "data": { "totalUsers": 1, "totalProjects": 5, "totalAdmins": 2, "systemUptime": 3600 } }
```

#### 获取系统日志
```
GET /api/admin/system/logs?page=1&limit=20
Headers: Authorization: Bearer <token>
Response: { "data": [...logs...], "total": 100 }
```

---

## 🔒 安全建议

### 1. 修改默认密码

首次登录后，立即在"系统设置"页面修改默认密码。

### 2. 创建独立的管理员账户

为每个管理员创建独立的账户，便于审计和管理。

### 3. 定期审查系统日志

通过数据看板查看系统日志，监控异常操作。

### 4. 限制超级管理员权限

只有信任的用户才应该被授予 `superadmin` 角色。

### 5. 生产环境安全措施

- ✅ 启用 HTTPS
- ✅ 使用强密码策略
- ✅ 实施 JWT token 过期机制
- ✅ 添加 IP 白名单限制
- ✅ 启用双因素认证 (2FA)
- ✅ 定期备份数据库

---

## 🛠️ 技术栈

### 后端
- **框架**: Express.js
- **数据库**: SQLite (better-sqlite3)
- **认证**: Token-based (可扩展为 JWT)
- **语言**: TypeScript (ES Module)

### 前端
- **框架**: Next.js 16 (App Router)
- **状态管理**: TanStack Query (React Query)
- **UI**: Tailwind CSS v4
- **图标**: Lucide React
- **HTTP 客户端**: Axios

---

## 📝 开发说明

### 数据库表结构

#### admins 表
```sql
CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  permissions TEXT,
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
)
```

#### system_config 表
```sql
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### system_logs 表
```sql
CREATE TABLE system_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  action TEXT NOT NULL,
  admin_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
)
```

### 初始化脚本

创建默认管理员账户：
```bash
cd packages/nvwax-server
npx tsx init-admin.ts
```

---

## ❓ 常见问题

### Q: 忘记密码怎么办？

A: 可以运行以下命令重置管理员密码：
```bash
# 需要手动编写密码重置脚本
```

### Q: 如何添加新的管理功能？

A: 
1. 在后端创建新的服务和控制器
2. 添加路由到 `routes/admin.routes.ts`
3. 在前端创建对应的页面组件
4. 在侧边栏菜单中添加入口

### Q: 支持多租户吗？

A: 当前版本不支持，但可以通过扩展数据库表结构来实现。

---

## 📞 技术支持

如有问题或建议，请联系开发团队。

---

**最后更新**: 2026-04-25
