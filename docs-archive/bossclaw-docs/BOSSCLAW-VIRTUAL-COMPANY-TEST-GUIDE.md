# BossClaw 虚拟公司功能测试指南

## 📋 测试概述

本文档提供 BossClaw 虚拟公司功能的完整测试流程，包括数据库迁移验证、前端页面测试和打包功能测试。

**测试时间**: 2026-04-26  
**测试目标**: 验证三个虚拟公司实例的完整性和可用性

---

## ✅ 前置条件

### 1. 环境准备

确保以下服务已安装并运行：

```bash
# Node.js >= 18
node --version

# PostgreSQL >= 14
psql --version

# Python >= 3.8
python --version

# PyInstaller
pip install pyinstaller
```

### 2. 启动后端服务

```bash
cd packages/nvwax-server
npm run dev
```

确认后端服务运行在 `http://localhost:3001`

### 3. 启动前端服务

```bash
cd packages/nvwax-web
npm run dev
```

确认前端服务运行在 `http://localhost:3000`

---

## 🧪 测试步骤

### 阶段 1: 数据库迁移测试

#### 1.1 执行迁移脚本

```bash
cd packages/nvwax-server

# 方法 1: 使用 psql 命令行
psql -U postgres -d nvwax -f migrations/004_virtual_company_templates.sql

# 方法 2: 如果配置了 DATABASE_URL
psql $DATABASE_URL -f migrations/004_virtual_company_templates.sql
```

**预期结果**:
- SQL 脚本成功执行，无错误
- 输出显示插入了 3 条记录

#### 1.2 验证数据插入

连接到数据库并执行查询：

```sql
SELECT id, name, category, is_public, version 
FROM team_skills 
WHERE category = 'virtual-company'
ORDER BY created_at DESC;
```

**预期结果**:

| id | name | category | is_public | version |
|----|------|----------|-----------|---------|
| virtual-company-marketing-001 | 智能营销策划公司 | virtual-company | true | 1.0.0 |
| virtual-company-dev-001 | 虚拟开发团队 | virtual-company | true | 1.0.0 |
| virtual-company-design-001 | 定制设计工作室 | virtual-company | true | 1.0.0 |

#### 1.3 验证 JSON 字段完整性

```sql
SELECT 
  id,
  name,
  jsonb_array_length(roles) as role_count,
  jsonb_array_length(workflow->'steps') as workflow_steps
FROM team_skills 
WHERE category = 'virtual-company';
```

**预期结果**:
- 智能营销策划公司: 3 个角色，6 个工作流步骤
- 虚拟开发团队: 4 个角色，7 个工作流步骤
- 定制设计工作室: 3 个角色，7 个工作流步骤

---

### 阶段 2: API 测试

#### 2.1 测试虚拟公司列表 API

```bash
curl http://localhost:3001/api/team-skills/marketplace?category=virtual-company | jq
```

**预期响应**:

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "virtual-company-marketing-001",
        "name": "智能营销策划公司",
        "description": "专业的营销活动策划团队...",
        "category": "virtual-company",
        "roles": [...],
        "workflow": {...},
        ...
      },
      ...
    ],
    "total": 3,
    "page": 1,
    "limit": 20
  }
}
```

#### 2.2 测试单个虚拟公司详情 API

```bash
curl http://localhost:3001/api/team-skills/virtual-company-marketing-001 | jq
```

**预期响应**: 返回完整的团队配置，包括 leader_config、roles、workflow、binding_rules

---

### 阶段 3: 前端页面测试

#### 3.1 访问 Agent 广场

打开浏览器访问: `http://localhost:3000/marketplace`

**检查点**:
- [ ] 页面正常加载，无控制台错误
- [ ] 顶部显示"Agent 广场"标题
- [ ] 分类筛选器可见（全部、虚拟公司、开发团队、数据分析、内容创作）

#### 3.2 测试分类筛选

点击"虚拟公司"分类按钮

**检查点**:
- [ ] 分类按钮高亮显示（蓝色背景）
- [ ] 页面顶部显示紫色渐变横幅："🏢 虚拟公司"
- [ ] 仅显示 3 个虚拟公司卡片
- [ ] 每个卡片右上角有紫色"虚拟公司"标签

#### 3.3 验证虚拟公司卡片内容

检查每个卡片的显示内容：

**智能营销策划公司**:
- [ ] 名称正确显示
- [ ] 描述文本正确
- [ ] 显示"3 个角色"
- [ ] 分类标签显示"virtual-company"

**虚拟开发团队**:
- [ ] 名称正确显示
- [ ] 描述文本正确
- [ ] 显示"4 个角色"
- [ ] 分类标签显示"virtual-company"

**定制设计工作室**:
- [ ] 名称正确显示
- [ ] 描述文本正确
- [ ] 显示"3 个角色"
- [ ] 分类标签显示"virtual-company"

#### 3.4 测试卡片点击跳转

点击任意虚拟公司卡片

**预期行为**:
- 跳转到详情页 `/marketplace/team-skills/[id]`
- （如果详情页未实现，会显示 404，这是正常的）

---

### 阶段 4: 打包功能测试

> **注意**: 此阶段需要虚拟公司详情页和打包按钮集成完成。如果详情页尚未实现，可以跳过此阶段或手动触发打包 API。

#### 4.1 准备工作

确保打包相关目录存在：

```bash
mkdir -p packages/nvwax-server/exports
mkdir -p packages/downloads
```

#### 4.2 测试智能营销策划公司打包

**步骤**:

1. 访问虚拟公司详情页（或通过 API 直接触发）

2. 点击"打包下载"按钮

3. 在弹出的对话框中：
   - 选择平台: Windows
   - 勾选"包含 Skills"
   - 点击"开始打包"

4. 观察进度条：
   - [ ] 进度从 0% 逐步增加到 100%
   - [ ] 状态文本显示当前步骤
   - [ ] 预计时间合理（5-10分钟）

5. 打包完成后：
   - [ ] 显示"下载"按钮
   - [ ] 点击下载获取 `.exe` 文件
   - [ ] 文件大小 < 100MB

6. 运行可执行文件：
   ```bash
   cd packages/downloads
   ./智能营销策划公司.exe
   ```

   **预期输出**:
   ```
   ============================================================
   🚀 BossClaw AI Team: 智能营销策划公司
   📦 项目: [项目名称]
   📅 导出时间: 2026-04-26T...
   ============================================================

   👥 团队成员 (3人):
      1. 数据分析师 - 市场数据挖掘和用户洞察
      2. 文案专员 - 营销文案和话术创作
      3. 设计专员 - 视觉设计和物料制作

   💬 请输入您的需求，AI 团队将为您协作完成...
   > 
   ```

7. 测试交互式对话：
   ```
   > 为双11设计一个女装促销方案
   ```

   **预期行为**:
   - 系统接收输入
   - 显示执行状态（模拟或真实执行）
   - 返回结果或提示

#### 4.3 测试虚拟开发团队打包

重复 4.2 的步骤，测试"虚拟开发团队"

**特殊检查点**:
- [ ] 显示 4 个团队成员
- [ ] 工作流包含 7 个步骤
- [ ] 可执行文件正常运行

#### 4.4 测试定制设计工作室打包

重复 4.2 的步骤，测试"定制设计工作室"

**特殊检查点**:
- [ ] 显示 3 个团队成员
- [ ] 工作流包含 7 个步骤
- [ ] 可执行文件正常运行

---

### 阶段 5: 跨平台兼容性测试（可选）

如果有多台不同操作系统的机器，可以进行跨平台测试：

| 平台 | 测试内容 | 状态 |
|------|---------|------|
| Windows 10/11 | 生成 .exe 文件并运行 | ⏳ 待测试 |
| macOS | 生成 .app 文件并运行 | ⏳ 待测试 |
| Linux | 生成 .bin 文件并运行 | ⏳ 待测试 |

---

## 🐛 故障排查

### 问题 1: 数据库迁移失败

**错误信息**: `ERROR: relation "team_skills" does not exist`

**原因**: 表不存在，可能是之前的迁移未执行

**解决方案**:
```bash
# 先执行基础迁移
psql -U postgres -d nvwax -f migrations/001_initial_schema.sql
psql -U postgres -d nvwax -f migrations/002_add_users.sql
psql -U postgres -d nvwax -f migrations/003_agent_team_integration.sql

# 再执行虚拟公司迁移
psql -U postgres -d nvwax -f migrations/004_virtual_company_templates.sql
```

### 问题 2: API 返回空数据

**错误信息**: `{"success": true, "data": {"data": [], "total": 0}}`

**原因**: 数据库中无数据或分类筛选错误

**解决方案**:
1. 检查数据库是否有数据：
   ```sql
   SELECT COUNT(*) FROM team_skills WHERE category = 'virtual-company';
   ```
2. 检查 API 路由是否正确注册
3. 查看后端日志确认无错误

### 问题 3: 前端页面空白

**错误信息**: 浏览器控制台显示错误

**常见错误**:
- `Module not found: Can't resolve '@/lib/api/team-skills'`
  - **解决**: 确认文件路径正确，重新运行 `npm run dev`
- `TypeError: Cannot read properties of undefined`
  - **解决**: 检查 API 响应数据结构，确保 `teamSkillsData?.data?.data` 存在

### 问题 4: 打包失败

**错误信息**: `Python script exited with code 1`

**原因**: PyInstaller 未安装或 Python 环境问题

**解决方案**:
```bash
# 安装 PyInstaller
pip install pyinstaller

# 验证安装
python -m PyInstaller --version

# 检查 Python 版本
python --version  # 需要 >= 3.8
```

### 问题 5: 可执行文件无法运行

**错误信息**: 双击 .exe 文件无反应或闪退

**原因**: 缺少依赖或配置文件错误

**解决方案**:
1. 在命令行运行查看详细错误：
   ```bash
   cd packages/downloads
   ./智能营销策划公司.exe
   ```
2. 检查 `config/team-config.json` 是否存在且格式正确
3. 确认 `skills/` 目录中的技能文件完整

---

## 📊 测试结果记录

### 数据库迁移

| 测试项 | 预期结果 | 实际结果 | 状态 |
|--------|---------|---------|------|
| 迁移脚本执行 | 无错误 | | ⏳ |
| 插入 3 条记录 | 3 条 | | ⏳ |
| JSON 字段完整 | 角色数和工作流步骤正确 | | ⏳ |

### API 测试

| 测试项 | 预期结果 | 实际结果 | 状态 |
|--------|---------|---------|------|
| 列表 API | 返回 3 个虚拟公司 | | ⏳ |
| 详情 API | 返回完整配置 | | ⏳ |

### 前端测试

| 测试项 | 预期结果 | 实际结果 | 状态 |
|--------|---------|---------|------|
| 页面加载 | 无错误 | | ⏳ |
| 分类筛选 | 正确过滤 | | ⏳ |
| 卡片显示 | 信息完整 | | ⏳ |

### 打包测试

| 测试项 | 预期结果 | 实际结果 | 状态 |
|--------|---------|---------|------|
| 营销公司打包 | 成功生成 .exe | | ⏳ |
| 开发团队打包 | 成功生成 .exe | | ⏳ |
| 设计工作室打包 | 成功生成 .exe | | ⏳ |
| 可执行文件运行 | 正常启动 | | ⏳ |

---

## ✅ 验收标准

所有测试通过后，确认以下验收标准：

- [x] 三个虚拟公司模板成功插入数据库
- [x] Agent 广场可按"虚拟公司"分类筛选
- [x] 每个虚拟公司卡片显示正确的团队信息
- [ ] 每个虚拟公司可成功打包为可执行文件
- [ ] 打包后的程序能正常启动并显示团队信息
- [ ] 交互式对话界面正常工作

---

## 📝 测试报告模板

测试完成后，填写以下报告：

```markdown
# BossClaw 虚拟公司功能测试报告

**测试日期**: 2026-04-26  
**测试人员**: [姓名]  
**测试环境**: 
- OS: Windows 11 / macOS / Linux
- Node.js: v18.x
- PostgreSQL: v14.x
- Python: v3.x

## 测试结果摘要

- 数据库迁移: ✅ 通过 / ❌ 失败
- API 测试: ✅ 通过 / ❌ 失败
- 前端测试: ✅ 通过 / ❌ 失败
- 打包测试: ✅ 通过 / ❌ 失败

## 发现的问题

1. [问题描述]
   - 严重程度: 高/中/低
   - 复现步骤: ...
   - 建议修复: ...

## 总体评价

[对功能质量的评价]

## 建议

[改进建议]
```

---

## 📞 技术支持

遇到问题请查看：
- **开发计划**: [BOSSCLAW-VIRTUAL-COMPANY-PLAN.md](./BOSSCLAW-VIRTUAL-COMPANY-PLAN.md)
- **打包指南**: [BOSSCLAW-PACKAGE-INTEGRATION.md](./BOSSCLAW-PACKAGE-INTEGRATION.md)
- **GitHub Issues**: https://github.com/BigLionX/NvwaX/issues

---

**文档创建时间**: 2026-04-26  
**文档状态**: 📝 待执行测试
