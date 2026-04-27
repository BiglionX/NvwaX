# 虚拟公司功能 - 手动测试指南

## 🚀 快速开始

### 1. 启动服务

确保以下服务正在运行：

```bash
# 后端服务（终端 1）
cd packages/nvwax-server
npm run dev

# 前端服务（终端 2）
cd packages/nvwax-web
npm run dev
```

### 2. 访问 Agent 广场

打开浏览器访问：**http://localhost:3000/marketplace**

---

## ✅ 测试步骤

### 测试 1: 浏览所有团队技能

1. 访问 http://localhost:3000/marketplace
2. 点击顶部筛选器的 **"全部"** 按钮
3. **预期结果**: 显示 6 个卡片（3 个虚拟公司 + 3 个团队技能）

### 测试 2: 分类筛选 - 虚拟公司

1. 点击筛选器中的 **"虚拟公司"** 按钮
2. **预期结果**: 只显示 3 个虚拟公司卡片
   - 智能营销策划公司
   - 虚拟开发团队
   - 定制设计工作室

### 测试 3: 分类筛选 - 开发团队

1. 点击筛选器中的 **"开发团队"** 按钮
2. **预期结果**: 显示 1 个卡片
   - 全栈开发团队

### 测试 4: 分类筛选 - 数据分析

1. 点击筛选器中的 **"数据分析"** 按钮
2. **预期结果**: 显示 1 个卡片
   - 数据分析团队

### 测试 5: 分类筛选 - 内容创作

1. 点击筛选器中的 **"内容创作"** 按钮
2. **预期结果**: 显示 1 个卡片
   - 内容创作团队

### 测试 6: 查看虚拟公司详情

1. 在"虚拟公司"分类下，点击任意卡片
2. **预期结果**: 跳转到详情页，显示：
   - 团队名称和描述
   - 团队领导者信息
   - 团队成员列表（角色、专长、职责）
   - 工作流程步骤
   - 协作规则
   - 打包下载按钮（当前为占位符）

**测试 URL 示例**:
- http://localhost:3000/marketplace/team-skills/virtual-company-marketing-001
- http://localhost:3000/marketplace/team-skills/virtual-company-dev-001
- http://localhost:3000/marketplace/team-skills/team-skill-dev-001

### 测试 7: 验证数据完整性

在详情页中检查：

- [ ] 团队名称正确显示
- [ ] 描述文本完整
- [ ] 领导者配置包含姓名和职责
- [ ] 成员列表显示所有角色（3-4 个）
- [ ] 每个角色显示：角色名、专长、Agent 类型、职责列表
- [ ] 工作流步骤按顺序显示（6-7 步）
- [ ] 每步工作流显示：步骤号、动作、执行者、输出
- [ ] 协作规则显示：沟通协议、冲突解决、质量标准
- [ ] 创建日期正确显示

### 测试 8: 返回导航

1. 在详情页点击浏览器后退按钮
2. **预期结果**: 返回到 Agent 广场列表页
3. 或者点击页面左上角的 "← 返回列表" 链接

---

## 🔍 API 测试（可选）

### 使用 curl 测试

```bash
# 获取所有团队技能
curl http://localhost:3001/api/team-skills/marketplace?page=1&limit=20

# 按分类筛选
curl http://localhost:3001/api/team-skills/category/virtual-company?page=1&limit=10
curl http://localhost:3001/api/team-skills/category/development?page=1&limit=10
curl http://localhost:3001/api/team-skills/category/analysis?page=1&limit=10
curl http://localhost:3001/api/team-skills/category/content?page=1&limit=10

# 获取单个团队技能详情
curl http://localhost:3001/api/team-skills/virtual-company-marketing-001
```

### 使用浏览器开发者工具

1. 打开 http://localhost:3000/marketplace
2. 按 F12 打开开发者工具
3. 切换到 **Network** 标签
4. 点击不同的分类筛选器
5. 观察 API 请求：
   - `/api/team-skills/marketplace` （全部）
   - `/api/team-skills/category/virtual-company` （虚拟公司）
   - `/api/team-skills/category/development` （开发团队）
   - 等等...

6. 检查响应数据是否包含正确的字段

---

## 📊 预期数据清单

### 数据库记录总数

| 分类 | 数量 | ID 前缀 |
|------|------|---------|
| virtual-company | 3 | virtual-company-* |
| development | 1 | team-skill-dev-001 |
| analysis | 1 | team-skill-analysis-001 |
| content | 1 | team-skill-content-001 |
| **总计** | **6** | - |

### 虚拟公司实例

| 名称 | ID | 角色数 | 工作流步数 |
|------|----|--------|-----------|
| 智能营销策划公司 | virtual-company-marketing-001 | 3 | 6 |
| 虚拟开发团队 | virtual-company-dev-001 | 4 | 7 |
| 定制设计工作室 | virtual-company-design-001 | 3 | 7 |

### 新分类示例

| 分类 | 名称 | ID | 角色数 | 工作流步数 |
|------|------|----|--------|-----------|
| development | 全栈开发团队 | team-skill-dev-001 | 3 | 7 |
| analysis | 数据分析团队 | team-skill-analysis-001 | 3 | 7 |
| content | 内容创作团队 | team-skill-content-001 | 3 | 7 |

---

## ⚠️ 已知限制

1. **打包功能**: 详情页的"打包下载"按钮目前仅显示提示框，真实打包功能待实现
2. **团队执行**: Leader Agent 编排功能需要额外的 workflow 服务支持
3. **用户自定义**: 当前只能查看公开模板，无法创建或编辑自己的团队技能

---

## 🐛 问题排查

### 问题 1: 分类筛选没有反应

**可能原因**: 后端服务未重启，路由更改未生效

**解决方案**:
```bash
# 重启后端服务
cd packages/nvwax-server
npm run dev
```

### 问题 2: 详情页显示 404

**可能原因**: 前端服务未运行或路由配置错误

**解决方案**:
1. 确认前端服务正在运行（端口 3000）
2. 检查 URL 是否正确：`/marketplace/team-skills/[id]`
3. 清除浏览器缓存后重试

### 问题 3: API 返回空数据

**可能原因**: 数据库迁移未执行

**解决方案**:
```bash
cd packages/nvwax-server
node run-migration-005.mjs
```

### 问题 4: 数据库连接失败

**可能原因**: .env 文件中的 DATABASE_URL 配置错误

**解决方案**:
1. 检查 `packages/nvwax-server/.env` 文件
2. 确认 `DATABASE_URL` 指向正确的 Neon 数据库
3. 确保网络连接正常

---

## ✅ 测试检查清单

完成以下所有检查项即表示功能正常：

- [ ] 后端服务正常运行（端口 3001）
- [ ] 前端服务正常运行（端口 3000）
- [ ] Agent 广场页面可访问
- [ ] 显示 6 个团队技能卡片
- [ ] 分类筛选器正常工作（5 个分类）
- [ ] 点击卡片能跳转到详情页
- [ ] 详情页显示完整的团队信息
- [ ] 详情页可以返回列表
- [ ] API 端点返回正确的 JSON 数据
- [ ] 数据库中有 6 条记录

---

## 📞 技术支持

如遇到问题，请检查：

1. **后端日志**: `packages/nvwax-server` 终端输出
2. **前端控制台**: 浏览器开发者工具 Console 标签
3. **网络请求**: 浏览器开发者工具 Network 标签
4. **数据库状态**: 直接查询 PostgreSQL 数据库

---

**最后更新**: 2026-04-26  
**文档版本**: 1.0
