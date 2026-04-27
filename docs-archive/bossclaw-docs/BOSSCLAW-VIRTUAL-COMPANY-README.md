# BossClaw 虚拟公司功能

> 将 BossClaw 从"智能体管理平台"升级为"虚拟公司孵化器"

## 📖 概述

BossClaw 虚拟公司功能允许用户创建和管理由多个 AI 智能体组成的"虚拟公司"，这些智能体像真实团队一样协作工作。本次开发实现了三个典型场景的虚拟公司实例，并在 Agent 广场发布。

### 核心特性

- 🏢 **虚拟公司模板**: 预置营销、开发、设计三类公司模板
- 👥 **多角色协作**: 每个公司包含 3-4 个专业角色
- 🔄 **工作流程**: 定义清晰的协作流程和产出物
- 📦 **一键打包**: 可将虚拟公司打包为独立可执行文件
- 🎯 **场景化应用**: 针对电商促销、软件开发、品牌设计等场景

---

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 18
- PostgreSQL >= 14
- Python >= 3.8（用于打包功能）
- PyInstaller（`pip install pyinstaller`）

### 2. 安装步骤

```bash
# 克隆项目
git clone https://github.com/BigLionX/NvwaX.git
cd NvwaX

# 安装后端依赖
cd packages/nvwax-server
npm install

# 安装前端依赖
cd ../nvwax-web
npm install

# 安装 Python 依赖
cd ../skillhub-workflow
pip install pyinstaller
```

### 3. 数据库迁移

```bash
cd packages/nvwax-server
psql -U postgres -d nvwax -f migrations/004_virtual_company_templates.sql
```

或使用快速测试脚本（Windows）：

```bash
test-virtual-company.bat
```

### 4. 启动服务

```bash
# 终端 1: 启动后端
cd packages/nvwax-server
npm run dev

# 终端 2: 启动前端
cd packages/nvwax-web
npm run dev
```

### 5. 访问 Agent 广场

打开浏览器访问: http://localhost:3000/marketplace

点击"虚拟公司"分类，查看三个实例。

---

## 📦 虚拟公司实例

### 1. 智能营销策划公司

**适用场景**: 电商促销、品牌活动、内容营销

**团队成员**:
- 策划总监（Leader）
- 数据分析师
- 文案专员
- 设计专员

**工作流程**:
1. 需求分析和目标设定
2. 历史数据分析和市场洞察
3. 营销策略制定
4. 营销文案生成
5. 视觉设计
6. 最终审核和优化

### 2. 虚拟开发团队

**适用场景**: 小程序开发、网站搭建、API开发

**团队成员**:
- 技术负责人（Leader）
- 产品经理
- 后端开发
- 前端开发
- 测试工程师

**工作流程**:
1. 需求分析和系统设计
2. 技术架构设计
3. 数据库设计
4. API接口开发
5. 前端界面开发
6. 集成测试
7. 部署和文档

### 3. 定制设计工作室

**适用场景**: Logo设计、包装设计、UI设计

**团队成员**:
- 创意总监（Leader）
- 平面设计师
- UI/UX设计师
- 3D建模师

**工作流程**:
1. 需求沟通和创意构思
2. 市场调研和灵感收集
3. 初稿设计
4. UI界面设计
5. 3D建模和渲染
6. 整合和优化
7. 交付和反馈

---

## 🛠️ 技术架构

### 数据模型

虚拟公司信息存储在 `team_skills` 表中：

```sql
CREATE TABLE team_skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,  -- 'virtual-company'
  leader_config JSONB,
  roles JSONB,
  workflow JSONB,
  binding_rules JSONB,
  is_public BOOLEAN DEFAULT true,
  version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### API 端点

```typescript
// 获取虚拟公司列表
GET /api/team-skills/marketplace?category=virtual-company

// 获取单个虚拟公司详情
GET /api/team-skills/:id

// 导出虚拟公司配置
POST /api/agent-teams/:id/export

// 触发打包构建
POST /api/agent-teams/:id/build-package

// 查询构建状态
GET /api/package-builds/:jobId
```

### 前端组件

- `app/marketplace/page.tsx` - Agent 广场页面（含分类筛选）
- `components/Package/PackageModal.tsx` - 打包对话框
- `lib/api/team-skills.ts` - Team Skills API 客户端

---

## 📚 文档

| 文档 | 说明 |
|------|------|
| [BOSSCLAW-VIRTUAL-COMPANY-PLAN.md](./BOSSCLAW-VIRTUAL-COMPANY-PLAN.md) | 完整的开发计划和技术方案 |
| [BOSSCLAW-VIRTUAL-COMPANY-TEST-GUIDE.md](./BOSSCLAW-VIRTUAL-COMPANY-TEST-GUIDE.md) | 详细的测试指南和验收标准 |
| [BOSSCLAW-VIRTUAL-COMPANY-COMPLETION.md](./BOSSCLAW-VIRTUAL-COMPANY-COMPLETION.md) | 实施完成报告和成果总结 |
| [BOSSCLAW-PACKAGE-INTEGRATION.md](./BOSSCLAW-PACKAGE-INTEGRATION.md) | 打包功能集成指南 |
| [BossClaw.md](./BossClaw.md) | 原始设计文档和需求分析 |

---

## 🧪 测试

### 快速测试

运行快速测试脚本（Windows）：

```bash
test-virtual-company.bat
```

该脚本会自动：
1. 执行数据库迁移
2. 验证数据插入
3. 检查后端/前端服务
4. 测试 API 端点
5. 检查 Python 环境

### 完整测试

参考 [BOSSCLAW-VIRTUAL-COMPANY-TEST-GUIDE.md](./BOSSCLAW-VIRTUAL-COMPANY-TEST-GUIDE.md) 进行完整的端到端测试。

---

## ⚠️ 已知限制

1. **单平台构建**: 当前只能生成运行后端的平台的可执行文件
2. **详情页未实现**: 虚拟公司详情页尚未创建
3. **打包时间长**: PyInstaller 打包需要 5-10 分钟
4. **元数据存储**: 场景、数据源等元数据暂存储在 description 字段

---

## 📅 路线图

### Phase 1 (已完成) ✅
- [x] 创建三个虚拟公司模板
- [x] 扩展 API 支持分类筛选
- [x] 改造 Agent 广场页面

### Phase 2 (进行中) ⏳
- [ ] 创建虚拟公司详情页
- [ ] 集成打包按钮
- [ ] 端到端测试

### Phase 3 (规划中) 📋
- [ ] 增加 metadata 字段
- [ ] GitHub Actions 多平台构建
- [ ] 性能优化

### Phase 4 (未来) 🔮
- [ ] 虚拟公司间协作
- [ ] 插件系统
- [ ] AI 增强功能

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件

---

## 📞 联系方式

- **GitHub Issues**: https://github.com/BigLionX/NvwaX/issues
- **项目主页**: https://github.com/BigLionX/NvwaX

---

**最后更新**: 2026-04-26  
**版本**: v1.0.0
