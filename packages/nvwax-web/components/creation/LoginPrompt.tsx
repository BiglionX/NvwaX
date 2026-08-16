'use client';

import { LogIn, Lock } from 'lucide-react';
import Link from 'next/link';

/**
 * 统一登录引导组件
 *
 * 未登录时展示友好的登录引导（替代原来的黑屏报错/仅一行提示），
 * Agent 与 AiTeam 创建流程共用。
 */

interface LoginPromptProps {
  title?: string;
  description?: string;
  loginLabel?: string;
  loginHref?: string;
  className?: string;
}

export default function LoginPrompt({
  title = '请先登录',
  description = '登录后即可创建并保存您的 AI Agent / AiTeam，可随时在个人空间中管理和使用。',
  loginLabel = '登录 / 注册',
  loginHref = '/login',
  className = '',
}: LoginPromptProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-10 ${className}`}>
      <div className="w-16 h-16 mb-4 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
        <Lock size={28} className="text-white" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed mb-6">{description}</p>
      <Link
        href={loginHref}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 active:scale-[0.98]"
      >
        <LogIn size={18} />
        {loginLabel}
      </Link>
    </div>
  );
}
