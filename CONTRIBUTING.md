# Contributing to NvwaX

感谢你对 NvwaX 项目的关注！我们欢迎所有形式的贡献。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [代码审查](#代码审查)

---

## 行为准则

本项目采用 [Contributor Covenant](https://www.contributor-covenant.org/) 行为准则。参与即表示你同意遵守这些规则。

### 我们的承诺

为了营造一个开放和友好的环境，我们承诺：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

---

## 如何贡献

### 报告 Bug

如果你发现了一个 bug，请创建一个 Issue，包含：

1. **清晰的标题**：简明扼要地描述问题
2. **重现步骤**：详细说明如何重现问题
3. **预期行为**：描述你期望发生什么
4. **实际行为**：描述实际发生了什么
5. **环境信息**：操作系统、浏览器、Node.js 版本等
6. **截图/日志**：如果有的话

### 提出新功能

如果你想添加新功能：

1. 先查看现有的 Issues，确保没有重复
2. 创建一个新的 Issue 讨论你的想法
3. 等待维护者的反馈
4. 如果获得批准，开始实现

### 改进文档

文档永远需要改进！你可以：

- 修复拼写错误
- 添加示例代码
- 改进说明的清晰度
- 翻译文档

---

## 开发环境设置

### 前置要求

- Node.js 18+
- PostgreSQL 15+ (或使用 Neon)
- pnpm (推荐) 或 npm
- Git

### 安装步骤

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/YOUR_USERNAME/NvwaX.git
cd NvwaX

# 2. 添加上游远程仓库
git remote add upstream https://github.com/BigLionX/NvwaX.git

# 3. 安装依赖
pnpm install

# 4. 配置环境变量
cp packages/nvwax-server/.env.example packages/nvwax-server/.env
cp packages/nvwax-web/.env.local.example packages/nvwax-web/.env.local

# 5. 初始化数据库
cd packages/nvwax-server
npm run db:migrate

# 6. 启动开发服务器
# 终端 1: 后端
npm run dev

# 终端 2: 前端
cd ../nvwax-web
npm run dev
```

---

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构代码
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具变动

### 示例

```bash
# 新功能
git commit -m "feat(search): add full-text search support"

# 修复 bug
git commit -m "fix(auth): resolve token expiration issue"

# 文档更新
git commit -m "docs(readme): update installation instructions"

# 重构
git commit -m "refactor(api): simplify error handling logic"
```

---

## Pull Request 流程

### 1. 创建分支

从 `main` 分支创建新分支：

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

### 2. 开发

- 编写代码
- 添加测试（如适用）
- 更新文档（如适用）

### 3. 测试

确保所有测试通过：

```bash
# 运行测试
npm test

# 检查代码风格
npm run lint
```

### 4. 提交

```bash
git add .
git commit -m "feat: your commit message"
```

### 5. 推送

```bash
git push origin feature/your-feature-name
```

### 6. 创建 PR

1. 访问 GitHub 仓库
2. 点击 "Compare & pull request"
3. 填写 PR 描述
4. 请求审查

---

## 代码审查

### 审查标准

我们会检查：

- ✅ 代码质量
- ✅ 测试覆盖
- ✅ 文档完整性
- ✅ 遵循项目规范
- ✅ 没有安全漏洞

### 审查流程

1. 自动检查（CI）
2. 维护者审查
3. 反馈和修改
4. 合并到主分支

### 常见反馈

- **代码风格**: 请运行 `npm run lint -- --fix`
- **缺少测试**: 请添加单元测试
- **文档不足**: 请更新相关文档
- **性能问题**: 请优化算法或数据结构

---

## 开发建议

### 代码风格

- 使用 TypeScript
- 遵循 ESLint 规则
- 使用有意义的变量名
- 保持函数简短（<50 行）
- 添加必要的注释

### 测试

- 为新功能编写测试
- 保持测试覆盖率 >80%
- 使用描述性的测试名称

### 文档

- 更新 README
- 添加 JSDoc 注释
- 提供使用示例

---

## 常见问题

### Q: 我的 PR 多久会被审查？
A: 通常在 1-3 个工作日内。

### Q: 我可以同时处理多个 Issue 吗？
A: 可以，但建议一次专注于一个。

### Q: 如果我的 PR 被拒绝怎么办？
A: 我们会说明原因，你可以根据反馈修改后重新提交。

### Q: 如何成为维护者？
A: 持续贡献高质量的代码和文档，我们会邀请你加入。

---

## 联系方式

- **Email**: 1055603323@qq.com
- **GitHub Issues**: [新建 Issue](https://github.com/BigLionX/NvwaX/issues)
- **Discussions**: [参与讨论](https://github.com/BigLionX/NvwaX/discussions)

---

## 致谢

感谢所有为 NvwaX 做出贡献的开发者！

<div align="center">

**Happy Coding! 🚀**

</div>
