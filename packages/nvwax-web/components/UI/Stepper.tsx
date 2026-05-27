import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  /** 步骤标题 */
  title: string;
  /** 步骤描述 */
  description?: string;
  /** 步骤图标（可选） */
  icon?: React.ReactNode;
}

export interface StepperProps {
  /** 步骤列表 */
  steps: StepItem[];
  /** 当前步骤（从0开始） */
  current: number;
  /** 方向 */
  direction?: 'horizontal' | 'vertical';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一步骤条组件
 * 
 * @example
 * ```tsx
 * <Stepper
 *   steps={[
 *     { title: '步骤1', description: '描述1' },
 *     { title: '步骤2', description: '描述2' },
 *     { title: '步骤3', description: '描述3' },
 *   ]}
 *   current={1}
 * />
 * ```
 */
export default function Stepper({
  steps,
  current,
  direction = 'horizontal',
  size = 'md',
  className = '',
}: StepperProps) {
  // 尺寸配置
  const sizes = {
    sm: {
      circle: 'w-8 h-8',
      fontSize: 'text-sm',
      iconSize: 16,
    },
    md: {
      circle: 'w-10 h-10',
      fontSize: 'text-base',
      iconSize: 20,
    },
    lg: {
      circle: 'w-12 h-12',
      fontSize: 'text-lg',
      iconSize: 24,
    },
  };
  
  const currentSize = sizes[size];
  
  if (direction === 'vertical') {
    return (
      <div className={`space-y-0 ${className}`}>
        {steps.map((step, index) => {
          const isCompleted = index < current;
          const isCurrent = index === current;
          
          return (
            <div key={index} className="flex gap-4">
              {/* 步骤圆圈和连接线 */}
              <div className="flex flex-col items-center">
                {/* 圆圈 */}
                <div
                  className={`
                    ${currentSize.circle} rounded-full
                    flex items-center justify-center
                    font-semibold
                    transition-all duration-300
                    ${isCompleted
                      ? 'bg-linear-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200/50 dark:shadow-green-900/30'
                      : isCurrent
                        ? 'bg-linear-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 ring-4 ring-blue-100 dark:ring-blue-900/30'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check size={currentSize.iconSize} />
                  ) : (
                    <span className={currentSize.fontSize}>{index + 1}</span>
                  )}
                </div>
                
                {/* 连接线（非最后一个） */}
                {index < steps.length - 1 && (
                  <div className={`w-0.5 h-16 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
              
              {/* 步骤内容 */}
              <div className="flex-1 pb-8">
                <h4
                  className={`
                    font-semibold mb-1
                    ${isCompleted || isCurrent
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-600'
                    }
                  `}
                >
                  {step.title}
                </h4>
                {step.description && (
                  <p className={`text-sm ${isCompleted || isCurrent ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  
  // 水平方向
  return (
    <div className={`flex items-start ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < current;
        const isCurrent = index === current;
        const isLast = index === steps.length - 1;
        
        return (
          <div key={index} className="flex-1 flex items-start">
            {/* 步骤内容 */}
            <div className="flex flex-col items-center flex-1">
              {/* 圆圈 */}
              <div
                className={`
                  ${currentSize.circle} rounded-full
                  flex items-center justify-center
                  font-semibold
                  transition-all duration-300
                  relative z-10
                  ${isCompleted
                    ? 'bg-linear-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200/50 dark:shadow-green-900/30'
                    : isCurrent
                      ? 'bg-linear-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 ring-4 ring-blue-100 dark:ring-blue-900/30'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }
                `}
              >
                {isCompleted ? (
                  <Check size={currentSize.iconSize} />
                ) : (
                  <span className={currentSize.fontSize}>{index + 1}</span>
                )}
              </div>
              
              {/* 标题和描述 */}
              <div className="mt-3 text-center">
                <h4
                  className={`
                    font-semibold mb-1
                    ${isCompleted || isCurrent
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-600'
                    }
                  `}
                >
                  {step.title}
                </h4>
                {step.description && (
                  <p className={`text-sm ${isCompleted || isCurrent ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
                    {step.description}
                  </p>
                )}
              </div>
            </div>
            
            {/* 连接线（非最后一个） */}
            {!isLast && (
              <div className="flex-1 flex items-center pt-5">
                <div
                  className={`
                    h-0.5 w-full
                    ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}
                  `}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
