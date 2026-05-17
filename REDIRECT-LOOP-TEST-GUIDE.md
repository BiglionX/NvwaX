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
- localStorage 中没有认证信息
- 未登录状态

**测试步骤：**
1. 打开浏览器控制台
2. 执行：`localStorage.clear()`
3. 刷新页面或直接访问：`https://nvwax.proclaw.cc/profile`
4. 观察控制台和页面跳转

**预期结果：**
```
ProfilePage immediate check - token exists: false userInfo exists: false
Not logged in, redirecting to login...
```
- ✅ 页面重定向到 `/login?redirect=/profile`
- ✅ **不出现**循环重定向

---

### 场景 3: 从 Login 登录后跳转到 Profile

**测试步骤：**
1. 访问：`https://nvwax.proclaw.cc/login`
2. 输入凭据并登录
3. 登录成功后自动跳转到 `/profile`
4. 观察控制台日志

**预期结果：**
```
// Login 页面
useAuth: User logged in: test@nvwax.com
Already logged in, redirecting to: /profile

// Profile 页面（只出现一次）
ProfilePage immediate check - token exists: true userInfo exists: true
ProfilePage: Rendering ProfileContent
```

**验证要点：**
- ✅ ProfilePage 的 "immediate check" 只执行一次
- ✅ **不出现** "No auth found, redirecting to login..."
- ✅ 页面正常显示用户信息
- ✅ 页面地址保持 `/profile`，不再跳转

---

### 场景 4: 刷新 Profile 页面

**测试步骤：**
1. 确保已登录并处于 `/profile` 页面
2. 按 `F5` 或 `Ctrl+R` 刷新页面
3. 观察控制台和页面行为

**预期结果：**
```
ProfilePage immediate check - token exists: true userInfo exists: true
ProfilePage: Rendering ProfileContent
```

**验证要点：**
- ✅ 刷新后正常显示页面
- ✅ **不出现**重定向到登录页
- ✅ **不出现**多次检查日志
- ✅ `hasCheckedAuth` 正常工作

---

### 场景 5: 退出登录后重新访问

**测试步骤：**
1. 在 `/profile` 页面点击"退出登录"
2. 等待跳转到 `/login`
3. 清除浏览器缓存（可选）
4. 直接访问：`https://nvwax.proclaw.cc/profile`

**预期结果：**
```
ProfilePage immediate check - token exists: false userInfo exists: false
Not logged in, redirecting to login...
```

**验证要点：**
- ✅ 正确重定向到登录页
- ✅ **不出现**循环重定向
- ✅ 页面地址变为 `/login?redirect=/profile`

---

## 🔍 关键日志说明

### 正常的日志流程（已登录）
```
=== ProfilePage Render ===
isLoggedIn: false           ← useAuth 还未完成，这是正常的
loading: true

ProfilePage immediate check - token exists: true userInfo exists: true
ProfilePage: Loading...
ProfilePage: Rendering ProfileContent
```

### ❌ 异常的日志流程（重定向循环）
```
=== ProfilePage Render ===
isLoggedIn: false
loading: true

ProfilePage immediate check - token exists: true userInfo exists: true
No auth found, redirecting to login...  ← ❌ 不应出现

// 然后重定向到 /login
// 然后又重定向回 /profile
// 然后又重定向到 /login
// ... 无限循环
```

---

##  测试检查清单

- [ ] 场景 1: 已登录用户访问 /profile - 正常显示
- [ ] 场景 2: 未登录用户访问 /profile - 正确重定向到 /login
- [ ] 场景 3: 从 Login 登录后跳转 - 不出现循环
- [ ] 场景 4: 刷新 Profile 页面 - 保持当前页面
- [ ] 场景 5: 退出登录后重新访问 - 正确重定向

---

## 🐛 如果仍然出现问题

### 检查清单：
1. **清除浏览器缓存**
   - Chrome: `Ctrl+Shift+Delete` → 清除缓存
   - 或无痕模式测试：`Ctrl+Shift+N`

2. **检查 localStorage**
   ```javascript
   // 在控制台执行
   console.log('token:', localStorage.getItem('user_token'));
   console.log('userInfo:', localStorage.getItem('user_info'));
   ```

3. **查看完整的控制台日志**
   - 搜索 "ProfilePage" 关键字
   - 统计 "immediate check" 出现的次数（应该只有 1 次）

4. **检查网络请求**
   - Network 标签查看是否有重复的页面请求
   - 状态码应该都是 200

---

## ✅ 成功标准

当以下所有条件满足时，测试通过：

1. ✅ 控制台 "ProfilePage immediate check" 只出现一次
2. ✅ 已登录用户能正常看到 Profile 页面
3. ✅ 不出现 `/login` ↔ `/profile` 的来回跳转
4. ✅ 页面地址栏稳定，不频繁变化
5. ✅ 所有 5 个测试场景都通过

---

**测试日期：** 2026-05-17  
**测试版本：** Commit `1151df6` - "fix: 彻底解决 ProfilePage 重定向循环问题"  
**测试环境：** https://nvwax.proclaw.cc
