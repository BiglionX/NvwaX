'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi, AiTeam } from '@/lib/api/projects';
import { teamSkillApi, TeamSkill } from '@/lib/api/team-skills';
import { Users, Plus, ArrowLeft, Calendar, LayoutGrid, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function ProjectDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TeamSkill | null>(null);

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.getProject(projectId)
  });

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ['teams', projectId],
    queryFn: () => projectApi.getAiTeams(projectId)
  });

  // 获取公开的 Team Skills（用于模板选择）
  const { data: templatesData, isLoading: loadingTemplates } = useQuery({
    queryKey: ['marketplace-team-skills'],
    queryFn: () => teamSkillApi.getMarketplaceTeamSkills(1, 6)
  });

  const createMutation = useMutation({
    mutationFn: ({ name }: { name: string }) =>
      projectApi.createAiTeam(projectId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', projectId] });
      setShowCreateModal(false);
      setNewTeamName('');
    }
  });

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    createMutation.mutate({ name: newTeamName });
  };

  if (loadingProject || loadingTeams) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12 text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <ArrowLeft size={16} />
          返回项目列表
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {project?.name}
          </h1>
          {project?.description && (
            <p className="text-gray-600 dark:text-gray-300">{project.description}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg transition-all shadow-md"
          >
            <LayoutGrid size={20} />
            从模板创建
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            创建 AiTeam
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link
          href="/nvwa"
          className="group bg-gradient-to-br from-indigo-500 to-blue-700 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="text-white" size={24} />
            </div>
            <h3 className="text-lg font-semibold">使用 Nvwa 智能体工厂</h3>
          </div>
          <p className="text-indigo-100 text-sm">
            通过对话式需求分析，自动生成专属团队配置
          </p>
        </Link>

        <button
          onClick={() => setShowTemplateModal(true)}
          className="group bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-white" size={24} />
            </div>
            <h3 className="text-lg font-semibold">浏览 Team Skills 模板</h3>
          </div>
          <p className="text-orange-100 text-sm">
            选择现成的团队协作模板，一键应用到项目
          </p>
        </button>
      </div>

      {/* Teams Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams?.map((team: AiTeam) => (
          <Link
            key={team.id}
            href={`/projects/${projectId}/teams/${team.id}`}
            className="block bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                  {team.name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Calendar size={14} />
                  <span>{new Date(team.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                查看团队 →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {!teams?.length && (
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无 AiTeam</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">创建您的第一个 AiTeam 开始组织 Agent 团队</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg transition-all"
            >
              <LayoutGrid size={20} />
              从模板创建
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus size={20} />
              创建 AiTeam
            </button>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">创建新 AiTeam</h2>
            <form onSubmit={handleCreateTeam}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  团队名称 *
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  placeholder="输入团队名称"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">选择 Team Skill 模板</h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {loadingTemplates ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templatesData?.data?.data?.map((template: TeamSkill) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {template.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.category === 'development' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        template.category === 'research' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        template.category === 'content' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {template.category}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                      {template.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{template.roles?.length || 0} 个角色</span>
                      <span>•</span>
                      <span>{template.workflow?.steps?.length || 0} 个工作流步骤</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedTemplate && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    团队名称 *
                  </label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                    placeholder={`例如：${selectedTemplate.name}团队`}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowTemplateModal(false);
                      setSelectedTemplate(null);
                      setNewTeamName('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      if (!newTeamName.trim()) {
                        alert('请输入团队名称');
                        return;
                      }
                      // TODO: 实现从模板创建团队的逻辑
                      alert(`即将使用模板 "${selectedTemplate.name}" 创建团队 "${newTeamName}"`);
                      setShowTemplateModal(false);
                      setSelectedTemplate(null);
                      setNewTeamName('');
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg transition-all"
                  >
                    应用模板并创建
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
