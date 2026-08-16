import type { Metadata } from "next";
import LoginClient from "./Client";
import { alternatesFor } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  const title = isEn
    ? "Login - NvwaX AI Agent & AiTeam Platform"
    : "登录 - NvwaX AI Agent & AiTeam 平台";
  const description = isEn
    ? "Log in to your NvwaX account to manage your AI Agents, AiTeams, and projects. Supports email and admin login."
    : "登录 NvwaX 账户，管理您的 AI Agent、AiTeam 和项目。支持邮箱登录和管理员登录。";

  return {
    title,
    description,
    openGraph: {
      title: isEn ? "NvwaX Login" : "NvwaX 登录",
      description: isEn
        ? "Log in to NvwaX to start managing your AI Agents and AiTeams."
        : "登录 NvwaX 平台，开始管理您的 AI Agent 和 AiTeam。",
    },
    alternates: alternatesFor("/login", locale),
  };
}

export default function LoginPage() {
  return <LoginClient />;
}
