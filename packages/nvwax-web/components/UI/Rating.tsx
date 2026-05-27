'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

export interface RatingProps {
  /** 当前评分 */
  value: number;
  /** 评分改变回调 */
  onChange: (value: number) => void;
  /** 最大评分 */
  max?: number;
  /** 是否只读 */
  readOnly?: boolean;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示数值 */
  showValue?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一评分组件
 * 
 * @example
 * ```tsx
 * const [rating, setRating] = useState(4);
 * 
 * <Rating
 *   value={rating}
 *   onChange={setRating}
 *   max={5}
 *   showValue
 * />
 * ```
 */
export default function Rating({
  value,
  onChange,
  max = 5,
  readOnly = false,
  size = 'md',
  showValue = false,
  className = '',
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  // 尺寸配置
  const sizes = {
    sm: { iconSize: 16, gap: 'gap-1' },
    md: { iconSize: 24, gap: 'gap-2' },
    lg: { iconSize: 32, gap: 'gap-3' },
  };

  const currentSize = sizes[size];

  const handleStarClick = (starValue: number) => {
    if (!readOnly) {
      onChange(starValue);
    }
  };

  const handleStarHover = (starValue: number) => {
    if (!readOnly) {
      setHoverValue(starValue);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverValue(null);
    }
  };

  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className={`inline-flex items-center ${className}`}>
      {/* 星星组 */}
      <div
        className={`flex items-center ${currentSize.gap}`}
        onMouseLeave={handleMouseLeave}
      >
        {[...Array(max)].map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= displayValue;
          const isHovered = hoverValue !== null && starValue <= hoverValue;

          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => handleStarClick(starValue)}
              onMouseEnter={() => handleStarHover(starValue)}
              disabled={readOnly}
              className={`
                focus:outline-none focus:ring-2 focus:ring-blue-500 rounded
                ${readOnly ? 'cursor-default' : 'cursor-pointer'}
              `}
              whileHover={!readOnly ? { scale: 1.2 } : {}}
              whileTap={!readOnly ? { scale: 0.9 } : {}}
            >
              <Star
                size={currentSize.iconSize}
                className={`
                  transition-all duration-200
                  ${isFilled || isHovered
                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg'
                    : 'text-gray-300 dark:text-gray-600'
                  }
                `}
              />
            </motion.button>
          );
        })}
      </div>

      {/* 数值显示 */}
      {showValue && (
        <span className="ml-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          {value}/{max}
        </span>
      )}
    </div>
  );
}
