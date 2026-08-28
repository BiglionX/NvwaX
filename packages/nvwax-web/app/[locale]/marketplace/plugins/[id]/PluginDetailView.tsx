"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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

export function PluginDetailView({
  plugin,
  locale,
}: {
  plugin: PluginDetail;
  locale: string;
}) {
  const t = useTranslations("marketplace");
  const [viewing, setViewing] = useState(false);

  const agentCount = plugin.agents?.length ?? 0;

  const handleView = async () => {
    setViewing(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      alert(t("installComingSoon"));
    } finally {
      setViewing(false);
    }
  };

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 mb-8">
        <div className="flex items-start gap-6 mb-6">
          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-4xl shrink-0">
            🧩
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {plugin.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              {plugin.category && (
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                  {t("industry")}: {plugin.category}
                </span>
              )}
              <span>📦 {t("agentsIncluded", { count: agentCount })}</span>
              {plugin.version && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                  v{plugin.version}
                </span>
              )}
              {plugin.isPublic !== undefined && (
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    plugin.isPublic
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {plugin.isPublic ? "Public" : "Private"}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleView}
            disabled={viewing}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {viewing ? "..." : t("viewPlugin")}
          </button>
        </div>

        {plugin.description && (
          <div className="prose dark:prose-invert max-w-none mb-6">
            <p>{plugin.description}</p>
          </div>
        )}
      </div>

      {plugin.agents && plugin.agents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t("agentsIncluded", { count: agentCount })}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plugin.agents.map((a) => (
              <a
                key={a.id}
                href={`/${locale}/marketplace/agents/${a.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl shrink-0">
                    {a.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.thumbnailUrl}
                        alt={a.name}
                        className="w-full h-full rounded-lg object-cover"
                      />
                    ) : (
                      "🤖"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {a.name}
                    </h3>
                    {a.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {a.description}
                      </p>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {plugin.roles && plugin.roles.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t("roleCount", { count: plugin.roles.length })}
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {plugin.roles.map((r, idx) => (
              <div
                key={`${r.role}-${idx}`}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-medium text-gray-900 dark:text-white">
                  🎭 {r.role}
                </h3>
                {r.specialty && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {r.specialty}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-500">
        ID: {plugin.id}
      </div>
    </div>
  );
}