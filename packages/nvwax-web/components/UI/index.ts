/**
 * NvwaX UI 组件库
 * 
 * 统一的 UI 组件集合，提供一致的设计语言和用户体验
 */

// 基础组件
export { default as Button } from './Button';
export type { ButtonProps } from './Button';

export { default as Card } from './Card';
export type { CardProps } from './Card';

export { default as Container } from './Container';
export type { ContainerProps } from './Container';

// 反馈组件
export { default as Loading } from './Loading';
export type { LoadingProps } from './Loading';

export { default as EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

// 弹窗组件
export { default as Modal } from './Modal';
export type { ModalProps } from './Modal';

export { default as Toast } from './Toast';
export type { ToastProps, ToastType } from './Toast';

export { default as Dropdown } from './Dropdown';
export type { DropdownProps, DropdownOption } from './Dropdown';

// 展示组件
export { default as Tabs } from './Tabs';
export type { TabsProps, TabItem } from './Tabs';

export { default as Progress } from './Progress';
export type { ProgressProps } from './Progress';

export { default as Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';
export { SkeletonCard, SkeletonList, SkeletonTable } from './Skeleton';

// 交互组件
export { default as Tooltip } from './Tooltip';
export type { TooltipProps } from './Tooltip';

export { default as Accordion } from './Accordion';
export type { AccordionProps, AccordionItem } from './Accordion';

export { default as Alert } from './Alert';
export type { AlertProps, AlertType } from './Alert';

// 导航组件
export { default as Breadcrumbs } from './Breadcrumbs';
export type { BreadcrumbsProps, BreadcrumbItem } from './Breadcrumbs';

export { default as Pagination } from './Pagination';
export type { PaginationProps } from './Pagination';

export { default as Stepper } from './Stepper';
export type { StepperProps, StepItem } from './Stepper';

// v2.2.0 增强版向导步骤指示器
export { default as WizardStepper } from './WizardStepper';
export type { WizardStepperProps, WizardStep, WizardStepStatus } from './WizardStepper';

// 行业模板卡片（用于 Agent 创建向导）
export { default as IndustryTemplateCard, IndustryTemplateGrid } from './IndustryTemplateCard';
export type { IndustryTemplateCardProps, IndustryTemplate, IndustryType } from './IndustryTemplateCard';
export { INDUSTRY_TEMPLATES } from './IndustryTemplateCard';

// 沙箱对话（用于 Agent 测试）
export { default as SandboxChat } from './SandboxChat';
export type { SandboxChatProps, SandboxMessage, SandboxMessageRole, SandboxExecutor } from './SandboxChat';

// 状态机可视化（用于 Aiteam 创建流程）
export { default as StateGraphVisualizer } from './StateGraphVisualizer';
export type { StateGraphVisualizerProps, StateGraphNode, StateGraphEdge } from './StateGraphVisualizer';
export { DEFAULT_STATE_MACHINE_NODES, DEFAULT_STATE_MACHINE_EDGES } from './StateGraphVisualizer';

// v2.2.0 Aiteam 状态机视图（集成 StateGraphVisualizer + 操作面板 + Checkpoint）
export { default as AiteamStateGraphView } from '../Search/AiteamStateGraphView';
export type { AiteamStateGraphViewProps } from '../Search/AiteamStateGraphView';

// 表单组件
export { default as Input } from './Input';
export type { InputProps } from './Input';

export { default as Select } from './Select';
export type { SelectProps, SelectOption } from './Select';

export { default as Switch } from './Switch';
export type { SwitchProps } from './Switch';

export { default as Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';

export { default as Radio } from './Radio';
export type { RadioProps } from './Radio';

// 高级交互组件
export { default as DatePicker } from './DatePicker';
export type { DatePickerProps } from './DatePicker';

export { default as Slider } from './Slider';
export type { SliderProps } from './Slider';

export { default as Rating } from './Rating';
export type { RatingProps } from './Rating';

// 布局组件
export { default as Tag } from './Tag';
export type { TagProps } from './Tag';

export { default as Divider } from './Divider';
export type { DividerProps } from './Divider';

export { default as Space } from './Space';
export type { SpaceProps } from './Space';

// 展示组件
export { default as Badge } from './Badge';
export type { BadgeProps } from './Badge';

export { default as Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';
