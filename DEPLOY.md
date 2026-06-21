# NvwaX 部署指南

## 方式一：通过 CodeBuddy（推荐，已配置好）

在 CodeBuddy 聊天框中直接说：

> **重新部署**

CodeBuddy 已保存服务器配置（实例 `lhins-5x8onyrr`，地域 `ap-singapore`），会自动完成部署。

---

## 方式二：手动 SSH 部署（适用于任何 IDE）

### 前置条件
```bash
# 1. SSH 连接服务器
ssh ubuntu@43.156.133.180

# 2. 进入项目目录
cd /opt/nvwax

# 3. 拉取最新代码
git pull origin main
```

### 完整部署（重新构建所有容器）
```bash
cd /opt/nvwax
docker compose --env-file .env up -d --build
```

### 仅重启（无代码变更时）
```bash
cd /opt/nvwax
docker compose restart
```

### 查看日志
```bash
docker compose logs -f              # 所有服务
docker compose logs -f backend    # 仅后端
docker compose logs -f frontend   # 仅前端
```

---

## 方式三：VS Code Remote SSH

1. 安装 VS Code 插件：`Remote - SSH`
2. 按 `F1` → `Remote-SSH: Connect to Host`
3. 输入 `ubuntu@43.156.133.180`
4. 连接后打开 `/opt/nvwax` 目录
5. 在 VS Code 终端中执行上述部署命令

---

## 服务器信息

| 项目 | 值 |
|------|-----|
| IP | `43.156.133.180` |
| SSH 用户 | `ubuntu` |
| 项目目录 | `/opt/nvwax` |
| 地域（Lighthouse） | `ap-singapore` |
| 实例 ID（Lighthouse） | `lhins-5x8onyrr` |

---

## 常见问题

### 构建失败：`Duplicate export 'default'`
**原因**：Next.js 页面文件同时有 `export default function Foo()` 和文件末尾 `export default Foo`。  
**修复**：删除函数前的 `export default`，保留末尾的 `export default Foo`。

### 构建失败：ESLint / TypeScript 报错
**临时跳过**（服务器上操作）：
```bash
cd /opt/nvwax/packages/nvwax-web
# 编辑 next.config.ts，加入：
#   eslint: { ignoreDuringBuilds: true },
#   typescript: { ignoreBuildErrors: true },
```
然后重新构建。

### 前端访问空白
```bash
docker compose restart frontend
```
