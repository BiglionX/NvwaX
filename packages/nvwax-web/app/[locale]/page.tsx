import type { Metadata } from "next";
import NvwaClient from "./nvwa/Client";
import DshBanner from "@/components/DshBanner";
import JsonLd from "@/components/JsonLd";
import { alternatesFor, homePageJsonLd } from "@/lib/seo";
import Link from "next/link";
import { Sparkles, Zap, ArrowRight, Github, Star } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  const title = isEn
    ? "NvwaX - v2.2.0 | Virtual Company Factory | Create Your AI Virtual Company"
    : "首页 - v2.2.0 | 虚拟公司制造工厂 | 轻松创建个性化的虚拟公司";
  const description = isEn
    ? "NvwaX v2.2.0 - Virtual Company Factory. Structured Output Engine (99% reliability), Graph State Machine, Dynamic Agent Registry, YAML DSL, Reflection Learning, MCP Protocol. Search 240+ AI Agents, build AiTeams."
    : "NvwaX v2.2.0 虚拟公司制造工厂。Structured Output 引擎（99%可靠性）、图状态机、动态 Agent 注册表、YAML DSL、反思学习系统、MCP 协议。搜索 240+ AI Agent，组建 AiTeam。";

  return {
    title,
    description,
    openGraph: {
      title: isEn ? "NvwaX v2.2.0 - Virtual Company Factory" : "NvwaX v2.2.0 - 虚拟公司制造工厂",
      description: isEn
        ? "v2.2.0: Structured Output Engine, Graph State Machine, Dynamic Agent Registry, YAML DSL, Reflection Learning, MCP Protocol."
        : "v2.2.0: Structured Output 引擎、图状态机、动态 Agent 注册表、YAML DSL、反思学习、MCP 协议。",
    },
    alternates: alternatesFor("/", locale),
  };
}

// 核心功能数据
const coreFeatures = [
  { icon: "⚡", title: "Structured Output", desc: "99% 可靠性", color: "from-amber-400 to-orange-500" },
  { icon: "🔄", title: "Graph State Machine", desc: "条件分支与断点", color: "from-blue-400 to-indigo-500" },
  { icon: "📋", title: "Dynamic Registry", desc: "语义匹配", color: "from-emerald-400 to-teal-500" },
  { icon: "📝", title: "YAML DSL", desc: "热加载", color: "from-violet-400 to-purple-500" },
  { icon: "🧠", title: "Reflection Learning", desc: "从失败中学习", color: "from-rose-400 to-pink-500" },
  { icon: "🔗", title: "MCP Protocol", desc: "6 个工具", color: "from-cyan-400 to-blue-500" },
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
          ? "NvwaX v2.2.0 - Virtual Company Factory - Create AI Virtual Companies"
          : "NvwaX v2.2.0 - 虚拟公司制造工厂 - 轻松创建 AI 虚拟公司"}
      </h1>

      {/* Hero 区域 - 深色渐变背景，突出品牌 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950">
        {/* 装饰背景 */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          {/* Logo 和品牌标识 */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                Nvwa<span className="text-blue-400">X</span>
              </h2>
              <p className="text-blue-300 text-sm">Virtual Company Factory</p>
            </div>
          </div>

          {/* v2.2.0 版本徽章 */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              v2.2.0 全新发布
            </div>
          </div>

          {/* 主标题 */}
          <h3 className="text-2xl lg:text-4xl font-bold text-center text-white mb-4">
            {isEn ? "Agent 创建方法全面升级" : "Agent 创建方法全面升级"}
          </h3>
          <p className="text-center text-blue-200 text-lg mb-10 max-w-2xl mx-auto">
            {isEn
              ? "Structured Output Engine · Graph State Machine · Dynamic Agent Registry · YAML DSL · Reflection Learning · MCP Protocol"
              : "Structured Output 引擎 · 图状态机 · 动态 Agent 注册表 · YAML DSL · 反思学习系统 · MCP 协议"}
          </p>

          {/* CTA 按钮 */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link
              href="/nvwa"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
            >
              <Sparkles size={20} />
              {isEn ? "Start Building" : "开始创建"}
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold backdrop-blur-sm transition-all"
            >
              <Star size={20} />
              {isEn ? "Explore Marketplace" : "浏览市场"}
            </Link>
          </div>

          {/* GitHub 链接 */}
          <div className="flex justify-center">
            <a
              href="https://github.com/BiglionX/NvwaX"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-300 hover:text-white transition-colors"
            >
              <Github size={18} />
              <span>github.com/BiglionX/NvwaX</span>
            </a>
          </div>
        </div>
      </section>

      {/* 核心功能展示 - 彩色卡片 */}
      <section className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h4 className="text-center text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4">
            {isEn ? "Core Technologies" : "核心技术"}
          </h4>
          <h3 className="text-center text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-10">
            {isEn ? "6 Major Technical Upgrades" : "6 大技术升级"}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {coreFeatures.map((feature, i) => (
              <div
                key={i}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} rounded-2xl blur-sm opacity-20 group-hover:opacity-40 transition-opacity`} />
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="text-4xl mb-3">{feature.icon}</div>
                  <h5 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{feature.title}</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 数据统计条 - 深色背景 */}
      <section className="bg-slate-900 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: "240+", label: isEn ? "AI Agents" : "AI Agent", sub: isEn ? "Indexed" : "已索引" },
              { value: "8+", label: isEn ? "Data Sources" : "数据源", sub: isEn ? "Including GitHub" : "含 GitHub" },
              { value: "MIT", label: isEn ? "License" : "开源协议", sub: isEn ? "100% Open Source" : "完全开源" },
              { value: "100%", label: isEn ? "Code Quality" : "代码质量", sub: isEn ? "Zero Errors" : "零错误" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-1">
                  {stat.value}
                </div>
                <div className="text-white font-medium">{stat.label}</div>
                <div className="text-slate-400 text-sm">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nvwa 工作台 */}
      <NvwaClient embedded />

      {/* DSH 集成横幅 */}
      <div className="px-4 sm:px-6 py-6 bg-slate-50 dark:bg-slate-900">
        <DshBanner />
      </div>
    </>
  );
}
