# Marketing Bundle

营销团队 Leader Skill Bundle - 提供营销策略、内容运营、用户增长相关 Leader。

## 包含 Skills

- `marketing-director-v1` - 营销总监（数据驱动型）
- `marketing-director-v2` - 营销总监 v2（创新型）

## 使用方法

### 在 Nvwax 平台中使用

```typescript
import { leaderBundleService } from '@nvwax/core';

await leaderBundleService.install('marketing-bundle');
const skill = await leaderSkillService.getBySkillId('marketing-director-v1');
```

### 在外部 Agent 框架中使用（通过 MCP）

```bash
# 启动 MCP Server
npx nvwax-mcp-server --bundle marketing-bundle
```

### 直接导入

```typescript
import { leaderSkillRouter } from '@nvwax/core';
import 'marketing-bundle/skills/marketing-director.js';

const result = await leaderSkillRouter.route('小红书种草内容', { topK: 3 });
```

## 版本

- 当前：1.0.0
- 兼容性：leader-agent >= 2.0.0

## 许可证

MIT