import type { Metadata } from "next";
import LoginClient from "./Client";

export const metadata: Metadata = {
  title: "登录 - NvwaX AI Agent & 虚拟公司 平台",
  description:
    "登录 NvwaX 账户，管理您的 AI Agent、虚拟公司和项目。支持邮箱登录和管理员登录。",
  openGraph: {
    title: "NvwaX 登录",
    description:
      "登录 NvwaX 平台，开始管理您的 AI Agent 和虚拟公司。",
  },
  alternates: {
    canonical: "https://nvwax.com/login",
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
