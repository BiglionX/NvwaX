'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { leaderAgentApi, type LeaderAgentExecutionResult } from '@/lib/api/team-skills';
import { Play, Loader2, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function TeamExecutionPage() {
  const params = useParams();
  const [requirement, setRequirement] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<LeaderAgentExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    if (!requirement.trim()) {
      setError('请输入任务需求');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setExecutionResult(null);

    try {
      const result = await leaderAgentApi.orchestrateWithLeader(requirement);
      setExecutionResult(result);
      
      if (result.success) {
        alert('✅ 执行成功！');
      } else {
        setError(result.error || '执行失败');
      }
    } catch (err) {
      console.error('Execution failed:', err);
      const errorMessage = err instanceof Error ? err.message : '执行失败，请重试';
      setError(errorMessage);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-linear-to-br from-gray-50 via-blue-50/30 to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 min-h-screen">
      {/* 返回按钮 */}
      <div className="mb-6">
        <Link
          href={`/projects/${params.projectId}`}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          返回项目详情
        </Link>
      </div>

      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          团队执行监控
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          使用 Leader Agent 智能编排团队执行任务
        </p>
      </div>

      {/* 执行表单 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border-2 border-gray-200 dark:border-gray-700 mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          任务需求描述
        </label>
        <textarea
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          placeholder="例如：创建一个电商客服智能体，能够自动回复客户咨询并查询订单状态..."
          className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white min-h-30 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
          disabled={isExecuting}
        />
        
        <button
          onClick={handleExecute}
          disabled={isExecuting || !requirement.trim()}
          className="mt-4 w-full px-6 py-3 bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          {isExecuting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              执行中...
            </>
          ) : (
            <>
              <Play size={20} />
              启动团队执行
            </>
          )}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">执行失败</h3>
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* 执行结果 */}
      {executionResult && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            {executionResult.success ? (
              <CheckCircle className="text-green-600" size={24} />
            ) : (
              <AlertCircle className="text-red-600" size={24} />
            )}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              执行结果
            </h2>
          </div>

          <div className="space-y-4">
            {/* 执行模式 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                执行模式
              </h3>
              <p className="text-gray-900 dark:text-white">{executionResult.mode}</p>
            </div>

            {/* 团队信息 */}
            {executionResult.teamName && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  团队名称
                </h3>
                <p className="text-gray-900 dark:text-white">{executionResult.teamName}</p>
              </div>
            )}

            {executionResult.teamDescription && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  团队描述
                </h3>
                <p className="text-gray-900 dark:text-white">{executionResult.teamDescription}</p>
              </div>
            )}

            {/* 团队成员 */}
            {executionResult.teammates && executionResult.teammates.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  团队成员 ({executionResult.teammates.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {executionResult.teammates.map((teammate, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">
                        {teammate.role}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {teammate.specialty}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 工作流步骤数 */}
            {executionResult.workflowSteps && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  工作流步骤数
                </h3>
                <p className="text-gray-900 dark:text-white">{executionResult.workflowSteps} 步</p>
              </div>
            )}

            {/* 执行时间 */}
            {executionResult.executionTime && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  执行时间
                </h3>
                <p className="text-gray-900 dark:text-white">
                  {(executionResult.executionTime / 1000).toFixed(2)} 秒
                </p>
              </div>
            )}

            {/* 详细结果 */}
            {executionResult.executionResult && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  详细执行结果
                </h3>
                <pre className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 overflow-x-auto text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600">
                  {JSON.stringify(executionResult.executionResult, null, 2)}
                </pre>
              </div>
            )}

            {/* 时间戳 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                执行时间
              </h3>
              <p className="text-gray-900 dark:text-white">
                {new Date(executionResult.timestamp).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
