# Flowise (NvwaX) 开发环境搭建指南

## 📋 前置条件检查

### ✅ 已完成
- [x] Git 已安装 (v2.53.0)
- [x] Node.js 已安装 (v20.11.0)
- [x] npm 已安装 (v10.2.4)
- [x] Git 用户配置完成

---

## 🚀 步骤 1：Fork Flowise 仓库

### 手动操作（在浏览器中完成）

1. **访问 Flowise 官方仓库**
   ```
   https://github.com/FlowiseAI/Flowise
   ```

2. **点击 "Fork" 按钮**
   - 位置：右上角
   - 选择你的组织：`BiglionX`
   - 仓库名称改为：`NvwaX`

3. **等待 Fork 完成**
   - 通常需要几秒钟
   - 完成后会跳转到：`https://github.com/BiglionX/NvwaX`

4. **验证 Fork 成功**
   - 确认仓库 URL 是 `https://github.com/BiglionX/NvwaX`
   - 确认可以看到所有 Flowise 的文件

---

## 💻 步骤 2：克隆到本地

完成 Fork 后，在终端执行：

```bash
# 进入工作目录
cd d:\BigLionX

# 克隆仓库
git clone https://github.com/BiglionX/NvwaX.git

# 进入项目目录
cd NvwaX
```

---

## 📦 步骤 3：安装依赖

```bash
# 安装所有依赖
npm install

# 这可能需要几分钟时间，取决于网络速度
# 如果遇到问题，可以尝试使用国内镜像：
# npm config set registry https://registry.npmmirror.com
```

---

## 🔧 步骤 4：配置环境变量

```bash
# 复制示例配置文件
cp packages/server/.env.example packages/server/.env

# 编辑 .env 文件，设置必要的配置
# 主要需要配置：
# - PORT=3000
# - DATABASE_PATH=./database.sqlite
# - API_KEY_PATH=./api.key
```

---

## 🏃 步骤 5：启动开发服务器

```bash
# 启动开发模式
npm run dev

# 或者分别启动各个服务：
# npm run start:server  # 后端
# npm run start:ui      # 前端
```

---

## ✅ 步骤 6：验证安装

### 访问应用

打开浏览器访问：
```
http://localhost:3000
```

### 预期结果

你应该看到：
- ✅ Flowise 主界面
- ✅ 可以创建新的 Chatflow
- ✅ 可以添加节点
- ✅ 界面响应正常

### 测试基本功能

1. **创建新 Chatflow**
   - 点击 "Add New"
   - 输入名称：Test Flow
   - 点击创建

2. **添加节点**
   - 拖拽一个 "Chat Model" 节点
   - 拖拽一个 "Prompt Template" 节点
   - 连接它们

3. **保存并测试**
   - 点击 "Save"
   - 点击 "Chat" 测试

---

## 🐛 常见问题

### 问题 1：npm install 失败

**症状**: 依赖安装超时或失败

**解决方案**:
```bash
# 清除缓存
npm cache clean --force

# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com

# 重新安装
npm install
```

### 问题 2：端口被占用

**症状**: `EADDRINUSE: address already in use :::3000`

**解决方案**:
```bash
# Windows: 查找占用端口的进程
netstat -ano | findstr :3000

# 杀死进程（替换 PID）
taskkill /PID <PID> /F

# 或者修改端口
# 在 packages/server/.env 中设置
PORT=3001
```

### 问题 3：TypeScript 编译错误

**症状**: 大量 TypeScript 错误

**解决方案**:
```bash
# 清理构建缓存
npm run clean

# 重新构建
npm run build
```

### 问题 4：数据库初始化失败

**症状**: 无法创建 SQLite 数据库

**解决方案**:
```bash
# 确保有写入权限
# Windows: 以管理员身份运行终端

# 或删除现有数据库文件
rm packages/server/database.sqlite

# 重新启动
npm run dev
```

---

## 📝 开发提示

### 项目结构

```
NvwaX/
├── packages/
│   ├── server/          # 后端服务器
│   │   ├── src/         # TypeScript 源码
│   │   ├── .env         # 环境变量
│   │   └── database.sqlite
│   ├── ui/              # 前端界面
│   │   ├── src/         # React 源码
│   │   └── public/
│   └── components/      # 共享组件
├── docs/                # 文档
└── examples/            # 示例
```

### 常用命令

```bash
# 开发模式（热重载）
npm run dev

# 生产构建
npm run build

# 运行测试
npm test

# 代码格式化
npm run lint
npm run format

# 清理构建产物
npm run clean
```

### 调试技巧

1. **查看日志**
   ```bash
   # 后端日志会在终端显示
   # 前端日志在浏览器控制台 (F12)
   ```

2. **启用详细日志**
   ```bash
   # 在 .env 中添加
   LOG_LEVEL=debug
   ```

3. **数据库检查**
   ```bash
   # 使用 DB Browser for SQLite 查看数据库
   # 或使用命令行：
   sqlite3 packages/server/database.sqlite
   ```

---

## 🎯 下一步：集成 SkillHub API

环境搭建完成后，我们将：

1. **添加 OpenAPI Toolkit 节点**
   - 在 Flowise 中配置 SkillHub API
   - 测试工具发现功能

2. **创建自定义节点**
   - `SkillHubSearchNode` - 搜索技能
   - `SkillHubDetailNode` - 获取详情

3. **构建第一个工作流**
   - 用户输入 → 搜索技能 → 显示结果

---

## 📞 需要帮助？

如果遇到无法解决的问题：

1. **查看 Flowise 官方文档**
   - https://docs.flowiseai.com

2. **检查 GitHub Issues**
   - https://github.com/FlowiseAI/Flowise/issues

3. **查看我们的进度报告**
   - [PROGRESS-DAY1.md](PROGRESS-DAY1.md)
   - [API-TEST-REPORT.md](API-TEST-REPORT.md)

---

## ✅ 检查清单

完成以下所有项后，环境即搭建成功：

- [ ] Fork Flowise 仓库为 NvwaX
- [ ] 克隆到本地 `d:\BigLionX\NvwaX`
- [ ] 运行 `npm install` 成功
- [ ] 配置 `.env` 文件
- [ ] 运行 `npm run dev` 无错误
- [ ] 浏览器访问 http://localhost:3000 正常
- [ ] 可以创建和保存 Chatflow
- [ ] 可以添加和连接节点

---

**准备好了吗？让我们开始吧！** 🚀
