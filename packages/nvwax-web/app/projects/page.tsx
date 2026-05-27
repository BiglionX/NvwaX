import type { Metadata } from "next";
import ProjectsClient from "./Client";

export const metadata: Metadata = {
  title: "项目管理 - NvwaX AI Agent & 虚拟公司 平台",
  description:
    "在 NvwaX 创建和管理您的 AI 项目。组织 AI Agent 和虚拟公司，跟踪项目进展，高效管理团队与智能体资源。",
  openGraph: {
    title: "NvwaX 项目管理 - 组织 AI Agent 与团队",
    description:
      "创建和管理 AI 项目，聚合您的智能体和虚拟公司资源。",
  },
  alternates: {
    canonical: "https://nvwax.com/projects",
  },
};

export default function ProjectsPage() {
  return <ProjectsClient />;
}
