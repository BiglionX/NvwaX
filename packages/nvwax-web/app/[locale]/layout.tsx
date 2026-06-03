import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import "./globals.css";
import MainLayout from "@/components/Layout/MainLayout";
import Providers from "@/components/Providers";
import { routing } from '@/src/i18n/routing';

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

  const titleZh = "NvwaX - 虚拟公司制造工厂 | 轻松创建个性化的虚拟公司";
  const titleEn = "NvwaX - Virtual Company Factory | Easily Create Your AI Virtual Company";
  const descZh = "NvwaX 是一个虚拟公司制造工厂，帮你轻松创建个性化的 AI 虚拟公司。支持搜索和管理 AI Agent，组建 AiTeam，用 AI 智能体驱动你的业务。";
  const descEn = "NvwaX is a Virtual Company Factory that helps you easily create personalized AI Virtual Companies. Search and manage AI Agents, build AiTeams, and power your business with AI agents.";

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
      "虚拟公司",
      "Virtual Company",
      "AI Agent",
      "AI智能体",
      "AiTeam",
      "AI团队",
      "人工智能代理",
      "Agent搜索",
      "AI Marketplace",
      "NvwaX",
      "智能体平台",
      "AI Agent平台",
      "开源AI",
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
    alternates: {
      canonical: `https://nvwax.proclaw.cc/${locale}`,
      languages: {
        'zh': 'https://nvwax.proclaw.cc/zh',
        'en': 'https://nvwax.proclaw.cc/en',
      },
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NvwaX",
  alternateName: "NvwaX 虚拟公司制造工厂",
  url: "https://nvwax.proclaw.cc",
  description:
    "虚拟公司制造工厂 - 轻松创建个性化的 AI 虚拟公司，搜索和管理 AI Agent，组建 AiTeam",
  inLanguage: "zh-CN",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://nvwax.proclaw.cc/search?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
