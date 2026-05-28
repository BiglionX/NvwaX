import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import NvwaClient from "./Client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nvwa" });
  return {
    title: t("pageTitle"),
    description: t("pageDesc"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDesc"),
    },
    alternates: {
      canonical: "https://nvwax.com/nvwa",
    },
  };
}

export default function NvwaPage() {
  return <NvwaClient />;
}
