'use client';

import { X, Calendar, Tag, Download, Star, Users, FileText, Settings } from 'lucide-react';
import type { Agent } from '@/lib/api/agents';
import type { AiTeam } from '@/lib/api/aiteams';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'agent' | 'aiteam';
  resource: Agent | AiTeam;
}

export default function DetailModal({
  isOpen,
  onClose,
  resourceType,
  resource
}: DetailModalProps) {
  if (!isOpen) return null;

  const isAgent = resourceType === 'agent';
  const agent = isAgent ? (resource as Agent) : null;
  const aiteam = !isAgent ? (resource as AiTeam) : null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-gray-200 dark:border-gray-700">
        {/* 头部 */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            {isAgent ? (
              <FileText className="text-blue-600" size={28} />
            ) : (
              <Users className="text-purple-600" size={28} />
            )}
            {resource.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 基本信息 */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings size={20} className="text-gray-600 dark:text-gray-400" />
              基本信息
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">名称</div>
                <div className="font-medium text-gray-900 dark:text-white">{resource.name}</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">版本</div>
                <div className="font-medium text-gray-900 dark:text-white">v{resource.version}</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">状态</div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  resource.publishStatus === 'published' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : resource.publishStatus === 'draft'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                }`}>
                  {resource.publishStatus === 'published' ? '已发布' : resource.publishStatus === 'draft' ? '草稿' : '私有'}
                </span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">类型</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {isAgent 
                    ? (agent?.type === 'single' ? '单个智能体' : '团队成员')
                    : 'AI团队'
                  }
                </div>
              </div>
            </div>
          </section>

          {/* 描述 */}
          {resource.description && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">描述</h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {resource.description}
                </p>
              </div>
            </section>
          )}

          {/* 标签 */}
          {resource.tags && resource.tags.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Tag size={20} className="text-gray-600 dark:text-gray-400" />
                标签
              </h3>
              <div className="flex flex-wrap gap-2">
                {resource.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      isAgent
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 统计信息 */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Star size={20} className="text-gray-600 dark:text-gray-400" />
              统计信息
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl text-center">
                <Download className="mx-auto mb-2 text-blue-600 dark:text-blue-400" size={24} />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{resource.downloadCount}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">下载次数</div>
              </div>
              <div className="p-4 bg-linear-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl text-center">
                <Star className="mx-auto mb-2 text-yellow-600 dark:text-yellow-400" size={24} />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{resource.rating.toFixed(1)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">评分</div>
              </div>
              <div className="p-4 bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{resource.reviewCount}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">评价数</div>
              </div>
            </div>
          </section>

          {/* AiTeam 特有信息 */}
          {!isAgent && aiteam && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users size={20} className="text-gray-600 dark:text-gray-400" />
                执行统计
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">执行次数</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{aiteam.executionCount}</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">成功率</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {aiteam.successRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* 成员列表 */}
              {aiteam.members && aiteam.members.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">团队成员</h4>
                  <div className="space-y-2">
                    {aiteam.members.map((member, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{member.role}</div>
                          {member.responsibilities && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {member.responsibilities}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Agent ID: {member.agentId.slice(0, 8)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 时间信息 */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Calendar size={20} className="text-gray-600 dark:text-gray-400" />
              时间信息
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">创建时间</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatDate(resource.createdAt)}
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">更新时间</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatDate(resource.updatedAt)}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 底部按钮 */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
