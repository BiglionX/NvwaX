# NvwaX 部署检查清单

本文档提供完整的部署前检查步骤，确保项目已准备好生产环境部署。

## 📋 部署前清理完成项

### ✅ 已完成的清理工作

1. **临时文档归档**
   - ✓ 移动 14 个临时开发文档到 `docs-archive/` 目录
   - ✓ 移动 5 个测试脚本文件到 `docs-archive/` 目录
   - ✓ 更新 `.gitignore` 忽略 `docs-archive/` 目录

2. **代码规范修复**
   - ✓ 修复所有 TypeScript 类型错误
   - ✓ 移除未使用的变量和导入
   - ✓ 更新 Tailwind CSS 类名为最新规范 (v4)
   - ✓ 修复 Express req.params 类型问题

3. **依赖管理**
   - ✓ 安装所有缺失的 npm 依赖
   - ✓ 添加 ESM 模块支持 (`"type": "module"`)
   - ✓ 更新 TypeScript moduleResolution 为 `"bundler"`

4. **目录结构优化**
   - ✓ 为空的 `packages/downloads/` 添加 `.gitkeep`
   - ✓ 为空的 `packages/workflow-editor/` 添加 `.gitkeep`

---

## 🔍 部署前检查清单

### 1. 环境准备

- [ ] Node.js >= 18.0.0 已安装
- [ ] npm >= 9.0.0 已安装
- [ ] Docker 和 Docker Compose 已安装（如使用容器部署）
- [ ] 数据库服务可用（PostgreSQL/MySQL）

### 2. 配置文件

- [ ] `.env` 文件已从 `.env.example` 复制并配置
- [ ] 环境变量已正确设置：
  - [ ] `DATABASE_URL` - 数据库连接字符串
  - [ ] `JWT_SECRET` - JWT 密钥
  - [ ] `PORT` - 服务器端口
  - [ ] `NEXT_PUBLIC_API_URL` - API 基础 URL
- [ ] `docker-compose.yml` 配置已检查

### 3. 依赖安装

```bash
# 根目录安装
npm install

# 或分别安装各包
cd packages/nvwax-web && npm install
cd packages/nvwax-server && npm install
cd packages/nvwax-sdk && npm install
```

### 4. 构建验证

```bash
# 构建 SDK
cd packages/nvwax-sdk
npm run build

# 构建 Server
cd packages/nvwax-server
npm run build

# 构建 Web
cd packages/nvwax-web
npm run build
```

### 5. 数据库迁移

```bash
# 运行数据库迁移
cd packages/nvwax-server
npm run db:migrate
```

### 6. 测试运行

```bash
# 启动开发服务器测试
cd packages/nvwax-server
npm run dev

# 在另一个终端
cd packages/nvwax-web
npm run dev
```

访问 http://localhost:3000 验证应用正常运行。

### 7. Git 状态

- [ ] 所有更改已提交
- [ ] 没有未跟踪的重要文件
- [ ] `.gitignore` 正确配置

```bash
git status
git add .
git commit -m "Prepare for deployment"
```

---

## 🚀 部署方式

### 方式一：Docker Compose（推荐）

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式二：手动部署

#### 后端部署

```bash
cd packages/nvwax-server
npm run build
npm start
```

#### 前端部署

```bash
cd packages/nvwax-web
npm run build
npm start
```

### 方式三：云平台部署

参考各云平台的 Node.js 应用部署指南：
- Vercel（前端）
- Railway / Render（后端）
- AWS / Azure / GCP

---

## 📊 部署后验证

### 健康检查

1. **API 端点**
   ```bash
   curl http://your-domain.com/api/health
   ```

2. **前端页面**
   - 访问主页
   - 测试登录/注册
   - 测试核心功能

3. **数据库连接**
   - 检查数据持久化
   - 验证 CRUD 操作

### 监控设置

- [ ] 错误追踪（Sentry 等）
- [ ] 性能监控
- [ ] 日志收集
- [ ] 告警配置

---

## 🔒 安全检查

- [ ] 所有敏感信息使用环境变量
- [ ] JWT 密钥足够复杂
- [ ] CORS 配置正确
- [ ] HTTPS 已启用（生产环境）
- [ ] 数据库密码已更改默认值
- [ ] API 速率限制已配置

---

## 📝 常见问题

### Q: 构建失败怎么办？

A: 检查：
1. Node.js 版本是否符合要求
2. 所有依赖是否正确安装
3. TypeScript 编译错误
4. 查看完整错误日志

### Q: 数据库连接失败？

A: 检查：
1. `DATABASE_URL` 是否正确
2. 数据库服务是否运行
3. 防火墙/网络配置
4. 数据库权限

### Q: 前端无法连接后端？

A: 检查：
1. `NEXT_PUBLIC_API_URL` 配置
2. CORS 设置
3. 后端服务是否运行
4. 端口是否正确

---

## 📞 支持

如遇问题，请：
1. 查看 `docs/` 目录下的相关文档
2. 检查 GitHub Issues
3. 联系开发团队

---

**最后更新**: 2026-04-26
**版本**: 1.0.0
