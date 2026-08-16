import type { MetadataRoute } from 'next';
import { absoluteUrl, getApiBaseUrl } from '@/lib/seo';

/**
 * sitemap.xml（SEO/GEO）
 *
 * - 静态公开页面：中英双语（zh 默认语言不带前缀，en 带 /en），
 *   每项带 hreflang alternates
 * - 动态页面：已发布的 Team Skill 详情（/marketplace/team-skills/:id）
 * - 移除用户私有路径（/projects、/dashboard、/admin 等，见 robots.txt）
 */

// 静态公开页面（path 不含 locale 前缀；home 为 '/'）
const STATIC_PAGES: Array<{
  path: string;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
}> = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/marketplace', priority: 0.9, changeFrequency: 'daily' },
  { path: '/nvwa', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/team-skills', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/bounties', priority: 0.7, changeFrequency: 'daily' },
  { path: '/faq', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/search', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/developer', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/dsh', priority: 0.6, changeFrequency: 'monthly' },
  {
    path: '/developer/api-reference',
    priority: 0.7,
    changeFrequency: 'weekly',
  },
  { path: '/login', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/register', priority: 0.4, changeFrequency: 'monthly' },
  // GEO 资产（LLM 索引文件，llmstxt.org 规范）
  { path: '/llms.txt', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/llms-en.txt', priority: 0.3, changeFrequency: 'yearly' },
];

// 为每个页面生成中英双语 sitemap 条目（带 hreflang alternates）
function entriesForPage(
  page: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' },
  lastModified?: Date,
): MetadataRoute.Sitemap {
  const { path, priority, changeFrequency } = page;
  return (['zh', 'en'] as const).map((locale) => ({
    url: absoluteUrl(path, locale),
    lastModified: lastModified || new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: {
        zh: absoluteUrl(path, 'zh'),
        en: absoluteUrl(path, 'en'),
      },
    },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.flatMap((page) =>
    entriesForPage(page),
  );

  // 动态页面：从公开 API 获取已发布的 Team Skill（市场详情页）
  const dynamicEntries: MetadataRoute.Sitemap = [];
  try {
    const apiUrl = getApiBaseUrl();

    const res = await fetch(`${apiUrl}/team-skills/marketplace?limit=50`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const body = await res.json();
      const skills = body?.data?.data || body?.data || [];
      if (Array.isArray(skills)) {
        for (const skill of skills as Array<{
          id: string | number;
          updatedAt?: string;
        }>) {
          const path = `/marketplace/team-skills/${skill.id}`;
          dynamicEntries.push(
            ...entriesForPage(
              { path, priority: 0.8, changeFrequency: 'weekly' },
              new Date(skill.updatedAt || Date.now()),
            ),
          );
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch dynamic pages for sitemap:', error);
  }

  return [...staticEntries, ...dynamicEntries];
}
