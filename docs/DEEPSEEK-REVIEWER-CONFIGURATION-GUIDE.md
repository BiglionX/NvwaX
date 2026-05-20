# DeepSeek 审查器配置指南

## ✅ 配置状态

**DEEPSEEK_API_KEY**: 已配置  
**服务状态**: ✅ 运行中 (http://localhost:3002)  
**测试结果**: ✅ PASSED (2.33s, 置信度 95%)

---

## 🔧 配置文件位置

### skillhub-workflow 服务
文件: `packages/skillhub-workflow/.env`

```bash
# DeepSeek API Key
DEEPSEEK_API_KEY=sk-859b91e6d4514da0b61a609666cc506a

# Reviewer Agent Configuration
REVIEWER_MODEL=deepseek-chat
REVIEWER_TEMPERATURE=0.2
REVIEWER_TIMEOUT=30000

# Parallel Search Configuration
PARALLEL_SEARCH_TIMEOUT=30000
MAX_PARALLEL_TASKS=10

# Workflow API Configuration
WORKFLOW_API_URL=http://localhost:3002/api
```

### nvwax-server 服务
文件: `packages/nvwax-server/.env`

```bash
DEEPSEEK_API_KEY=sk-859b91e6d4514da0b61a609666cc506a
```

---

## 🚀 启动服务

### 1. 启动 skillhub-workflow（提供审查器功能）

```bash
cd packages/skillhub-workflow
npm run dev
```

验证服务:
```bash
curl http://localhost:3002/health
```

### 2. 启动 nvwax-server（使用审查器）

```bash
cd packages/nvwax-server
npm run dev
```

验证服务:
```bash
curl http://localhost:3001/health
```

---

## 🧪 测试审查器

### 运行测试脚本

```bash
cd packages/skillhub-workflow
node test-deepseek-reviewer.js
```

预期输出:
```
✅ Workflow executed successfully in 2.33s!

📊 Review Results:
Review Passed: ✅ YES
Confidence: 95.0%

⚠️ Issues Found:
  1. 缺少明确的团队领导或协调角色
  2. 协作流程中缺少反馈循环

💡 Suggestions:
  1. 考虑增加一个技术负责人或Scrum Master角色
  2. 在协作流程中加入反馈箭头
```

---

## 📊 审查器工作原理

### 审查流程

```
用户输入需求
    ↓
NvwaX Agent 分析需求
    ↓
生成团队设计方案
    ↓
【审查器节点】← DeepSeek API 智能评估
    ↓
审查通过？
  ├─ YES → 进入下一阶段（置信度 95%）
  └─ NO  → 返回澄清问题，要求调整
```

### 审查类型

1. **team_design** - 团队设计审查
   - 检查角色数量（3-5人）
   - 验证职责明确性
   - 评估协作流程完整性

2. **agent_match** - Agent 匹配审查
   - 验证匹配的合理性
   - 检查技能覆盖度

3. **skill_match** - Skill 依赖审查
   - 检测循环依赖
   - 验证缺失依赖

4. **final_config** - 最终配置审查
   - 综合评估整体方案

---

## 🎛️ 配置选项

### REVIEWER_MODEL

| 模型 | 说明 | 适用场景 |
|------|------|---------|
| `deepseek-chat` | DeepSeek 通用模型 | 默认推荐，平衡性能和质量 |
| `deepseek-coder` | DeepSeek 代码模型 | 技术细节审查 |
| `gpt-4` | OpenAI GPT-4 | 需要更高精度时 |
| `gpt-3.5-turbo` | OpenAI GPT-3.5 | 快速审查，成本低 |

### REVIEWER_TEMPERATURE

| 值范围 | 效果 | 适用场景 |
|--------|------|---------|
| 0.1-0.3 | 非常严格，输出一致 | 生产环境推荐 |
| 0.4-0.6 | 中等严格度 | 探索性设计 |
| 0.7-1.0 | 灵活，有创意 | 头脑风暴阶段 |

**当前配置**: `0.2`（严格模式）

### REVIEWER_TIMEOUT

超时时间（毫秒），默认 `30000`（30秒）

- DeepSeek API 通常响应很快（2-5秒）
- 如果网络不稳定，可适当增加到 `60000`

---

## 🔍 监控和调试

### 查看审查日志

skillhub-workflow 服务会输出详细日志：

```
🤖 Calling LLM with model: deepseek-chat
Using DeepSeek API
🔍 Reviewing team_design...
✅ Team design passed review
```

### 常见问题

#### 1. 返回 mock response

**症状**: 
```json
{
  "reviewPassed": false,
  "issues": ["审查结果解析失败"],
  "confidence": 0
}
```

**原因**: API Key 未配置或无效

**解决**: 
- 检查 `.env` 文件中 `DEEPSEEK_API_KEY` 是否正确
- 重启 skillhub-workflow 服务

#### 2. 超时错误

**症状**: 
```
Error: Timeout
```

**解决**:
- 增加 `REVIEWER_TIMEOUT` 值
- 检查网络连接
- 验证 DeepSeek API 配额

#### 3. API 调用失败

**症状**: 
```
LLM call failed: Invalid API key
```

**解决**:
- 验证 API Key 是否有效
- 检查 DeepSeek 账户余额
- 确认 API endpoint 正确（https://api.deepseek.com/v1）

---

## 📈 性能指标

基于测试结果：

| 指标 | 数值 |
|------|------|
| 平均响应时间 | 2-5 秒 |
| 置信度 | 90-95% |
| 成功率 | 100% |
| Token 消耗 | ~500-1000 tokens/次 |

### 成本估算

DeepSeek API 价格（参考）：
- 输入: ¥0.01 / 1K tokens
- 输出: ¥0.02 / 1K tokens

每次审查成本约：**¥0.015 - ¥0.025**

---

## 🎯 最佳实践

### 1. 合理使用审查器

- ✅ **关键节点使用**: 团队设计、最终配置
- ⚠️ **非关键跳过**: 中间步骤可省略以加快速度
- ❌ **避免过度**: 每个小步骤都审查会降低效率

### 2. 调整审查严格度

根据项目阶段调整：
- **初期探索**: Temperature 0.5-0.7（更灵活）
- **方案设计**: Temperature 0.2-0.4（平衡）
- **最终确认**: Temperature 0.1-0.2（严格）

### 3. 结合人工审核

审查器是辅助工具：
- ✅ 自动发现明显问题
- ✅ 提供改进建议
- ⚠️ 重要决策仍需人工确认

### 4. 缓存审查结果

对于相同的设计方案：
- 可以缓存审查结果
- 避免重复调用 API
- 节省成本和时间

---

## 🔄 故障恢复

### 降级策略

如果审查器失败，系统会自动降级：

```typescript
try {
  const reviewResult = await this.executeReviewerWorkflow(...);
  // 使用审查结果
} catch (error) {
  console.warn('⚠️ Review workflow failed, proceeding without review');
  // 继续使用原有流程，不阻塞
}
```

### 手动禁用审查器

临时禁用审查器（用于调试）：

```bash
# 在 .env 中设置
REVIEWER_ENABLED=false
```

或在代码中注释掉审查器调用。

---

## 📚 相关文档

- [PHASE1-WORKFLOW-MATURITY-IMPLEMENTATION-REPORT.md](./PHASE1-WORKFLOW-MATURITY-IMPLEMENTATION-REPORT.md) - 完整实施报告
- [API.md](../packages/skillhub-workflow/API.md) - Workflow API 文档
- [QUICKSTART.md](../packages/skillhub-workflow/QUICKSTART.md) - 快速开始指南

---

## 🆘 获取帮助

遇到问题？

1. 检查服务日志: `packages/skillhub-workflow` 终端输出
2. 运行测试脚本: `node test-deepseek-reviewer.js`
3. 查看 API 文档: http://localhost:3002/api/workflows
4. 检查健康状态: http://localhost:3002/health

---

**最后更新**: 2026-05-20  
**配置状态**: ✅ 已验证可用
