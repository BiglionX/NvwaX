import type { Metadata } from "next";
import NvwaClient from "./nvwa/Client";
import DshBanner from "@/components/DshBanner";
import JsonLd from "@/components/JsonLd";
import { alternatesFor, homePageJsonLd } from "@/lib/seo";
import Link from "next/link";
import { Sparkles, ArrowRight, Star, Users, Building2, ClipboardList } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  const title = isEn
    ? "NvwaX - AI Virtual Company OS | Build Your AI Team & Virtual Company"
    : "NvwaX - AI 虚拟公司操作系统 | 组建你的 AI 团队与虚拟公司";
  const description = isEn
    ? "NvwaX is the operating system for building AI companies: register a team, set up roles (CEO, Marketing Director, Copywriter...), assign tasks, and get deliverables. Hire AI partners instead of building single agents."
    : "NvwaX 是帮你组建 AI 公司的操作系统：注册团队 → 设置岗位（CEO、市场总监、文案…）→ 分配任务 → 产出成果。招聘 AI 合伙人，而不是单个智能体。";

  return {
    title,
    description,
    openGraph: {
      title: isEn ? "NvwaX - AI Virtual Company OS" : "NvwaX - AI 虚拟公司操作系统",
      description: isEn
        ? "Register a team, set up roles, assign tasks, and get deliverables — build your AI virtual company."
        : "注册团队、设置岗位、分配任务、产出成果 —— 一键组建你的 AI 虚拟公司。",
    },
    alternates: alternatesFor("/", locale),
  };
}

// 核心价值数据（AI 公司叙事）
const coreFeatures = [
  { icon: "🏢", title: "多角色协作", desc: "CEO · 市场总监 · 文案 · 设计", color: "from-blue-400 to-indigo-500" },
  { icon: "📋", title: "任务编排", desc: "自动分配 · 并行执行", color: "from-emerald-400 to-teal-500" },
  { icon: "🧠", title: "记忆与状态", desc: "跨任务上下文管理", color: "from-violet-400 to-purple-500" },
  { icon: "📦", title: "成果交付", desc: "文档包 · 可导出配置", color: "from-amber-400 to-orange-500" },
  { icon: "🤝", title: "AI 合伙人", desc: "招聘而非构建", color: "from-rose-400 to-pink-500" },
  { icon: "⚙️", title: "公司模板", desc: "营销 · 客服 · 内容创作", color: "from-cyan-400 to-blue-500" },
];

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const isEn = locale === "en";

  return (
    <>
      {/* SEO & GEO: FAQPage 结构化数据 */}
      <JsonLd data={homePageJsonLd()} />

      {/* SEO & GEO: 静态 h1 标题 */}
      <h1 className="sr-only">
        {isEn
          ? "NvwaX - AI Virtual Company OS - Build Your AI Virtual Company"
          : "NvwaX - AI 虚拟公司操作系统 - 组建你的 AI 虚拟公司"}
      </h1>

      {/* Hero 区域 - 深色渐变背景，AI 公司叙事 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        {/* 装饰背景 */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Logo 和品牌标识 */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                Nvwa<span className="text-blue-400">X</span>
              </h2>
              <p className="text-blue-300 text-xs">AI Virtual Company OS</p>
            </div>
          </div>

          {/* 定位徽章 */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              {isEn ? "Your AI Company OS" : "你的 AI 公司操作系统"}
            </div>
          </div>

          {/* 主标题 */}
          <h3 className="text-xl lg:text-3xl font-bold text-center text-white mb-3">
            {isEn ? "Build your AI virtual company, not single agents" : "你负责提需求，我们负责组建一支能干活的 AI 公司"}
          </h3>
          <p className="text-center text-blue-200 text-sm lg:text-base mb-8 max-w-2xl mx-auto">
            {isEn
              ? "Register team → Set up roles → Assign tasks → Get deliverables"
              : "注册团队 → 设置岗位 → 分配任务 → 产出成果"}
          </p>

          {/* 核心价值展示 - 紧凑横排 */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {coreFeatures.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all"
              >
                <span className="text-xl">{feature.icon}</span>
                <div>
                  <span className="text-white text-sm font-medium">{feature.title}</span>
                  <span className="text-blue-300 text-xs ml-1.5">{feature.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 数据统计条 */}
          <div className="grid grid-cols-4 gap-4 mb-8 max-w-3xl mx-auto">
            {[
              { value: "240+", label: isEn ? "AI Partners" : "AI 合伙人" },
              { value: "100+", label: isEn ? "Company Templates" : "公司模板" },
              { value: "6", label: isEn ? "Roles per Company" : "岗位 / 公司" },
              { value: "1", label: isEn ? "Deliverable Package" : "成果文档包" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-0.5">
                  {stat.value}
                </div>
                <div className="text-blue-300 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* CTA 按钮 */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <Link
              href="/nvwa"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
            >
              <Building2 size={18} />
              {isEn ? "Build Your AI Company" : "开始组建 AI 公司"}
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/my-aiteam"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold backdrop-blur-sm transition-all"
            >
              <Users size={18} />
              {isEn ? "My AI Companies" : "我的 AI 公司"}
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-blue-200 font-semibold backdrop-blur-sm transition-all"
            >
              <Star size={18} />
              {isEn ? "Explore AI Team Market" : "浏览 AI 团队市场"}
            </Link>
          </div>

          {/* GitHub 链接 */}
          <div className="flex justify-center">
            <a
              href="https://github.com/BiglionX/NvwaX"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-300 hover:text-white transition-colors text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span>github.com/BiglionX/NvwaX</span>
            </a>
          </div>
        </div>
      </section>

      {/* Nvwa 工作台 - 核心产品：AI 公司创建向导，突出展示 */}
      <section className="bg-gradient-to-b from-slate-100 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* 核心产品标识 */}
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium">
              <ClipboardList size={12} />
              {isEn ? "Core Product: AI Team Builder" : "核心产品：AI 团队创建向导"}
            </span>
          </div>
        </div>
        <NvwaClient embedded defaultMode="aiteam" />
      </section>

      {/* DSH 集成横幅 */}
      <div className="px-4 sm:px-6 py-6 bg-slate-50 dark:bg-slate-900">
        <DshBanner />
      </div>
    </>
  );
}
