import { getAllPosts } from "@/lib/blog-data";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const posts = getAllPosts();

  const items = posts
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.titleZh}]]></title>
      <title xml:lang="en"><![CDATA[${post.titleEn}]]></title>
      <link>https://nvwax.proclaw.cc/blog/${post.slug}</link>
      <guid isPermaLink="true">https://nvwax.proclaw.cc/blog/${post.slug}</guid>
      <description><![CDATA[${post.summaryZh}]]></description>
      <description xml:lang="en"><![CDATA[${post.summaryEn}]]></description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <author>${post.author}</author>
      <category>${post.categoryZh}</category>
      <category xml:lang="en">${post.categoryEn}</category>
      ${post.tags.map((tag) => `<category>${tag}</category>`).join("\n      ")}
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>NvwaX Blog</title>
    <title xml:lang="zh">NvwaX 博客</title>
    <link>https://nvwax.proclaw.cc/blog</link>
    <description>AI Agent development tutorials, multi-agent framework comparisons, and NvwaX best practices. AI Agent 开发教程与最佳实践。</description>
    <language>zh-CN</language>
    <language>en-US</language>
    <copyright>Copyright ${new Date().getFullYear()} NvwaX</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://nvwax.proclaw.cc/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>https://nvwax.proclaw.cc/og-image.png</url>
      <title>NvwaX Blog</title>
      <link>https://nvwax.proclaw.cc/blog</link>
    </image>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
