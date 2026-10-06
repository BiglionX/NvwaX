import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // 允许所有爬虫访问所有页面
        userAgent: "*",
        allow: "/",
      },
      {
        // 额外允许 AI 爬虫（OpenAI, Anthropic, Google AI）
        userAgent: [
          "GPTBot",
          "Claude-Web",
          "Google-Extended",
          "CCBot",
          "anthropic-ai",
          "Bytespider",
          "Diffbot",
          "FacebookBot",
          "LinkedInBot",
        ],
        allow: "/",
      },
    ],
    sitemap: [
      "https://nvwax.proclaw.cc/sitemap.xml",
      "https://nvwax.proclaw.cc/sitemap-0.xml",
    ],
    // 允许搜索引擎直接访问博客 RSS 和 sitemap
    host: "https://nvwax.proclaw.cc",
  };
}
