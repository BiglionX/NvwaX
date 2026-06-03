import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "首页 - 虚拟公司制造工厂 | 轻松创建个性化的虚拟公司",
  description:
    "NvwaX 虚拟公司制造工厂，帮你轻松创建个性化的 AI 虚拟公司。搜索和管理 AI Agent，组建 AiTeam，用 AI 智能体驱动你的业务。",
  openGraph: {
    title: "NvwaX - 虚拟公司制造工厂",
    description:
      "轻松创建个性化的虚拟公司。搜索240+ AI Agent，组建 AiTeam，用 AI 智能体驱动业务。",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
