# Docker 部署故障排除指南

## 🔧 已修复的问题

### 问题：`ERR_PNPM_NO_LOCKFILE` 错误

**错误信息：**
```
ERR_PNPM_NO_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is absent
```

**根本原因：**
- Dockerfile 使用了 `pnpm install --frozen-lockfile`
- 但项目中没有 `pnpm-lock.yaml` 文件
- Docker 缓存了旧的镜像层

**解决方案（已应用）：**
1. ✅ 移除所有 `--frozen-lockfile` 参数
2. ✅ 显式添加 `--no-frozen-lockfile` 参数
3. ✅ 添加 `ARG CACHE_BUST=1` 强制清除缓存
4. ✅ 适配 monorepo 结构

---

## 🚀 如何强制重新构建

### 方案 1：在部署平台清除缓存

#### Railway
1. 进入项目 → 选择服务
2. 点击 **Settings** 标签
3. 滚动到 **Danger Zone**
4. 点击 **"Reset and Redeploy"**（这会清除所有缓存）

#### Render
1. 进入 Dashboard → 选择服务
2. 点击 **"Manual Deploy"**
3. 选择 **"Clear build cache & deploy"**

#### Vercel（仅前端）
1. 进入项目 → **Deployments**
2. 点击最新部署右侧的 **...**
3. 选择 **"Redeploy"**

---

### 方案 2：通过 Git 触发重新构建

由于我们添加了 `ARG CACHE_BUST=1`，每次推送都会强制重新构建依赖层。

```bash
# 如果仍然使用缓存，可以修改 CACHE_BUST 值
# 编辑 Dockerfile，将 ARG CACHE_BUST=1 改为 ARG CACHE_BUST=2
# 然后提交并推送
git add .
git commit -m "bump: 强制清除 Docker 缓存"
git push origin main
```

---

### 方案 3：本地测试 Docker 构建

在推送之前，可以在本地测试构建：

```powershell
# 测试后端构建
docker build --no-cache -f Dockerfile.backend -t nvwax-backend-test .

# 测试前端构建
docker build --no-cache -f Dockerfile.frontend -t nvwax-frontend-test .

# 测试完整构建
docker build --no-cache -t nvwax-fullstack-test .
```

---

## 📋 验证清单

部署成功后，验证以下内容：

### 1. 构建日志检查
- [ ] 没有 `frozen-lockfile` 错误
- [ ] 看到 `pnpm install --no-frozen-lockfile` 成功执行
- [ ] 所有依赖安装完成
- [ ] 构建阶段成功完成

### 2. 服务健康检查
```bash
# 后端健康检查
curl https://your-backend-url.com/health

# 应该返回：
# {"status":"ok","timestamp":"2026-04-27T..."}
```

### 3. API 功能测试
```bash
# 测试用户注册
curl -X POST https://your-backend-url.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'

# 测试用户登录
curl -X POST https://your-backend-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### 4. 前端连接测试
- [ ] 打开浏览器开发者工具（F12）
- [ ] 访问前端 URL
- [ ] 检查 Network 标签
- [ ] 确认 API 请求发送到正确的后端地址
- [ ] 没有 CORS 错误

---

## 🐛 常见问题

### Q1: 仍然看到 `frozen-lockfile` 错误

**原因：** Docker 使用了缓存的旧层

**解决：**
```bash
# 方法 1: 在部署平台清除缓存（见上方）

# 方法 2: 修改 CACHE_BUST 值
# 编辑 Dockerfile，将 ARG CACHE_BUST=1 改为 =2

# 方法 3: 添加新的空提交
git commit --allow-empty -m "ci: trigger rebuild"
git push origin main
```

### Q2: 构建成功但服务无法启动

**检查：**
1. 环境变量是否正确配置
   - `DATABASE_URL` 或 `DB_*` 变量
   - `JWT_SECRET`
   - `NODE_ENV=production`

2. 端口配置
   - 后端默认端口：3001
   - 前端默认端口：3000

3. 数据库连接
   - PostgreSQL 是否可访问
   - 数据库是否已创建

### Q3: 前端无法连接后端

**原因：** CORS 配置或 API URL 错误

**解决：**
1. 检查前端环境变量 `NEXT_PUBLIC_API_URL`
2. 确保后端 CORS 配置包含前端域名
3. 检查浏览器控制台的 Network 标签

---

## 📝 Dockerfile 修改记录

### 最新修改（2026-04-27）

**文件：** Dockerfile, Dockerfile.backend, Dockerfile.frontend

**变更：**
```diff
+ ARG CACHE_BUST=1

- RUN pnpm install --frozen-lockfile
+ RUN pnpm install --no-frozen-lockfile
```

**原因：**
- 解决 pnpm-lock.yaml 缺失导致的构建失败
- 强制清除 Docker 缓存确保使用新配置

---

## 🔗 相关资源

- [Docker 缓存机制](https://docs.docker.com/build/cache/)
- [pnpm 文档 - frozen-lockfile](https://pnpm.io/cli/install#--frozen-lockfile)
- [Railway 文档](https://docs.railway.app/)
- [Render 文档](https://render.com/docs)
- [Vercel 文档](https://vercel.com/docs)

---

## 📞 需要帮助？

如果问题仍然存在，请提供：
1. 完整的构建日志
2. 使用的部署平台（Railway/Render/Vercel）
3. 错误发生的具体步骤
4. Dockerfile 的完整内容
