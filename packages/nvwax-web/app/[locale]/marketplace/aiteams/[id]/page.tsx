import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { AiTeamDetailView } from "./AiTeamDetailView";
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

interface AiTeamMember {
  role: string;
  agent_type?: string;
  responsibilities?: string[];
}

interface AiTeamDetail {
  id: string;
  name: string;
  description?: string;
  category?: string;
  members?: AiTeamMember[];
  workflow?: { steps?: unknown[] };
  rating?: number;
  reviewCount?: number;
  downloadCount?: number;
  executionCount?: number;
  successRate?: number;
  tags?: string[];
  version?: string;
  thumbnailUrl?: string;
}

async function fetchAiTeam(id: string): Promise<AiTeamDetail | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/v1/marketplace/aiteams/${id}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as AiTeamDetail) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const aiteam = await fetchAiTeam(id);
  if (!aiteam) {
    return {
      title: locale === "en" ? "AiTeam not found" : "未找到 AI 团队",
      alternates: alternatesFor(`/marketplace/aiteams/${id}`, locale),
    };
  }
  return {
    title: `${aiteam.name} | NvwaX Marketplace`,
    description: aiteam.description || "",
    openGraph: {
      title: aiteam.name,
      description: aiteam.description || "",
    },
    alternates: alternatesFor(`/marketplace/aiteams/${id}`, locale),
  };
}

export default async function AiTeamDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "marketplace" });
  const aiteam = await fetchAiTeam(id);

  if (!aiteam) {
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
            name: aiteam.name,
            url: absoluteUrl(`/marketplace/aiteams/${id}`, locale),
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

        <AiTeamDetailView aiteam={aiteam} locale={locale} />
      </div>
    </>
  );
}