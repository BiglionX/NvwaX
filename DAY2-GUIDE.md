# Day 2 操作指南 - Fork Flowise 并搭建环境

**日期**: 2026-04-25  
**目标**: 完成 Flowise 环境搭建

---

## 📋 今日任务清单

- [ ] 1. 确认代码已推送到 GitHub
- [ ] 2. Fork Flowise 仓库
- [ ] 3. 克隆 Flowise 到本地
- [ ] 4. 安装依赖
- [ ] 5. 启动开发服务器
- [ ] 6. 验证 Flowise 运行

---

## ✅ 任务 1: 确认代码推送状态

### 检查推送是否成功

```bash
cd d:\BigLionX\NvwaX
git status
```

**预期结果**:
- ✅ 如果显示 "Your branch is up to date with 'origin/main'" → 推送成功
- ⏳ 如果仍在推送中 → 继续等待
- ❌ 如果显示失败 → 查看下面的解决方案

### 如果推送失败

#### 方案 A: 重试 HTTPS
```bash
git push -u origin main
```

#### 方案 B: 切换到 SSH（推荐）

**步骤 1**: 生成 SSH Key（如果还没有）
```bash
ssh-keygen -t ed25519 -C "1055603323@qq.com"
# 按回车使用默认路径
# 设置 passphrase（可选，直接回车跳过）
```

**步骤 2**: 复制公钥
```bash
# 显示公钥内容
type C:\Users\%USERNAME%\.ssh\id_ed25519.pub

# 或手动打开文件复制内容
notepad C:\Users\%USERNAME%\.ssh\id_ed25519.pub
```

**步骤 3**: 添加到 GitHub
1. 访问: https://github.com/settings/keys
2. 点击 "New SSH key"
3. Title: `NvwaX Development`
4. Key: 粘贴刚才复制的公钥内容
5. 点击 "Add SSH key"

**步骤 4**: 更改远程 URL
```bash
git remote set-url origin git@github.com:BiglionX/NvwaX.git
```

**步骤 5**: 测试连接
```bash
ssh -T git@github.com
# 应该看到: Hi BiglionX! You've successfully authenticated...
```

**步骤 6**: 推送代码
```bash
git push -u origin main
```

---

## 🍴 任务 2: Fork Flowise 仓库

### 在浏览器中操作

1. **访问 Flowise 官方仓库**
   ```
   https://github.com/FlowiseAI/Flowise
   ```

2. **点击 Fork 按钮**
   - 位置：页面右上角
   - 图标：分叉箭头

3. **配置 Fork**
   - Owner: 选择 `BiglionX`
   - Repository name: 保持 `Flowise` 或改为 `NvwaX-Flowise`
   - Description: （可选）添加描述
   - ☑ Copy the `main` branch only: 勾选（节省空间）

4. **点击 "Create fork"**

5. **等待完成**
   - 通常需要 10-30 秒
   - 完成后会跳转到你的 Fork 页面

6. **验证 Fork 成功**
   - URL 应该是: `https://github.com/BiglionX/Flowise`
   - 可以看到所有 Flowise 的文件

---

## 📥 任务 3: 克隆 Flowise 到本地

### 选择克隆位置

你有两个选择：

#### 选项 A: 独立目录（推荐）⭐

```bash
# 在 BigLionX 目录下创建新目录
cd d:\BigLionX

# 克隆 Flowise
git clone https://github.com/BiglionX/Flowise.git NvwaX-Flowise

# 进入目录
cd NvwaX-Flowise
```

**优点**: 
- 与 NvwaX 文档项目分离
- 更清晰的目录结构
- 便于管理

#### 选项 B: NvwaX 子目录

```bash
# 在 NvwaX 目录下创建 flowise 子目录
cd d:\BigLionX\NvwaX
mkdir flowise
cd flowise

# 克隆 Flowise
git clone https://github.com/BiglionX/Flowise.git .
```

**优点**:
- 所有相关文件在一起
- 便于版本控制

---

## 📦 任务 4: 安装依赖

### 进入 Flowise 目录

```bash
# 根据你选择的选项
cd d:\BigLionX\NvwaX-Flowise
# 或
cd d:\BigLionX\NvwaX\flowise
```

### 安装依赖

```bash
# 标准安装
npm install
```

**预计时间**: 5-15 分钟（取决于网络速度）

### 如果安装很慢

使用国内镜像：

```bash
# 设置淘宝镜像
npm config set registry https://registry.npmmirror.com

# 重新安装
npm install
```

### 如果遇到错误

#### 错误 1: node-gyp 编译失败

```bash
# Windows 需要安装构建工具
npm install --global windows-build-tools

# 然后重新安装
npm install
```

#### 错误 2: 权限问题

```bash
# 以管理员身份运行 PowerShell
# 然后重新执行 npm install
```

#### 错误 3: 内存不足

```bash
# 增加 Node.js 内存限制
set NODE_OPTIONS=--max-old-space-size=4096
npm install
```

---

## ⚙️ 任务 5: 配置环境变量

### 复制示例配置

```bash
# Windows PowerShell
Copy-Item packages\server\.env.example packages\server\.env
```

### 编辑配置文件

打开 `packages\server\.env`，确认以下配置：

```env
# 端口
PORT=3000

# 数据库路径
DATABASE_PATH=./database.sqlite

# API Key 路径
API_KEY_PATH=./api.key

# 日志级别
LOG_LEVEL=info

# 其他配置保持默认
```

---

## 🏃 任务 6: 启动开发服务器

### 启动 Flowise

```bash
# 在项目根目录
npm run dev
```

**预期输出**:
```
Starting Flowise...
Server is running on port 3000
Visit http://localhost:3000
```

### 访问 Flowise

打开浏览器访问：
```
http://localhost:3000
```

### 验证功能

1. **首页加载**
   - ✅ 看到 Flowise 欢迎页面
   - ✅ 界面正常显示

2. **创建 Chatflow**
   - 点击 "Add New"
   - 输入名称: "Test Flow"
   - 点击创建

3. **添加节点**
   - 从左侧拖拽一个节点到画布
   - 例如: "Chat Model" → "OpenAI"
   - 配置基本参数

4. **保存测试**
   - 点击 "Save"
   - 确认保存成功

---

## 🐛 常见问题

### Q1: 端口 3000 被占用？

**症状**: `EADDRINUSE: address already in use :::3000`

**解决**:
```bash
# 查找占用端口的进程
netstat -ano | findstr :3000

# 杀死进程（替换 PID）
taskkill /PID <PID> /F

# 或修改端口
# 在 packages/server/.env 中设置
PORT=3001
```

### Q2: TypeScript 编译错误？

**症状**: 大量 TS 错误

**解决**:
```bash
# 清理并重新构建
npm run clean
npm run build
npm run dev
```

### Q3: 数据库初始化失败？

**症状**: 无法创建 SQLite 数据库

**解决**:
```bash
# 确保有写入权限
# 或删除现有数据库
rm packages\server\database.sqlite

# 重新启动
npm run dev
```

### Q4: 前端资源加载失败？

**症状**: 页面空白或样式丢失

**解决**:
```bash
# 清除浏览器缓存
# 硬刷新: Ctrl + F5

# 或重新构建前端
cd packages/ui
npm run build
```

---

## ✅ 验证清单

完成以下所有项即表示环境搭建成功：

- [ ] Flowise 仓库已 Fork
- [ ] 代码已克隆到本地
- [ ] `npm install` 成功完成
- [ ] `.env` 文件已配置
- [ ] `npm run dev` 无错误启动
- [ ] 浏览器访问 http://localhost:3000 正常
- [ ] 可以创建新的 Chatflow
- [ ] 可以添加和连接节点
- [ ] 可以保存 Chatflow

---

## 📊 预计时间

| 任务 | 预计时间 |
|------|---------|
| Fork 仓库 | 2 分钟 |
| 克隆代码 | 5 分钟 |
| 安装依赖 | 10-15 分钟 |
| 配置环境 | 3 分钟 |
| 启动服务器 | 2 分钟 |
| 验证功能 | 5 分钟 |
| **总计** | **30-40 分钟** |

---

## 🎯 下一步（Day 3）

环境搭建完成后，我们将：

1. **测试 OpenAPI 集成**
   - 检查 SkillHub OpenAPI spec
   - 在 Flowise 中添加 OpenAPI Toolkit
   - 测试工具发现功能

2. **创建自定义节点**
   - SkillHubSearchNode
   - SkillHubDetailNode

3. **构建第一个工作流**
   - 用户输入 → 搜索技能 → 显示结果

---

## 📞 需要帮助？

- 📖 查看 [FLOWISE-SETUP-GUIDE.md](FLOWISE-SETUP-GUIDE.md)
- 🐛 提交 Issue
- 💬 联系团队

---

**准备好了吗？让我们开始吧！** 🚀

按照上面的步骤一步步执行，遇到任何问题随时告诉我！
