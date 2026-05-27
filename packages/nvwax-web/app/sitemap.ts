import type { MetadataRoute } from 'next';

const BASE_URL = 'https://nvwax.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/marketplace`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/nvwa`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/developer`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/projects`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/bounties`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/team-skills`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ];

  // 动态页面：从 API 获取已发布的 Agent/团队
  const dynamicPages: MetadataRoute.Sitemap = [];
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'https://nvwax.proclaw.cc/api';

    const [agentsRes, teamsRes] = await Promise.allSettled([
      fetch(`${apiUrl}/marketplace/agents?limit=50`, {
        signal: AbortSignal.timeout(5000),
      }),
      fetch(`${apiUrl}/aiteams/published?limit=50`, {
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    if (agentsRes.status === 'fulfilled') {
      const data = await agentsRes.value.json();
      const agents = data?.data?.data || data?.data || [];
      if (Array.isArray(agents)) {
        dynamicPages.push(
          ...agents.map((agent: { id: string | number; updatedAt?: string }) => ({
            url: `${BASE_URL}/marketplace/agents/${agent.id}`,
            lastModified: new Date(agent.updatedAt || Date.now()),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          }))
        );
      }
    }

    if (teamsRes.status === 'fulfilled') {
      const data = await teamsRes.value.json();
      const teams = data?.data?.aiteams || data?.data || [];
      if (Array.isArray(teams)) {
        dynamicPages.push(
          ...teams.map((team: { id: string | number; updatedAt?: string }) => ({
            url: `${BASE_URL}/marketplace/aiteams/${team.id}`,
            lastModified: new Date(team.updatedAt || Date.now()),
            changeFrequency: 'daily' as const,
            priority: 0.8,
          }))
        );
      }
    }
  } catch (error) {
    console.error('Failed to fetch dynamic pages for sitemap:', error);
  }

  return [...staticPages, ...dynamicPages];
}
