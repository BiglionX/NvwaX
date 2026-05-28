import type { Metadata } from "next";
import RegisterClient from "./Client";

export const metadata: Metadata = {
  title: "注册 - NvwaX AI Agent & AiTeam 平台",
  description:
    "注册 NvwaX 账户，开始搜索、发现和创建 AI Agent 与 AiTeam。免费加入 AI 开发者社区。",
  openGraph: {
    title: "NvwaX 注册 - 创建您的 AI Agent 账户",
    description:
      "加入 NvwaX，探索 AI Agent 和 AiTeam 的无限可能。",
  },
  alternates: {
    canonical: "https://nvwax.com/register",
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}

