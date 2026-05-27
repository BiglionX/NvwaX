'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/**
 * AI 搜索全局 Context 类型
 */
interface AiSearchContextType {
  /** 面板是否打开 */
  isOpen: boolean;
  /** 初始消息（打开面板时预填充） */
  initialMessage?: string;
  /** 自动生成 Agent 的回调 */
  onAutoGenerate?: (query: string) => void;
  /** 打开 AI 搜索面板 */
  openAiSearch: (message?: string, onGenerate?: (query: string) => void) => void;
  /** 关闭 AI 搜索面板 */
  closeAiSearch: () => void;
}

const AiSearchContext = createContext<AiSearchContextType | null>(null);

/**
 * AI 搜索全局状态 Provider
 * 包裹在 MainLayout 中，使 AiSearchPanel 成为全局可用的覆盖层
 */
export function AiSearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | undefined>(undefined);
  const [onAutoGenerate, setOnAutoGenerate] = useState<((query: string) => void) | undefined>(undefined);

  const openAiSearch = useCallback((message?: string, onGenerate?: (query: string) => void) => {
    setInitialMessage(message);
    setOnAutoGenerate(() => onGenerate);
    setIsOpen(true);
  }, []);

  const closeAiSearch = useCallback(() => {
    setIsOpen(false);
    setInitialMessage(undefined);
    setOnAutoGenerate(undefined);
  }, []);

  return (
    <AiSearchContext.Provider value={{ isOpen, initialMessage, onAutoGenerate, openAiSearch, closeAiSearch }}>
      {children}
    </AiSearchContext.Provider>
  );
}

/**
 * 使用 AI 搜索全局状态的 Hook
 */
export function useAiSearch(): AiSearchContextType {
  const context = useContext(AiSearchContext);
  if (!context) {
    throw new Error('useAiSearch must be used within an AiSearchProvider');
  }
  return context;
}
