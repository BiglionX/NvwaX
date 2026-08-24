'use client';

/**
 * 我的 AI 公司（虚拟公司）管理页
 * ----------------------------------------------------------------
 * AI Team Builder 主界面的用户侧落点：
 * - 展示用户已组建的 AI 公司（AiTeam）列表
 * - 支持查看公司成员、导出配置、发布/取消发布、删除
 * - 支持「分配任务」：给公司下达任务需求，由 Leader Agent 编排公司内
 *   各岗位 AI 合伙人协同执行（对接 skillhub-workflow orchestrate/leader）
 * - 支持 ?aiteam=<id> 深链：创建成功后自动打开对应公司详情
 *
 * 鉴权说明：后端 /aiteams 系列路由挂载 userAuthMiddleware（仅认
 * Authorization: Bearer 或 ?token=），因此本页所有 aiteam 调用走
 * authedFetch（/api/auth/proxy 注入 OIDC token），不复用未鉴权的 apiClient。
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Users,
  Plus,
  Eye,
  Trash2,
  Send,
  Rocket,
  Loader2,
  User as UserIcon,
  Briefcase,
  Play,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import LoadingState from '@/components/Layout/LoadingState';
import ExportModal, { ExportFormatType } from '@/components/ExportModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DetailModal from '@/components/DetailModal';
import { Card, Button, Badge, EmptyState, ErrorState } from '@/components/UI';
import { authedFetch } from '@/lib/oidc/authed-fetch';
import { aiteamApi } from '@/lib/api/aiteams';
import type { AiTeam, AiTeamMember } from '@/lib/api/aiteams';
import { leaderAgentApi, type LeaderAgentExecutionResult } from '@/lib/api/team-skills';
import { useAuth } from '@/hooks/useAuth';

/** 导出文件名（按格式映射，避免双重扩展名） */
const EXPORT_FILENAMES: Record<ExportFormatType, string> = {
  json: 'company-config.json',
  yaml: 'company-config.yaml',
  proclaw: 'company-config.proclaw-team.json',
  crewai: 'team.crewai',
  langgraph: 'company-config.langgraph.json',
};

/** 导出公司配置并触发浏览器下载（带鉴权） */
async function exportAiTeamAuthed(id: string, format: ExportFormatType) {
  const res = await authedFetch(`/aiteams/${id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || '导出失败');
  }
  const downloadUrl = data.data?.downloadUrl;
  if (!downloadUrl) throw new Error('导出结果缺少下载地址');

  const dl = await authedFetch(downloadUrl, { method: 'GET' });
  if (!dl.ok) throw new Error('下载失败');
  const blob = await dl.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = EXPORT_FILENAMES[format] || 'company-config.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function MyAiCompaniesPage() {
  const router = useRouter();
  const { isLoggedIn, userInfo, loading: authLoading } = useAuth();
  const userId = userInfo?.id;
  const queryClient = useQueryClient();

  // 导出模态框状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCompany, setExportCompany] = useState<{ id: string; name: string } | null>(null);

  // 删除确认对话框状态
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteCompany, setDeleteCompany] = useState<{ id: string; name: string } | null>(null);

  // 详情模态框状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailCompany, setDetailCompany] = useState<AiTeam | null>(null);

  // 任务分配/执行模态框状态
  const [taskCompany, setTaskCompany] = useState<AiTeam | null>(null);

  // 深链：?aiteam=<id> 自动打开对应公司详情（创建成功后跳转而来）
  const [pendingAiteamId, setPendingAiteamId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('aiteam');
    if (id) setPendingAiteamId(id);
  }, []);

  // 获取 AI 公司列表（aiteamApi 已走 authedFetch 鉴权；limit 放大以覆盖深链目标不在首页的情况）
  const { data: companiesData, isLoading, isError, refetch } = useQuery({
    queryKey: ['aiteams', userId],
    queryFn: () => aiteamApi.getUserAiTeams({ limit: 100 }),
    enabled: !!userId,
  });

  // 数据就绪后，若存在深链目标则自动打开详情并高亮卡片
  useEffect(() => {
    if (!pendingAiteamId || !companiesData?.data?.aiteams) return;
    const target = companiesData.data.aiteams.find((c) => c.id === pendingAiteamId);
    if (target) {
      setDetailCompany(target);
      setShowDetailModal(true);
      // 滚动到目标卡片
      setTimeout(() => {
        document
          .getElementById(`company-${target.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      // 命中后清理 URL 中的 ?aiteam= 参数，避免刷新重复触发
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }
      setPendingAiteamId(null);
    }
    // 未命中：保留 pendingAiteamId，数据重取（如发布/删除后的 invalidate）时自动重试
  }, [pendingAiteamId, companiesData]);

  // 发布/取消发布 mutation（aiteamApi 已鉴权）
  const publishMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'publish' | 'unpublish' }) =>
      action === 'publish' ? aiteamApi.publishAiTeam(id) : aiteamApi.unpublishAiTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiteams', userId] });
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : '操作失败，请重试');
    },
  });

  // 删除 mutation（aiteamApi 已鉴权）
  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiteamApi.deleteAiTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiteams', userId] });
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : '删除失败，请重试');
    },
  });

  const handleExport = async (format: ExportFormatType) => {
    if (!exportCompany) return;
    await exportAiTeamAuthed(exportCompany.id, format);
  };

  const handleDelete = async () => {
    if (!deleteCompany) return;
    await deleteMutation.mutateAsync(deleteCompany.id);
  };

  // 未登录：提示登录（等待 auth 初始化完成，避免已登录用户闪现登录卡片）
  if (!authLoading && !isLoggedIn) {
    const loginTarget = `/my-aiteam${typeof window !== 'undefined' ? window.location.search : ''}`;
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Building2 size={28} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">请先登录</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">登录后查看和管理您的 AI 公司。</p>
          <Button variant="primary" onClick={() => router.push(`/login?redirect=${encodeURIComponent(loginTarget)}`)}>
            前往登录
          </Button>
        </Card>
      </div>
    );
  }

  if (authLoading || isLoading) {
    return <LoadingState text="加载 AI 公司中..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="加载失败"
        description="暂时无法获取您的 AI 公司，请检查网络后重试。"
        onRetry={() => refetch()}
      />
    );
  }

  const companies: AiTeam[] = companiesData?.data?.aiteams || [];
  const publishedCount = companies.filter((c) => c.publishStatus === 'published').length;
  const totalMemberCount = companies.reduce((sum, c) => sum + (c.members?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="text-blue-600" size={26} />
            我的 AI 公司
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            你组建的每一支 AI 团队，就是一家能帮你干活的小型虚拟公司。
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={() => router.push('/nvwa')}
            icon={<Plus size={18} />}
          >
            组建新 AI 公司
          </Button>
        </div>
      </div>

      {/* 统计条 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'AI 公司总数', value: companies.length, icon: Building2 },
          { label: '已发布公司', value: publishedCount, icon: Rocket },
          { label: 'AI 合伙人（岗位）', value: totalMemberCount, icon: Users },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} padding="md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Icon className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 公司列表 */}
      {companies.length === 0 ? (
        <EmptyState
          icon={<Building2 size={40} />}
          title="还没有 AI 公司"
          description="注册你的第一家 AI 公司：选择公司类型（营销、客服、内容创作...），设置岗位，分配任务，让 AI 合伙人帮你搞定整个项目。"
          actionText="立即组建 AI 公司"
          onAction={() => router.push('/nvwa')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map((company) => (
            <div
              key={company.id}
              id={`company-${company.id}`}
              className={`scroll-mt-24 rounded-2xl transition-shadow ${
                showDetailModal && detailCompany?.id === company.id
                  ? 'ring-2 ring-blue-400 dark:ring-blue-500'
                  : ''
              }`}
            >
              <CompanyCard
                company={company}
                publishing={publishMutation.isPending}
                onView={() => {
                  setDetailCompany(company);
                  setShowDetailModal(true);
                }}
                onTask={() => setTaskCompany(company)}
                onPublish={() =>
                  publishMutation.mutate({
                    id: company.id,
                    action: company.publishStatus === 'published' ? 'unpublish' : 'publish',
                  })
                }
                onExport={() => {
                  setExportCompany({ id: company.id, name: company.name });
                  setShowExportModal(true);
                }}
                onDelete={() => {
                  setDeleteCompany({ id: company.id, name: company.name });
                  setShowDeleteDialog(true);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* 导出模态框 */}
      {showExportModal && exportCompany && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => {
            setShowExportModal(false);
            setExportCompany(null);
          }}
          resourceType="aiteam"
          resourceName={exportCompany.name}
          onExport={handleExport}
        />
      )}

      {/* 删除确认对话框 */}
      {showDeleteDialog && deleteCompany && (
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setDeleteCompany(null);
          }}
          onConfirm={handleDelete}
          title="确认解散公司"
          message={`确定要解散 AI 公司 "${deleteCompany.name}" 吗？此操作不可恢复。`}
          confirmText="解散"
          cancelText="取消"
          variant="danger"
        />
      )}

      {/* 详情模态框（复用 AiTeam 详情） */}
      {showDetailModal && detailCompany && (
        <DetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setDetailCompany(null);
          }}
          resourceType="aiteam"
          resource={detailCompany}
        />
      )}

      {/* 任务分配/执行模态框 */}
      {taskCompany && (
        <CompanyTaskModal
          company={taskCompany}
          onClose={() => setTaskCompany(null)}
        />
      )}
    </div>
  );
}

// AI 公司卡片
function CompanyCard({
  company,
  publishing,
  onView,
  onTask,
  onPublish,
  onExport,
  onDelete,
}: {
  company: AiTeam;
  publishing: boolean;
  onView: () => void;
  onTask: () => void;
  onPublish: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const members: AiTeamMember[] = company.members || [];
  const statusText =
    company.publishStatus === 'published'
      ? '已发布'
      : company.publishStatus === 'draft'
        ? '草稿'
        : '私有';

  return (
    <Card padding="lg" className="hover:border-blue-300 dark:hover:border-blue-700 transition-all h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Building2 size={22} className="text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{company.name}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <Badge
                variant={
                  company.publishStatus === 'published'
                    ? 'success'
                    : company.publishStatus === 'draft'
                      ? 'warning'
                      : 'default'
                }
              >
                {statusText}
              </Badge>
              {company.category && (
                <span className="text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                  {company.category}
                </span>
              )}
              <span className="text-gray-400 dark:text-gray-500">v{company.version}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onView}
          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          title="查看详情"
          aria-label="查看详情"
        >
          <Eye size={16} />
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 min-h-10">
        {company.description || '这家 AI 公司还没有填写简介。'}
      </p>

      {/* 成员（岗位）预览 */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
          <Briefcase size={13} />
          岗位设置（{members.length} 个 AI 合伙人）
        </div>
        {members.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">尚未设置岗位，可稍后在详情中补充。</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {members.slice(0, 5).map((member, index) => (
              <span
                key={`${member.agentId}-${index}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300"
              >
                <UserIcon size={11} className="text-blue-500" />
                {member.role || '未命名岗位'}
              </span>
            ))}
            {members.length > 5 && (
              <span className="px-2 py-1 text-xs text-gray-400">+{members.length - 5}</span>
            )}
          </div>
        )}
      </div>

      {/* 操作区 */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        <Button
          variant="primary"
          size="sm"
          icon={<Play size={14} />}
          onClick={onTask}
          title="给这家公司分配任务，让 AI 合伙人协同执行"
        >
          分配任务
        </Button>
        <Button variant="outline" size="sm" icon={<Eye size={14} />} onClick={onView}>
          查看详情
        </Button>
        <Button variant="outline" size="sm" icon={<Send size={14} />} onClick={onExport}>
          导出配置
        </Button>
        <Button
          variant={company.publishStatus === 'published' ? 'ghost' : 'outline'}
          size="sm"
          icon={publishing ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
          onClick={onPublish}
        >
          {company.publishStatus === 'published' ? '取消发布' : '发布到市场'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 size={14} />}
          onClick={onDelete}
          className="!text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/20 ml-auto"
        >
          解散
        </Button>
      </div>

      <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
        组建于 {new Date(company.createdAt).toLocaleDateString()}
      </p>
    </Card>
  );
}

// 任务分配/执行模态框：给公司下达任务，Leader Agent 编排公司内 AI 合伙人执行
function CompanyTaskModal({
  company,
  onClose,
}: {
  company: AiTeam;
  onClose: () => void;
}) {
  const [requirement, setRequirement] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<LeaderAgentExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    if (!requirement.trim()) {
      setError('请先描述要分配给公司的任务需求。');
      return;
    }
    setIsExecuting(true);
    setError(null);
    setResult(null);
    try {
      // 把公司上下文（名称/岗位）传给 Leader Agent，让编排更贴合这家公司
      const workspace = {
        aiteamId: company.id,
        companyName: company.name,
        roles: (company.members || []).map((m) => m.role).filter(Boolean),
      };
      const r = await leaderAgentApi.orchestrateWithLeader(requirement.trim(), workspace);
      setResult(r);
    } catch (err) {
      console.error('Task execution failed:', err);
      setError(err instanceof Error ? err.message : '执行失败，请稍后重试。');
    } finally {
      setIsExecuting(false);
    }
  };

  const members: AiTeamMember[] = company.members || [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200/60 dark:border-gray-700/60">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Briefcase size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">给「{company.name}」分配任务</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                描述任务需求，CEO（Leader Agent）将编排公司内各岗位 AI 合伙人协同执行
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="关闭"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              任务需求 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="例如：为我们的新品策划一套 7 天小红书种草方案，输出完整执行文档..."
              disabled={isExecuting}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white min-h-28 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* 公司岗位提示 */}
          {members.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {members.map((m, idx) => (
                <span
                  key={`${m.agentId}-${idx}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300"
                >
                  <UserIcon size={11} className="text-blue-500" />
                  {m.role || '未命名岗位'}
                </span>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {result && (
            <div
              className={`p-4 rounded-xl border ${
                result.success
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
                )}
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {result.success ? '执行完成' : '执行失败'}
                </h3>
              </div>
              {result.success && (
                <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                  {result.teamName && <p>🏢 公司：{result.teamName}</p>}
                  {result.teamDescription && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {result.teamDescription}
                    </p>
                  )}
                  {result.teammates && result.teammates.length > 0 && (
                    <p>
                      🤝 参与岗位：
                      {result.teammates.map((t) => t.role).join('、')}
                    </p>
                  )}
                  {typeof result.workflowSteps === 'number' && <p>📋 工作流步骤：{result.workflowSteps} 步</p>}
                  {typeof result.executionTime === 'number' && (
                    <p>⏱️ 执行耗时：{result.executionTime} 秒</p>
                  )}
                </div>
              )}
              {result.error && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{result.error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 dark:bg-gray-800/50 flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose} disabled={isExecuting}>
            关闭
          </Button>
          <Button
            variant="primary"
            fullWidth
            icon={isExecuting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
            onClick={handleExecute}
            disabled={isExecuting}
          >
            {isExecuting ? '执行中...' : '开始执行'}
          </Button>
        </div>
      </div>
    </div>
  );
}
