'use client';

/**
 * 主题 Provider（亮色 / 暗色 / 跟随系统）
 *
 * - 通过给 <html> 添加/移除 .dark 类控制暗色模式（配合 globals.css 的
 *   @custom-variant dark 与 .dark 令牌覆盖）。
 * - 选择持久化到 localStorage（key: nvwax-theme）。
 * - 默认跟随系统偏好；layout.tsx 中有内联脚本防止首屏闪烁（FOUC）。
 */

import { createContext, useContext, useEffect, useMemo, useState, type JSX, type ReactNode } from 'react';
import * as React from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** 用户选择（含 system） */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** 实际生效的主题 */
  resolved: ResolvedTheme;
  /** 在亮/暗之间切换 */
  toggle: () => void;
}

const STORAGE_KEY = 'nvwax-theme';

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  resolved: 'light',
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>('light');

  // 读取持久化选择（首帧由 layout 内联脚本处理，这里负责状态同步）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeState(saved);
      }
    } catch {
      // localStorage 不可用时保持默认
    }
  }, []);

  // 应用主题类并监听系统偏好变化
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const next: ResolvedTheme =
        theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
      setResolved(next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // ignore
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      resolved,
      toggle: () => setThemeState(resolved === 'dark' ? 'light' : 'dark'),
    }),
    [theme, resolved]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
