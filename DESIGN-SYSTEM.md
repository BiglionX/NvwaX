# NvwaX 设计系统规范

## 1. 色彩系统

### 主色调
- **蓝色**: `from-blue-600 to-purple-600` (渐变)
- **蓝色深色**: `from-blue-700 to-purple-700` (hover)
- **成功色**: `green-600`
- **警告色**: `orange-500`
- **错误色**: `red-600`

### 灰色系统
- **边框**: `gray-200` (亮色模式) / `gray-700` (暗色模式)
- **背景**: `gray-50` (亮色) / `gray-800` (暗色)
- **文本**: `gray-900` (主文本) / `gray-600` (次要文本)

## 2. 圆角系统

### 组件圆角
- **大圆角**: `rounded-xl` (12px) - 卡片、对话框
- **中圆角**: `rounded-lg` (8px) - 按钮、输入框
- **小圆角**: `rounded` (4px) - 标签、徽章

## 3. 边框系统

### 边框宽度
- **卡片边框**: `border-2` (2px)
- **表单边框**: `border-2` (2px)
- **分割线**: `border` (1px)

### 边框颜色
- **默认**: `border-gray-200 dark:border-gray-700`
- **悬停**: `border-blue-300 dark:border-blue-700`
- **焦点**: `border-blue-500`

## 4. 阴影系统

### 阴影级别
- **默认**: `shadow-md`
- **悬停**: `shadow-lg`
- **对话框**: `shadow-xl` / `shadow-2xl`
- **禁用**: `shadow-none`

## 5. 间距系统

### 标准间距
- **容器内边距**: `px-4 sm:px-6 lg:px-8 py-6`
- **卡片内边距**: `p-6`
- **组件间距**: `gap-6` (网格) / `gap-4` (flex)
- **元素间距**: `mb-4` / `mb-6`

## 6. 按钮规范

### 主要按钮
```html
<button class="px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 
  hover:from-blue-700 hover:to-purple-700 text-white font-medium 
  rounded-xl shadow-md hover:shadow-lg transition-all">
```

### 次要按钮
```html
<button class="px-4 py-2 border-2 border-gray-200 dark:border-gray-700 
  hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all">
```

### 危险按钮
```html
<button class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white 
  rounded-xl transition-all shadow-md hover:shadow-lg">
```

## 7. 表单规范

### 输入框
```html
<input class="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 
  rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 
  outline-none transition-all">
```

### 选择框
```html
<select class="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-2 
  border-gray-200 dark:border-gray-600 rounded-lg focus:ring-4 
  focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
```

## 8. 卡片规范

### 标准卡片
```html
<div class="bg-white dark:bg-gray-800 rounded-xl border-2 
  border-gray-200 dark:border-gray-700 shadow-md">
```

### 可点击卡片
```html
<div class="bg-white dark:bg-gray-800 rounded-xl border-2 
  border-gray-200 dark:border-gray-700 hover:border-blue-300 
  dark:hover:border-blue-700 hover:-translate-y-1 hover:shadow-xl 
  transition-all">
```

## 9. 空状态规范

```html
<div class="text-center py-12 bg-white dark:bg-gray-800 rounded-xl 
  border-2 border-gray-200 dark:border-gray-700 shadow-md">
  <div class="w-20 h-20 bg-linear-to-br from-gray-100 to-gray-50 
    dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center 
    justify-center mx-auto mb-6">
    <!-- Icon -->
  </div>
  <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
    <!-- Title -->
  </h3>
  <p class="text-gray-600 dark:text-gray-400 mb-6">
    <!-- Description -->
  </p>
</div>
```

## 10. 加载状态规范

使用 `LoadingState` 组件：
```tsx
<LoadingState /> {/* 默认全屏 */}
<LoadingState fullScreen={false} /> {/* 非全屏 */}
<LoadingState text="跳转中..." /> {/* 自定义文本 */}
```

## 11. 响应式设计

### 断点
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px

### 网格系统
- **移动端**: `grid-cols-1`
- **平板**: `md:grid-cols-2`
- **桌面**: `lg:grid-cols-3`

## 12. 暗色模式支持

所有组件必须支持暗色模式：
- 背景: `bg-white dark:bg-gray-800`
- 文本: `text-gray-900 dark:text-white`
- 边框: `border-gray-200 dark:border-gray-700`
- 次要文本: `text-gray-600 dark:text-gray-400`

## 13. 动画过渡

### 过渡时长
- **快速**: `transition-all duration-200`
- **标准**: `transition-all`
- **缓慢**: `transition-all duration-300`

### 变换效果
- **悬停提升**: `hover:-translate-y-1`
- **悬停缩放**: `hover:scale-105`
- **点击缩放**: `active:scale-95`

## 14. 图标规范

- **小图标**: `size={16}`
- **中图标**: `size={20}`
- **大图标**: `size={24}`
- **超大图标**: `size={40}`

## 15. 字体规范

### 字号
- **标题**: `text-3xl` / `text-2xl` / `text-xl`
- **正文**: `text-base` (16px)
- **小号**: `text-sm` (14px)
- **超小号**: `text-xs` (12px)

### 字重
- **常规**: `font-normal`
- **中等**: `font-medium`
- **粗体**: `font-semibold`
- **加粗**: `font-bold`

---

**最后更新**: 2026-05-17  
**版本**: 1.0.0  
**维护者**: 前端设计团队
