# TypeScript 模块导入错误修复指南

## 问题描述

在 `packages/nvwax-web/app/(user-center)/my-aiteam/page.tsx` 中出现以下 TypeScript 错误:

```
找不到模块"@/lib/api/projects"或其相应的类型声明。
找不到模块"@/components/Layout/LoadingState"或其相应的类型声明。
```

## 原因分析

这些文件实际上**存在且导出正确**:
- ✅ `packages/nvwax-web/lib/api/projects.ts` - 存在,导出了 `projectApi` 和 `Project`
- ✅ `packages/nvwax-web/components/Layout/LoadingState.tsx` - 存在,默认导出组件

这是 **TypeScript 语言服务器缓存问题**,不是代码错误。

## 解决方案

### 方法 1: 重启 TypeScript 语言服务器 (推荐)

在 VS Code 中:
1. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
2. 输入并选择: **"TypeScript: Restart TS Server"**
3. 等待几秒,错误应该消失

### 方法 2: 重新加载 VS Code 窗口

1. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
2. 输入并选择: **"Developer: Reload Window"**
3. VS Code 会重新加载,TypeScript 缓存会被清除

### 方法 3: 删除 TypeScript 缓存

```bash
# 在项目根目录执行
cd packages/nvwax-web
rm -rf .next
rm -rf node_modules/.cache
```

然后重启 VS Code。

## 验证修复

修复后,检查以下文件应该没有错误:
- `packages/nvwax-web/app/(user-center)/my-aiteam/page.tsx`
- `packages/nvwax-web/app/(user-center)/agent-repository/page.tsx`

## 预防措施

如果频繁遇到此问题:

1. **确保 tsconfig.json 配置正确**:
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./*"]
       }
     }
   }
   ```

2. **定期重启 TS Server**: 在大型项目中,TypeScript 缓存可能会过时

3. **使用 pnpm 而非 npm**: pnpm 的依赖管理更可靠

## 相关文件

- `packages/nvwax-web/lib/api/projects.ts` - 项目 API 客户端
- `packages/nvwax-web/components/Layout/LoadingState.tsx` - 加载状态组件
- `packages/nvwax-web/app/(user-center)/my-aiteam/page.tsx` - 我的 AiTeam 页面
