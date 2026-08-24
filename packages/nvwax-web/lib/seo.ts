/**
 * SEO / GEO 工具库
 *
 * 统一管理站点的：
 *  - 站点基址（SITE_URL）
 *  - 多语言路径（zh 默认语言不带前缀，en 带 /en）
 *  - canonical / hreflang alternates
 *  - 结构化数据（JSON-LD）：Organization / WebSite / SoftwareApplication / FAQPage / BreadcrumbList
 *
 * GEO（Generative Engine Optimization）说明：
 * 生成式引擎（ChatGPT、Perplexity、Gemini、Copilot、AI Overviews 等）依赖结构化数据、
 * 清晰的站点描述与可引用的权威内容来理解并引用站点。本文件为全站统一提供这些资产。
 */

export const PRODUCTION_URL = 'https://nvwax.proclaw.cc';

/**
 * 站点基址。
 *
 * 注意：Next.js 生产构建时 .env.local 的优先级高于 .env.production，
 * 而仓库内的 .env.local 指向 http://localhost:3000。
 * 因此生产环境（NODE_ENV=production）强制使用正式域名，避免
 * canonical / hreflang / llms.txt 链接错误地指向 localhost。
 */
export const SITE_URL =
  process.env.NODE_ENV === 'production'
    ? PRODUCTION_URL
    : process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_URL;

/** API 基址（同样在生产环境强制使用正式域名，规避 .env.local 覆盖） */
export function getApiBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || `${SITE_URL}/api`;
  return process.env.NODE_ENV === 'production' ? `${PRODUCTION_URL}/api` : apiUrl;
}

export const DEFAULT_LOCALE = 'zh';
export const LOCALES = ['zh', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** 生成带 locale 前缀的路径（zh 默认不带前缀，en 带 /en 前缀） */
export function localizedPath(path: string, locale: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) {
    return normalized === '/' ? '/' : normalized;
  }
  return `/en${normalized === '/' ? '' : normalized}`;
}

/** 生成绝对 URL（用于 canonical / hreflang / sitemap） */
export function absoluteUrl(path: string, locale: string): string {
  return `${SITE_URL}${localizedPath(path, locale)}`;
}

/** 生成 canonical + 双语 hreflang alternates（Metadata.alternates） */
export function alternatesFor(path: string, locale: string) {
  return {
    canonical: absoluteUrl(path, locale),
    languages: {
      zh: absoluteUrl(path, 'zh'),
      en: absoluteUrl(path, 'en'),
    },
  };
}

/* ────────────────────────── JSON-LD 构建器 ────────────────────────── */

/** 站点组织信息 */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NvwaX',
    alternateName: 'NvwaX AI 虚拟公司操作系统',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      'NvwaX 是帮你组建 AI 公司的操作系统：注册团队、设置岗位（CEO、市场总监、文案...）、分配任务、产出成果。招聘 240+ AI 合伙人，组建你的 AI 虚拟公司。',
    sameAs: ['https://github.com/BigLionX/NvwaX'],
  };
}

/** 站点搜索行为（支持 /search?q= 站内搜索） */
export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'NvwaX',
    alternateName: 'NvwaX AI 虚拟公司操作系统',
    url: SITE_URL,
    description:
      '帮你组建 AI 公司的操作系统 - 注册团队、设置岗位、分配任务、产出成果，组建你的 AI 虚拟公司。',
    inLanguage: 'zh-CN',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** 软件应用结构化数据（帮助 AI 引擎理解这是一款可用的 SaaS 产品） */
export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'NvwaX',
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'NvwaX AI 虚拟公司操作系统：注册团队、设置岗位、分配任务、产出成果。招聘 240+ AI 合伙人，组建 AiTeam（AI 公司），复用 Team Skills 模板，发布悬赏任务。',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CNY',
      description: '免费注册开始使用，另有 Pro 与 Enterprise 付费套餐',
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'version', value: '2.2.0' },
      { '@type': 'PropertyValue', name: 'agents', value: '240+' },
      { '@type': 'PropertyValue', name: 'dataSources', value: '8+' },
      { '@type': 'PropertyValue', name: 'license', value: 'MIT' },
    ],
  };
}

/** 首页 FAQ 结构化数据（GEO 高价值：AI 引擎直接引用问答内容） */
export function homePageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'NvwaX 是什么？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'NvwaX 是帮你组建 AI 公司的操作系统。与传统"创建单个智能体"的平台不同，NvwaX 以 AI Team Builder 为核心：你注册一家虚拟公司（营销、客服、内容创作等），AI 架构师为你设置岗位（CEO、市场总监、文案...），招聘 AI 合伙人，分配任务并产出成果。',
        },
      },
      {
        '@type': 'Question',
        name: '如何组建一家 AI 虚拟公司？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '在 NvwaX 选择公司类型（营销、客服、内容创作、数据分析...），描述核心目标，AI 架构师会自动设计岗位（CEO、市场总监、文案等）、匹配 AI 合伙人并分配任务，最终生成可下载的公司配置文档包。',
        },
      },
      {
        '@type': 'Question',
        name: '什么是 AI 合伙人？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI 合伙人是 NvwaX 对单个智能体的新定位：创建单个 Agent 不再是目的，而是"招聘员工"的手段——为你的 AI 公司招募具备特定岗位能力的 AI 合伙人（如客服专员、数据分析师、文案）。',
        },
      },
      {
        '@type': 'Question',
        name: '什么是 AiTeam？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AiTeam 是 NvwaX 的核心概念，即一支 AI 团队（虚拟公司）。每个团队包含多个协同工作的 AI 合伙人（CEO、市场总监、工程师等），用于完成特定业务目标。支持团队模板、一键导出为 CrewAI/LangGraph 格式。',
        },
      },
      {
        '@type': 'Question',
        name: '支持哪些数据源？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '目前支持 GitHub（200+ Agents）、Gitee、ModelScope、百度、阿里、腾讯、华为、京东等多个数据源。采用混合搜索策略，优先本地数据库，无结果时全网搜索。',
        },
      },
      {
        '@type': 'Question',
        name: 'MCP 协议是什么？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Model Context Protocol（MCP）是标准化的 AI Agent 工具调用协议。NvwaX v2.2.0 暴露了6个 MCP Tools（搜索Agent、设计团队、匹配技能、分析需求等），支持 CrewAI、LangGraph、OpenAgents 等外部框架调用。',
        },
      },
    ],
  };
}

/** FAQPage 结构化数据（GEO 高价值：AI 引擎直接引用问答内容） */
export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/** 面包屑结构化数据 */
export function breadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
