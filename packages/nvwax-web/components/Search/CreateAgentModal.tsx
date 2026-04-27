'use client';

import { useState } from 'react';
import { X, Sparkles, Zap, Code, Database, Search } from 'lucide-react';

interface SkillRecommendation {
  id: string;
  name: string;
  description: string;
  category?: string;
  relevanceScore: number;
}

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  recommendations: SkillRecommendation[];
}

export default function CreateAgentModal({ 
  isOpen, 
  onClose, 
  query,
  recommendations 
}: CreateAgentModalProps) {
  const [agentName, setAgentName] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleCreateAgent = async () => {
    if (!agentName || selectedSkills.length === 0) {
      setError('请输入 Agent 名称并至少选择一个 Skill');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      console.log('Creating agent:', {
        name: agentName,
        query,
        selectedSkills
      });

      // Step 1: 创建工作流
      const workflowResponse = await fetch('http://localhost:3002/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName,
          description: `Agent for: ${query}`,
          nodes: [
            {
              id: 'llm_node',
              type: 'llm',
              params: {
                prompt: `你是一个专业的助手。用户需求：${query}。请提供详细的解决方案。`,
                model: 'gpt-3.5-turbo',
                temperature: 0.7
              }
            }
          ],
          edges: []
        })
      });

      if (!workflowResponse.ok) {
        throw new Error('创建工作流失败');
      }

      const workflow = await workflowResponse.json();
      console.log('Workflow created:', workflow);

      // Step 2: 执行工作流
      const executionResponse = await fetch(
        `http://localhost:3002/api/workflows/${workflow.id}/execute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { 
              requirement: query,
              skills: selectedSkills
            }
          })
        }
      );

      if (!executionResponse.ok) {
        throw new Error('执行工作流失败');
      }

      const result = await executionResponse.json();
      console.log('Workflow executed:', result);

      // Step 3: 显示成功消息
      alert(`✅ Agent "${agentName}" 创建成功！\n\n工作流 ID: ${workflow.id}`);
      
      // 重置表单
      setAgentName('');
      setSelectedSkills([]);
      onClose();
      
    } catch (err) {
      console.error('Failed to create agent:', err);
      setError(err instanceof Error ? err.message : '创建失败，请重试');
      alert('❌ 创建失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                创建您的专属 Agent
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                基于搜索关键词 &quot;{query}&quot; 推荐
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Agent Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Agent 名称
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="给您的 Agent 起个名字..."
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>

          {/* Recommended Skills */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={20} className="text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                推荐使用的 Skills
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                （点击选择用于构建 Agent）
              </span>
            </div>

            {recommendations.length > 0 ? (
              <div className="grid gap-3">
                {recommendations.map((skill) => (
                  <div
                    key={skill.id}
                    onClick={() => toggleSkill(skill.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedSkills.includes(skill.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Code size={16} className="text-blue-500" />
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {skill.name}
                          </h4>
                          {skill.category && (
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded-full">
                              {skill.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {skill.description}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            相关性
                          </div>
                          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {skill.relevanceScore}%
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedSkills.includes(skill.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedSkills.includes(skill.id) && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Search size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无推荐的 Skills</p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
              <Database size={16} />
              提示
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>选择与您的需求最相关的 Skills</li>
              <li>可以组合多个 Skills 来增强 Agent 能力</li>
              <li>创建后可以进一步自定义 Agent 的行为和配置</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-b-2xl">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            已选择 <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedSkills.length}</span> 个 Skills
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleCreateAgent}
              disabled={!agentName || selectedSkills.length === 0 || isCreating}
              className="px-6 py-2 bg-linear-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  创建中...
                </>
              ) : (
                '创建 Agent'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
