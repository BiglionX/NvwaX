import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, getFeaturedPosts, getAllCategories, getReadTime } from "@/lib/blog-data";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd, absoluteUrl, alternatesFor } from "@/lib/seo";
import { BookOpen, Clock, Calendar, Tag } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  const title = isEn ? "Blog - NvwaX AI Agent Platform" : "博客 - NvwaX AI Agent 平台";
  const description = isEn
    ? "AI Agent development tutorials, multi-agent framework comparisons, and NvwaX best practices. Learn how to build AI teams with CrewAI, LangGraph, and NvwaX."
    : "AI Agent 开发教程、多智能体框架对比、NvwaX 最佳实践。学习如何用 CrewAI、LangGraph 和 NvwaX 构建 AI 团队。";

  return {
    title,
    description,
    keywords: [
      "AI Agent 教程", "多智能体", "CrewAI 教程", "LangGraph 教程",
      "AI Team", "Multi-Agent", "AI Agent Tutorial", "AI 开发",
    ],
    openGraph: {
      title,
      description,
      type: "website",
    },
    alternates: alternatesFor("/blog", locale),
  };
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  const isEn = locale === "en";
  const allPosts = getAllPosts();
  const featuredPosts = getFeaturedPosts();
  const categories = getAllCategories();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/", locale) },
          { name: isEn ? "Blog" : "博客", url: absoluteUrl("/blog", locale) },
        ])}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm mb-4">
              <BookOpen size={14} />
              {isEn ? "AI Agent Development Blog" : "AI Agent 开发博客"}
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              {isEn ? "Learn to Build AI Teams" : "学习构建 AI 团队"}
            </h1>
            <p className="text-blue-200 text-lg max-w-2xl mx-auto">
              {isEn
                ? "Tutorials, comparisons, and best practices for AI Agent development. From single Agent to multi-Agent collaboration."
                : "AI Agent 开发教程、框架对比与最佳实践。从单 Agent 到多 Agent 协作，覆盖 CrewAI、LangGraph、NvwaX 全方位指南。"}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="text-yellow-500">⭐</span>
              {isEn ? "Featured" : "精选文章"}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredPosts.slice(0, 2).map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium">
                      {isEn ? post.categoryEn : post.categoryZh}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar size={12} />
                      {new Date(post.publishedAt).toLocaleDateString(isEn ? "en-US" : "zh-CN")}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {isEn ? post.titleEn : post.titleZh}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-4">
                    {isEn ? post.summaryEn : post.summaryZh}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock size={12} />
                      {getReadTime(post, locale)} min {isEn ? "read" : "阅读"}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Tag size={16} />
            {isEn ? "Categories" : "分类浏览"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat.slug}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm border border-gray-200 dark:border-gray-700"
              >
                {isEn ? cat.nameEn : cat.nameZh} ({cat.count})
              </span>
            ))}
          </div>
        </section>

        {/* All Posts */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {isEn ? "All Articles" : "全部文章"}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all overflow-hidden"
              >
                {/* Category badge */}
                <div className="p-5 pb-0">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium">
                      {isEn ? post.categoryEn : post.categoryZh}
                    </span>
                    {post.featured && (
                      <span className="text-yellow-500 text-sm">⭐</span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {isEn ? post.titleEn : post.titleZh}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4">
                    {isEn ? post.summaryEn : post.summaryZh}
                  </p>
                </div>
                {/* Footer */}
                <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(post.publishedAt).toLocaleDateString(isEn ? "en-US" : "zh-CN")}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock size={11} />
                    {getReadTime(post, locale)} min
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
