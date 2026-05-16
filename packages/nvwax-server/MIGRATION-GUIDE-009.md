# 数据库迁移指南 - 虚拟公司会话系统

## 📋 迁移信息

- **迁移版本**: 009
- **迁移名称**: virtual_company_sessions
- **创建时间**: 2026-05-16
- **描述**: 创建虚拟公司创建会话表和相关索引

---

## 🚀 执行迁移

### 方法 1: 使用 Node.js 脚本（推荐）

```bash
# 确保 PostgreSQL 正在运行
cd packages/nvwax-server
node run-migration-009.mjs
```

### 方法 2: 使用 psql 命令行

```bash
# 连接到数据库
psql -U postgres -d nvwax

# 执行迁移脚本
\i migrations/009_virtual_company_sessions.sql

# 验证
\dt virtual_company_sessions
\d virtual_company_sessions
```

### 方法 3: 使用 Docker（如果使用 Docker Compose）

```bash
# 启动数据库服务
docker-compose up -d db

# 执行迁移
docker-compose exec db psql -U nvwax -d nvwax -f /docker-entrypoint-initdb.d/009_virtual_company_sessions.sql
```

---

## ✅ 验证迁移

执行以下 SQL 查询验证表是否创建成功：

```sql
-- 检查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'virtual_company_sessions';

-- 查看表结构
\d virtual_company_sessions

-- 检查索引
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'virtual_company_sessions';
```

预期输出：
- 表 `virtual_company_sessions` 存在
- 包含 11 个字段
- 4 个索引已创建

---

## 📊 表结构说明

### virtual_company_sessions

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT (PK) | 会话 ID |
| user_id | TEXT (FK) | 用户 ID |
| status | TEXT | 会话状态 |
| conversation_history | JSONB | 对话历史 |
| requirements | JSONB | 用户需求 |
| selected_roles | JSONB | 选定的角色 |
| progress | JSONB | 进度追踪 |
| final_team_skill_id | TEXT (FK) | 最终 Team Skill ID |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| completed_at | TIMESTAMP | 完成时间 |

### 状态枚举

- `initiated` - 会话已创建
- `requirements_gathering` - 需求收集中
- `role_selection` - 角色选择中
- `agent_searching` - Agent 搜索中
- `skill_matching` - Skill 匹配中
- `confirming` - 确认中
- `building` - 构建中
- `completed` - 已完成
- `failed` - 失败
- `cancelled` - 已取消

---

## 🔧 扩展的表

### team_skills

新增字段：
- `creation_session_id` - 创建来源会话 ID
- `source_agents` - 引用的开源 Agent IDs (JSONB)
- `custom_skills` - 自定义 Skills (JSONB)

### agents

新增字段：
- `created_from_session` - 创建来源会话 ID
- `is_from_marketplace` - 是否来自 SkillHub
- `marketplace_agent_id` - SkillHub 中的原始 ID

---

## ⚠️ 注意事项

1. **备份数据**: 执行迁移前建议备份数据库
   ```bash
   pg_dump -U postgres nvwax > backup_$(date +%Y%m%d).sql
   ```

2. **检查依赖**: 确保 `users` 和 `team_skills` 表已存在

3. **权限**: 确保数据库用户有 CREATE TABLE 和 ALTER TABLE 权限

4. **回滚**: 如需回滚，执行：
   ```sql
   DROP TABLE IF EXISTS virtual_company_sessions CASCADE;
   
   ALTER TABLE team_skills 
   DROP COLUMN IF EXISTS creation_session_id,
   DROP COLUMN IF EXISTS source_agents,
   DROP COLUMN IF EXISTS custom_skills;
   
   ALTER TABLE agents
   DROP COLUMN IF EXISTS created_from_session,
   DROP COLUMN IF EXISTS is_from_marketplace,
   DROP COLUMN IF EXISTS marketplace_agent_id;
   ```

---

## 🐛 故障排查

### 问题 1: 连接失败

**错误**: `connect ECONNREFUSED ::1:5432`

**解决**:
```bash
# 检查 PostgreSQL 是否运行
pg_lsclusters

# 启动 PostgreSQL
sudo systemctl start postgresql

# 或使用 Docker
docker-compose up -d db
```

### 问题 2: 权限不足

**错误**: `permission denied for database`

**解决**:
```sql
-- 以超级用户身份登录
psql -U postgres

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE nvwax TO nvwax;
GRANT ALL ON SCHEMA public TO nvwax;
```

### 问题 3: 表已存在

**错误**: `relation "virtual_company_sessions" already exists`

**解决**: 迁移脚本已使用 `IF NOT EXISTS`，应该可以安全跳过。如需重新创建，先删除旧表。

---

## 📞 技术支持

如遇到问题，请检查：
1. PostgreSQL 版本 >= 15
2. 数据库连接配置正确
3. 有足够的磁盘空间
4. 查看详细错误日志

---

**文档状态**: ✅ 完成  
**最后更新**: 2026-05-16
