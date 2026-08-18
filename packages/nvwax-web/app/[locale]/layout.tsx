import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import "./globals.css";
import MainLayout from "@/components/Layout/MainLayout";
import Providers from "@/components/Providers";
import { routing } from '@/src/i18n/routing';
import {
  alternatesFor,
  organizationJsonLd,
  softwareApplicationJsonLd,
  webSiteJsonLd,
} from '@/lib/seo';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const titleZh = "NvwaX v2.2.0 - 虚拟公司制造工厂 | 轻松创建个性化的虚拟公司";
  const titleEn = "NvwaX v2.2.0 - Virtual Company Factory | Create Your AI Virtual Company";
  const descZh = "NvwaX v2.2.0 虚拟公司制造工厂。Structured Output 引擎、图状态机、动态 Agent 注册表、YAML DSL、反思学习系统、MCP 协议。搜索 240+ AI Agent，组建 AiTeam，用 AI 智能体驱动业务。";
  const descEn = "NvwaX v2.2.0 - Virtual Company Factory. Structured Output Engine (99% reliability), Graph State Machine, Dynamic Agent Registry, YAML DSL, Reflection Learning, MCP Protocol. Search 240+ AI Agents, build AiTeams.";

  const title = locale === 'en' ? titleEn : titleZh;
  const description = locale === 'en' ? descEn : descZh;

  return {
    metadataBase: new URL("https://nvwax.proclaw.cc"),
    title: {
      default: title,
      template: "%s | NvwaX",
    },
    description,
    keywords: [
      // 核心产品词
      "NvwaX",
      "虚拟公司",
      "Virtual Company",
      "AI Agent",
      "AI智能体",
      "AiTeam",
      "AI团队",
      "人工智能代理",
      "Agent搜索",
      "AI Marketplace",
      // v2.2.0 新功能关键词
      "Structured Output",
      "图状态机",
      "Graph State Machine",
      "动态Agent注册表",
      "Dynamic Agent Registry",
      "YAML DSL",
      "声明式YAML",
      "反思学习",
      "Reflection Learning",
      "MCP Protocol",
      "Model Context Protocol",
      // v2.1.0 功能
      "行业插件",
      "Industry Plugin",
      "能力注册API",
      "Action输出扩展",
      "插件上下文注入",
      // 通用
      "智能体平台",
      "AI Agent平台",
      "开源AI",
      "开源AI Agent",
      "CrewAI",
      "LangGraph",
      "AI工作流",
      "多智能体协作",
    ],
    openGraph: {
      title,
      description,
      url: "https://nvwax.proclaw.cc",
      siteName: "NvwaX",
      locale: locale === 'en' ? 'en_US' : 'zh_CN',
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico", type: "image/x-icon" },
        { url: "/logo.png", type: "image/png" },
      ],
      apple: [{ url: "/logo.png", type: "image/png" }],
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || "YOUR_GOOGLE_VERIFICATION_CODE",
    },
    alternates: alternatesFor('/', locale),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'zh' | 'en')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale === 'en' ? 'en' : 'zh-CN'}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 主题预置脚本：首帧前按 localStorage/系统偏好应用 .dark，避免暗色模式闪烁（FOUC） */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nvwax-theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})();`,
          }}
        />
        {/* GEO 结构化数据：WebSite（站内搜索）+ Organization + SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd()) }}
        />
      </head>
      <body className="min-h-full">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <MainLayout>{children}</MainLayout>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
