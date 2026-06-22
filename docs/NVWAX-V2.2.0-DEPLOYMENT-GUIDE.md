# NvwaX v2.2.0 腾讯云服务器部署指南

## 📋 部署前准备

### 1. 服务器信息
- **IP 地址**: 43.156.133.180
- **SSH 用户**: ubuntu
- **项目目录**: /opt/nvwax
- **SSH 密钥**: nvwax-deploy

### 2. 本地准备
确保已完成：
- ✅ v2.2.0 代码已推送到 GitHub
- ✅ 数据库迁移脚本已就绪
- ✅ 环境变量 `.env` 文件已配置

---

## 🚀 部署步骤

### 方法一：SSH 手动部署（推荐）

#### Step 1: SSH 登录服务器
```bash
ssh ubuntu@43.156.133.180
```

#### Step 2: 进入项目目录并拉取最新代码
```bash
cd /opt/nvwax
git pull origin main
```

#### Step 3: 执行部署脚本
```bash
bash scripts/deploy-to-tencent.sh
```

**部署脚本会自动执行**：
1. ✅ 检查项目目录
2. ✅ 拉取最新代码
3. ✅ 检查环境变量
4. ✅ 检查 OIDC 密钥
5. ✅ **执行数据库迁移**（v2.2.0 新增）
6. ✅ 停止旧容器
7. ✅ 构建并启动新容器
8. ✅ 健康检查（含 MCP 和状态机端点）

---

### 方法二：分步手动部署

#### Step 1: 拉取代码
```bash
cd /opt/nvwax
git pull origin main
```

#### Step 2: 执行数据库迁移
```bash
# 从 .env 获取数据库连接
source .env

# 执行迁移脚本
psql $DATABASE_URL -f packages/nvwax-server/migrations/030_creation_state_machine.sql
```

**迁移内容**：
- `creation_checkpoints` 表（状态机 checkpoint 持久化）
- `agent_definitions` 表（动态 Agent 注册）
- `nvwax_memories` 扩展（embedding + reflection_notes）
- 预填充 5 种内置 Agent

#### Step 3: 停止旧容器
```bash
docker compose down
```

#### Step 4: 构建并启动
```bash
docker compose --env-file .env up -d --build
```

#### Step 5: 等待服务启动
```bash
sleep 30
```

#### Step 6: 健康检查
```bash
# 检查容器状态
docker compose ps

# 检查后端
curl http://localhost:3001/health

# 检查 MCP 端点
curl http://localhost:3001/api/mcp/health

# 检查状态机路由
curl http://localhost:3001/api/aiteam-state-machine/graph

# 检查前端
curl http://localhost:3000
```

---

## ✅ 验证部署

### 1. 前端验证
访问以下页面：
- **主页**: http://43.156.133.180:3000
- **Marketplace**: http://43.156.133.180:3000/marketplace
- **Agent 创建向导**: 点击"创建智能体"按钮
- **状态机模式**: http://43.156.133.180:3000/nvwa（切换到"状态机"模式）
- **测试页面**: http://43.156.133.180:3000/test-v22（仅开发环境）

### 2. 后端 API 验证
```bash
# 后端健康检查
curl http://43.156.133.180:3001/health

# MCP 工具列表
curl -X POST http://43.156.133.180:3001/api/mcp/tools/list \
  -H "Content-Type: application/json"

# 状态机图定义
curl http://43.156.133.180:3001/api/aiteam-state-machine/graph
```

### 3. 数据库验证
```bash
# 连接数据库
psql $DATABASE_URL

# 检查新表
\dt creation_checkpoints
\dt agent_definitions

# 检查预填充数据
SELECT count(*) FROM agent_definitions;
-- 应该返回 5（5 种内置 Agent）
```

---

## 🔧 故障排查

### 问题 1: 数据库迁移失败
**症状**: 部署脚本在步骤 5 报错

**解决方案**:
```bash
# 手动执行迁移
cd /opt/nvwax
psql $DATABASE_URL -f packages/nvwax-server/migrations/030_creation_state_machine.sql

# 如果表已存在，检查是否已迁移
psql $DATABASE_URL -c "\dt creation_checkpoints"
```

### 问题 2: 容器启动失败
**症状**: `docker compose up` 报错

**解决方案**:
```bash
# 查看详细日志
docker compose logs backend --tail 100
docker compose logs frontend --tail 100

# 清理并重新构建
docker compose down
docker system prune -f
docker compose up -d --build
```

### 问题 3: MCP 端点不可用
**症状**: `/api/mcp/health` 返回 404

**解决方案**:
```bash
# 检查后端日志
docker compose logs backend | grep -i mcp

# 确认 app.ts 已挂载 MCP Router
grep -n "createMCPRouter" packages/nvwax-server/src/app.ts
```

### 问题 4: 前端页面不显示新组件
**症状**: Marketplace 页面没有 AgentWizardModal

**解决方案**:
```bash
# 强制清除浏览器缓存
# 或硬刷新：Ctrl + Shift + R (Windows) / Cmd + Shift + R (Mac)

# 检查前端构建
docker compose logs frontend | grep -i "compiled"
```

---

## 📊 部署后检查清单

- [ ] 前端页面可访问（http://43.156.133.180:3000）
- [ ] 后端健康检查通过（/health）
- [ ] MCP 端点正常（/api/mcp/health）
- [ ] 状态机路由正常（/api/aiteam-state-machine/graph）
- [ ] 数据库迁移完成（3 个新表）
- [ ] Agent 向导可用（marketplace 页面）
- [ ] 状态机模式可用（/nvwa 页面）
- [ ] 所有容器运行正常（`docker compose ps`）

---

## 📝 回滚方案

如果部署失败，可以快速回滚：

```bash
cd /opt/nvwax

# 1. 停止当前容器
docker compose down

# 2. 回退代码到上一个版本
git reset --hard HEAD~1

# 3. 重新启动
docker compose up -d --build

# 4. 验证
docker compose ps
curl http://localhost:3000
```

---

## 🎯 v2.2.0 新增功能验证

### 1. Structured Output 引擎
- 创建 Agent 时检查 LLM 输出解析成功率
- 应达到 ~99%（相比之前的 ~80%）

### 2. 图状态机
- 在 /nvwa 页面切换到"状态机"模式
- 应该看到 13 个节点的可视化图
- 测试事件触发（APPROVE / REJECT / GO_BACK）

### 3. Agent 向导
- 在 marketplace 点击"创建智能体"
- 应该弹出 3 步向导（身份/能力/测试）
- 测试 IndustryTemplateGrid 一键填充

### 4. MCP 协议
```bash
# 调用 MCP 工具
curl -X POST http://43.156.133.180:3001/api/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "nvwax_search_agents",
    "arguments": {"query": "营销推广"}
  }'
```

---

## 📞 技术支持

如遇到问题，请检查：
1. 部署日志：`docker compose logs -f`
2. 后端日志：`docker compose logs backend -f`
3. 前端日志：`docker compose logs frontend -f`
4. 数据库日志：`docker compose logs postgres -f`

---

*部署文档版本: v2.2.0*  
*最后更新: 2026-06-22*
