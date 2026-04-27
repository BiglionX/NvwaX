'use client';

import { useState, useEffect } from 'react';
import { History, X } from 'lucide-react';

interface SearchHistoryProps {
  onSearch: (query: string) => void;
}

const STORAGE_KEY = 'bounty_search_history';
const MAX_HISTORY = 10;

export default function SearchHistory({ onSearch }: SearchHistoryProps) {
  // 使用 lazy initialization 加载搜索历史
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse search history:', e);
      }
    }
    return [];
  });

  // 添加搜索记录
  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    
    const trimmed = query.trim();
    const newHistory = [
      trimmed,
      ...history.filter(h => h !== trimmed)
    ].slice(0, MAX_HISTORY);
    
    setHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  };

  // 删除单条记录
  const removeFromHistory = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h !== query);
    setHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  };

  // 清空历史
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <History size={14} />
          <span>搜索历史</span>
        </div>
        <button
          onClick={clearHistory}
          className="text-xs text-gray-500 hover:text-red-500 transition-colors"
        >
          清空
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {history.map((query, index) => (
          <div
            key={index}
            onClick={() => onSearch(query)}
            className="group flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg cursor-pointer transition-colors"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {query}
            </span>
            <button
              onClick={(e) => removeFromHistory(query, e)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
