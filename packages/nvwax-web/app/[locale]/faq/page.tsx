import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import FAQClient from "./Client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return {
    title: t("pageTitle"),
    description: t("pageDesc"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDesc"),
    },
    alternates: {
      canonical: "https://nvwax.com/faq",
    },
  };
}

export default async function FAQPage() {
  const t = await getTranslations("faq");

  const faqItems = [
    { question: t("q1"), answer: t("a1") },
    { question: t("q2"), answer: t("a2") },
    { question: t("q3"), answer: t("a3") },
    { question: t("q4"), answer: t("a4") },
    { question: t("q5"), answer: t("a5") },
    { question: t("q6"), answer: t("a6") },
    { question: t("q7"), answer: t("a7") },
    { question: t("q8"), answer: t("a8") },
    { question: t("q9"), answer: t("a9") },
    { question: t("q10"), answer: t("a10") },
    { question: t("q11"), answer: t("a11") },
    { question: t("q12", { apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api" }), answer: t("a12", { apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api" }) },
    { question: t("q13"), answer: t("a13") },
    { question: t("q14"), answer: t("a14") },
    { question: t("q15"), answer: t("a15") },
    { question: t("q16"), answer: t("a16") },
    { question: t("q17"), answer: t("a17") },
    { question: t("q18"), answer: t("a18") },
    { question: t("q19"), answer: t("a19") },
    { question: t("q20"), answer: t("a20") },
    { question: t("q21"), answer: t("a21") },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FAQClient />
    </>
  );
}
