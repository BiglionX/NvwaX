'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { bountyApi } from '@/lib/api/bounty';

interface SearchSuggestionsProps {
  query: string;
  onSelect: (suggestion: string) => void;
}

export default function SearchSuggestions({ query, onSelect }: SearchSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 获取搜索建议
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: () => bountyApi.getSearchSuggestions(query, 5),
    enabled: query.trim().length >= 1,
    staleTime: 30 * 1000, // 30秒缓存
  });

  // 显示条件：有查询且有建议
  const shouldShow = query.trim().length >= 1 && suggestions && suggestions.length > 0;

  // 点击外部关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 键盘导航
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!shouldShow || !suggestions || suggestions.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            event.preventDefault();
            onSelect(suggestions[selectedIndex]);
            setIsOpen(false);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shouldShow, suggestions, selectedIndex, onSelect]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div ref={wrapperRef} className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
      {isLoading ? (
        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
          加载中...
        </div>
      ) : (
        <ul className="max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => {
                onSelect(suggestion);
                setIsOpen(false);
              }}
              className={`px-4 py-3 cursor-pointer transition-colors flex items-center gap-3 group ${
                index === selectedIndex 
                  ? 'bg-blue-100 dark:bg-blue-900/30' 
                  : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
            >
              <Search size={16} className="text-gray-400 group-hover:text-blue-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {suggestion}
              </span>
              {index === selectedIndex && (
                <span className="ml-auto text-xs text-blue-500">Enter</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
