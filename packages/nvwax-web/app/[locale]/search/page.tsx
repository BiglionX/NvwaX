import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SearchClient from "./Client";
import { alternatesFor } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return {
    title: t("pageTitle"),
    description: t("pageDesc"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDesc"),
    },
    alternates: alternatesFor("/search", locale),
  };
}

export default function SearchPage() {
  return <SearchClient />;
}

