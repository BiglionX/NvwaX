'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DatePickerProps {
  /** 选中的日期 */
  value?: Date;
  /** 日期改变回调 */
  onChange: (date: Date | null) => void;
  /** 标签文本 */
  label?: string;
  /** 占位文本 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 最小日期 */
  minDate?: Date;
  /** 最大日期 */
  maxDate?: Date;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一日期选择器组件
 * 
 * @example
 * ```tsx
 * const [date, setDate] = useState<Date | null>(null);
 * 
 * <DatePicker
 *   value={date || undefined}
 *   onChange={setDate}
 *   label="选择日期"
 * />
 * ```
 */
export default function DatePicker({
  value,
  onChange,
  label,
  placeholder = '选择日期...',
  disabled = false,
  minDate,
  maxDate,
  className = '',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());

  // 格式化日期显示
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 获取月份的天数
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // 获取月份第一天的星期
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // 生成日历网格
  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days: (number | null)[] = [];
    
    // 填充上个月的空白
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // 填充当月的天数
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  // 处理日期选择
  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    
    // 检查是否在允许范围内
    if (minDate && selectedDate < minDate) return;
    if (maxDate && selectedDate > maxDate) return;
    
    onChange(selectedDate);
    setIsOpen(false);
  };

  // 切换到上个月
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  // 切换到下个月
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // 检查日期是否可选
  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  // 检查是否是今天
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  // 检查是否选中
  const isSelected = (day: number) => {
    if (!value) return false;
    return (
      day === value.getDate() &&
      currentMonth.getMonth() === value.getMonth() &&
      currentMonth.getFullYear() === value.getFullYear()
    );
  };

  const calendarDays = generateCalendar();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className={`relative ${className}`}>
      {/* 标签 */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      {/* 输入框触发器 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3
          bg-white dark:bg-gray-800
          border-2 rounded-xl
          flex items-center justify-between
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen
            ? 'border-violet-500 dark:border-violet-600 shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30'
            : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'
          }
        `}
      >
        <span className={`text-left ${!value ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
          {value ? formatDate(value) : placeholder}
        </span>
        <CalendarIcon size={20} className="text-gray-400" />
      </button>

      {/* 日历弹窗 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="
              absolute z-50 mt-2
              bg-white dark:bg-gray-800
              border-2 border-gray-200 dark:border-gray-700
              rounded-xl shadow-xl
              p-4
              w-80
            "
          >
            {/* 月份导航 */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <span className="font-semibold text-gray-900 dark:text-white">
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
              </span>
              
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* 日期网格 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => (
                <div key={index} className="aspect-square">
                  {day !== null ? (
                    <button
                      onClick={() => !isDateDisabled(day) && handleDateSelect(day)}
                      disabled={isDateDisabled(day)}
                      className={`
                        w-full h-full rounded-lg
                        text-sm font-medium
                        transition-all duration-200
                        ${isSelected(day)
                          ? 'bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-lg'
                          : isToday(day)
                            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-2 border-violet-500'
                            : isDateDisabled(day)
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      {day}
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
