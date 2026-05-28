import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "首页 - AI Agent & AiTeam 制造工厂",
  description:
    "搜索、发现、创建和发布 AI Agent 与 AiTeam。开源智能体搜索与协作平台，支持多数据源搜索和 AI 团队创建。",
  openGraph: {
    title: "NvwaX - AI Agent & AiTeam 制造工厂",
    description:
      "搜索240+ AI Agent，创建 AiTeam 和 AI 团队。开源智能体协作平台。",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
