import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/Layout/MainLayout";
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nvwax.com"),
  title: {
    default: "NvwaX - AI Agent & 虚拟公司 制造工厂",
    template: "%s | NvwaX",
  },
  description:
    "NvwaX 是一个开源的 AI Agent 和虚拟公司搜索、发现和管理平台。支持从 GitHub、HuggingFace 等多数据源搜索 AI Agent，创建虚拟公司（AI团队）和智能体。",
  keywords: [
    "AI Agent",
    "AI智能体",
    "虚拟公司",
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
    title: "NvwaX - AI Agent & 虚拟公司 制造工厂",
    description:
      "搜索 · 发现 · 创建 · 发布 AI Agent 和虚拟公司。开源的智能体搜索与协作平台。",
    url: "https://nvwax.com",
    siteName: "NvwaX",
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "NvwaX - AI Agent & 虚拟公司 制造工厂",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NvwaX - AI Agent & 虚拟公司 制造工厂",
    description: "搜索 · 发现 · 创建 · 发布 AI Agent 和虚拟公司",
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
    google: "YOUR_GOOGLE_VERIFICATION_CODE",
  },
  alternates: {
    canonical: "https://nvwax.com",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NvwaX",
  alternateName: "NvwaX AI Agent & Virtual Company Platform",
  url: "https://nvwax.com",
  description:
    "AI Agent & 虚拟公司 制造工厂 - 搜索、发现、创建、发布智能体和虚拟公司",
  inLanguage: "zh-CN",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://nvwax.com/search?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full">
        <Providers>
          <MainLayout>{children}</MainLayout>
        </Providers>
      </body>
    </html>
  );
}
