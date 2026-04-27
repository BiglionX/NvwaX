# Agent 增强功能 - 测试指南

**日期**: 2026-04-26  
**状态**: ✅ 已准备就绪

---

## 📋 前置要求

### 1. 安装依赖

```bash
# Dashboard 依赖 (已完成)
cd packages/nvwax-web
npm install recharts

# Testing Agent 依赖 (需要在项目中安装)
cd your-project
npm install --save-dev jest @types/jest cypress
```

### 2. 配置环境变量

创建 `.env.local` 文件:

```bash
# Jira 配置 (可选)
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN=your-api-token

# Trello 配置 (可选)
TRELLO_KEY=your-key
TRELLO_TOKEN=your-token
```

---

## 🧪 测试步骤

### 测试 1: Dashboard 可视化面板

#### 启动开发服务器

```bash
cd packages/nvwax-web
npm run dev
```

#### 访问 Dashboard

打开浏览器访问:
```
http://localhost:3000/dashboard
```

#### 验证功能

✅ **Overview 标签页**
- [ ] 显示6个关键指标卡片
- [ ] 任务完成趋势图正常显示
- [ ] 团队角色分布饼图正常显示

✅ **Progress 标签页**
- [ ] 任务状态柱状图显示
- [ ] 本周活动统计正确

✅ **Testing 标签页**
- [ ] 测试覆盖率横向柱状图
- [ ] 4个覆盖率指标卡片
- [ ] 健康检查指示器

✅ **Performance 标签页**
- [ ] 5个性能指标卡片
- [ ] 阈值对比显示

✅ **Team 标签页**
- [ ] 团队概览统计
- [ ] 7个角色列表

---

### 测试 2: Testing Agent Enhanced

#### 创建测试项目

```bash
mkdir test-project
cd test-project
npm init -y
npm install --save-dev jest @types/jest
```

#### 创建示例代码

```javascript
// math.js
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

module.exports = { add, subtract };
```

```javascript
// math.test.js
const { add, subtract } = require('./math');

test('adds 1 + 2 to equal 3', () => {
  expect(add(1, 2)).toBe(3);
});

test('subtracts 5 - 2 to equal 3', () => {
  expect(subtract(5, 2)).toBe(3);
});
```

#### 使用 Testing Agent

```javascript
const TestingAgentEnhanced = require('../packages/skillhub-workflow/src/agents/testing-agent-enhanced');

async function test() {
  const tester = new TestingAgentEnhanced();
  
  // 执行真实测试
  const result = await tester.executeRealTests('./test-project', {
    testRunner: 'jest',
    coverage: true,
    reporters: ['default', 'html']
  });
  
  console.log('Test Results:', result);
  console.log('HTML Report:', result.reports.html);
  
  // 生成修复建议 (如果有失败的测试)
  if (result.failures.length > 0) {
    const suggestions = await tester.generateAutoFixSuggestions(result);
    console.log('Fix Suggestions:', suggestions);
  }
}

test();
```

#### 验证输出

✅ 应该看到:
```
🧪 Testing Agent executing real tests...
✅ Project configuration validated
Running: npx jest --coverage
✅ Real tests executed. Passed: 2/2
📊 Reports generated:
   HTML: test-project/test-reports/test-report-xxx.html
   JSON: test-project/test-reports/test-report-xxx.json
```

✅ 打开 HTML 报告查看可视化结果

---

### 测试 3: Project Management Agent

#### 测试 Jira 集成 (需要真实 Jira 账户)

```javascript
const ProjectManagementAgent = require('../packages/skillhub-workflow/src/agents/project-management-agent');

async function testJira() {
  const pm = new ProjectManagementAgent({
    platform: 'jira',
    jiraBaseUrl: process.env.JIRA_BASE_URL,
    jiraEmail: process.env.JIRA_EMAIL,
    jiraApiToken: process.env.JIRA_API_TOKEN
  });
  
  // 创建项目
  const project = await pm.createJiraProject({
    name: 'Test Project',
    key: 'TP',
    description: 'Testing project creation',
    leadAccountId: 'your-account-id'
  });
  
  console.log('Project created:', project);
  
  // 从 PRD 创建任务
  const prd = {
    features: [
      {
        id: 'F001',
        name: 'User Authentication',
        description: 'Implement login and registration',
        priority: 'must-have',
        userStories: [
          'As a user, I want to login with email and password',
          'As a user, I want to register a new account'
        ],
        acceptanceCriteria: ['Valid credentials required', 'Password strength validation']
      }
    ]
  };
  
  const tasks = await pm.createTasksFromPRD(prd, 'TP');
  console.log(`Created ${tasks.length} tasks`);
  
  // 生成进度报告
  const report = await pm.generateProgressReport('TP');
  console.log('Progress Report:', report);
}

testJira();
```

#### 测试 Trello 集成 (需要真实 Trello 账户)

```javascript
async function testTrello() {
  const pm = new ProjectManagementAgent({
    platform: 'trello',
    trelloKey: process.env.TRELLO_KEY,
    trelloToken: process.env.TRELLO_TOKEN
  });
  
  // 创建 Board
  const board = await pm.createTrelloBoard({
    name: 'Test Board',
    description: 'Testing board creation'
  });
  
  console.log('Board created:', board);
  
  // 从 PRD 创建卡片
  const cards = await pm.createCardsFromPRD(prd, board.id);
  console.log(`Created ${cards.length} cards`);
}

testTrello();
```

---

## 📊 预期结果

### Dashboard

访问 `http://localhost:3000/dashboard` 应该看到:

1. **美观的界面**
   - 响应式布局
   - 深色/浅色模式支持
   - 平滑的动画效果

2. **交互式图表**
   - 鼠标悬停显示详细数据
   - 图例可点击切换
   - 实时数据更新 (模拟)

3. **5个完整标签页**
   - 每个标签页都有独特的可视化
   - 数据一致性
   - 清晰的标签和说明

### Testing Agent

执行测试后应该生成:

1. **控制台输出**
   ```
   Tests: 2/2 passed
   Coverage: 87.5%
   ```

2. **HTML 报告文件**
   - 精美的可视化页面
   - 测试统计卡片
   - 失败测试详情 (如果有)

3. **JSON 报告文件**
   - 结构化的测试数据
   - 便于程序化处理

### Project Management Agent

成功执行后应该:

1. **Jira/Trello 中创建项目**
   - 项目名称正确
   - 描述完整

2. **自动创建任务/卡片**
   - 从 PRD 分解的任务
   - 正确的优先级标签
   - 合理的截止日期

3. **进度报告**
   - 完成率统计
   - 任务分布
   - 时间线

---

## 🐛 常见问题

### Q1: Dashboard 显示空白

**原因**: 数据加载失败  
**解决**: 检查浏览器控制台错误,确保 React 组件正确渲染

### Q2: Testing Agent 报错 "Missing dependencies"

**原因**: 项目未安装 Jest  
**解决**: 
```bash
npm install --save-dev jest @types/jest
```

### Q3: Jira API 认证失败

**原因**: API Token 错误或过期  
**解决**: 
1. 访问 https://id.atlassian.com/manage-profile/security/api-tokens
2. 生成新的 API Token
3. 更新 `.env.local`

### Q4: Trello 权限错误

**原因**: Token 权限不足  
**解决**: 
1. 访问 https://trello.com/app-key
2. 生成带有读写权限的 Token
3. 更新 `.env.local`

---

## ✅ 测试清单

完成以下检查确认所有功能正常:

- [ ] Dashboard 可以正常访问
- [ ] 5个标签页都能正常显示
- [ ] 图表交互正常 (悬停、点击)
- [ ] Testing Agent 可以执行真实测试
- [ ] 生成了 HTML 和 JSON 报告
- [ ] Project Management Agent 可以连接 Jira/Trello
- [ ] 成功创建了项目和任务
- [ ] 进度报告数据准确

---

## 🎉 完成!

如果所有测试都通过,恭喜! Agent 增强功能已经完全就绪。

您可以:
1. 开始在实际项目中使用这些功能
2. 根据需求定制 Dashboard
3. 扩展更多集成 (GitHub Projects, Asana 等)

---

© 2026 NvwaX Team
