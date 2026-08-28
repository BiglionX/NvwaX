"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface AgentDetail {
  id: string;
  name: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  rating?: number;
  reviewCount?: number;
  downloadCount?: number;
  tags?: string[];
  version?: string;
  publishStatus?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function AgentDetailView({
  agent,
  locale: _locale,
}: {
  agent: AgentDetail;
  locale: string;
}) {
  const t = useTranslations("marketplace");
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      // 占位：未来调 install 端点
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
          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-4xl shrink-0">
            {agent.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={agent.thumbnailUrl}
                alt={agent.name}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              "🤖"
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {agent.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              {agent.category && (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                  {agent.category}
                </span>
              )}
              {agent.rating !== undefined && (
                <span>
                  ⭐ {agent.rating.toFixed(1)} ({agent.reviewCount ?? 0})
                </span>
              )}
              {agent.downloadCount !== undefined && (
                <span>⬇ {agent.downloadCount}</span>
              )}
              {agent.version && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                  v{agent.version}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleInstall}
            disabled={installing}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {installing ? "..." : `+ ${t("install")}`}
          </button>
        </div>

        {agent.description && (
          <div className="prose dark:prose-invert max-w-none mb-6">
            <p>{agent.description}</p>
          </div>
        )}

        {agent.tags && agent.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {agent.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {agent.publishStatus && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{t("byAuthor")}:</span>{" "}
            <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
              {agent.publishStatus}
            </span>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-500">
        ID: {agent.id}
      </div>
    </div>
  );
}