import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { alternatesFor } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  const title = isEn
    ? "NvwaX - Virtual Company Factory | Create Your AI Virtual Company"
    : "首页 - 虚拟公司制造工厂 | 轻松创建个性化的虚拟公司";
  const description = isEn
    ? "NvwaX is a Virtual Company Factory that helps you easily create personalized AI Virtual Companies. Search 240+ AI Agents, build AiTeams, and power your business with AI agents."
    : "NvwaX 虚拟公司制造工厂，帮你轻松创建个性化的 AI 虚拟公司。搜索和管理 AI Agent，组建 AiTeam，用 AI 智能体驱动你的业务。";

  return {
    title,
    description,
    openGraph: {
      title: isEn ? "NvwaX - Virtual Company Factory" : "NvwaX - 虚拟公司制造工厂",
      description: isEn
        ? "Easily create personalized AI virtual companies. Search 240+ AI Agents, build AiTeams, and power your business with AI."
        : "轻松创建个性化的虚拟公司。搜索240+ AI Agent，组建 AiTeam，用 AI 智能体驱动业务。",
    },
    alternates: alternatesFor("/", locale),
  };
}

export default function HomePage() {
  return <HomeClient />;
}
