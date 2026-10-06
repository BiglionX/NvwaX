import type { Metadata } from "next";
import APIDocsClient from "./APIDocsClient";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn ? "API Documentation - NvwaX" : "API 文档 - NvwaX",
    description: isEn
      ? "NvwaX REST API complete reference documentation — includes all endpoints for Marketplace, Agents, AiTeams, Search, and Export with usage examples."
      : "NvwaX RESTful API 完整参考文档，包含所有端点、参数和使用示例。涵盖 Marketplace、Agent、AiTeam、搜索和导出等全部接口。",
    keywords: [
      "NvwaX API", "API Documentation", "REST API", "Agent API",
      "AI Team API", "Marketplace API", "AI Agent",
      "API 参考", "RESTful API", "开发者文档",
    ],
    alternates: {
      canonical: "https://nvwax.proclaw.cc/api/docs",
    },
    openGraph: {
      title: isEn ? "API Documentation - NvwaX" : "API 文档 - NvwaX",
      description: isEn
        ? "Complete NvwaX API reference with endpoints, parameters, and examples."
        : "NvwaX API 完整参考，包含端点说明、参数定义和使用示例。",
      url: "https://nvwax.proclaw.cc/api/docs",
      siteName: "NvwaX",
      type: "article",
    },
  };
}

export default function APIDocsPage() {
  return <APIDocsClient />;
}
