import type { Metadata } from "next";
import FAQClient from "./Client";

const faqItems = [
  { question: "NvwaX 是什么？", answer: "NvwaX 是一个开源的 AI Agent 搜索、发现和管理平台。它可以帮助您从 GitHub、Gitee、HuggingFace 等多个数据源发现和探索优秀的 AI Agent 项目，支持本地数据库缓存和全网搜索功能。" },
  { question: "如何开始使用 NvwaX？", answer: "1. 访问首页\n2. 在搜索框中输入关键词\n3. 浏览搜索结果或使用快速筛选器\n4. 点击感兴趣的 Agent 查看详情\n5. 注册账号后可以创建项目和管理 Agent 团队" },
  { question: "需要注册才能使用吗？", answer: "基础搜索和浏览功能无需注册即可使用。但如果您想创建项目、管理 Agent 团队或使用高级功能，则需要注册账号。" },
  { question: "如何搜索 Agent？", answer: "您可以在首页或搜索页面输入关键词进行搜索。支持的功能包括：关键词搜索（Agent 名称、描述、标签）、快速筛选（全部、GitHub、Gitee、中国公司）、分页浏览、按星级排序。" },
  { question: "搜索数据来源哪里？", answer: "NvwaX 采用混合搜索策略：优先搜索本地数据库（已爬取的 240+ Agents），如果本地无结果则进行全网搜索（GitHub API、HuggingFace API），搜索结果会自动保存到本地数据库供下次使用。" },
  { question: "为什么有时搜索很慢？", answer: "首次搜索某个关键词时，如果本地数据库没有相关结果，系统会进行全网搜索，这可能需要几秒钟。后续相同关键词的搜索会直接从本地数据库返回，速度非常快。" },
  { question: "Agent 数据多久更新一次？", answer: "系统每 24 小时自动执行一次爬虫任务，从各大平台获取最新的 Agent 数据。管理员也可以在后台手动触发爬取。" },
  { question: "数据存储在哪里？", answer: "所有 Agent 元数据都存储在 Neon PostgreSQL 云数据库中，确保数据持久化和高可用性。您的个人账户信息也安全地存储在云端。" },
  { question: "支持哪些数据源？", answer: "目前支持的数据源包括：GitHub（主要来源，200+ Agents）、Gitee（中国代码托管平台，15+ Agents）、HuggingFace（AI 模型平台）、中国科技公司（百度、阿里、腾讯、华为等）。" },
  { question: "如何创建项目？", answer: "登录您的账号，访问「我的项目」页面，点击「创建新项目」，填写项目名称和描述，保存后即可开始添加 Agent 团队。" },
  { question: "什么是 AiTeam？", answer: "AiTeam 是 NvwaX 的核心概念，代表一个 AI Agent 协作团队。您可以在项目中创建多个 AiTeam，每个团队包含多个协同工作的 Agent，用于完成特定任务。" },
  { question: "如何贡献代码？", answer: "我们欢迎所有形式的贡献！请查看 CONTRIBUTING.md 文件了解详细的贡献流程。您可以通过提交 Issue 报告问题、发起 Pull Request 修复 bug、改进文档、提出新功能建议等方式参与。" },
  { question: "项目使用什么开源协议？", answer: "NvwaX 采用 MIT 开源协议，您可以自由使用、修改和分发代码，只需保留原始的版权声明和许可声明。" },
  { question: "如何联系开发团队？", answer: "您可以通过 GitHub Issues、GitHub Discussions 或 Email 联系我们。" },
  { question: "项目路线图是什么？", answer: "主要方向包括：v1.0 核心搜索和管理功能（已完成），v1.1 SkillHub 集成和工作流引擎，v2.0 AI 辅助 Agent 构建和团队协作。" },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export const metadata: Metadata = {
  title: "常见问题 - AI Agent & 虚拟公司 平台 FAQ",
  description:
    "关于 NvwaX AI Agent 和虚拟公司平台的常见问题解答。了解如何使用搜索功能、管理项目、创建 AiTeam、贡献代码等。",
  openGraph: {
    title: "NvwaX 常见问题 - AI Agent & 虚拟公司 平台 FAQ",
    description:
      "20+ 常见问题解答，覆盖入门指南、搜索功能、数据管理、技术问题等。",
  },
  alternates: {
    canonical: "https://nvwax.com/faq",
  },
};

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FAQClient />
    </>
  );
}
