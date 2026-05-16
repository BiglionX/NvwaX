'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { teamSkillApi } from '@/lib/api/team-skills';
import { 
  ArrowLeft, Users, Workflow, Shield,
  Package, Sparkles, CheckCircle, Clock, Zap 
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import TeamSkillPackageModal from '@/components/Package/TeamSkillPackageModal';
import VirtualCompanyChat from '@/components/virtual-company-chat';

// 辅助函数：安全解析 JSON
const safeParseJSON = (value: unknown) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('JSON parse error:', e);
      return null;
    }
  }
  return value;
};

export default function TeamSkillDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // 查询团队技能详情
  const { data, isLoading, error } = useQuery({
    queryKey: ['team-skill', id],
    queryFn: () => teamSkillApi.getTeamSkillById(id)
  });

  const skill = data?.data;

  // 解析 JSON 字段
  const leaderConfig = safeParseJSON(skill?.leaderConfig);
  const roles = Array.isArray(skill?.roles) ? skill.roles : safeParseJSON(skill?.roles) || [];
  const workflow = safeParseJSON(skill?.workflow);
  const bindingRules = safeParseJSON(skill?.bindingRules);
  const steps = workflow?.steps || [];

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            未找到团队技能
          </h2>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
            返回 Agent 广场
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 返回按钮 */}
      <div className="mb-6">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft size={18} />
          返回 Agent 广场
        </Link>
      </div>

      {/* 头部信息 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {skill.name}
              </h1>
              {skill.category === 'virtual-company' && (
                <span className="px-3 py-1 text-sm rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 flex items-center gap-1">
                  <Sparkles size={14} />
                  虚拟公司
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {skill.description || '专业的全栈开发团队，包含产品经理、UI/UX设计师、前端/后端开发、数据库专家、测试工程师和DevOps工程师。提供从需求分析、界面设计、开发实现、自动化测试到CI/CD部署的端到端解决方案，确保高质量交付。'}
            </p>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowPackageModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <Package size={20} />
              打包下载
            </button>
            <button
              onClick={() => setShowChat(true)}
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all duration-200 hover:-translate-y-0.5"
            >
              <Sparkles size={20} />
              与 CEO Agent 对话
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-2">
            <Users size={18} />
            <span>{roles.length + (leaderConfig ? 1 : 0)} 个角色 (含领导者)</span>
          </div>
          <div className="flex items-center gap-2">
            <Workflow size={18} />
            <span>{steps.length} 步工作流</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={18} />
            <span>版本 {skill.version}</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 左侧：团队配置 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Leader 配置 */}
          {leaderConfig && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="text-yellow-500" size={24} />
                团队领导者
              </h2>
              <div className="bg-linear-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {leaderConfig.name}
                </h3>
                {leaderConfig.responsibilities && (
                  <ul className="space-y-1">
                    {leaderConfig.responsibilities.map((resp: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* 团队成员 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="text-blue-500" size={24} />
              团队成员
            </h2>
            <div className="space-y-3">
              {roles.map((role: { role: string; specialty: string; agent_type: string; responsibilities?: string[] }, idx: number) => (
                <div
                  key={idx}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {role.role}
                    </h3>
                    <span className="px-2 py-1 text-xs rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      {role.agent_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    {role.specialty}
                  </p>
                  {role.responsibilities && (
                    <ul className="space-y-1">
                      {role.responsibilities.map((resp: string, rIdx: number) => (
                        <li key={rIdx} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 工作流程 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Workflow className="text-purple-500" size={24} />
              工作流程
            </h2>
            <div className="space-y-3">
              {steps.map((step: { step: number; action: string; performed_by: string; output: string }, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {step.action}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>{step.performed_by}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap size={14} />
                        <span>产出: {step.output}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：协作规则和信息 */}
        <div className="space-y-6">
          {/* 协作规则 */}
          {bindingRules && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="text-green-500" size={24} />
                协作规则
              </h2>
              <div className="space-y-3">
                {bindingRules.communication_protocol && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      沟通协议
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {bindingRules.communication_protocol}
                    </p>
                  </div>
                )}
                {bindingRules.conflict_resolution && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      冲突解决
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {bindingRules.conflict_resolution}
                    </p>
                  </div>
                )}
                {bindingRules.quality_standards && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      质量标准
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {bindingRules.quality_standards}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 元数据 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="text-gray-500" size={24} />
              基本信息
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">分类</span>
                <span className="text-gray-900 dark:text-white font-medium">{skill.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">版本</span>
                <span className="text-gray-900 dark:text-white font-medium">{skill.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">公开状态</span>
                <span className={`font-medium ${skill.isPublic ? 'text-green-600' : 'text-gray-600'}`}>
                  {skill.isPublic ? '公开' : '私有'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">创建时间</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {skill.createdAt ? new Date(skill.createdAt).toLocaleDateString('zh-CN') : '未知'}
                </span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <button
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              onClick={() => setShowPackageModal(true)}
            >
              <Package size={20} />
              打包下载
            </button>
            
            <button
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              onClick={() => setShowChat(true)}
            >
              <Sparkles size={20} />
              与 CEO Agent 对话
            </button>
            
            <Link
              href="/marketplace"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              返回列表
            </Link>
          </div>
        </div>
      </div>

      {/* Team Skill Package Modal */}
      <TeamSkillPackageModal
        teamSkillId={skill.id}
        teamSkillName={skill.name}
        isOpen={showPackageModal}
        onClose={() => setShowPackageModal(false)}
      />

      {/* Leader Agent Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold">CEO Agent 对话</h3>
              <button onClick={() => setShowChat(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <span className="sr-only">关闭</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <VirtualCompanyChat 
              sessionId={id} 
              onComplete={(data) => {
                console.log('Chat completed', data);
                // 可以在这里处理完成后的逻辑，比如刷新页面或跳转
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
