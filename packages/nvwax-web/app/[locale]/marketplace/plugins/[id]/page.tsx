import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { PluginDetailView } from "./PluginDetailView";
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

interface PluginAgent {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
}

interface PluginDetail {
  id: string;
  name: string;
  description?: string;
  category?: string;
  agents?: PluginAgent[];
  roles?: Array<{ role: string; specialty?: string }>;
  version?: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

async function fetchPlugin(id: string): Promise<PluginDetail | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/v1/marketplace/plugins/${id}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as PluginDetail) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const plugin = await fetchPlugin(id);
  if (!plugin) {
    return {
      title: locale === "en" ? "Plugin not found" : "未找到行业插件",
      alternates: alternatesFor(`/marketplace/plugins/${id}`, locale),
    };
  }
  return {
    title: `${plugin.name} | NvwaX Marketplace`,
    description: plugin.description || "",
    openGraph: {
      title: plugin.name,
      description: plugin.description || "",
    },
    alternates: alternatesFor(`/marketplace/plugins/${id}`, locale),
  };
}

export default async function PluginDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "marketplace" });
  const plugin = await fetchPlugin(id);

  if (!plugin) {
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
            name: plugin.name,
            url: absoluteUrl(`/marketplace/plugins/${id}`, locale),
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

        <PluginDetailView plugin={plugin} locale={locale} />
      </div>
    </>
  );
}