import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { AgentDetailView } from "./AgentDetailView";
import JsonLd from "@/components/JsonLd";
import {
  absoluteUrl,
  alternatesFor,
  breadcrumbJsonLd,
  getApiBaseUrl,
} from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

interface AgentDetail {
  id: string;
  name: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  rating?: number;
  reviewCount?: number;
  downloadCount?: number;
  tags?: string[];
  version?: string;
  publishStatus?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

async function fetchAgent(id: string): Promise<AgentDetail | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/v1/marketplace/agents/${id}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      // 公开数据可缓存
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as AgentDetail) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const agent = await fetchAgent(id);
  if (!agent) {
    return {
      title: locale === "en" ? "Agent not found" : "未找到 Agent",
      alternates: alternatesFor(`/marketplace/agents/${id}`, locale),
    };
  }
  return {
    title: `${agent.name} | NvwaX Marketplace`,
    description: agent.description || "",
    openGraph: {
      title: agent.name,
      description: agent.description || "",
    },
    alternates: alternatesFor(`/marketplace/agents/${id}`, locale),
  };
}

export default async function AgentDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "marketplace" });
  const agent = await fetchAgent(id);

  if (!agent) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          {
            name: t("title"),
            url: absoluteUrl("/marketplace", locale),
          },
          {
            name: agent.name,
            url: absoluteUrl(`/marketplace/agents/${id}`, locale),
          },
        ])}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/marketplace"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
        >
          ← {t("backToList")}
        </Link>

        <AgentDetailView agent={agent} locale={locale} />
      </div>
    </>
  );
}