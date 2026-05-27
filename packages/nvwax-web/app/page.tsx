'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bot, Users, Star, Layers } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {/* 全屏固定星空背景 */}
      <div className="fixed inset-0 -z-10 stars-bg" />

      {/* 星云光晕层 */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* 大星云 - 右上 */}
        <div
          className="absolute -top-40 -right-40 w-125 h-125 rounded-full opacity-30 animate-[drift_12s_ease-in-out_infinite]"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0.1) 40%, transparent 70%)',
            filter: 'blur(40px)'
          }}
        />
        {/* 小星云 - 左下 */}
        <div
          className="absolute -bottom-20 -left-20 w-87.5 h-87.5 rounded-full opacity-25 animate-[drift_15s_ease-in-out_infinite_2s]"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0.08) 40%, transparent 70%)',
            filter: 'blur(30px)'
          }}
        />
        {/* 流星 */}
        <div
          className="absolute top-10 left-1/2 w-0.5 h-0.5 rounded-full bg-white animate-[shootingStar_6s_linear_infinite]"
          style={{
            boxShadow: '0 0 4px 2px rgba(255,255,255,0.3)',
          }}
        />
      </div>

      {/* 主内容 */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-3xl mx-auto text-center animate-[fadeIn_0.8s_ease-out]">
        {/* Logo / 品牌标识 */}
        <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-linear-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 ring-1 ring-white/10">
          <Bot size={40} className="text-white" />
        </div>

        {/* 标题 */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4">
          <span className="bg-linear-to-r from-blue-400 via-sky-300 to-blue-200 bg-clip-text text-transparent">
            NvwaX
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-blue-200/80 mb-2 font-medium">
          AI Agent 制造工厂
        </p>
        <p className="text-sm sm:text-base text-slate-400 mb-10">
          搜索 · 发现 · 创建 · 发布
        </p>

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="mb-6 max-w-xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-linear-to-r from-blue-500 to-blue-700 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden shadow-2xl">
              <Search size={20} className="ml-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索 AI Agent、技能、框架..."
                className="flex-1 px-4 py-3.5 bg-transparent text-white placeholder-slate-400 outline-none text-base"
              />
              <button
                type="submit"
                className="m-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors text-sm"
              >
                搜索
              </button>
            </div>
          </div>
        </form>

        {/* CTA 按钮 */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <Link
            href="/nvwa"
            className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 active:scale-[0.98]"
          >
            <Bot size={20} />
            创建 Agent
          </Link>
          <Link
            href="/nvwa"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 hover:border-white/30 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98]"
          >
            <Users size={20} />
            创建虚拟公司（AI team）
          </Link>
        </div>

        {/* 数据统计 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
          {[
            { value: '240+', label: 'Agents', icon: Bot },
            { value: '5', label: '数据源', icon: Layers },
            { value: '16+', label: '技能', icon: Star },
            { value: '开源', label: '项目', icon: ({ size, className }: { size?: number; className?: string }) => (
              <svg width={size || 18} height={size || 18} className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            ) },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
              >
                <Icon size={18} className="text-blue-400" />
                <span className="text-2xl font-bold text-white">{stat.value}</span>
                <span className="text-xs text-slate-400">{stat.label}</span>
              </div>
            );
          })}
        </div>
      </div>

        {/* 底部渐隐过渡 */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-b from-transparent to-[#080b1a] pointer-events-none" />
      </div>
    </>
  );
}
