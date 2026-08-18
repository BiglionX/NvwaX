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
    alternateName: 'NvwaX 虚拟公司制造工厂',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      'NvwaX 是一个 AI 虚拟公司制造工厂平台，支持搜索 AI Agent、组建 AiTeam（AI 团队）、复用 Team Skills 团队模板，并用 AI 智能体驱动真实业务。',
    sameAs: ['https://github.com/BigLionX/NvwaX'],
  };
}

/** 站点搜索行为（支持 /search?q= 站内搜索） */
export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'NvwaX',
    alternateName: 'NvwaX 虚拟公司制造工厂',
    url: SITE_URL,
    description:
      '虚拟公司制造工厂 - 轻松创建个性化的 AI 虚拟公司，搜索和管理 AI Agent，组建 AiTeam',
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
      'NvwaX v2.2.0 虚拟公司制造工厂：Structured Output 引擎（图状态机）、动态 Agent 注册表、YAML DSL、反思学习系统、MCP 协议。搜索 240+ AI Agent，组建 AiTeam 团队，复用 Team Skills 模板，发布悬赏任务。',
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
          text: 'NvwaX 是一个开源的 AI Agent 与 AiTeam 平台，帮助开发者搜索、发现、创建和发布 AI 智能体与 AI 团队。平台提供智能体市场、团队协作模板、智能工作流、悬赏任务系统等能力。',
        },
      },
      {
        '@type': 'Question',
        name: 'v2.2.0 有哪些核心升级？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'v2.2.0 主要升级包括：1) Structured Output 引擎 - 3级降级策略，输出可靠性从80%提升到99%；2) 图状态机流程引擎 - 支持条件分支、Checkpoint、Human-in-the-loop；3) 动态 Agent 注册表 - 突破5种硬编码类型限制；4) 声明式 YAML DSL；5) 反思学习系统；6) MCP 协议支持。',
        },
      },
      {
        '@type': 'Question',
        name: '如何创建 AI Agent？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '通过 Nvwa 智能体工厂创建：对话说清需求，Nvwa 引导完成需求分析、数据源配置、技能匹配，自动搜索模板并审查配置。支持对话式（7步引导）和状态机两种创建模式。',
        },
      },
      {
        '@type': 'Question',
        name: '什么是 AiTeam？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AiTeam 是 NvwaX 的核心概念，代表一个 AI Agent 协作团队。每个团队包含多个协同工作的 Agent（CEO、分析师、工程师等），用于完成特定业务目标。支持团队模板、一键导出为 CrewAI/LangGraph 格式。',
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
