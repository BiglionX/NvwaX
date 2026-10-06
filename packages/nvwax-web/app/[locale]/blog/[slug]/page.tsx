import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllPosts, getRelatedPosts, getReadTime } from "@/lib/blog-data";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd, absoluteUrl, alternatesFor } from "@/lib/seo";
import { Calendar, Clock, Tag, ArrowLeft, User, ChevronRight } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const posts = getAllPosts();
  const locales = ["zh", "en"];
  return locales.flatMap((locale) =>
    posts.map((post) => ({ locale, slug: post.slug }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const isEn = locale === "en";
  const title = isEn ? post.titleEn : post.titleZh;
  const description = isEn ? post.summaryEn : post.summaryZh;
  const url = absoluteUrl(`/blog/${slug}`, locale);

  return {
    title: `${title} - NvwaX Blog`,
    description,
    keywords: post.tags,
    authors: [{ name: post.author }],
    openGraph: {
      title: `${title} - NvwaX Blog`,
      description,
      url,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      tags: post.tags,
      siteName: "NvwaX",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - NvwaX Blog`,
      description,
    },
    alternates: alternatesFor(`/blog/${slug}`, locale),
  };
}

/** 简易 Markdown 渲染（支持标题、列表、粗体、代码块、链接） */
function renderMarkdown(content: string): string {
  let html = content
    // 代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const escaped = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      return `<pre class="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto my-4 text-sm font-mono"><code class="language-${lang || "text"}">${escaped}</code></pre>`;
    })
    // 行内代码
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    // 表格
    .replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g, (_, header, body) => {
      const headers = header.split("|").filter((h: string) => h.trim()).map((h: string) => `<th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">${h.trim()}</th>`).join("");
      const rows = body.trim().split("\n").map((row: string) => {
        const cells = row.split("|").filter((c: string) => c.trim()).map((c: string) => `<td class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">${c.trim()}</td>`).join("");
        return `<tr>${cells}</tr>`;
      }).join("");
      return `<div class="overflow-x-auto my-4"><table class="w-full border-collapse rounded-lg overflow-hidden">${headers ? `<thead><tr>${headers}</tr></thead>` : ""}<tbody>${rows}</tbody></table></div>`;
    })
    // 标题 h2
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">$1</h2>')
    // 标题 h3
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-2">$1</h3>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-white">$1</strong>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // 无序列表
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-700 dark:text-gray-300 my-1">$1</li>')
    // 有序列表
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 text-gray-700 dark:text-gray-300 my-1 list-decimal">$2</li>')
    // 段落
    .replace(/\n\n/g, '</p><p class="my-4 text-gray-700 dark:text-gray-300 leading-relaxed">')
    // 换行
    .replace(/\n/g, "<br>");

  // 包裹段落
  html = `<p class="my-4 text-gray-700 dark:text-gray-300 leading-relaxed">${html}</p>`;
  // 合并连续的列表项
  html = html.replace(/(<li[^>]*>.*<\/li>)(<br>)?/g, (match) => {
    if (!match.includes("</p>") && !match.includes("</h")) {
      return match.replace(/<br>$/, "");
    }
    return match;
  });
  return html;
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const isEn = locale === "en";
  const relatedPosts = getRelatedPosts(post, 3);
  const readTime = getReadTime(post, locale);
  const content = isEn ? post.contentEn : post.contentZh;
  const title = isEn ? post.titleEn : post.titleZh;
  const summary = isEn ? post.summaryEn : post.summaryZh;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: summary,
    author: { "@type": "Person", name: post.author },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    publisher: {
      "@type": "Organization",
      name: "NvwaX",
      url: "https://nvwax.proclaw.cc",
    },
    url: absoluteUrl(`/blog/${slug}`, locale),
    keywords: post.tags.join(", "),
    articleSection: isEn ? post.categoryEn : post.categoryZh,
    wordCount: content.length,
  };

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/", locale) },
          { name: isEn ? "Blog" : "博客", url: absoluteUrl("/blog", locale) },
          { name: title, url: absoluteUrl(`/blog/${slug}`, locale) },
        ])}
      />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</Link>
          <ChevronRight size={14} />
          <Link href="/blog" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {isEn ? "Blog" : "博客"}
          </Link>
          <ChevronRight size={14} />
          <span className="text-gray-700 dark:text-gray-300 truncate max-w-xs">{title}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
              {isEn ? post.categoryEn : post.categoryZh}
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
            {title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">{summary}</p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <User size={14} />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Calendar size={14} />
              {new Date(post.publishedAt).toLocaleDateString(isEn ? "en-US" : "zh-CN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Clock size={14} />
              {readTime} min {isEn ? "read" : "阅读"}
            </span>
          </div>
        </header>

        {/* Content */}
        <div
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />

        {/* Tags */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <Tag size={14} className="text-gray-500 dark:text-gray-400" />
            {post.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {isEn ? "Related Articles" : "相关文章"}
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all group"
                >
                  <span className="text-xs text-blue-600 dark:text-blue-400 mb-1 block">
                    {isEn ? related.categoryEn : related.categoryZh}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {isEn ? related.titleEn : related.titleZh}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Back to Blog */}
        <div className="mt-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft size={16} />
            {isEn ? "Back to Blog" : "返回博客"}
          </Link>
        </div>
      </article>
    </>
  );
}
