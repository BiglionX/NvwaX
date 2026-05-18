'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Folder, Trash2, ExternalLink, Users, Settings } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { projectApi } from '@/lib/api/projects';
import LoadingState from '@/components/Layout/LoadingState';
import { useAuth } from '@/hooks/useAuth';

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  aiTeamCount?: number;
  agentCount?: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError
  } = useQuery({
    queryKey: ['projects', userInfo?.id],
    queryFn: () => projectApi.getProjects(userInfo?.id || ''),
    enabled: !!userInfo?.id
  });

  const createProjectMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) => 
      projectApi.createProject(userInfo?.id || '', name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', userInfo?.id] });
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => projectApi.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', userInfo?.id] });
    }
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    createProjectMutation.mutate({
      name: newProjectName,
      description: newProjectDesc
    });
  };

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm('确定要删除这个项目吗？此操作不可撤销。')) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  if (projectsLoading) {
    return <LoadingState />;
  }

  if (projectsError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">错误</h2>
          <p className="text-red-600 dark:text-red-400">
            加载项目失败: {(projectsError as Error).message}
          </p>
        </div>
      </div>
    );
  }

  const projects = projectsData?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Folder className="text-blue-600" size={32} />
            项目管理
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            创建和管理您的 AI 项目
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium"
        >
          <Plus size={20} />
          新建项目
        </button>
      </div>

      {/* Stats */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总项目数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{projects.length}</p>
              </div>
              <Folder className="text-blue-600" size={32} />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">AI 团队总数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {projects.reduce((sum: number, project: Project) => sum + (project.aiTeamCount || 0), 0)}
                </p>
              </div>
              <Users className="text-purple-600" size={32} />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">智能体总数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {projects.reduce((sum: number, project: Project) => sum + (project.agentCount || 0), 0)}
                </p>
              </div>
              <Settings className="text-green-600" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-20 h-20 bg-linear-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Folder size={40} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            暂无项目
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            开始创建您的第一个 AI 项目
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium"
          >
            <Plus size={20} />
            创建新项目
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: Project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Folder className="text-blue-600" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    title="查看详情"
                  >
                    <ExternalLink size={16} className="text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    disabled={deleteProjectMutation.isPending}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors text-red-600 disabled:opacity-50"
                    title="删除项目"
                  >
                    {deleteProjectMutation.isPending ? (
                      <Trash2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm">
                <div className="text-gray-600 dark:text-gray-400">
                  {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                </div>
                <div className="flex gap-4 text-gray-600 dark:text-gray-400">
                  <span>{project.aiTeamCount || 0} 团队</span>
                  <span>{project.agentCount || 0} 智能体</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                创建新项目
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                为您的 AI 工作空间设置一个名称和描述
              </p>
              
              <form onSubmit={handleCreateProject}>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    项目名称 *
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                    placeholder="输入项目名称"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    项目描述
                  </label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all resize-none"
                    placeholder="简要描述项目目标"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={createProjectMutation.isPending}
                    className="flex-1 px-4 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createProjectMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        创建中...
                      </>
                    ) : (
                      '创建项目'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}