# NvwaX UI/UX 优化快速参考指南

## 🎨 核心设计原则

### 1. 品牌色彩系统
```
主色调: 紫罗兰渐变 (from-violet-500 to-purple-600)
辅助色: 蓝色渐变 (from-blue-500 to-indigo-600)
成功色: 绿色渐变 (from-green-500 to-emerald-600)
警告色: 橙色渐变 (from-orange-500 to-amber-600)
危险色: 红色渐变 (from-red-500 to-rose-600)
```

### 2. 圆角规范
```
按钮/输入框: rounded-lg (8px)
卡片/面板:   rounded-xl (12px)
模态框/弹窗: rounded-2xl (16px)
头像/图标:   rounded-full
```

### 3. 阴影系统
```
默认卡片: shadow-md
悬停状态: shadow-lg
下拉菜单: shadow-xl
模态框:   shadow-2xl
彩色阴影: shadow-violet-200 dark:shadow-violet-900/30
```

---

## 📦 常用组件模板

### 标准按钮
```tsx
<button className="px-6 py-3 bg-linear-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30 hover:shadow-xl">
  按钮文本
</button>
```

### 次要按钮
```tsx
<button className="px-4 py-2 border-2 border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-gray-700 dark:text-gray-300 rounded-xl transition-all">
  次要操作
</button>
```

### 标准卡片
```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-200/50 dark:hover:shadow-violet-900/30 transition-all duration-300 p-6">
  {/* 卡片内容 */}
</div>
```

### 输入框
```tsx
<input 
  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
  placeholder="请输入..."
/>
```

### 徽章/标签
```tsx
<span className="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium rounded-lg">
  标签文本
</span>
```

---

## 🏗️ 布局模板

### 页面容器
```tsx
<Container size="lg" className="py-8">
  {/* 页面内容 */}
</Container>

// Container 组件实现
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {children}
</div>
```

### 两栏布局（用户中心）
```tsx
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
  <aside className="lg:col-span-3">
    {/* 侧边导航 */}
  </aside>
  <main className="lg:col-span-9">
    {/* 主要内容 */}
  </main>
</div>
```

### 三栏网格（卡片列表）
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* 卡片项 */}
</div>
```

### 四栏网格（统计数据）
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* 统计卡片 */}
</div>
```

---

## 🎭 动画效果

### 页面过渡
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {children}
</motion.div>
```

### 卡片悬停
```tsx
<div className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
  {/* 内容 */}
</div>
```

### 按钮点击
```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  按钮文本
</motion.button>
```

### 渐入动画
```tsx
className="animate-in fade-in slide-in-from-bottom-4 duration-500"
```

---

## 🌈 渐变背景

### Hero 区域
```tsx
<div className="bg-linear-to-br from-violet-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-violet-900/20 dark:to-purple-900/20">
  {/* 内容 */}
</div>
```

### 卡片高亮
```tsx
<div className="bg-linear-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
  {/* 内容 */}
</div>
```

### 按钮渐变
```tsx
className="bg-linear-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
```

---

## 📱 响应式断点

```tsx
// 移动端优先
className="
  grid-cols-1           // 默认（移动）
  sm:grid-cols-2        // ≥640px
  md:grid-cols-3        // ≥768px
  lg:grid-cols-4        // ≥1024px
  xl:grid-cols-5        // ≥1280px
"

// 显示/隐藏
className="hidden lg:block"  // 桌面端显示
className="lg:hidden"        // 移动端显示

// 间距调整
className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12"
```

---

## 🎯 常见场景速查

### 空状态
```tsx
<div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
  <div className="w-20 h-20 bg-linear-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
    <Icon size={40} className="text-gray-400" />
  </div>
  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
    暂无数据
  </h3>
  <p className="text-gray-600 dark:text-gray-400 mb-6">
    这里还没有任何内容
  </p>
  <button className="px-6 py-3 bg-linear-to-r from-violet-500 to-purple-600 text-white rounded-xl">
    创建第一个
  </button>
</div>
```

### 加载状态
```tsx
<div className="flex items-center justify-center py-12">
  <div className="relative">
    <div className="w-12 h-12 border-4 border-violet-200 dark:border-violet-900 rounded-full"></div>
    <div className="absolute top-0 left-0 w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
  <span className="ml-4 text-gray-600 dark:text-gray-400">加载中...</span>
</div>
```

### 成功提示
```tsx
<div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
  <span className="text-green-700 dark:text-green-300 font-medium">
    操作成功！
  </span>
</div>
```

### 错误提示
```tsx
<div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
  <span className="text-red-700 dark:text-red-300 font-medium">
    操作失败，请重试
  </span>
</div>
```

### 信息提示
```tsx
<div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
  <div>
    <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">
      提示信息
    </p>
    <p className="text-sm text-blue-600 dark:text-blue-400">
      详细的说明文字
    </p>
  </div>
</div>
```

---

## 🔍 检查清单

### 发布前检查
- [ ] 所有按钮有明确的视觉反馈（hover/active/disabled）
- [ ] 所有表单字段有清晰的标签和错误提示
- [ ] 所有图片有 alt 属性
- [ ] 颜色对比度符合 WCAG AA 标准
- [ ] 移动端触摸目标 ≥ 44px
- [ ] 键盘导航流畅
- [ ] 暗色模式正常显示
- [ ] 加载状态清晰
- [ ] 空状态友好
- [ ] 错误处理完善

### 性能检查
- [ ] 图片使用 Next.js Image 组件
- [ ] 大型组件使用动态导入
- [ ] 列表使用虚拟滚动（如需要）
- [ ] 避免不必要的重渲染
- [ ] Lighthouse 评分 > 90

---

## 🚀 快速开始新页面

```tsx
'use client';

import Container from '@/components/Layout/Container';

export default function NewPage() {
  return (
    <Container size="lg" className="py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          页面标题
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          页面描述
        </p>
      </div>
      
      {/* 页面内容 */}
      <div className="space-y-6">
        {/* 内容区块 */}
      </div>
    </Container>
  );
}
```

---

## 📚 资源链接

- **完整优化方案**: `/docs/UI-UX-OPTIMIZATION-PLAN.md`
- **设计系统规范**: `/DESIGN-SYSTEM.md`
- **Tailwind CSS 文档**: https://tailwindcss.com/docs
- **Framer Motion 文档**: https://www.framer.com/motion/
- **无障碍指南**: https://www.w3.org/WAI/WCAG21/quickref/

---

**最后更新**: 2026-05-19  
**版本**: 1.0.0
