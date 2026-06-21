# NvwaX 文档中心

> **欢迎来到 NvwaX 文档中心！**
>
> 这里汇集了所有 NvwaX 项目的文档，包括部署指南、API 接入指南、前端 API 说明等。

---

## 📖 文档索引

### 1. 部署相关

| 文档 | 说明 | 适用对象 |
|------|------|---------|
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | 完整部署指南（前置要求、快速部署、手动部署、验证、常见问题） | 运维工程师、DevOps |
| [../scripts/quick-deploy.sh](../scripts/quick-deploy.sh) | 快速部署脚本（一键部署） | 运维工程师、开发者 |

**快速开始**：
```bash
# 克隆仓库
git clone https://github.com/BiglionX/NvwaX.git /opt/nvwax
cd /opt/nvwax

# 运行快速部署脚本
sudo DOMAIN=account.yourdomain.com \
     EMAIL=admin@yourdomain.com \
     DB_PASSWORD=<密码> \
     JWT_SECRET=<密钥> \
     bash scripts/quick-deploy.sh
```

---

### 2. 接入相关

| 文档 | 说明 | 适用对象 |
|------|------|---------|
| [API_GUIDE.md](./API_GUIDE.md) | API 接入指南（OIDC 标准协议、前后端集成、Social Login、API 参考、示例代码） | 后端开发者、前端开发者 |
| [FRONTEND_API.md](./FRONTEND_API.md) | 前端 API 说明（组件说明、API 函数、状态管理、样式定制） | 前端开发者、UI/UX 设计师 |

**快速接入**：
- **OIDC 标准协议**：参考 [API_GUIDE.md](./API_GUIDE.md) 第 2 节
- **前端集成（JavaScript/TypeScript）**：参考 [API_GUIDE.md](./API_GUIDE.md) 第 3 节
- **后端集成（Node.js/Python/Java）**：参考 [API_GUIDE.md](./API_GUIDE.md) 第 4 节

---

### 3. 其他文档

| 文档 | 说明 | 位置 |
|------|------|------|
| **架构设计** | 系统架构、模块设计 | [docs/architecture/](../docs/architecture/) |
| **API 参考** | 后端 API 文档 | [docs/api/](../docs/api/) |
| **开发者指南** | 代码规范、贡献指南 | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| **Changelog** | 版本更新记录 | [CHANGELOG.md](../CHANGELOG.md) |

---

## 🚀 快速开始

### 场景 1：我是运维工程师，需要部署 NvwaX

1. 阅读 [部署指南](./DEPLOYMENT_GUIDE.md) 第 1 节（前置要求）
2. 使用 [快速部署脚本](./../scripts/quick-deploy.sh) 一键部署
3. 参考 [部署指南](./DEPLOYMENT_GUIDE.md) 第 5 节验证部署

**预计时间**：30 分钟

---

### 场景 2：我是后端开发者，需要接入统一登录

1. 向 NvwaX 团队申请 OIDC 客户端凭证（参考 [API 接入指南](./API_GUIDE.md) 第 1.3 节）
2. 阅读 [API 接入指南](./API_GUIDE.md) 第 2 节（OIDC 标准协议接入）
3. 根据后端语言选择示例（Node.js/Python/Java）（参考 [API 接入指南](./API_GUIDE.md) 第 4 节）

**预计时间**：1-2 小时

---

### 场景 3：我是前端开发者，需要集成登录功能

1. 向 NvwaX 团队申请 OIDC 客户端凭证
2. 阅读 [API 接入指南](./API_GUIDE.md) 第 3 节（前端集成）
3. 或使用 [前端 API 说明](./FRONTEND_API.md) 了解组件和 API 函数

**预计时间**：30 分钟 - 1 小时

---

### 场景 4：我是合作项目开发者，需要了解 NvwaX 能提供什么

1. 阅读 [API 接入指南](./API_GUIDE.md) 第 1 节（概述）
2. 了解 OIDC 标准协议和 PKCE 流程
3. 联系 NvwaX 团队申请 OIDC 客户端凭证

**预计时间**：15 分钟

---

## 📋 常见问题速查

| 问题 | 文档位置 |
|------|---------|
| 如何部署 NvwaX？ | [部署指南](./DEPLOYMENT_GUIDE.md) |
| 如何接入统一登录？ | [API 接入指南](./API_GUIDE.md) 第 2 节 |
| 如何使用 Social Login？ | [API 接入指南](./API_GUIDE.md) 第 5 节 |
| 如何创建 OIDC 客户端？ | [部署指南](./DEPLOYMENT_GUIDE.md) 第 4 节 |
| 如何验证部署是否成功？ | [部署指南](./DEPLOYMENT_GUIDE.md) 第 5 节 |
| 前端如何集成登录组件？ | [前端 API 说明](./FRONTEND_API.md) 第 2 节 |
| Token 过期怎么办？ | [API 接入指南](./API_GUIDE.md) 第 2.8 节 |
| 如何调试 OIDC 流程？ | [API 接入指南](./API_GUIDE.md) 第 8.5 节 |

---

## 🔗 相关链接

### 官方资源

- **官方网站**：https://account.proclaw.cc
- **Discovery 端点**：https://account.proclaw.cc/.well-known/openid-configuration
- **JWKS 端点**：https://account.proclaw.cc/.well-known/jwks.json
- **GitHub 仓库**：https://github.com/BiglionX/NvwaX

### 标准规范

- **OIDC 标准**：https://openid.net/specs/
- **OAuth 2.0 标准**：https://oauth.net/2/
- **PKCE 规范**：https://oauth.net/2/pkce/

### 常用库

- **前端（JavaScript/TypeScript）**：
  - [oidc-client-ts](https://github.com/authts/oidc-client-ts)
  - [next-auth](https://next-auth.js.org/)
- **后端（Node.js）**：
  - [openid-client](https://github.com/panva/node-openid-client)
  - [passport-openidconnect](https://github.com/jaredhanson/passport-openidconnect)
- **后端（Python）**：
  - [authlib](https://authlib.org/)
  - [django-allauth](https://django-allauth.readthedocs.io/)
- **后端（Java）**：
  - [Spring Security OAuth2](https://spring.io/projects/spring-security-oauth)
  - [Nimbus OAuth 2.0 SDK](https://connect2id.com/products/nimbus-oauth-openid-connect-sdk)

---

## 📞 支持与反馈

如果你在部署或接入过程中遇到问题，可以：

### 1. 查看文档
- 先查看本文档中心的对应文档
- 使用 Ctrl+F 搜索关键词

### 2. 查看 GitHub Issues
- 访问 https://github.com/BiglionX/NvwaX/issues
- 查看是否有类似问题

### 3. 联系支持团队
- 📧 **Email**：admin@proclaw.cc
- 💬 **微信群**：NvwaX 开发者交流群（请联系管理员获取邀请链接）

### 4. 提交 Issue
- 访问 https://github.com/BiglionX/NvwaX/issues
- 点击 "New Issue" 创建新问题
- 请详细描述问题，并附上错误日志、截图等信息

---

## 📝 文档贡献指南

如果你发现文档有错误或需要补充，欢迎贡献！

### 贡献步骤

1. **Fork 仓库**：
   ```bash
   git fork https://github.com/BiglionX/NvwaX.git
   ```

2. **创建分支**：
   ```bash
   git checkout -b docs/update-api-guide
   ```

3. **修改文档**：
   - 编辑对应的 Markdown 文件
   - 确保格式正确（使用 Markdown 语法）
   - 添加示例代码（如果有）

4. **提交更改**：
   ```bash
   git add docs/API_GUIDE.md
   git commit -m "docs: 更新 API 接入指南，添加 Python 示例"
   git push origin docs/update-api-guide
   ```

5. **创建 Pull Request**：
   - 访问 https://github.com/BiglionX/NvwaX/pulls
   - 点击 "New Pull Request"
   - 填写 PR 描述，说明修改内容

### 文档规范

- ✅ 使用清晰的标题和目录
- ✅ 使用表格、代码块、示意图等可视化元素
- ✅ 提供完整的示例代码
- ✅ 说明适用对象和预计时间
- ✅ 添加锚点链接，方便跳转

---

## 📅 文档更新日志

| 日期 | 版本 | 更新内容 | 作者 |
|------|------|---------|------|
| 2026-06-21 | 1.0 | 初始版本（创建部署指南、API 接入指南、前端 API 说明） | NvwaX Team |
|  |  |  |  |

---

## 📄 许可证

本文档遵循 **MIT License** 开源。

---

**文档版本**：1.0  
**最后更新**：2026-06-21  
**维护者**：NvwaX Team  
**联系方式**：admin@proclaw.cc
