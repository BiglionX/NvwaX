import type { Metadata } from "next";
import RegisterClient from "./Client";
import { alternatesFor } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  const title = isEn
    ? "Register - NvwaX AI Agent & AiTeam Platform"
    : "注册 - NvwaX AI Agent & AiTeam 平台";
  const description = isEn
    ? "Create your NvwaX account to search, discover, and build AI Agents and AiTeams. Join the AI developer community for free."
    : "注册 NvwaX 账户，开始搜索、发现和创建 AI Agent 与 AiTeam。免费加入 AI 开发者社区。";

  return {
    title,
    description,
    openGraph: {
      title: isEn
        ? "NvwaX Sign Up - Create Your AI Agent Account"
        : "NvwaX 注册 - 创建您的 AI Agent 账户",
      description: isEn
        ? "Join NvwaX and explore the endless possibilities of AI Agents and AiTeams."
        : "加入 NvwaX，探索 AI Agent 和 AiTeam 的无限可能。",
    },
    alternates: alternatesFor("/register", locale),
  };
}

export default function RegisterPage() {
  return <RegisterClient />;
}
