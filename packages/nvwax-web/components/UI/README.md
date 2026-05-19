# NvwaX UI 组件库使用示例

## 📦 已完成的组件

### 1. Button 按钮组件

```tsx
import { Button } from '@/components/UI';

// 基础用法
<Button>点击我</Button>

// 不同变体
<Button variant="primary">主要按钮</Button>
<Button variant="secondary">次要按钮</Button>
<Button variant="outline">边框按钮</Button>
<Button variant="ghost">幽灵按钮</Button>
<Button variant="danger">危险按钮</Button>

// 不同尺寸
<Button size="sm">小按钮</Button>
<Button size="md">中按钮</Button>
<Button size="lg">大按钮</Button>

// 带图标
import { Search, ArrowRight } from 'lucide-react';
<Button icon={<Search />}>搜索</Button>
<Button rightIcon={<ArrowRight />}>下一步</Button>

// 加载状态
<Button loading={isLoading}>保存中...</Button>

// 全宽按钮
<Button fullWidth>提交</Button>

// 禁用状态
<Button disabled>禁用按钮</Button>
```

---

### 2. Card 卡片组件

```tsx
import { Card } from '@/components/UI';

// 基础卡片
<Card padding="md">
  <h3>卡片标题</h3>
  <p>卡片内容</p>
</Card>

// 可点击卡片
<Card variant="clickable" onClick={() => console.log('clicked')}>
  <p>点击我</p>
</Card>

// 高亮卡片
<Card variant="highlighted">
  <p>重要信息</p>
</Card>

// 无阴影
<Card shadow={false}>
  <p>无阴影卡片</p>
</Card>

// 不同内边距
<Card padding="none">无内边距</Card>
<Card padding="sm">小内边距</Card>
<Card padding="md">中等内边距（默认）</Card>
<Card padding="lg">大内边距</Card>
```

---

### 3. Container 容器组件

```tsx
import { Container } from '@/components/UI';

// 基础用法
<Container>
  <h1>页面内容</h1>
</Container>

// 不同尺寸
<Container size="sm">小容器 (max-w-5xl)</Container>
<Container size="md">中容器 (max-w-6xl)</Container>
<Container size="lg">大容器 (max-w-7xl，默认)</Container>
<Container size="xl">超大容器 (max-w-screen-xl)</Container>
<Container size="full">全宽容器</Container>

// 自定义类名
<Container className="py-8">
  <h1>带上下内边距</h1>
</Container>
```

---

### 4. Loading 加载组件

```tsx
import { Loading } from '@/components/UI';

// 局部加载
<Loading text="加载中..." />

// 全屏加载
<Loading fullScreen text="正在加载数据..." />

// 自定义文本
<Loading text="正在保存..." />

// 无文本
<Loading text="" />
```

---

### 5. EmptyState 空状态组件

```tsx
import { EmptyState } from '@/components/UI';

// 基础用法
<EmptyState
  title="暂无数据"
  description="这里还没有任何内容"
/>

// 带操作按钮
<EmptyState
  title="暂无项目"
  description="您还没有创建任何项目"
  actionText="创建第一个项目"
  onAction={() => console.log('create')}
/>

// 自定义图标
import { Folder } from 'lucide-react';
<EmptyState
  title="文件夹为空"
  icon={<Folder size={40} />}
/>
```

---

### 6. Input 输入框组件

``tsx
import { Input } from '@/components/UI';

// 基础用法
<Input placeholder="请输入内容" />

// 不同尺寸
<Input size="sm" placeholder="小输入框" />
<Input size="md" placeholder="中输入框" />
<Input size="lg" placeholder="大输入框" />

// 带图标
import { Search } from 'lucide-react';
<Input icon={<Search />} placeholder="搜索" />

// 禁用状态
<Input disabled placeholder="禁用输入框" />

// 多行输入框
<Textarea placeholder="请输入多行内容" />

```

---

### 7. Checkbox 复选框组件

``tsx
import { Checkbox } from '@/components/UI';

// 基础用法
<Checkbox label="选项1" />

// 不同尺寸
<Checkbox size="sm" label="小复选框" />
<Checkbox size="md" label="中复选框" />
<Checkbox size="lg" label="大复选框" />

// 禁用状态
<Checkbox disabled label="禁用复选框" />

```

---

### 8. Radio 单选框组件

``tsx
import { Radio } from '@/components/UI';

// 基础用法
<Radio label="选项1" />

// 不同尺寸
<Radio size="sm" label="小单选框" />
<Radio size="md" label="中单选框" />
<Radio size="lg" label="大单选框" />

// 禁用状态
<Radio disabled label="禁用单选框" />

```

---

### 9. Avatar 头像组件

```tsx
import { Avatar } from '@/components/UI';

// 基础用法
<Avatar src="/avatar.jpg" alt="用户名" />

// 不同尺寸
<Avatar size="sm" /> // 32px
<Avatar size="md" /> // 40px (默认)
<Avatar size="lg" /> // 48px
<Avatar size="xl" /> // 64px

// 带文字（显示首字）
<Avatar alt="张三" /> // 显示 "张"

// 不同形状
<Avatar shape="circle" /> // 圆形（默认）
<Avatar shape="square" /> // 方形

// 可点击
<Avatar onClick={() => console.log('clicked')} />
```

---

### 10. Modal 模态框组件 ⭐新增

```tsx
import { Modal, Button } from '@/components/UI';
import { useState } from 'react';

function MyComponent() {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setOpen(true)}>打开模态框</Button>
      
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="确认操作"
        subtitle="此操作不可撤销"
        size="md" // sm | md | lg | xl | full
      >
        <p>确定要删除这个项目吗？</p>
      </Modal>
    </>
  );
}

// 带底部操作区
<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="编辑信息"
  footer={
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
      <Button onClick={handleSave}>保存</Button>
    </div>
  }
>
  <form>
    {/* 表单内容 */}
  </form>
</Modal>

// ESC 键关闭、点击遮罩关闭（默认启用）
```

---

### 11. Toast 消息提示组件 ⭐新增

```tsx
import { Toast, Button } from '@/components/UI';
import { useState } from 'react';

function MyComponent() {
  const [toast, setToast] = useState({
    visible: false,
    type: 'success' as const,
    message: ''
  });
  
  const showToast = (type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({
      visible: true,
      type,
      message: `${type} 消息提示`
    });
  };
  
  return (
    <>
      <Button onClick={() => showToast('success')}>成功</Button>
      <Button onClick={() => showToast('error')}>错误</Button>
      <Button onClick={() => showToast('warning')}>警告</Button>
      <Button onClick={() => showToast('info')}>信息</Button>
      
      <Toast
        type={toast.type}
        title={toast.type === 'success' ? '操作成功' : undefined}
        message={toast.message}
        visible={toast.visible}
        onClose={() => setToast({ ...toast, visible: false })}
        duration={3000} // 自动关闭时间，0 表示不自动关闭
      />
    </>
  );
}

// 特性：
// - 4种类型：success, error, warning, info
// - 自动进度条动画
// - 右上角固定位置
// - 可手动关闭
```

---

### 12. Dropdown 下拉菜单组件 ⭐新增

```tsx
import { Dropdown } from '@/components/UI';
import { useState } from 'react';

function MyComponent() {
  const [value, setValue] = useState('');
  
  return (
    <Dropdown
      options={[
        { value: 'option1', label: '选项1' },
        { value: 'option2', label: '选项2' },
        { value: 'option3', label: '选项3', disabled: true },
      ]}
      value={value}
      onChange={(val) => setValue(val)}
      placeholder="请选择..."
      label="选择选项"
    />
  );
}

// 带图标
import { User, Settings } from 'lucide-react';

<Dropdown
  options={[
    { value: 'profile', label: '个人资料', icon: <User size={16} /> },
    { value: 'settings', label: '设置', icon: <Settings size={16} /> },
  ]}
  value={value}
  onChange={setValue}
/>

// 特性：
// - 点击外部自动关闭
// - ESC 键关闭
// - 支持禁用选项
// - 支持自定义图标
// - 平滑展开/收起动画
```

---

## 🎨 设计令牌使用

### CSS 变量

在自定义样式中使用设计令牌：

```css
.my-custom-element {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.my-button {
  background: linear-gradient(to right, var(--color-primary-start), var(--color-primary-end));
}
```

### Tailwind 类名

推荐使用 Tailwind 类名（已在设计中统一）：

```tsx
// 品牌色渐变
className="bg-linear-to-r from-violet-500 to-purple-600"

// 阴影
className="shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30"

// 圆角
className="rounded-xl"  // 卡片
className="rounded-lg"  // 按钮
className="rounded-2xl" // 模态框

// 边框
className="border-2 border-gray-200 dark:border-gray-700"
```

---

## 📝 最佳实践

### 1. 保持一致性

```tsx
// ✅ 好：使用统一的组件
<Button variant="primary">提交</Button>
<Card padding="md">内容</Card>

// ❌ 不好：手动写样式
<button className="bg-blue-500 px-4 py-2 rounded">提交</button>
<div className="bg-white p-4 border">内容</div>
```

### 2. 响应式设计

```tsx
// ✅ 好：使用 Container 自动处理响应式
<Container size="lg">
  <h1>响应式内容</h1>
</Container>

// 网格布局
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* 卡片 */}
</div>
```

### 3. 无障碍支持

```tsx
// ✅ 好：所有组件都支持键盘导航和屏幕阅读器
<Button onClick={handleClick} aria-label="提交表单">
  提交
</Button>

// 加载状态告知
<Button loading={isLoading} aria-busy={isLoading}>
  {isLoading ? '保存中...' : '保存'}
</Button>
```

### 4. 组合使用

```tsx
import { Container, Card, Button, EmptyState } from '@/components/UI';

export default function MyPage() {
  const items = [];
  
  return (
    <Container size="lg" className="py-8">
      <h1 className="text-3xl font-bold mb-6">我的页面</h1>
      
      {items.length === 0 ? (
        <EmptyState
          title="暂无数据"
          description="开始添加您的第一项内容"
          actionText="创建新项目"
          onAction={() => console.log('create')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <Card key={item.id} variant="clickable" onClick={() => handleItemClick(item)}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
```

---

## 🚀 快速开始新页面

``tsx
'use client';

import { Container, Card, Button } from '@/components/UI';
import { useState } from 'react';

export default function NewPage() {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    setLoading(true);
    // API 调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };
  
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
      
      {/* 内容卡片 */}
      <Card padding="lg">
        <h2 className="text-xl font-semibold mb-4">内容区域</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          这里是页面的主要内容
        </p>
        
        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button onClick={handleSubmit} loading={loading}>
            提交
          </Button>
          <Button variant="outline">
            取消
          </Button>
        </div>
      </Card>
    </Container>
  );
}
```

---

## 📚 后续计划

待开发的组件：
- [ ] Tabs 标签页
- [ ] Progress 进度条
- [ ] Skeleton 骨架屏

---

**最后更新**: 2026-05-19  
**版本**: 1.0.0
