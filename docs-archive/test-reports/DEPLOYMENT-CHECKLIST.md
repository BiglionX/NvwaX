# 🚀 NvwaX 部署检查清单

**日期**: 2026-04-25  
**版本**: v1.0

---

## 📋 部署前检查

### ✅ 环境准备
- [x] Node.js 20.11.0+ 已安装
- [x] npm 10.2.4+ 已安装
- [x] PostgreSQL 数据库可访问
- [x] 所有依赖已安装（3个包）

### ✅ 代码质量
- [x] TypeScript 编译无错误
- [x] ESLint 检查通过
- [x] 代码结构清晰
- [x] 注释完整

### ✅ 功能测试
- [x] 用户注册/登录正常
- [x] Agent搜索功能正常
- [x] 悬赏系统流程正常
- [x] API端点全部可用
- [x] 前端页面渲染正常
- [x] 工作流引擎运行正常

### ✅ 安全配置
- [x] JWT认证配置正确
- [x] 密码加密（bcryptjs）
- [x] CORS配置完善
- [x] Helmet安全头启用
- [x] SQL注入防护到位
- [x] XSS防护措施有效

### ✅ 性能测试
- [x] API响应时间 < 500ms（平均）
- [x] 数据库查询优化
- [x] 前端加载速度良好
- [x] 内存使用合理

---

## 🔧 部署步骤

### 1. 准备生产环境

```bash
# 克隆仓库
git clone https://github.com/BigLionX/NvwaX.git
cd NvwaX

# 安装依赖
npm install
```

### 2. 配置环境变量

创建 `.env.production`：

```env
# 服务器配置
NODE_ENV=production
PORT=3001

# 数据库配置
DATABASE_URL=postgresql://user:password@host:5432/nvwax?sslmode=require

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS配置
CORS_ORIGIN=https://your-domain.com

# 前端配置
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

### 3. 数据库迁移

```bash
cd packages/nvwax-server

# 执行迁移脚本
node run-migration.js
node run-migration-003.mjs

# 创建超级管理员
npm run create-super-admin
```

### 4. 构建项目

```bash
# 构建后端
cd packages/nvwax-server
npm run build

# 构建前端
cd ../nvwax-web
npm run build

# 工作流引擎无需构建
```

### 5. 启动服务

#### 方式一：直接启动

```bash
# 终端1: 后端服务
cd packages/nvwax-server
npm start

# 终端2: 工作流引擎
cd packages/skillhub-workflow
npm start

# 终端3: 前端服务
cd packages/nvwax-web
npm start
```

#### 方式二：Docker部署（推荐）

```bash
# 使用docker-compose
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 6. 验证部署

```bash
# 健康检查
curl http://localhost:3001/health
curl http://localhost:3002/health

# 前端访问
curl http://localhost:3000

# API测试
curl http://localhost:3001/api/search/agents?q=ai
```

---

## 🔒 安全检查

### SSL/HTTPS
- [ ] 配置SSL证书
- [ ] 启用HTTPS重定向
- [ ] 更新CORS配置为HTTPS域名

### 防火墙
- [ ] 只开放必要端口（80, 443）
- [ ] 限制SSH访问
- [ ] 配置速率限制

### 监控
- [ ] 设置应用监控（PM2/New Relic）
- [ ] 配置日志收集
- [ ] 设置告警规则

### 备份
- [ ] 配置数据库自动备份
- [ ] 设置备份保留策略
- [ ] 测试恢复流程

---

## 📊 性能优化建议

### 数据库
- [ ] 添加查询缓存（Redis）
- [ ] 优化慢查询
- [ ] 定期清理旧数据

### 前端
- [ ] 启用CDN
- [ ] 图片懒加载
- [ ] 代码分割

### 后端
- [ ] 启用Gzip压缩
- [ ] 配置连接池
- [ ] 添加API限流

---

## 🆘 故障排除

### 常见问题

**1. 服务无法启动**
```bash
# 检查日志
docker-compose logs -f
# 或
tail -f packages/nvwax-server/logs/error.log
```

**2. 数据库连接失败**
```bash
# 测试连接
psql $DATABASE_URL
# 检查防火墙
sudo ufw status
```

**3. 内存不足**
```bash
# 查看内存使用
free -h
# 增加swap
sudo fallocate -l 2G /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**4. 端口被占用**
```bash
# 查找占用端口的进程
lsof -i :3001
# 终止进程
kill -9 <PID>
```

---

## ✅ 部署后验证

### 功能验证
- [ ] 访问首页正常
- [ ] 用户注册成功
- [ ] 用户登录成功
- [ ] Agent搜索正常
- [ ] 悬赏发布正常
- [ ] 导航栏显示正确

### 性能验证
- [ ] 页面加载时间 < 3秒
- [ ] API响应时间 < 1秒
- [ ] 无内存泄漏
- [ ] CPU使用率正常

### 安全验证
- [ ] HTTPS正常工作
- [ ] 认证令牌有效
- [ ] 跨域请求正常
- [ ] 错误信息不泄露

---

## 📞 支持联系方式

- **GitHub Issues**: https://github.com/BigLionX/NvwaX/issues
- **Email**: 1055603323@qq.com
- **文档**: ./docs/DEPLOYMENT-TEST-REPORT.md

---

**部署完成后，请勾选所有验证项并签字确认。**

**部署人员**: _______________  
**验证人员**: _______________  
**日期**: _______________

---

**祝部署顺利！🎉**
