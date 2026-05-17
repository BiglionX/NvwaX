'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi, Project } from '@/lib/api/projects';
import { Folder, Plus, Calendar } from 'lucide-react';
import Link from 'next/link';
import LoadingState from '@/components/Layout/LoadingState';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Mock user ID - in production, get from auth context
  const userId = 'user-123';

  const { data, isLoading } = useQuery({
    queryKey: ['projects', userId],
    queryFn: () => projectApi.getProjects(userId, 1, 20)
  });

  const createMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      projectApi.createProject(userId, name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
    }
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createMutation.mutate({ name: newProjectName, description: newProjectDesc });
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium"
          >
            <Plus size={18} />
            创建项目
          </button>
        </div>

      {/* Projects Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.data?.map((project: Project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="block bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-1 hover:shadow-xl transition-all group"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-linear-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/30 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                <Folder className="text-blue-600 dark:text-blue-400" size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {project.name}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <Calendar size={14} />
                  <span>{new Date(project.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </div>
            
            {project.description && (
              <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-4 leading-relaxed">
                {project.description}
              </p>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                查看详情
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>

      {!data?.data?.length && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <div className="w-20 h-20 bg-linear-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Folder size={40} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">暂无项目</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">创建您的第一个项目开始使用</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-8 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all font-medium"
          >
            <Plus size={18} />
            创建项目
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 shadow-2xl border-2 border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Folder className="text-blue-600" size={24} />
              创建新项目
            </h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  项目名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all"
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
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all resize-none"
                  placeholder="输入项目描述（可选）"
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
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50"
                >
                  {createMutation.isPending ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
