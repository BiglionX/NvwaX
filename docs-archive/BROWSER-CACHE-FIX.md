# 浏览器缓存清理指南

## ❗ 问题说明

浏览器显示错误：
```
Export Github doesn't exist in target module
```

这是因为浏览器缓存了旧的编译代码，而新代码已经修复了图标导入问题。

## ✅ 解决方案

### 方法 1：硬刷新浏览器（推荐）

**Windows/Linux:**
- 按 `Ctrl + Shift + R`
- 或 `Ctrl + F5`

**Mac:**
- 按 `Cmd + Shift + R`

### 方法 2：清除浏览器缓存

#### Chrome/Edge
1. 按 `F12` 打开开发者工具
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

#### 或者手动清除
1. 按 `Ctrl + Shift + Delete` (Windows) / `Cmd + Shift + Delete` (Mac)
2. 选择"缓存的图片和文件"
3. 点击"清除数据"

### 方法 3：重启开发服务器

如果上述方法无效，可以重启前端开发服务器：

```bash
# 停止当前服务（在运行前端的终端按 Ctrl+C）

# 清理构建缓存
cd packages/nvwax-web
Remove-Item -Recurse -Force .next

# 重新启动
npm run dev
```

## 🔍 验证修复

刷新后，检查以下内容：

1. **页面正常加载** - 没有控制台错误
2. **图标正确显示** - Layers 图标替代了 Store
3. **功能正常** - 搜索、筛选等功能可用

## 📝 已修复的问题

### 原代码（错误）
```typescript
import { Search, Store, Folder, Star, Github, ArrowRight, Sparkles, TrendingUp, Filter } from 'lucide-react';
```

### 修复后（正确）
```typescript
import { Search, Star, ArrowRight, Sparkles, TrendingUp, Layers } from 'lucide-react';
```

**变更说明：**
- ❌ 删除了不存在的图标：`Store`, `Folder`, `Github`, `Filter`
- ✅ 添加了合适的图标：`Layers`（用于"全部"和"Multi-platform"）

## 💡 为什么会出现这个问题？

Next.js 使用 Turbopack 进行快速编译，但有时：
1. 浏览器缓存了旧的 JavaScript bundle
2. 开发服务器的热更新没有完全生效
3. 模块依赖关系需要重新解析

硬刷新可以强制浏览器重新下载所有资源，解决这个问题。

## 🎯 预防措施

1. **开发时定期硬刷新** - 特别是在修改导入语句后
2. **使用无痕模式测试** - 避免缓存干扰
3. **清除 .next 目录** - 遇到奇怪问题时

---

**创建时间**: 2026-04-25  
**问题状态**: ✅ 代码已修复，只需清除浏览器缓存
