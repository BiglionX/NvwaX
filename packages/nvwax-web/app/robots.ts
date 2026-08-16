import type { MetadataRoute } from 'next';

/**
 * robots.txt（SEO/GEO）
 *
 * - 全站允许抓取（目录/内容页已对爬虫开放，见 middleware.ts）
 * - 显式放行主流搜索引擎与生成式 AI 爬虫（GPTBot / ClaudeBot / PerplexityBot 等），
 *   供 GEO（Generative Engine Optimization）收录
 * - 用户私有路径（dashboard / profile / admin / projects 等）一律 disallow
 */

// 所有爬虫（含 AI 爬虫）均禁止抓取的私有/系统路径
const DISALLOWED = [
  '/api/',
  '/admin/',
  '/_next/',
  '/dashboard',
  '/profile',
  '/settings',
  '/token-usage',
  '/token-purchase',
  '/agent-repository',
  '/my-bounties',
  '/microbiz',
  '/projects',
  '/bounties/create',
  '/oauth/',
  '/portal/',
  '/test-connection',
  '/test-v22',
];

// 生成式 AI / 搜索增强爬虫（GEO 重点）
const AI_CRAWLERS = [
  'GPTBot', // OpenAI 网页爬虫（GPT 训练/引用）
  'OAI-SearchBot', // OpenAI 搜索（ChatGPT 联网检索）
  'ChatGPT-User', // ChatGPT 按需访问
  'ClaudeBot', // Anthropic Claude 爬虫
  'Claude-Web', // Anthropic Claude 网页访问
  'anthropic-ai', // Anthropic 合规爬虫
  'PerplexityBot', // Perplexity 搜索
  'Google-Extended', // Google AI（Gemini / AI Overviews）
  'Applebot-Extended', // Apple AI（Siri / Apple Intelligence）
  'cohere-ai', // Cohere
  'Amazonbot', // Amazon（含 Rufus）
  'Meta-ExternalAgent', // Meta AI
  'Diffbot', // Diffbot 知识图谱
  'CCBot', // Common Crawl
  'Bytespider', // 字节跳动（豆包/即梦）
  'YouBot', // You.com
  'ExaBot', // Exa 神经搜索
  'DuckAssistBot', // DuckDuckGo AI
];

// 传统搜索引擎
const SEARCH_CRAWLERS = [
  'Googlebot',
  'Google-InspectionTool',
  'Bingbot',
  'BingPreview',
  'Baiduspider',
  'YandexBot',
  'Sogou',
  '360Spider',
  'DuckDuckBot',
];

// 社交/分享卡片抓取（OG 预览）
const SOCIAL_CRAWLERS = [
  'facebookexternalhit',
  'Twitterbot',
  'LinkedInBot',
  'Discordbot',
  'Slackbot',
  'TelegramBot',
  'WhatsApp',
  'Viber',
  'SkypeUriPreview',
  'Pinterest',
  'Applebot',
];

const ruleFor = (userAgent: string) => ({
  userAgent,
  allow: '/',
  disallow: DISALLOWED,
});

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 兜底规则：所有未单独列出的爬虫
      { userAgent: '*', allow: '/', disallow: DISALLOWED },
      ...AI_CRAWLERS.map(ruleFor),
      ...SEARCH_CRAWLERS.map(ruleFor),
      ...SOCIAL_CRAWLERS.map(ruleFor),
    ],
    // GEO：为 LLM 提供站点索引（llmstxt.org 规范），建议人工向
    // OpenAI / Anthropic / Perplexity / Google 提交后生效
    sitemap: 'https://nvwax.proclaw.cc/sitemap.xml',
  };
}
