'use client';

import { useState } from 'react';
import { X, Send, Sparkles, Building2, Loader2 } from 'lucide-react';

interface VirtualCompanyCreateModalProps {
  onClose: () => void;
  onSuccess: (teamSkillId: string) => void;
}

interface CreateRequest {
  description: string;
  dataSources?: string[];
  outputs?: string[];
  implementation?: string;
  skills?: string[];
  isPublic?: boolean;
}

export default function VirtualCompanyCreateModal({ onClose, onSuccess }: VirtualCompanyCreateModalProps) {
  const [step, setStep] = useState<'input' | 'generating' | 'success'>('input');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    teamSkillId: string;
    teamName: string;
  } | null>(null);

  // 示例提示词
  const examples = [
    '创建一个营销团队，负责社交媒体内容创作、数据分析和广告投放',
    '组建一个全栈开发团队，包含前端、后端和DevOps工程师',
    '建立一个设计工作室，专注于UI/UX设计和品牌视觉识别',
  ];

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('请输入需求描述');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setStep('generating');

    try {
      const requestData: CreateRequest = {
        description: description.trim(),
        dataSources: [],
        outputs: [],
        implementation: '',
        skills: [],
        isPublic: true
      };

      const response = await fetch('/api/nvwa/create-virtual-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '创建失败');
      }

      setResult({
        teamSkillId: data.data.teamSkillId,
        teamName: data.data.teamName
      });
      setStep('success');
    } catch (err) {
      console.error('Error creating virtual company:', err);
      setError(err instanceof Error ? err.message : '创建虚拟公司失败，请重试');
      setStep('input');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewResult = () => {
    if (result) {
      onSuccess(result.teamSkillId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-r from-purple-500 to-pink-500 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">创建虚拟公司</h2>
              <p className="text-sm text-gray-500">用自然语言描述你的 AI 团队需求</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <div className="space-y-6">
              {/* Description Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述你的需求
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例如：我需要一个营销团队来管理社交媒体账号，创建内容，分析数据..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none min-h-30"
                  disabled={isSubmitting}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>

              {/* Examples */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💡 示例
                </label>
                <div className="space-y-2">
                  {examples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setDescription(example)}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-700"
                      disabled={isSubmitting}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 提示</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>详细描述团队的主要职责和工作内容</li>
                  <li>说明需要哪些专业角色（如设计师、开发者等）</li>
                  <li>提及期望的输出成果和工作流程</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  正在生成虚拟公司配置...
                </h3>
                <p className="text-sm text-gray-500">
                  AI 正在分析你的需求并组建合适的团队
                </p>
              </div>
            </div>
          )}

          {step === 'success' && result && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="p-4 bg-green-100 rounded-full">
                <Sparkles className="w-12 h-12 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  🎉 虚拟公司创建成功！
                </h3>
                <p className="text-gray-600 mb-4">
                  <span className="font-semibold">{result.teamName}</span> 已保存到市场
                </p>
                <p className="text-sm text-gray-500">
                  你可以在 Team Skills 中查看和管理这个虚拟公司
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          {step === 'input' && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                disabled={isSubmitting}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!description.trim() || isSubmitting}
                className="flex-1 px-4 py-2 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                创建虚拟公司
              </button>
            </div>
          )}

          {step === 'generating' && (
            <button
              disabled
              className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
            >
              生成中...
            </button>
          )}

          {step === 'success' && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={handleViewResult}
                className="flex-1 px-4 py-2 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                查看详情
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
