'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, Project } from '@/lib/api/admin';
import { 
  Search, 
  Folder,
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  User as UserIcon,
  Filter
} from 'lucide-react';

interface ProjectListResponse {
  data: Project[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminProjectsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');

  const limit = 20;

  // 获取项目列表
  const { data: projectsData, isLoading: loadingProjects } = useQuery<ProjectListResponse>({
    queryKey: ['admin-projects', page, debouncedSearch, statusFilter],
    queryFn: () => adminApi.getProjectList(page, limit, debouncedSearch || undefined, statusFilter || undefined),
    placeholderData: (previousData) => previousData
  });

  // 获取项目统计
  const { data: projectStats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-project-stats'],
    queryFn: () => adminApi.getProjectStats()
  });

  // 搜索处理（防抖）
  const handleSearch = (value: string) => {
    setSearch(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  };

  // 审核项目
  const reviewMutation = useMutation({
    mutationFn: ({ projectId, approved, notes }: { projectId: string; approved: boolean; notes?: string }) => 
      adminApi.reviewProject(projectId, approved, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-project-stats'] });
      setShowReviewModal(false);
      setSelectedProject(null);
      setReviewNotes('');
      alert('审核完成');
    },
    onError: (error: Error) => {
      alert('审核失败: ' + error.message);
    }
  });

  // 下架项目
  const suspendMutation = useMutation({
    mutationFn: ({ projectId, reason }: { projectId: string; reason?: string }) => 
      adminApi.suspendProject(projectId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-project-stats'] });
      alert('项目已下架');
    },
    onError: (error: Error) => {
      alert('下架失败: ' + error.message);
    }
  });

  // 恢复项目
  const restoreMutation = useMutation({
    mutationFn: (projectId: string) => adminApi.restoreProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-project-stats'] });
      alert('项目已恢复');
    },
    onError: (error: Error) => {
      alert('恢复失败: ' + error.message);
    }
  });

  const handleReviewClick = (project: Project, action: 'approve' | 'reject') => {
    setSelectedProject(project);
    setReviewAction(action);
    setShowReviewModal(true);
  };

  const handleConfirmReview = () => {
    if (selectedProject) {
      reviewMutation.mutate({ 
        projectId: selectedProject.id, 
        approved: reviewAction === 'approve',
        notes: reviewNotes 
      });
    }
  };

  const handleSuspend = (project: Project) => {
    const reason = prompt('请输入下架原因：');
    if (reason !== null) {
      suspendMutation.mutate({ projectId: project.id, reason: reason || undefined });
    }
  };

  const handleRestore = (projectId: string) => {
    if (confirm('确定要恢复该项目吗？')) {
      restoreMutation.mutate(projectId);
    }
  };

  const totalPages = projectsData ? Math.ceil(projectsData.total / limit) : 0;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            <CheckCircle size={14} />
            正常
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <XCircle size={14} />
            已下架
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle size={14} />
            审核中
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
            未知
          </span>
        );
    }
  };

  if (loadingProjects || loadingStats) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Loader2 className="animate-spin mx-auto mb-4" size={48} />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">项目管理</h1>
        <p className="text-gray-600 dark:text-gray-300">审核和管理用户项目</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Folder className="text-blue-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">总项目数</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {projectStats?.total || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">活跃项目</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {projectStats?.active || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <XCircle className="text-red-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">已下架</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {projectStats?.suspended || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-yellow-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">审核中</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {projectStats?.underReview || 0}
          </p>
        </div>
      </div>

      {/* 搜索和筛选栏 */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜索项目名称、描述或用户邮箱..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="pl-10 pr-8 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white appearance-none cursor-pointer"
          >
            <option value="">全部状态</option>
            <option value="active">正常</option>
            <option value="suspended">已下架</option>
            <option value="under_review">审核中</option>
          </select>
        </div>
      </div>

      {/* 项目列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">项目</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">所有者</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">状态</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">创建时间</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {projectsData?.data && projectsData.data.length > 0 ? (
              projectsData.data.map((project: Project) => (
                <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{project.name}</p>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{project.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <UserIcon size={16} />
                      <div>
                        <p>{project.userName || '未设置'}</p>
                        <p className="text-xs text-gray-500">{project.userEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(project.status)}
                    {project.reviewNotes && (
                      <p className="text-xs text-gray-500 mt-1">{project.reviewNotes}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar size={16} />
                      {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {project.status === 'suspended' ? (
                        <button
                          onClick={() => handleRestore(project.id)}
                          disabled={restoreMutation.isPending}
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors disabled:opacity-50 text-sm"
                        >
                          <CheckCircle size={16} />
                          恢复
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleReviewClick(project, 'approve')}
                            disabled={reviewMutation.isPending}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 text-sm"
                          >
                            <CheckCircle size={16} />
                            通过
                          </button>
                          <button
                            onClick={() => handleReviewClick(project, 'reject')}
                            disabled={reviewMutation.isPending}
                            className="flex items-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                          >
                            <XCircle size={16} />
                            拒绝
                          </button>
                          <button
                            onClick={() => handleSuspend(project)}
                            disabled={suspendMutation.isPending}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50 text-sm"
                          >
                            <XCircle size={16} />
                            下架
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <Folder className="mx-auto mb-2 opacity-50" size={48} />
                  <p>暂无项目数据</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              第 {page} / {totalPages} 页，共 {projectsData?.total || 0} 条记录
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-all"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-all"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 审核弹窗 */}
      {showReviewModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              {reviewAction === 'approve' ? (
                <CheckCircle className="text-green-500 shrink-0" size={24} />
              ) : (
                <XCircle className="text-red-500 shrink-0" size={24} />
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {reviewAction === 'approve' ? '通过项目' : '拒绝项目'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  项目名称：<span className="font-medium">{selectedProject.name}</span>
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                审核备注（可选）
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="请输入审核备注..."
                rows={3}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedProject(null);
                  setReviewNotes('');
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleConfirmReview}
                disabled={reviewMutation.isPending}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                  reviewAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {reviewMutation.isPending ? '处理中...' : (reviewAction === 'approve' ? '确认通过' : '确认拒绝')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
