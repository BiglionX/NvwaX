# 热门 Agent 团队冷启动数据导入指南

## 概述

本指南将帮助您导入20个热门的Agent团队作为虚拟公司的冷启动数据。

## 已创建的迁移文件

我们已经创建了包含20个热门Agent团队的SQL迁移文件：
- 文件位置: `packages/nvwax-server/migrations/014_popular_agent_teams_cold_start.sql`

## 团队分类统计

| 分类 | 数量 | 说明 |
|------|------|------|
| development | 5 | 软件开发类团队 |
| analysis | 4 | 数据分析类团队 |
| content | 4 | 内容创作类团队 |
| design | 3 | 产品设计类团队 |
| operations | 4 | 运营类团队 |

## 团队列表

### 软件开发类 (5个)
1. Web应用开发团队
2. 移动应用开发团队
3. AI/机器学习开发团队
4. 区块链开发团队
5. 游戏开发团队

### 数据分析类 (4个)
6. 商业智能分析团队
7. 用户行为分析团队
8. 市场调研团队
9. 金融量化分析团队

### 内容创作类 (4个)
10. 数字营销团队
11. 视频制作团队
12. 品牌策划团队
13. 教育培训内容团队

### 产品设计类 (3个)
14. UI/UX设计团队
15. 产品设计团队
16. 工业设计团队

### 运营类 (4个)
17. 电商运营团队
18. 社群运营团队
19. 客户服务团队
20. HR招聘团队

## 导入方法

### 方法一：通过Docker执行（推荐）

如果您的系统正在运行Docker，可以使用以下命令：

```bash
# 进入项目根目录
cd d:\BigLionX\NvwaX

# 执行迁移脚本
docker-compose exec nvwax-server psql -U postgres -d nvwax -f packages/nvwax-server/migrations/014_popular_agent_teams_cold_start.sql
```

### 方法二：通过psql命令行工具

如果您本地安装了PostgreSQL客户端：

```bash
# 连接到数据库并执行迁移
psql -h localhost -U nvwax -d nvwax -f packages/nvwax-server/migrations/014_popular_agent_teams_cold_start.sql
```

### 方法三：通过Node.js脚本

我们提供了一个Node.js脚本来执行导入：

```bash
# 进入服务器目录
cd packages/nvwax-server

# 运行导入脚本
node scripts/import-popular-agent-teams.js
```

**注意**: 运行脚本前请确保：
1. PostgreSQL数据库服务正在运行
2. 数据库连接配置正确（检查 `.env` 文件）
3. 已安装必要的依赖 (`pg`)

### 方法四：手动执行SQL

您可以直接在数据库管理工具（如 pgAdmin、DBeaver等）中打开并执行：
`packages/nvwax-server/migrations/014_popular_agent_teams_cold_start.sql`

## 验证导入结果

导入完成后，可以通过以下SQL查询验证：

```sql
-- 查看所有团队
SELECT id, name, category, is_public, version 
FROM team_skills 
ORDER BY category, created_at DESC;

-- 查看分类统计
SELECT category, COUNT(*) as count 
FROM team_skills 
GROUP BY category 
ORDER BY category;

-- 查看总数
SELECT COUNT(*) as total FROM team_skills;
```

预期结果应该是总共23个团队（原有的3个示例 + 新增的20个）。

## 团队数据结构说明

每个团队包含以下信息：

- **id**: 唯一标识符
- **name**: 团队名称
- **description**: 团队描述
- **category**: 分类 (development/analysis/content/design/operations)
- **leader_config**: Leader Agent配置
- **roles**: 团队成员角色定义
- **workflow**: 工作流程步骤
- **binding_rules**: 协作规则
- **is_public**: 是否公开可用
- **version**: 版本号

## 使用这些团队

导入后，这些团队将在以下场景中可用：

1. **虚拟公司创建**: 用户在创建虚拟公司时可以选择这些预定义的团队模板
2. **Agent匹配**: 系统可以根据用户需求自动匹配最合适的团队
3. **市场展示**: 公开的团队可以在Agent市场中展示供其他用户使用

## 自定义和扩展

您可以根据需要修改或添加更多团队：

1. 编辑 SQL 文件添加新的团队
2. 调整现有团队的配置
3. 创建新的分类

## 故障排除

### 问题1: 数据库连接失败

**解决方案**:
- 确保PostgreSQL服务正在运行
- 检查数据库连接配置（host, port, username, password）
- 验证数据库是否存在

### 问题2: 表不存在

**解决方案**:
- 确保已执行之前的迁移脚本创建了 `team_skills` 表
- 检查迁移顺序是否正确

### 问题3: 重复导入

**解决方案**:
- SQL使用了 `ON CONFLICT (id) DO NOTHING`，重复执行不会造成问题
- 但建议只执行一次以避免混淆

## 下一步

导入完成后，您可以：

1. 启动应用程序测试虚拟公司创建功能
2. 在Agent市场中查看这些团队
3. 根据实际使用情况调整团队配置
4. 收集用户反馈优化团队设计

---

**提示**: 这些冷启动数据将大大提升用户体验，让用户在首次使用时就能看到丰富的团队选择！
