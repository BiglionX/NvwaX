import type { Metadata } from "next";
import TeamSkillsView from "./TeamSkillsView";
import { alternatesFor } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  const title = isEn
    ? "Team Skills Marketplace - NvwaX"
    : "Team Skills 市场 - NvwaX";
  const description = isEn
    ? "Explore reusable AI team collaboration templates on NvwaX. Apply ready-made Team Skills to your projects in one click."
    : "探索可复用的 AI 团队协作模板，一键应用到您的项目。按类别浏览开发、研究、内容创作、数据分析、市场营销等 Team Skills。";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    alternates: alternatesFor("/team-skills", locale),
  };
}

export default function TeamSkillsPage() {
  return <TeamSkillsView />;
}
