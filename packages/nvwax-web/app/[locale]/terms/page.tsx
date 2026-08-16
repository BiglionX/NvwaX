import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("termsTitle"),
    description: t("termsMetaDesc"),
    alternates: alternatesFor("/terms", locale),
  };
}

export default async function TermsPage() {
  const t = await getTranslations("legal");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t("termsHeading")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">{t("termsUpdated")}</p>
        <div className="prose prose-gray dark:prose-invert space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>{t("termsP1")}</p>
          <p>{t("termsP2")}</p>
          <p>{t("termsP3")}</p>
          <p>{t("termsP4")}</p>
        </div>
      </div>
    </div>
  );
}
