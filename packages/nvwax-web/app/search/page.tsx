import type { Metadata } from "next";
import SearchClient from "./Client";

export const metadata: Metadata = {
  title: "Agent & Skill 搜索 - AI Agent 搜索引擎",
  description:
    "在 NvwaX 搜索 AI Agent 和 Skill，支持智能搜索、全网搜索和本地数据库缓存。快速发现 GitHub、Gitee、HuggingFace 等平台的优秀项目。",
  openGraph: {
    title: "NvwaX Agent & Skill 搜索",
    description:
      "智能搜索 AI Agent 和 Skill，优先本地数据库，无结果则全网搜索。",
  },
  alternates: {
    canonical: "https://nvwax.com/search",
  },
};

export default function SearchPage() {
  return <SearchClient />;
}

