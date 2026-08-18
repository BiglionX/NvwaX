import type { Metadata } from "next";
import NvwaClient from "./nvwa/Client";
import DshBanner from "@/components/DshBanner";
import JsonLd from "@/components/JsonLd";
import { alternatesFor, homePageJsonLd } from "@/lib/seo";

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

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const isEn = locale === "en";

  return (
    <>
      {/* SEO & GEO: FAQPage 结构化数据 - 帮助 AI 引擎理解内容 */}
      <JsonLd data={homePageJsonLd()} />

      {/* SEO & GEO: 静态 h1 标题 - 屏幕阅读器可见，搜索引擎抓取 */}
      <h1 className="sr-only">
        {isEn
          ? "NvwaX v2.2.0 - Virtual Company Factory - Create AI Virtual Companies"
          : "NvwaX v2.2.0 - 虚拟公司制造工厂 - 轻松创建 AI 虚拟公司"}
      </h1>

      {/* SEO & GEO: 静态摘要内容块 - 被搜索引擎和 AI 抓取用于索引 */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* v2.2.0 版本标识 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            {isEn ? "v2.2.0 Now Available" : "v2.2.0 全新发布"}
          </div>

          {/* 主要标题 */}
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {isEn
              ? "Agent Creation Method Fully Upgraded"
              : "Agent 创建方法全面升级"}
          </h2>

          {/* 核心功能列表 - SEO 关键词区域 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { title: "Structured Output", desc: isEn ? "99% reliability" : "99% 可靠性" },
              { title: "Graph State Machine", desc: isEn ? "Branches & Checkpoints" : "条件分支与断点" },
              { title: "Dynamic Agent Registry", desc: isEn ? "Semantic matching" : "语义匹配" },
              { title: "YAML DSL", desc: isEn ? "Hot reload" : "热加载" },
              { title: "Reflection Learning", desc: isEn ? "Learn from failures" : "从失败中学习" },
              { title: "MCP Protocol", desc: isEn ? "6 tools exposed" : "6 个工具暴露" },
            ].map((feature, i) => (
              <div key={i} className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
                <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{feature.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{feature.desc}</div>
              </div>
            ))}
          </div>

          {/* 搜索统计 */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
            <div>
              <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">240+</span>
              <span className="ml-1">{isEn ? "AI Agents" : "AI Agent"}</span>
            </div>
            <div>
              <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">8+</span>
              <span className="ml-1">{isEn ? "Data Sources" : "数据源"}</span>
            </div>
            <div>
              <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">MIT</span>
              <span className="ml-1">{isEn ? "License" : "开源协议"}</span>
            </div>
            <div>
              <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">100%</span>
              <span className="ml-1">{isEn ? "Code Quality" : "代码质量"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nvwa 工作台 */}
      <NvwaClient embedded />

      {/* DSH 集成横幅 */}
      <div className="px-4 sm:px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <DshBanner />
      </div>
    </>
  );
}
