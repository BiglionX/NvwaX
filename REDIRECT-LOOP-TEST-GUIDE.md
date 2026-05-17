# 重定向循环问题 - 手动测试指南

## 📋 测试目标
验证 ProfilePage 不再出现 `/login` ↔ `/profile` 的无限重定向循环

---

## 🧪 测试场景

### 场景 1: 已登录用户访问 /profile（正常流程）

**前置条件：**
- 用户已成功登录
- localStorage 中存在 `user_token` 和 `user_info`

**测试步骤：**
1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 在地址栏输入：`https://nvwax.proclaw.cc/profile`
4. 观察控制台输出

**预期结果：**
```
ProfilePage immediate check - token exists: true userInfo exists: true
ProfilePage: Loading...
ProfilePage: Rendering ProfileContent
```

**验证要点：**
- ✅ 只显示一次 "ProfilePage immediate check"
- ✅ 不出现 "Not logged in, redirecting to login..."
- ✅ 最终显示 "Rendering ProfileContent"
- ✅ 页面正常渲染，显示用户信息
- ❌ **不应出现**重复的重定向日志

---

### 场景 2: 未登录用户访问 /profile

**前置条件：**
- 清除 localStorage 中的认证信息

**测试步骤：**
1. 打开浏览器 Console
2. 执行：`localStorage.clear()`
3. 刷新页面或访问：`https://nvwax.proclaw.cc/profile`
4. 观察控制台输出

**预期结果：**
```
ProfilePage immediate check - token exists: false userInfo exists: false
No auth found, redirecting to login...
```

**验证要点：**
- ✅ 立即检测到无 token
- ✅ 重定向到 `/login?redirect=/profile`
- ✅ 只显示一次重定向日志
- ❌ **不应出现**反复跳转

---

### 场景 3: 从 Login 登录后跳转到 Profile

**前置条件：**
- 用户在登录页面
- 输入正确的邮箱和密码

**测试步骤：**
1. 访问：`https://nvwax.proclaw.cc/login`
2. 输入测试账号：`test@nvwax.com`
3. 输入密码
4. 点击"登录"按钮
5. 观察控制台输出和页面跳转

**预期结果：**
```
[Login Page] Email: test@nvwax.com
[Login Page] Is admin? false
Attempting user login with: {email: 'test@nvwax.com'}
Login response: {...}
Token and user info saved, auth state updated
[Login Page] Navigating to /profile

// 跳转到 /profile 后
ProfilePage immediate check - token exists: true userInfo exists: true
ProfilePage: Loading...
ProfilePage: Rendering ProfileContent
```

**验证要点：**
- ✅ 登录成功后只跳转一次到 `/profile`
- ✅ ProfilePage 立即检测到 token，允许渲染
- ✅ **关键**：不会出现 "Already logged in, redirecting to: /profile" 再次跳回 login
- ❌ **不应出现**循环重定向

---

### 场景 4: 刷新 Profile 页面

**前置条件：**
- 用户已在 `/profile` 页面
- localStorage 中有有效的 token

**测试步骤：**
1. 确保在 `/profile` 页面
2. 按 F5 或 Ctrl+R 刷新页面
3. 观察控制台输出

**预期结果：**
```
ProfilePage immediate check - token exists: true userInfo exists: true
ProfilePage: Loading...
ProfilePage: Rendering ProfileContent
```

**验证要点：**
- ✅ 刷新后仍然正常显示页面
- ✅ 不会重定向到 login
- ✅ `hasCheckedAuth` ref 防止重复检查
- ❌ **不应出现**多次重定向

---

### 场景 5: 管理员用户访问 /profile

**前置条件：**
- 使用管理员账号登录（如 `1055603323@qq.com`）

**测试步骤：**
1. 以管理员身份登录
2. 尝试访问：`https://nvwax.proclaw.cc/profile`
3. 观察控制台输出

**预期结果：**
```
ProfilePage immediate check - token exists: true userInfo exists: true
Admin user detected, redirecting to admin dashboard...
```

**验证要点：**
- ✅ 检测到管理员身份
- ✅ 重定向到 `/admin/dashboard`
- ✅ 只执行一次重定向
- ❌ **不应出现**在 profile 和 admin 之间循环

---

## 🔍 关键检查点

### 控制台日志检查

**✅ 正确的日志模式（无循环）：**
```
ProfilePage immediate check - token exists: true userInfo exists: true
ProfilePage: Loading...
ProfilePage: Rendering ProfileContent
```

**❌ 错误的日志模式（存在循环）：**
```
ProfilePage useEffect - isLoggedIn: false loading: true
Not logged in, redirecting to login...
Already logged in, redirecting to: /profile
ProfilePage useEffect - isLoggedIn: false loading: true  ← 又出现了！
Not logged in, redirecting to login...
Already logged in, redirecting to: /profile
...（无限重复）
```

### Network 面板检查

打开浏览器的 Network 标签，观察 HTTP 请求：

**✅ 正常情况：**
- 只有少量的 API 请求（获取用户信息、统计数据等）
- 没有频繁的页面跳转请求

**❌ 异常情况：**
- 看到大量的 302 重定向
- `/login` 和 `/profile` 请求交替出现
- 页面不断刷新

---

## 📊 测试结果记录表

| 测试场景 | 预期行为 | 实际行为 | 是否通过 | 备注 |
|---------|---------|---------|---------|------|
| 场景1: 已登录访问 /profile | 正常渲染 |  |  |  |
| 场景2: 未登录访问 /profile | 重定向到 login |  |  |  |
| 场景3: Login → Profile | 单次跳转 |  |  |  |
| 场景4: 刷新 Profile | 保持页面 |  |  |  |
| 场景5: 管理员访问 | 重定向到 admin |  |  |  |

---

## 🐛 如果发现问题

### 问题 1: 仍然出现重定向循环

**可能原因：**
- 代码未更新到最新版本
- 浏览器缓存了旧版本的 JavaScript

**解决方案：**
1. 硬刷新页面：Ctrl+Shift+R (Windows) 或 Cmd+Shift+R (Mac)
2. 清除浏览器缓存
3. 确认 Git commit 已推送：`git log --oneline -1`

### 问题 2: 控制台报错 401 Unauthorized

**说明：**
- 这是正常的，通知 API 返回 401 不影响页面渲染
- 只要页面能正常显示用户信息即可

### 问题 3: 页面一直显示"加载中..."

**可能原因：**
- `useAuth` hook 的 `loading` 状态一直是 `true`
- localStorage 中的数据损坏

**解决方案：**
1. 检查 Console 是否有错误
2. 执行 `localStorage.clear()` 后重新登录
3. 检查后端服务是否正常运行

---

## ✅ 测试通过标准

所有测试场景满足以下条件即为通过：

1. ✅ 每个场景只执行**一次**重定向（如果需要重定向）
2. ✅ 控制台日志中**不出现**重复的 "redirecting" 消息
3. ✅ Network 面板中**没有**频繁的 302 重定向
4. ✅ 页面能够**正常渲染**，显示用户信息
5. ✅ 用户交互流畅，**没有**卡顿或闪烁

---

## 📝 测试报告模板

```markdown
# 重定向循环测试报告

**测试日期：** 2026-05-17
**测试人员：** [您的名字]
**测试环境：** 
- 浏览器：Chrome 120 / Firefox 121 / Safari 17
- 操作系统：Windows 11 / macOS Sonoma
- 网络环境：本地开发 / 生产环境

## 测试结果

| 场景 | 状态 | 备注 |
|------|------|------|
| 场景1 | ✅ 通过 / ❌ 失败 |  |
| 场景2 | ✅ 通过 / ❌ 失败 |  |
| 场景3 | ✅ 通过 / ❌ 失败 |  |
| 场景4 | ✅ 通过 / ❌ 失败 |  |
| 场景5 | ✅ 通过 / ❌ 失败 |  |

## 发现的问题

[如果有问题，详细描述]

## 结论

✅ 重定向循环问题已解决 / ❌ 仍存在重定向循环问题
```

---

## 🎯 自动化测试脚本

项目根目录下提供了自动化测试脚本：

```bash
node test-redirect-loop.js
```

该脚本会模拟 4 个测试场景，验证 localStorage 检查逻辑是否正确。

**预期输出：**
```
🎉 所有测试通过！重定向循环问题已解决。
```
