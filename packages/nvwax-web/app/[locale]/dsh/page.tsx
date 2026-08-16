import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dsh" });
  return {
    title: t("pageTitle"),
    description: t("pageDesc"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDesc"),
    },
    alternates: alternatesFor("/dsh", locale),
  };
}

export default async function DSHPage() {
  const t = await getTranslations("dsh");

  const tools = [
    { name: "nvwax_search_agents", desc: t("tool1") },
    { name: "nvwax_design_team", desc: t("tool2") },
    { name: "nvwax_match_skills", desc: t("tool3") },
    { name: "nvwax_analyze_requirements", desc: t("tool4") },
    { name: "nvwax_get_best_practices", desc: t("tool5") },
    { name: "nvwax_register_agent", desc: t("tool6") },
  ];

  const steps = [
    { title: t("step1Title"), desc: t("step1Desc") },
    { title: t("step2Title"), desc: t("step2Desc") },
    { title: t("step3Title"), desc: t("step3Desc") },
  ];

  const significances = [
    { title: t("sig1Title"), desc: t("sig1Desc") },
    { title: t("sig2Title"), desc: t("sig2Desc") },
    { title: t("sig3Title"), desc: t("sig3Desc") },
    { title: t("sig4Title"), desc: t("sig4Desc") },
  ];

  const docs = [t("docsLink1"), t("docsLink2"), t("docsLink3")];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070d]">
      {/* 星空背景 */}
      <div className="fixed inset-0 -z-10 stars-bg" />
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-125 h-125 rounded-full opacity-30 animate-[drift_12s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.25) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-87.5 h-87.5 rounded-full opacity-25 animate-[drift_15s_ease-in-out_infinite_2s]"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0.08) 40%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 sm:py-20">
        {/* 返回首页 */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-10"
        >
          <span aria-hidden>←</span> {t("backHome")}
        </Link>

        {/* Hero */}
        <header className="mb-14 animate-[fadeIn_0.8s_ease-out]">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-violet-500/15 border border-violet-400/40 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-5">
            {t("heroBadge")}
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            <span className="bg-linear-to-r from-violet-400 via-blue-400 to-sky-300 bg-clip-text text-transparent">
              {t("heroTitle")}
            </span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            {t("heroSubtitle")}
          </p>
        </header>

        {/* 什么是 DSH 集成 */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-5">{t("whatTitle")}</h2>
          <div className="space-y-4 text-slate-300 leading-relaxed rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6">
            <p>{t("whatP1")}</p>
            <p>{t("whatP2")}</p>
            <p>{t("whatP3")}</p>
          </div>
        </section>

        {/* 集成方法 */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-5">{t("howTitle")}</h2>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="flex gap-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6 hover:bg-white/10 transition-colors"
              >
                <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-blue-600 text-white font-bold shadow-lg shadow-violet-500/20">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1.5">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6 个能力工具 */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-5">{t("toolsTitle")}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {tools.map((tool) => (
              <div
                key={tool.name}
                className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5 hover:border-violet-400/40 transition-colors"
              >
                <code className="text-sm font-mono text-violet-300 break-all">
                  {tool.name}
                </code>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{tool.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 集成意义 */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-5">
            {t("significanceTitle")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {significances.map((sig) => (
              <div
                key={sig.title}
                className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6 hover:bg-white/10 transition-colors"
              >
                <h3 className="font-semibold text-blue-300 mb-2">{sig.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{sig.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 更多资源 */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-5">{t("docsTitle")}</h2>
          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6">
            <p className="text-sm text-slate-400 mb-4">{t("docsDesc")}</p>
            <ul className="space-y-2.5">
              {docs.map((doc) => (
                <li key={doc} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  <span className="font-mono text-xs sm:text-sm break-all leading-relaxed">
                    {doc}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
