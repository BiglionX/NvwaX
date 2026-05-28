import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import MarketplaceClient from "./Client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketplace" });
  return {
    title: t("title") + " - NvwaX",
    description: t("subtitle"),
    openGraph: {
      title: "NvwaX " + t("title"),
      description: t("subtitle"),
    },
    alternates: {
      canonical: "https://nvwax.com/marketplace",
    },
  };
}

export default function MarketplacePage() {
  return <MarketplaceClient />;
}

