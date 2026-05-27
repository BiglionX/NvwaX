import type { Metadata } from "next";
import MarketplaceClient from "./Client";

export const metadata: Metadata = {
  title: "Agent 广场 - AI Agent & 虚拟公司 市场",
  description:
    "发现和探索优秀的 AI Agent、虚拟公司和 AI 团队。从 GitHub、HuggingFace 等多数据源搜索智能体，找到适合您项目的 AI 解决方案。",
  openGraph: {
    title: "NvwaX Agent 广场 - AI Agent & 虚拟公司 市场",
    description:
      "发现240+ AI Agent，探索虚拟公司和 AI 团队。开源智能体搜索平台。",
  },
  alternates: {
    canonical: "https://nvwax.com/marketplace",
  },
};

export default function MarketplacePage() {
  return <MarketplaceClient />;
}

