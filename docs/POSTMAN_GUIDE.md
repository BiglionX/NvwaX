# Postman Collection 使用指南

> **目标**：帮助开发者使用 Postman 测试 NvwaX OIDC API
>
> **适用对象**：后端开发者、API 测试人员

---

## 📋 目录

1. [概述](#1-概述)
2. [安装 Postman](#2-安装-postman)
3. [导入 Collection](#3-导入-collection)
4. [配置环境变量](#4-配置环境变量)
5. [测试流程](#5-测试流程)
6. [常见问题](#6-常见问题)
7. [高级用法](#7-高级用法)

---

## 1. 概述

### 1.1 什么是 Postman Collection？

Postman Collection 是一个 **API 测试集合**，包含：

- ✅ 预配置的 API 请求（Discovery、Authorization、Token、UserInfo 等）
- ✅ 自动化测试脚本（验证响应状态码、JSON 格式等）
- ✅ 环境变量管理（base_url、client_id、token 等）
- ✅ 请求执行顺序（按 OIDC 流程排列）

### 1.2 为什么使用 Postman？

| 方法 | 优点 | 缺点 |
|------|------|------|
| **Postman** | 可视化界面、自动化测试、环境变量管理 | 需要安装软件 |
| **curl** | 轻量、无需安装 | 命令复杂、难以管理多个请求 |
| **浏览器** | 简单 | 无法测试 POST 请求、无法自动化 |

### 1.3 Collection 文件位置

```
docs/NvwaX_OIDC_API.postman_collection.json
```

---

## 2. 安装 Postman

### 2.1 下载和安装

**方法 1：官方网站下载**

1. 访问：https://www.postman.com/downloads/
2. 选择对应操作系统（Windows/macOS/Linux）
3. 下载并安装

**方法 2：使用包管理器（Linux）**

```bash
# Ubuntu/Debian
sudo snap install postman

# Arch Linux
yay -S postman

# macOS (Homebrew)
brew install --cask postman
```

### 2.2 注册账号（可选）

Postman 可以免费使用，注册账号后可以：

- ✅ 同步 Collection 到云端
- ✅ 团队协作
- ✅ 生成 API 文档

如果不想注册，可以直接使用 **Postman Desktop App**（离线模式）。

---

## 3. 导入 Collection

### 3.1 方法 1：通过文件导入

1. 打开 Postman
2. 点击 **Import** 按钮（左上角）
3. 选择 **Upload Files**
4. 选择 `docs/NvwaX_OIDC_API.postman_collection.json` 文件
5. 点击 **Import**

### 3.2 方法 2：通过 URL 导入

1. 打开 Postman
2. 点击 **Import** 按钮
3. 选择 **Link**
4. 输入 URL：
   ```
   https://raw.githubusercontent.com/BiglionX/NvwaX/main/docs/NvwaX_OIDC_API.postman_collection.json
   ```
5. 点击 **Import**

### 3.3 验证导入成功

导入成功后，你应该在左侧边栏看到：

```
NvwaX OIDC API
├── 1. OIDC Discovery
│   └── Get Discovery Document
├── 2. JWKS (Get Public Key)
│   └── Get JWKS
├── 3. Authorization (Login)
│   └── Step 1: Generate PKCE Parameters
├── 4. Token Exchange
│   └── Exchange Code for Tokens
├── 5. Get UserInfo
│   └── Get User Info
├── 6. Refresh Token
│   └── Refresh Access Token
├── 7. End Session (Logout)
│   └── Logout
├── 8. Social Login (Optional)
│   ├── GitHub Login (Redirect)
│   └── Google Login (Redirect)
└── 9. Validate ID Token (Optional)
    └── Decode ID Token
```

---

## 4. 配置环境变量

### 4.1 打开环境变量配置

1. 在 Postman 顶部，点击 **Environment** 下拉菜单（默认显示 "No Environment"）
2. 选择 **Manage Environments**
3. 点击 **Add** 创建新环境
4. 命名环境：`NvwaX Local` 或 `NvwaX Production`

### 4.2 配置变量

| 变量名 | 说明 | 示例值 |
|--------|------|---------|
| `base_url` | OIDC IdP 基础 URL | `https://account.proclaw.cc` |
| `client_id` | 你的客户端 ID | `your-partner-client-id` |
| `redirect_uri` | 回调地址 | `http://localhost:3000/callback` |
| `code_verifier` | PKCE code verifier（自动生成） | *留空* |
| `code_challenge` | PKCE code challenge（自动生成） | *留空* |
| `authorization_code` | 授权码（手动填写） | *留空* |
| `access_token` | Access Token（自动保存） | *留空* |
| `refresh_token` | Refresh Token（自动保存） | *留空* |
| `id_token` | ID Token（自动保存） | *留空* |

**截图示例**：

```
┌─────────────────────────────────────────┐
│ Environment: NvwaX Local           │
├─────────────────────────────────────────┤
│ VARIABLE          INITIAL VALUE      │
│ base_url          https://account...  │
│ client_id         your-client-id     │
│ redirect_uri      http://localhos...  │
│ code_verifier     (留空)             │
│ code_challenge    (留空)             │
│ authorization...  (留空)             │
│ access_token      (留空)             │
│ refresh_token     (留空)             │
│ id_token          (留空)             │
└─────────────────────────────────────────┘
```

### 4.3 激活环境

1. 保存环境变量
2. 在 Postman 顶部，选择你创建的环境（例如：`NvwaX Local`）
3. 环境变量现在已激活（变量名会显示为橙色）

---

## 5. 测试流程

### 5.1 完整 OIDC 授权码流程

按照以下顺序执行请求：

#### Step 1：获取 OIDC Discovery 文档

1. 展开 **1. OIDC Discovery**
2. 点击 **Get Discovery Document**
3. 点击 **Send** 按钮
4. 查看响应（应该返回 JSON，包含 `issuer`、`authorization_endpoint`、`token_endpoint` 等）

**预期响应**：

```json
{
  "issuer": "https://account.proclaw.cc",
  "authorization_endpoint": "https://account.proclaw.cc/oauth/authorize",
  "token_endpoint": "https://account.proclaw.cc/oauth/token",
  "userinfo_endpoint": "https://account.proclaw.cc/oauth/userinfo",
  "jwks_uri": "https://account.proclaw.cc/.well-known/jwks.json"
}
```

#### Step 2：获取 JWKS（公钥）

1. 展开 **2. JWKS (Get Public Key)**
2. 点击 **Get JWKS**
3. 点击 **Send** 按钮
4. 查看响应（应该返回 JSON，包含 RSA 公钥）

**预期响应**：

```json
{
  "keys": [
    {
      "kty": "RSA",
      "n": "lF2eRHkFNSUNsvDSLkb...",
      "e": "AQAB",
      "kid": "MgyT8EXqBJX9aTOI",
      "use": "sig",
      "alg": "RS256"
    }
  ]
}
```

#### Step 3：生成 PKCE 参数并获取 Authorization Code

> **⚠️ 注意**：此步骤需要在浏览器中手动完成！

1. 展开 **3. Authorization (Login)**
2. 点击 **Step 1: Generate PKCE Parameters**
3. 点击 **Send** 按钮
4. Postman 会返回一个 HTML 页面（登录页面）

**接下来的步骤**：

1. 复制 Response 中的 HTML 内容
2. 保存为 `login.html` 文件
3. 在浏览器中打开 `login.html`
4. 完成登录流程（输入邮箱密码，或选择 Social Login）
5. 登录成功后，浏览器会重定向到 `redirect_uri`，并附带 `code` 参数

**例如**：

```
http://localhost:3000/callback?code=4/0Aeb...&state=random_state_123
```

6. 从 URL 中提取 `code` 参数
7. 在 Postman 中，打开 **Manage Environments**
8. 更新 `authorization_code` 变量为提取到的 `code` 值

#### Step 4：交换 Token

1. 展开 **4. Token Exchange**
2. 点击 **Exchange Code for Tokens**
3. 点击 **Send** 按钮
4. 查看响应（应该返回 `access_token`、`refresh_token`、`id_token`）

**预期响应**：

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "id_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**自动化**：Postman 会自动保存 `access_token`、`refresh_token`、`id_token` 到环境变量！

#### Step 5：获取用户信息

1. 展开 **5. Get UserInfo**
2. 点击 **Get User Info**
3. 点击 **Send** 按钮
4. 查看响应（应该返回用户邮箱、名称等信息）

**预期响应**：

```json
{
  "sub": "user-id-123",
  "iss": "https://account.proclaw.cc",
  "aud": "your-partner-client-id",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://account.proclaw.cc/avatars/123.png",
  "email_verified": true
}
```

#### Step 6（可选）：刷新 Token

如果 `access_token` 已过期，可以使用 `refresh_token` 获取新的 `access_token`：

1. 展开 **6. Refresh Token**
2. 点击 **Refresh Access Token**
3. 点击 **Send** 按钮
4. 查看响应（应该返回新的 `access_token` 和 `refresh_token`）

#### Step 7（可选）：退出登录

1. 展开 **7. End Session (Logout)**
2. 点击 **Logout**
3. 点击 **Send** 按钮
4. 查看响应（应该返回 200 或 302）

**注意**：退出登录后，需要清除本地存储的 `access_token` 和 `refresh_token`！

---

## 6. 常见问题

### 6.1 `code_verifier` 和 `code_challenge` 如何生成？

**问题**：Postman 的 **Pre-request Script** 中生成的 `code_challenge` 是占位符，需要手动替换。

**解决方法**：使用外部工具生成 PKCE 参数：

**方法 1：使用 Node.js**

```javascript
const crypto = require('crypto');

// 生成 code_verifier
const codeVerifier = crypto.randomBytes(64).toString('base64url');
console.log('code_verifier:', codeVerifier);

// 生成 code_challenge
const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
console.log('code_challenge:', codeChallenge);
```

**方法 2：使用在线工具**

- https://tonyxpage.github.io/pkce-generator/

**方法 3：使用 Postman 脚本（有限支持）**

在 **Pre-request Script** 中：

```javascript
// 生成 code_verifier (简单的随机字符串)
var codeVerifier = '';
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
for (var i = 0; i < 128; i++) {
    codeVerifier += chars.charAt(Math.floor(Math.random() * chars.length));
}

pm.environment.set('code_verifier', codeVerifier);

// 注意：Postman 不支持直接计算 SHA256！
// 需要手动计算 code_challenge，或使用外部工具
console.log('code_verifier: ' + codeVerifier);
console.log('⚠️ 请使用外部工具生成 code_challenge，并手动更新环境变量！');
```

### 6.2 如何查看测试脚本的输出？

**问题**：我想查看 `Tests` 脚本中的 `console.log` 输出，但找不到在哪里。

**解决方法**：

1. 打开 Postman **Console**（底部工具栏，点击 **Console** 按钮）
2. 重新发送请求
3. 查看 Console 输出

### 6.3 环境变量没有自动保存？

**问题**：执行 **Token Exchange** 后，`access_token` 等变量没有自动保存到环境变量。

**原因**：Postman 的 **Tests** 脚本需要在 **Response** 返回后才会执行。

**解决方法**：

1. 确保 **Tests** 脚本已正确配置（打开请求 → **Tests** 标签页）
2. 重新发送请求
3. 打开 **Manage Environments**，检查变量是否已更新

### 6.4 如何批量运行所有请求？

**问题**：我想自动化测试整个 OIDC 流程，不想手动点击每个请求。

**解决方法**：使用 **Postman Collection Runner**

1. 点击 Collection 名称旁边的 **...** 按钮
2. 选择 **Run**
3. 配置运行参数（例如：迭代次数、延迟等）
4. 点击 **Run NvwaX OIDC API**

**注意**：由于 **Step 3: Authorization** 需要在浏览器中手动完成，因此无法完全自动化。可以考虑跳过此步骤，手动填写 `authorization_code` 后继续。

---

## 7. 高级用法

### 7.1 添加自定义测试脚本

Postman 支持在 **Tests** 标签页中添加自定义测试脚本（JavaScript）。

**示例：验证 Token 过期时间**

```javascript
// 在 "Exchange Code for Tokens" 请求的 Tests 标签页中

pm.test('Token expires in 3600 seconds', function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.expires_in).to.eql(3600);
});

pm.test('Access Token is JWT', function() {
    var jsonData = pm.response.json();
    var accessToken = jsonData.access_token;
    var parts = accessToken.split('.');
    pm.expect(parts).to.have.lengthOf(3);  // JWT 有 3 部分
});
```

### 7.2 使用 Postman Mock Server

如果你还没有部署 NvwaX，可以使用 **Postman Mock Server** 模拟 API 响应：

1. 右键点击 Collection → **Mock Collection**
2. 配置 Mock Server 名称
3. 保存后，Postman 会生成一个 Mock URL（例如：`https://xxxxxx.mock.pstmn.io`）
4. 修改环境变量 `base_url` 为 Mock URL
5. 现在所有请求都会发送到 Mock Server

### 7.3 导出 API 文档

Postman 可以根据 Collection 自动生成 API 文档：

1. 右键点击 Collection → **View Documentation**
2. 点击 **Publish** 发布到 Postman Docs
3. 分享文档链接给团队

### 7.4 集成到 CI/CD

使用 **Newman**（Postman 的命令行工具）将 API 测试集成到 CI/CD 流程：

**安装 Newman**：

```bash
npm install -g newman
```

**运行 Collection**：

```bash
newman run docs/NvwaX_OIDC_API.postman_collection.json \
  --environment docs/NvwaX_OIDC_API.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export newman-results.json
```

**集成到 GitHub Actions**：

```yaml
# .github/workflows/api-test.yml
name: API Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g newman
      - run: newman run docs/NvwaX_OIDC_API.postman_collection.json
```

---

## 📞 支持与反馈

如果你在使用 Postman Collection 时遇到问题，可以：

1. **查看文档**：
   - Postman 官方文档：https://learning.postman.com/docs/
   - NvwaX API 接入指南：`docs/API_GUIDE.md`

2. **联系支持**：
   - 📧 Email：admin@proclaw.cc

3. **提交 Issue**：
   - GitHub：https://github.com/BiglionX/NvwaX/issues

---

**文档版本**：1.0  
**最后更新**：2026-06-21  
**适用版本**：NvwaX v1.3.0+
