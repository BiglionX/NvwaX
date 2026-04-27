# Vercel 部署检查清单

## ✅ 部署前检查

- [ ] 后端 API 已部署并可访问
- [ ] 获取后端 API URL（例如：https://your-api.railway.app）
- [ ] 测试后端 API 健康检查端点
- [ ] 本地构建测试通过

## ✅ Vercel 配置检查

- [ ] Root Directory 设置为 `packages/nvwax-web`
- [ ] Build Command 正确配置为 monorepo 构建命令
- [ ] Install Command 使用 pnpm
- [ ] `NEXT_PUBLIC_API_URL` 环境变量已设置

## ✅ 部署后验证

### 1. 基本功能测试
- [ ] 首页可以正常加载
- [ ] 导航菜单正常工作
- [ ] 页面路由跳转正常

### 2. API 连接测试
- [ ] 打开浏览器开发者工具（F12）
- [ ] 检查 Network 标签
- [ ] 确认 API 请求发送到正确的后端地址
- [ ] 没有 CORS 错误

### 3. 认证功能测试
- [ ] 注册功能正常
- [ ] 登录功能正常
- [ ] 登录后重定向正确
- [ ] 用户信息正确显示

### 4. 核心功能测试
- [ ] Agent Marketplace 可以浏览
- [ ] 搜索功能正常工作
- [ ] Bounty 系统可以访问
- [ ] 个人中心页面正常

### 5. 性能检查
- [ ] 首屏加载时间 < 3秒
- [ ] 图片加载正常
- [ ] 移动端响应式正常

## 🐛 常见问题排查

### 问题 1: 构建失败 - "Module not found"
**原因**: pnpm 依赖未正确安装
**解决**: 
```bash
# 在本地测试
cd packages/nvwax-web
pnpm install
pnpm run build
```

### 问题 2: API 请求失败 - CORS 错误
**原因**: 后端未配置 CORS
**解决**: 在后端代码中添加 Vercel 域名到 CORS 白名单

### 问题 3: 环境变量未生效
**原因**: 环境变量配置错误或需要重新部署
**解决**: 
1. 检查 Vercel Dashboard 中的环境变量
2. 触发新的部署（推送空提交或手动重新部署）
3. 清除浏览器缓存

### 问题 4: 页面 404
**原因**: Next.js 动态路由问题
**解决**: 确保所有动态路由页面文件存在

## 📊 监控和优化

### 启用 Vercel Analytics
1. 在 Vercel Dashboard 中启用 Web Analytics
2. 启用 Speed Insights
3. 查看性能报告

### 优化建议
- 使用 Next.js Image 组件优化图片
- 对静态页面启用 ISR（增量静态再生成）
- 配置 Edge Functions 降低延迟

## 🔗 有用的链接

- Vercel Dashboard: https://vercel.com/dashboard
- 部署日志: https://vercel.com/[your-project]/deployments
- 环境变量: https://vercel.com/[your-project]/settings/environment-variables
- 域名设置: https://vercel.com/[your-project]/settings/domains
