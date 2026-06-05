# 虚拟公司冷启动数据 - 20个热门Agent团队

## 📋 概述

为了解决虚拟公司数据为空的问题，我们准备了20个热门的Agent团队作为冷启动数据。这些团队涵盖了软件开发、数据分析、内容创作、产品设计和运营等多个领域，可以为用户提供丰富的选择。

## 🎯 目标

- ✅ 提供多样化的团队模板供用户选择
- ✅ 加速虚拟公司创建流程
- ✅ 展示系统的功能和能力
- ✅ 提升用户体验和参与度

## 📊 团队分类

| 分类 | 数量 | 代表团队 |
|------|------|----------|
| **development** | 5 | Web开发、移动开发、AI/ML、区块链、游戏开发 |
| **analysis** | 4 | 商业智能、用户行为分析、市场调研、金融量化 |
| **content** | 4 | 数字营销、视频制作、品牌策划、教育培训 |
| **design** | 3 | UI/UX设计、产品设计、工业设计 |
| **operations** | 4 | 电商运营、社群运营、客户服务、HR招聘 |

## 🚀 快速开始

### 方法一：使用PowerShell脚本（推荐Windows用户）

```powershell
# 在项目根目录执行
.\import-popular-teams.ps1
```

### 方法二：使用批处理脚本

```cmd
# 在项目根目录执行
import-popular-teams.bat
```

### 方法三：手动执行SQL

```bash
# 使用psql命令行工具
psql -h localhost -U nvwax -d nvwax -f packages/nvwax-server/migrations/014_popular_agent_teams_cold_start.sql
```

### 方法四：通过Docker

```bash
docker-compose exec nvwax-server psql -U postgres -d nvwax -f packages/nvwax-server/migrations/014_popular_agent_teams_cold_start.sql
```

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `packages/nvwax-server/migrations/014_popular_agent_teams_cold_start.sql` | SQL迁移文件，包含20个团队的定义 |
| `packages/nvwax-server/scripts/import-popular-agent-teams.js` | Node.js导入脚本 |
| `import-popular-teams.ps1` | PowerShell导入脚本 |
| `import-popular-teams.bat` | Windows批处理导入脚本 |
| `IMPORT_POPULAR_TEAMS_GUIDE.md` | 详细导入指南 |
| `README_COLD_START_TEAMS.md` | 本文件 |

## 🔍 验证导入

导入完成后，可以通过以下SQL查询验证：

```sql
-- 查看总数
SELECT COUNT(*) FROM team_skills;

-- 查看分类统计
SELECT category, COUNT(*) as count 
FROM team_skills 
GROUP BY category 
ORDER BY category;

-- 查看所有团队
SELECT id, name, category, is_public 
FROM team_skills 
ORDER BY created_at DESC;
```

预期结果：总共23个团队（原有3个示例 + 新增20个）

## 💡 团队特色

每个团队都包含完整的配置：

- **Leader配置**: 团队领导者的职责和能力
- **角色定义**: 团队成员的专业角色和技能
- **工作流程**: 标准化的工作步骤和输出
- **协作规则**: 沟通协议、冲突解决和质量标准

## 🎨 使用场景

这些团队将在以下场景中发挥作用：

1. **虚拟公司创建向导**: 用户可以选择预定义团队作为起点
2. **智能匹配**: 根据用户需求自动推荐合适的团队
3. **Agent市场**: 公开团队可供其他用户浏览和使用
4. **学习参考**: 新用户可以参考这些团队了解最佳实践

## 🔧 自定义扩展

您可以根据需要：

- ✏️ 修改现有团队的配置
- ➕ 添加新的团队类型
- 🏷️ 创建新的分类
- 🌐 调整团队的公开状态

## ⚠️ 注意事项

1. **数据库依赖**: 确保PostgreSQL服务正在运行
2. **表结构**: 确保`team_skills`表已通过之前的迁移创建
3. **重复执行**: SQL使用了`ON CONFLICT DO NOTHING`，可以安全重复执行
4. **权限要求**: 确保数据库用户有写入权限

## 🆘 故障排除

### 问题：连接失败
**解决**: 检查PostgreSQL服务状态和连接参数

### 问题：表不存在
**解决**: 确保已执行所有前置迁移脚本

### 问题：权限不足
**解决**: 使用具有足够权限的数据库用户

## 📈 后续优化建议

1. **用户反馈收集**: 跟踪哪些团队最受欢迎
2. **动态调整**: 根据使用情况优化团队配置
3. **A/B测试**: 测试不同团队模板的效果
4. **国际化**: 支持多语言团队描述

## 🤝 贡献

欢迎贡献更多优秀的团队模板！请遵循以下原则：

- 保持配置的完整性和一致性
- 提供清晰的描述和使用场景
- 确保工作流程合理可行
- 考虑不同行业和领域的多样性

---

**🎉 通过这些冷启动数据，您的虚拟公司将立即拥有丰富的团队选择，为用户提供更好的初始体验！**
