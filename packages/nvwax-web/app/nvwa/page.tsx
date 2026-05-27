import type { Metadata } from "next";
import NvwaClient from "./Client";

export const metadata: Metadata = {
  title: "Nvwa 智能体工厂 - 创建 AI Agent & 虚拟公司",
  description:
    "通过对话式交互轻松创建专属 AI Agent 和虚拟公司。Nvwa 智能体之母帮您一步步完成需求分析、数据源配置、技能匹配等流程。",
  openGraph: {
    title: "NvwaX 智能体工厂 - Nvwa",
    description:
      "AI Agent 智能体创建平台，通过对话快速构建您的专属智能体。",
  },
  alternates: {
    canonical: "https://nvwax.com/nvwa",
  },
};

export default function NvwaPage() {
  return <NvwaClient />;
}
