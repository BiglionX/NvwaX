'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectApi, Project } from '@/lib/api/projects';
import { teamSkillApi, TeamSkill } from '@/lib/api/team-skills';
import { 
  Folder, 
  Users, 
  Bot, 
  Plus, 
  TrendingUp,
  ArrowRight,
  Building2
} from 'lucide-react';
import Link from 'next/link';
import VirtualCompanyChatModal from '@/components/virtual-company-chat-modal';

export default function MyAiTeamPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVirtualCompanyModal, setShowVirtualCompanyModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Mock user ID - in production, get from auth context
  const userId = 'user-123';

  // 获取用户项目列表
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', userId],
    queryFn: () => projectApi.getProjects(userId, 1, 50)
  });

  // 获取公开的 Team Skills（市场展示）
  const { data: marketplaceData, isLoading: marketplaceLoading } = useQuery({
    queryKey: ['marketplace-team-skills'],
    queryFn: () => teamSkillApi.getMarketplaceTeamSkills(1, 6)
  });

  // 统计数据
  const stats = {
    projects: projectsData?.data?.length || 0,
    teams: 0, // TODO: 从 API 获取
    agents: 0 // TODO: 从 API 获取
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    try {
      await projectApi.createProject(userId, newProjectName, newProjectDesc);
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
      window.location.reload(); // 简单刷新，实际应该用 queryClient
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('创建项目失败，请重试');
    }
  };

  if (projectsLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-3"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400">加载中...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-600 rounded-lg p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs mb-1">项目总数</p>
              <p className="text-3xl font-semibold">{stats.projects}</p>
            </div>
            <Folder size={32} className="text-blue-200" />
          </div>
        </div>

        <div className="bg-purple-600 rounded-lg p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs mb-1">团队总数</p>
              <p className="text-3xl font-semibold">{stats.teams}</p>
            </div>
            <Users size={32} className="text-purple-200" />
          </div>
        </div>

        <div className="bg-green-600 rounded-lg p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs mb-1">Agent 总数</p>
              <p className="text-3xl font-semibold">{stats.agents}</p>
            </div>
            <Bot size={32} className="text-green-200" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setShowVirtualCompanyModal(true)}
          className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-all border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-1 text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Building2 className="text-white" size={28} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              虚拟公司
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
            与 CEO Agent 对话，快速创建您的 AI 团队和虚拟公司配置
          </p>
          <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:gap-3 gap-2 transition-all">
            开始创建 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <button
          onClick={() => setShowCreateModal(true)}
          className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-all border-2 border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:-translate-y-1 text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-linear-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Plus className="text-white" size={28} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              新建项目
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
            创建新项目，开始构建您的智能体团队
          </p>
          <div className="flex items-center text-green-600 dark:text-green-400 font-medium group-hover:gap-3 gap-2 transition-all">
            立即创建 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Projects Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Folder className="text-blue-600" size={24} />
            我的项目
          </h2>
          <Link
            href="/projects"
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
          >
            查看全部
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {projectsData?.data?.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border-2 border-gray-200 dark:border-gray-700 shadow-md">
            <div className="w-20 h-20 bg-linear-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Folder size={40} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              暂无项目
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              开始创建您的第一个项目吧！
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 font-medium"
            >
              创建项目
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectsData?.data?.slice(0, 6).map((project: Project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-gray-200 dark:border-gray-700 p-6 group hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-linear-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <Folder className="text-blue-600 dark:text-blue-400" size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                    </p>
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
        )}
      </div>

      {/* Marketplace Preview */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-orange-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              热门 Team Skills
            </h2>
          </div>
          <Link
            href="/team-skills"
            className="text-orange-600 dark:text-orange-400 font-medium hover:underline flex items-center gap-1"
          >
            浏览更多
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {marketplaceLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">加载中...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketplaceData?.data?.data?.slice(0, 3).map((skill: TeamSkill) => (
              <Link
                key={skill.id}
                href={`/team-skills/${skill.id}`}
                className="block bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-gray-200 dark:border-gray-700 p-6 group hover:-translate-y-1 hover:border-orange-300 dark:hover:border-orange-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full">
                    {skill.category}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {skill.name}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-4 leading-relaxed">
                  {skill.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    查看详情
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Virtual Company Modal */}
      {showVirtualCompanyModal && (
        <VirtualCompanyChatModal 
          onClose={() => setShowVirtualCompanyModal(false)}
          onSuccess={() => {
            setShowVirtualCompanyModal(false);
            // 可以添加成功后的处理逻辑，比如刷新页面或跳转
          }}
        />
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border-2 border-gray-200 dark:border-gray-700">
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
                  className="flex-1 px-4 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
