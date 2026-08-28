"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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

export function AiTeamDetailView({
  aiteam,
  locale: _locale,
}: {
  aiteam: AiTeamDetail;
  locale: string;
}) {
  const t = useTranslations("marketplace");
  const [installing, setInstalling] = useState(false);

  const memberCount = aiteam.members?.length ?? 0;
  const successRate =
    typeof aiteam.successRate === "number" ? aiteam.successRate.toFixed(1) : "—";

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      alert(t("installComingSoon"));
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 mb-8">
        <div className="flex items-start gap-6 mb-6">
          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl shrink-0">
            {aiteam.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={aiteam.thumbnailUrl}
                alt={aiteam.name}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              "👥"
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {aiteam.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              {aiteam.category && (
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                  {aiteam.category}
                </span>
              )}
              <span>👥 {t("members")}: {memberCount}</span>
              {aiteam.rating !== undefined && (
                <span>
                  ⭐ {aiteam.rating.toFixed(1)} ({aiteam.reviewCount ?? 0})
                </span>
              )}
              {aiteam.executionCount !== undefined && (
                <span>
                  📊 {aiteam.executionCount} {t("execCount")}
                </span>
              )}
              <span>✅ {t("successRate")}: {successRate}%</span>
              {aiteam.version && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                  v{aiteam.version}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleInstall}
            disabled={installing}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {installing ? "..." : `+ ${t("installTeam")}`}
          </button>
        </div>

        {aiteam.description && (
          <div className="prose dark:prose-invert max-w-none mb-6">
            <p>{aiteam.description}</p>
          </div>
        )}

        {aiteam.tags && aiteam.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {aiteam.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {aiteam.members && aiteam.members.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t("members")} ({memberCount})
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {aiteam.members.map((m, idx) => (
              <div
                key={`${m.role}-${idx}`}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎭</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {m.role}
                  </h3>
                </div>
                {m.agent_type && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                    type: {m.agent_type}
                  </p>
                )}
                {m.responsibilities && m.responsibilities.length > 0 && (
                  <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
                    {m.responsibilities.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {aiteam.workflow?.steps && aiteam.workflow.steps.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Workflow ({aiteam.workflow.steps.length} steps)
          </h2>
          <ol className="space-y-2">
            {aiteam.workflow.steps.map((_step, idx) => (
              <li
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300"
              >
                Step {idx + 1}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-500">
        ID: {aiteam.id}
      </div>
    </div>
  );
}