import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("aboutTitle"),
    description: t("aboutMetaDesc"),
    alternates: alternatesFor("/about", locale),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("legal");
  const isEn = false; // 简化处理

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/20">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t("aboutHeading")}
          </h1>
          <p className="text-lg text-blue-600 dark:text-blue-400 font-medium">
            v2.2.0 — AI Agent 与 AiTeam 平台
          </p>
        </div>

        {/* 核心介绍 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-700">
          <div className="prose prose-gray dark:prose-invert space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
            <p className="text-lg">{t("aboutP1")}</p>
            <p>{t("aboutP2")}</p>
            <p>{t("aboutP3")}</p>
          </div>
        </div>

        {/* v2.2.0 核心亮点 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-8 mb-8 text-white">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="text-3xl">🚀</span>
            v2.2.0 核心亮点
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: "⚡", title: "Structured Output 引擎", desc: "3级降级策略，输出可靠性从80%提升到99%，彻底告别JSON解析脆弱问题" },
              { icon: "🔄", title: "图状态机流程引擎", desc: "替代线性7步流程，支持条件分支、Checkpoint持久化、Human-in-the-loop、状态回退" },
              { icon: "📋", title: "动态 Agent 注册表", desc: "突破5种硬编码Agent类型限制，支持CRUD动态注册、语义匹配、GIN索引加速" },
              { icon: "📝", title: "声明式 YAML DSL", desc: "通过YAML文件定义Agent和工作流，支持热加载，灵活扩展" },
              { icon: "🧠", title: "反思学习系统", desc: "从失败案例中自动学习，提取失败模式，避免重复犯错" },
              { icon: "🔗", title: "MCP 协议支持", desc: "6个MCP Tools暴露，支持CrewAI、LangGraph、OpenAgents等外部框架调用" },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <span className="text-3xl">{item.icon}</span>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                  <p className="text-blue-100 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 核心功能 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="text-3xl">🎯</span>
            核心功能
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "AI Agent 搜索", desc: "从 GitHub、Gitee、ModelScope 等多数据源搜索 AI Agent，支持全文搜索、语义匹配" },
              { title: "Nvwa 智能体工厂", desc: "对话式创建智能体，7步引导流程，可视化进度追踪，自动化工作流" },
              { title: "AiTeam 团队", desc: "创建和管理 AI 虚拟团队，CEO Agent 动态生成，团队经营配置文档" },
              { title: "Team Skills 模板", desc: "可复用的团队技能模板库，覆盖网站运营、社交媒体、行业插件" },
              { title: "悬赏系统", desc: "发布、领取、提交、验证完整的悬赏流程，积分激励机制" },
              { title: "Admin 后台", desc: "Agent管理、虚拟公司监控、通知中心、审计日志" },
            ].map((item, i) => (
              <div key={i} className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 技术栈 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="text-3xl">🛠️</span>
            技术栈
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Next.js 14", type: "前端框架" },
              { name: "TypeScript", type: "开发语言" },
              { name: "Tailwind CSS", type: "样式方案" },
              { name: "Express.js", type: "后端框架" },
              { name: "PostgreSQL", type: "数据库" },
              { name: "LangChain.js", type: "工作流引擎" },
              { name: "pnpm", type: "包管理" },
              { name: "MIT", type: "开源协议" },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{item.type}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部版权 */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>© 2026 NvwaX. All rights reserved.</p>
          <p className="mt-2">
            Made with ❤️ by Open Source Community
          </p>
        </div>
      </div>
    </div>
  );
}
