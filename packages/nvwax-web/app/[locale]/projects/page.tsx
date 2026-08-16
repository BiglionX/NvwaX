import type { Metadata } from "next";
import ProjectsClient from "./Client";
import { alternatesFor } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  const title = isEn
    ? "Projects - NvwaX AI Agent & AiTeam Platform"
    : "项目管理 - NvwaX AI Agent & AiTeam 平台";
  const description = isEn
    ? "Create and manage your AI projects on NvwaX. Organize AI Agents and AiTeams, track progress, and manage team resources."
    : "在 NvwaX 创建和管理您的 AI 项目。组织 AI Agent 和 AiTeam，跟踪项目进展，高效管理团队与智能体资源。";

  return {
    title,
    description,
    openGraph: {
      title: isEn ? "NvwaX Projects - Organize AI Agents & Teams" : "NvwaX 项目管理 - 组织 AI Agent 与团队",
      description: isEn
        ? "Create and manage AI projects, aggregating your agents and AiTeam resources."
        : "创建和管理 AI 项目，聚合您的智能体和 AiTeam 资源。",
    },
    // 用户私有页面：禁止收录（与 robots.txt / X-Robots-Tag 同步）
    robots: {
      index: false,
      follow: false,
    },
    alternates: alternatesFor("/projects", locale),
  };
}

export default function ProjectsPage() {
  return <ProjectsClient />;
}
