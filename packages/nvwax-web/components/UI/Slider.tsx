'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface SliderProps {
  /** 当前值 */
  value: number;
  /** 值改变回调 */
  onChange: (value: number) => void;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步长 */
  step?: number;
  /** 标签文本 */
  label?: string;
  /** 是否显示数值 */
  showValue?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一滑块组件
 * 
 * @example
 * ```tsx
 * const [volume, setVolume] = useState(50);
 * 
 * <Slider
 *   value={volume}
 *   onChange={setVolume}
 *   min={0}
 *   max={100}
 *   label="音量"
 *   showValue
 * />
 * ```
 */
export default function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = false,
  disabled = false,
  className = '',
}: SliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // 计算百分比
  const percentage = ((value - min) / (max - min)) * 100;

  // 处理点击和拖动
  const handleInteraction = (clientX: number) => {
    if (disabled || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;
    
    let newValue = (x / width) * (max - min) + min;
    
    // 限制范围
    newValue = Math.max(min, Math.min(max, newValue));
    
    // 对齐步长
    if (step) {
      newValue = Math.round(newValue / step) * step;
    }
    
    onChange(newValue);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    handleInteraction(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    handleInteraction(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 键盘支持
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    let newValue = value;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = Math.max(min, value - step);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        newValue = Math.min(max, value + step);
        break;
      case 'Home':
        newValue = min;
        break;
      case 'End':
        newValue = max;
        break;
      default:
        return;
    }

    e.preventDefault();
    onChange(newValue);
  };

  // 全局事件监听
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className={className}>
      {/* 标签和数值 */}
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
              {value}
            </span>
          )}
        </div>
      )}

      {/* 滑块轨道 */}
      <div
        ref={sliderRef}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        className={`
          relative h-2 rounded-full cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* 背景轨道 */}
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full" />
        
        {/* 填充轨道 */}
        <div
          className="absolute h-full bg-linear-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-150"
          style={{ width: `${percentage}%` }}
        />
        
        {/* 滑块手柄 */}
        <div
          className={`
            absolute top-1/2 -translate-y-1/2 -translate-x-1/2
            w-5 h-5 bg-white rounded-full
            border-2 border-violet-600
            shadow-lg
            transition-all duration-150
            ${isDragging ? 'scale-125 shadow-xl' : ''}
            ${disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
          `}
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
