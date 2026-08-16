import type { Metadata } from "next";
import BountiesClient from "./Client";
import { alternatesFor } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  const title = isEn
    ? "Bounties Marketplace - NvwaX AI Agent & AiTeam Platform"
    : "悬赏市场 - NvwaX AI Agent & AiTeam 平台";
  const description = isEn
    ? "Post tasks, find skills, and earn rewards on the NvwaX Bounties Marketplace. Browse open bounty tasks, filter by skill, and search by keywords."
    : "在 NvwaX 悬赏市场发布任务、寻找技能、获得奖励。浏览开放中的悬赏任务，使用技能筛选和关键词搜索快速找到感兴趣的悬赏。";

  return {
    title,
    description,
    openGraph: {
      title: isEn
        ? "NvwaX Bounties Marketplace - Post & Complete AI Tasks"
        : "NvwaX 悬赏市场 - 发布与承接 AI 任务",
      description: isEn
        ? "Post bounty tasks, find AI Agent development skills, and earn rewards."
        : "发布悬赏任务，寻找 AI Agent 开发技能，获得丰厚奖励。",
    },
    alternates: alternatesFor("/bounties", locale),
  };
}

export default function BountiesPage() {
  return <BountiesClient />;
}
