import type { Metadata } from "next";
import SearchClient from "./Client";

export const metadata: Metadata = {
  title: "AI 搜索 Agent - NvwaX 智能搜索",
  description:
    "使用 AI Search Agent 对话式搜索 AI Agent 和 Skill。通过自然语言描述需求，AI 理解意图后从 GitHub、Gitee、ModelScope 等平台智能搜索。",
  openGraph: {
    title: "AI 搜索 Agent - NvwaX",
    description:
      "对话式 AI 智能搜索，理解自然语言，精准发现 Agent 和 Skill。",
  },
  alternates: {
    canonical: "https://nvwax.com/search",
  },
};

export default function SearchPage() {
  return <SearchClient />;
}

