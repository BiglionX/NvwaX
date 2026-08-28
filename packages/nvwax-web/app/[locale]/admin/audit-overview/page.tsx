'use client';

/**
 * Admin 审计概览（v2.3+）
 * ----------------------------------------------------------------
 * 数据来源：GET /api/admin/system/logs/stats
 *
 * 布局（4 个 KPI 卡片 + Top 10 actions + 24h 时间分布）：
 *
 * ┌──────┬──────┬──────┬──────┐
 * │ 总数 │ 成功 │ 失败 │ 警告 │  ← KPI 卡片
 * └──────┴──────┴──────┴──────┘
 * ┌──────────────────┬─────────┐
 * │ Top 10 actions    │ 按来源  │  ← 表格
 * │ action  count err%│  分布   │
 * └──────────────────┴─────────┘
 * ┌────────────────────────────┐
 * │ 24h 时间分布（柱状图）       │
 * └────────────────────────────┘
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { adminApi, type AuditLogStats } from '@/lib/api/admin';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  PieChart as PieChartIcon,
  Code2,
  Shield,
  Loader2,
  RefreshCw,
} from 'lucide-react';

const TIME_WINDOW_OPTIONS = [
  { value: 1, label: '1 天' },
  { value: 7, label: '7 天' },
  { value: 30, label: '30 天' },
  { value: 90, label: '90 天' },
] as const;

const SOURCE_COLORS: Record<string, string> = {
  admin: '#6366f1', // indigo
  'nvwa-workbench': '#10b981', // emerald
  unknown: '#9ca3af', // gray
};

export default function AdminAuditOverviewPage() {
  const t = useTranslations('admin');
  const [days, setDays] = useState<number>(7);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-audit-stats', days],
    queryFn: () => adminApi.getSystemLogStats({ days }),
    refetchInterval: 30_000, // 30s 自动刷新
  });

  const stats = data?.success ? data.data : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <PieChartIcon className="text-blue-600 dark:text-blue-400" size={28} />
            审计概览
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            来自 Nvwa 工作台 + Admin 后台的全部审计事件聚合（默认 {days} 天窗口）
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          >
            {TIME_WINDOW_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                最近 {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="animate-spin mx-auto mb-4" size={48} />
          <p>{t('loading')}</p>
        </div>
      ) : !stats ? (
        <div className="text-center py-12 text-gray-500">暂无数据</div>
      ) : (
        <>
          {/* KPI 卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              icon={<Activity className="text-blue-600" size={20} />}
              label="总事件数"
              value={stats.totalEvents}
              color="bg-blue-50 dark:bg-blue-900/20"
            />
            <KpiCard
              icon={<CheckCircle2 className="text-green-600" size={20} />}
              label="成功率"
              value={`${(stats.successRate * 100).toFixed(1)}%`}
              color="bg-green-50 dark:bg-green-900/20"
            />
            <KpiCard
              icon={<AlertTriangle className="text-red-600" size={20} />}
              label="失败 (error)"
              value={stats.byLevel.error}
              color="bg-red-50 dark:bg-red-900/20"
            />
            <KpiCard
              icon={<TrendingUp className="text-amber-600" size={20} />}
              label="警告 (warning)"
              value={stats.byLevel.warning}
              color="bg-amber-50 dark:bg-amber-900/20"
            />
          </div>

          {/* Top 10 actions + 按来源分布 */}
          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Top 10 Actions（{stats.windowDays} 天窗口）
                </h3>
              </div>
              <TopActionsTable topActions={stats.topActions} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <PieChartIcon size={14} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">按来源分布</h3>
              </div>
              <SourceBreakdown
                bySource={stats.bySource}
                totalEvents={stats.totalEvents}
              />
            </div>
          </div>

          {/* 24h 时间分布（纯 SVG 柱状图，无依赖） */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <Clock size={14} className="text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">24 小时事件分布</h3>
              <span className="ml-auto text-xs text-gray-400">（按 UTC 小时聚合）</span>
            </div>
            <Timeline24h data={stats.timeline24h} />
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// KPI 卡片
// ============================================================
function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}

// ============================================================
// Top 10 actions 表格
// ============================================================
function TopActionsTable({
  topActions,
}: {
  topActions: AuditLogStats['topActions'];
}) {
  if (topActions.length === 0) {
    return <div className="p-8 text-center text-sm text-gray-500">无操作事件</div>;
  }
  const maxCount = Math.max(...topActions.map((a) => a.count), 1);

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 dark:bg-gray-700/40 text-xs">
        <tr>
          <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Action</th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300 w-16">次数</th>
          <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300 w-16">错误率</th>
          <th className="px-3 py-2 w-1/3 font-semibold text-gray-700 dark:text-gray-300">分布</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
        {topActions.map((a) => (
          <tr key={a.action} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td className="px-3 py-2 font-mono text-xs text-gray-900 dark:text-white">{a.action}</td>
            <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">{a.count}</td>
            <td className="px-3 py-2 text-right tabular-nums">
              {a.errorRate > 0 ? (
                <span className={a.errorRate > 0.2 ? 'text-red-600 font-semibold' : 'text-amber-600'}>
                  {(a.errorRate * 100).toFixed(0)}%
                </span>
              ) : (
                <span className="text-green-600">0%</span>
              )}
            </td>
            <td className="px-3 py-2">
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                <div
                  className={`h-full rounded ${a.errorRate > 0.2 ? 'bg-red-400' : 'bg-blue-500'}`}
                  style={{ width: `${(a.count / maxCount) * 100}%` }}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ============================================================
// 按来源分布
// ============================================================
function SourceBreakdown({
  bySource,
  totalEvents,
}: {
  bySource: AuditLogStats['bySource'];
  totalEvents: number;
}) {
  if (bySource.length === 0 || totalEvents === 0) {
    return <div className="p-8 text-center text-sm text-gray-500">无来源数据</div>;
  }

  const total = bySource.reduce((sum, s) => sum + s.count, 0);

  // SVG 简单饼图（环形）
  const radius = 60;
  const stroke = 20;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-center">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <g transform="translate(80, 80) rotate(-90)">
            {bySource.map((seg) => {
              const color = SOURCE_COLORS[seg.source] ?? SOURCE_COLORS.unknown;
              const portion = seg.count / total;
              const dash = portion * circumference;
              const circle = (
                <circle
                  key={seg.source}
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offsetAcc}
                />
              );
              offsetAcc += dash;
              return circle;
            })}
            {/* 中心文字 */}
            <g transform="rotate(90)">
              <text textAnchor="middle" dominantBaseline="middle" className="fill-gray-900 dark:fill-gray-100" style={{ fontSize: 11, fontWeight: 600 }}>
                <tspan x="0" y="-4">{totalEvents}</tspan>
                <tspan x="0" y="12" style={{ fontSize: 9, fontWeight: 400, fill: '#9ca3af' }}>总事件</tspan>
              </text>
            </g>
          </g>
        </svg>
      </div>
      <div className="space-y-1.5">
        {bySource.map((seg) => {
          const Icon = seg.source === 'nvwa-workbench' ? Code2 : seg.source === 'admin' ? Shield : Activity;
          const color = SOURCE_COLORS[seg.source] ?? SOURCE_COLORS.unknown;
          const percent = total > 0 ? (seg.count / total) * 100 : 0;
          return (
            <div key={seg.source} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
              <Icon size={12} className="text-gray-500 shrink-0" />
              <span className="font-mono text-gray-700 dark:text-gray-300 truncate">
                {seg.source}
              </span>
              <span className="ml-auto tabular-nums text-gray-600 dark:text-gray-400">
                {seg.count} · {percent.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 24h 时间分布（纯 SVG 柱状图）
// ============================================================
function Timeline24h({ data }: { data: AuditLogStats['timeline24h'] }) {
  const maxCount = useMemo(() => Math.max(1, ...data.map((d) => d.count)), [data]);
  const totalCount = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data]);

  if (totalCount === 0) {
    return <div className="p-8 text-center text-sm text-gray-500">近 24 小时无事件</div>;
  }

  const chartHeight = 120;
  const barGap = 2;
  // 假设容器宽度 ~600，单 bar 宽度 = (600 - 23*barGap) / 24 ≈ 22
  const barWidth = 22;

  return (
    <div className="p-4 overflow-x-auto">
      <svg
        width="100%"
        height={chartHeight + 30}
        viewBox={`0 0 ${24 * (barWidth + barGap)} ${chartHeight + 30}`}
        preserveAspectRatio="xMinYMid meet"
      >
        {data.map((d, i) => {
          const h = (d.count / maxCount) * chartHeight;
          const errorH = d.errorCount > 0 ? (d.errorCount / maxCount) * chartHeight : 0;
          const x = i * (barWidth + barGap);
          const y = chartHeight - h;
          return (
            <g key={d.hour}>
              {/* 总柱 */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(h, d.count > 0 ? 2 : 0)}
                rx={2}
                fill={d.errorCount > 0 ? '#fca5a5' : '#93c5fd'}
                opacity={d.count === 0 ? 0.15 : 1}
              />
              {/* error 覆盖层（堆叠） */}
              {errorH > 0 && (
                <rect
                  x={x}
                  y={chartHeight - errorH}
                  width={barWidth}
                  height={errorH}
                  rx={2}
                  fill="#dc2626"
                />
              )}
              {/* 标签（小时） */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 12}
                textAnchor="middle"
                fontSize="9"
                fill="#9ca3af"
              >
                {d.count > 0 ? d.hour : ''}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-300" />
          info
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-200" />
          warning
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-600" />
          error（堆叠）
        </span>
        <span className="ml-4 text-gray-400">峰值 {maxCount}（{data.find((d) => d.count === maxCount)?.hour}:00）</span>
      </div>
    </div>
  );
}