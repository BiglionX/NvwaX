import type { Metadata } from "next";
import BountiesClient from "./Client";

export const metadata: Metadata = {
  title: "悬赏市场 - NvwaX AI Agent & AiTeam 平台",
  description:
    "在 NvwaX 悬赏市场发布任务、寻找技能、获得奖励。浏览开放中的悬赏任务，使用技能筛选和关键词搜索快速找到感兴趣的悬赏。",
  openGraph: {
    title: "NvwaX 悬赏市场 - 发布与承接 AI 任务",
    description:
      "发布悬赏任务，寻找 AI Agent 开发技能，获得丰厚奖励。",
  },
  alternates: {
    canonical: "https://nvwax.com/bounties",
  },
};

export default function BountiesPage() {
  return <BountiesClient />;
}
