'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { teamSkillApi, TeamSkill } from '@/lib/api/team-skills';
import { 
  ArrowLeft, 
  Users, 
  Zap, 
  CheckCircle, 
  Star,
  Calendar,
  Shield,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';

export default function TeamSkillDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ['team-skill', id],
    queryFn: () => teamSkillApi.getTeamSkillById(id)
  });

  const skill = data?.data;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12 text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Team Skill 未找到
          </h2>
          <Link
            href="/team-skills"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← 返回模板市场
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        href="/team-skills"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        返回模板市场
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-md border border-gray-200 dark:border-gray-700 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-4 py-2 text-sm font-medium rounded-full ${
                skill.category === 'development' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                skill.category === 'research' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                skill.category === 'content' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                skill.category === 'analysis' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {skill.category}
              </span>
              <div className="flex items-center gap-1 text-yellow-500">
                <Star size={20} fill="currentColor" />
                <span className="font-semibold">4.8</span>
                <span className="text-gray-500 dark:text-gray-400">(128 评价)</span>
              </div>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {skill.name}
            </h1>

            <p className="text-lg text-gray-600 dark:text-gray-300">
              {skill.description}
            </p>
          </div>

          <button
            onClick={() => alert('即将实现：选择项目并应用此模板')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <CheckCircle size={20} />
            应用到项目
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="text-blue-500" size={24} />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">团队成员</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {skill.roles?.length || 0} 个角色
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Zap className="text-orange-500" size={24} />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">工作流步骤</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {skill.workflow?.steps?.length || 0} 步
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="text-green-500" size={24} />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">版本</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {skill.version}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Leader Config */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <Shield className="text-blue-500" size={24} />
              Leader 配置
            </h2>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {skill.leaderConfig?.name}
              </h3>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">职责</p>
                <ul className="space-y-2">
                  {skill.leaderConfig?.responsibilities?.map((resp: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle size={16} className="text-blue-500 mt-1 flex-shrink-0" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Team Roles */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <Users className="text-purple-500" size={24} />
              团队成员 ({skill.roles?.length || 0})
            </h2>

            <div className="space-y-4">
              {skill.roles?.map((role, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {role.role}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {role.specialty}
                      </p>
                    </div>
                    {role.agent_type && (
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                        {role.agent_type}
                      </span>
                    )}
                  </div>

                  {role.responsibilities && role.responsibilities.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">职责</p>
                      <ul className="space-y-1">
                        {role.responsibilities.map((resp: string, rIdx: number) => (
                          <li key={rIdx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <CheckCircle size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Workflow */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <Zap className="text-orange-500" size={24} />
              工作流程 ({skill.workflow?.steps?.length || 0} 步)
            </h2>

            <div className="space-y-4">
              {skill.workflow?.steps?.map((step, idx) => (
                <div key={idx} className="relative">
                  {idx < skill.workflow.steps.length - 1 && (
                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                  )}
                  
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {step.step}
                      </span>
                    </div>

                    <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {step.action}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Users size={16} />
                          <span>执行者: {step.performed_by}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <CheckCircle size={16} />
                          <span>产出: {step.output}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Binding Rules */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MessageSquare className="text-green-500" size={20} />
              协作规则
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  沟通协议
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {skill.bindingRules?.communication_protocol}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  冲突解决
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {skill.bindingRules?.conflict_resolution}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  质量标准
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {skill.bindingRules?.quality_standards}
                </p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              元数据
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">版本</span>
                <span className="text-gray-900 dark:text-white font-medium">{skill.version}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">公开状态</span>
                <span className={`font-medium ${skill.isPublic ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {skill.isPublic ? '公开' : '私有'}
                </span>
              </div>

              {skill.createdAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">创建时间</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {new Date(skill.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              )}

              {skill.updatedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">更新时间</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {new Date(skill.updatedAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white">
            <h3 className="text-xl font-bold mb-3">
              准备好开始了吗？
            </h3>
            <p className="text-blue-100 text-sm mb-4">
              将此模板应用到您的项目，立即启动智能团队协作
            </p>
            <button
              onClick={() => alert('即将实现：选择项目并应用此模板')}
              className="w-full px-4 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              应用到项目
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
