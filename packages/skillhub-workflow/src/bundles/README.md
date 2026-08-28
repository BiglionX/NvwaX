# Skill Bundles（Hermes 风格）

本目录包含 Nvwax 的官方 Skill Bundle。每个 Bundle 是一个可独立打包的"Leader 能力包"。

## 目录结构

```
bundles/
├── README.md                          # 本文件
├── marketing-bundle/                  # 营销团队
│   ├── bundle.json
│   ├── README.md
│   └── skills/
│       └── marketing-director-v2.json
├── development-bundle/                # 开发团队
│   ├── bundle.json
│   └── README.md
└── general-bundle/                    # 通用团队
    ├── bundle.json
    └── README.md
```

## Bundle 规范

每个 Bundle 必须包含：
- `bundle.json` - 元数据（name, version, skills, dependencies）
- `README.md` - 使用说明
- `skills/*.json` - Leader Skill 定义（Hvgemes 兼容）

## 与数据库的同步

`scripts/sync-bundles.ts` 会：
1. 扫描本目录下所有 `bundle.json`
2. 把每个 Bundle 及其 skills 注册到 `leader_bundles` / `leader_skills` 表
3. 自动生成 skill 的 `triggers_embedding`

## 安装方法

```typescript
import { leaderBundleService } from '@nvwax/core';

await leaderBundleService.install('marketing-bundle');  // 完整安装
await leaderBundleService.install('marketing-bundle', { skillsOnly: true });  // 仅安装 skills
```

## 远端 Registry

支持从远端 registry 拉取 Bundle：
```typescript
await leaderBundleRegistry.pull('https://bundles.nvwax.cc/marketing-bundle-1.0.0.tar.gz');
```

## MCP 暴露

每个 Bundle 都可以暴露为 MCP Server，让外部 Agent（Claude/Cursor 等）调用：

```bash
npx nvwax-mcp-server --bundle marketing-bundle
```

## 设计参考

- Hermes Agent Skill Bundles：https://hermes-agent.nousresearch.com/docs
- Bundle Manifest 规范：https://hermes-agent.nousresearch.com/docs/zh-Hans/developer-guide/skills/bundles