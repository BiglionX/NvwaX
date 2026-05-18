'use client';

import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Folder, Users, Plus, Search, Filter, Download, Eye, Edit, Trash2, Send, Building2 } from 'lucide-react';
import LoadingState from '@/components/Layout/LoadingState';
import ExportModal from '@/components/ExportModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DetailModal from '@/components/DetailModal';
import EditModal from '@/components/EditModal';
import { agentApi } from '@/lib/api/agents';
import { aiteamApi } from '@/lib/api/aiteams';
import type { Agent } from '@/lib/api/agents';
import type { AiTeam } from '@/lib/api/aiteams';
import VirtualCompanyChatModal from '@/components/virtual-company-chat-modal';

type TabType = 'agents' | 'aiteams';

export default function AgentRepositoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('agents');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVirtualCompanyModal, setShowVirtualCompanyModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    type: 'agent' as 'agent' | 'aiteam'
  });
  
  // 导出模态框状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportResource, setExportResource] = useState<{
    id: string;
    name: string;
    type: 'agent' | 'aiteam';
  } | null>(null);
  
  // 删除确认对话框状态
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteResource, setDeleteResource] = useState<{
    id: string;
    name: string;
    type: 'agent' | 'aiteam';
  } | null>(null);
  
  // 详情模态框状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailResource, setDetailResource] = useState<{
    resource: Agent | AiTeam;
    type: 'agent' | 'aiteam';
  } | null>(null);
  
  // 编辑模态框状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [editResource, setEditResource] = useState<{
    resource: Agent | AiTeam;
    type: 'agent' | 'aiteam';
  } | null>(null);

  const queryClient = useQueryClient();

  // Mock user ID - in production, get from auth context
  const userId = 'user-123';

  // 获取 Agents 列表
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents', userId],
    queryFn: () => agentApi.getUserAgents(),
    enabled: activeTab === 'agents'
  });

  // 获取 AiTeams 列表
  const { data: aiteamsData, isLoading: aiteamsLoading } = useQuery({
    queryKey: ['aiteams', userId],
    queryFn: () => aiteamApi.getUserAiTeams(),
    enabled: activeTab === 'aiteams'
  });

  // 创建资源 mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      if (data.type === 'agent') {
        return agentApi.createAgent({
          name: data.name,
          description: data.description
        });
      } else {
        return aiteamApi.createAiTeam({
          name: data.name,
          description: data.description
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', userId] });
      queryClient.invalidateQueries({ queryKey: ['aiteams', userId] });
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', type: 'agent' });
    }
  });

  // 发布/取消发布 mutation
  const publishMutation = useMutation({
    mutationFn: async ({ id, type, action }: { id: string; type: 'agent' | 'aiteam'; action: 'publish' | 'unpublish' }) => {
      if (type === 'agent') {
        return action === 'publish' 
          ? agentApi.publishAgent(id)
          : agentApi.unpublishAgent(id);
      } else {
        return action === 'publish'
          ? aiteamApi.publishAiTeam(id)
          : aiteamApi.unpublishAiTeam(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', userId] });
      queryClient.invalidateQueries({ queryKey: ['aiteams', userId] });
    }
  });

  // 导出处理函数
  const handleExport = async (format: 'json' | 'yaml' | 'proclaw') => {
    if (!exportResource) return;
    
    try {
      if (exportResource.type === 'agent') {
        await agentApi.exportAgent(exportResource.id, format);
      } else {
        await aiteamApi.exportAiTeam(exportResource.id, format);
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  };

  // 删除处理函数
  const handleDelete = async () => {
    if (!deleteResource) return;
    
    if (deleteResource.type === 'agent') {
      await agentApi.deleteAgent(deleteResource.id);
    } else {
      await aiteamApi.deleteAiTeam(deleteResource.id);
    }
    
    queryClient.invalidateQueries({ queryKey: ['agents', userId] });
    queryClient.invalidateQueries({ queryKey: ['aiteams', userId] });
  };

  // 编辑保存处理函数
  const handleEditSave = async (data: {
    name: string;
    description: string;
    tags: string[];
    category: string;
    version: string;
  }) => {
    if (!editResource) return;
    
    if (editResource.type === 'agent') {
      await agentApi.updateAgent(editResource.resource.id, data);
    } else {
      await aiteamApi.updateAiTeam(editResource.resource.id, data);
    }
    
    queryClient.invalidateQueries({ queryKey: ['agents', userId] });
    queryClient.invalidateQueries({ queryKey: ['aiteams', userId] });
  };

  const isLoading = activeTab === 'agents' ? agentsLoading : aiteamsLoading;

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Folder className="text-blue-600" size={24} />
          我的Agent仓库
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowVirtualCompanyModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium"
          >
            <Building2 size={18} />
            虚拟公司
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium"
          >
            <Plus size={18} />
            创建新资源
          </button>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-1">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'agents'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Folder size={18} />
            <span>Agents ({agentsData?.data?.total || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('aiteams')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'aiteams'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Users size={18} />
            <span>AiTeams ({aiteamsData?.data?.total || 0})</span>
          </button>
        </div>
      </div>

      {/* 搜索和过滤栏 */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`搜索${activeTab === 'agents' ? 'Agent' : 'AiTeam'}...`}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all"
          />
        </div>
        <button className="px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
          <Filter size={18} />
          <span>筛选</span>
        </button>
      </div>

      {/* 内容区域 */}
      {activeTab === 'agents' ? (
        <AgentsList 
          agents={agentsData?.data?.agents || []}
          onPublish={(id, action) => publishMutation.mutate({ id, type: 'agent', action })}
          onExport={(id, name) => {
            setExportResource({ id, name, type: 'agent' });
            setShowExportModal(true);
          }}
          onDeleteClick={(id, name) => {
            setDeleteResource({ id, name, type: 'agent' });
            setShowDeleteDialog(true);
          }}
          onViewClick={(resource) => {
            setDetailResource({ resource, type: 'agent' });
            setShowDetailModal(true);
          }}
          onEditClick={(resource) => {
            setEditResource({ resource, type: 'agent' });
            setShowEditModal(true);
          }}
        />
      ) : (
        <AiTeamsList 
          aiteams={aiteamsData?.data?.aiteams || []}
          onPublish={(id, action) => publishMutation.mutate({ id, type: 'aiteam', action })}
          onExport={(id, name) => {
            setExportResource({ id, name, type: 'aiteam' });
            setShowExportModal(true);
          }}
          onDeleteClick={(id, name) => {
            setDeleteResource({ id, name, type: 'aiteam' });
            setShowDeleteDialog(true);
          }}
          onViewClick={(resource) => {
            setDetailResource({ resource, type: 'aiteam' });
            setShowDetailModal(true);
          }}
          onEditClick={(resource) => {
            setEditResource({ resource, type: 'aiteam' });
            setShowEditModal(true);
          }}
        />
      )}

      {/* 虚拟公司模态框 */}
      {showVirtualCompanyModal && (
        <VirtualCompanyChatModal 
          onClose={() => setShowVirtualCompanyModal(false)}
          onSuccess={() => {
            setShowVirtualCompanyModal(false);
            // 刷新数据
            queryClient.invalidateQueries({ queryKey: ['aiteams', userId] });
          }}
        />
      )}

      {/* 创建资源模态框 */}
      {showCreateModal && (
        <CreateResourceModal
          onClose={() => setShowCreateModal(false)}
          form={createForm}
          setForm={setCreateForm}
          onSubmit={(data) => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />
      )}

      {/* 导出模态框 */}
      {showExportModal && exportResource && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => {
            setShowExportModal(false);
            setExportResource(null);
          }}
          resourceType={exportResource.type}
          resourceName={exportResource.name}
          onExport={handleExport}
        />
      )}

      {/* 删除确认对话框 */}
      {showDeleteDialog && deleteResource && (
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setDeleteResource(null);
          }}
          onConfirm={handleDelete}
          title="确认删除"
          message={`确定要删除${deleteResource.type === 'agent' ? 'Agent' : 'AiTeam'} "${deleteResource.name}" 吗？此操作不可恢复。`}
          confirmText="删除"
          cancelText="取消"
          variant="danger"
        />
      )}

      {/* 详情模态框 */}
      {showDetailModal && detailResource && (
        <DetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setDetailResource(null);
          }}
          resourceType={detailResource.type}
          resource={detailResource.resource}
        />
      )}

      {/* 编辑模态框 */}
      {showEditModal && editResource && (
        <EditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditResource(null);
          }}
          resourceType={editResource.type}
          resource={editResource.resource}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}

// Agents 列表组件
function AgentsList({ 
  agents,
  onPublish,
  onExport,
  onDeleteClick,
  onViewClick,
  onEditClick
}: { 
  agents: Agent[];
  onPublish: (id: string, action: 'publish' | 'unpublish') => void;
  onExport: (id: string, name: string) => void;
  onDeleteClick: (id: string, name: string) => void;
  onViewClick: (resource: Agent) => void;
  onEditClick: (resource: Agent) => void;
}) {
  if (agents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-12 text-center">
        <Folder className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          还没有 Agent
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          创建你的第一个智能体，开始构建你的Agent仓库
        </p>
        <button className="px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium inline-flex items-center gap-2">
          <Plus size={18} />
          创建 Agent
        </button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {agents.map((agent) => (
        <AgentCard 
          key={agent.id} 
          agent={agent}
          onPublish={onPublish}
          onExport={onExport}
          onDeleteClick={onDeleteClick}
          onViewClick={() => onViewClick(agent)}
          onEditClick={() => onEditClick(agent)}
        />
      ))}
    </div>
  );
}

// Agent 卡片组件
function AgentCard({ 
  agent,
  onPublish,
  onExport,
  onDeleteClick,
  onViewClick,
  onEditClick
}: { 
  agent: Agent;
  onPublish: (id: string, action: 'publish' | 'unpublish') => void;
  onExport: (id: string, name: string) => void;
  onDeleteClick: (id: string, name: string) => void;
  onViewClick: () => void;
  onEditClick: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-1 hover:shadow-xl transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-linear-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/30 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
            <Folder className="text-blue-600 dark:text-blue-400" size={28} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {agent.name}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full ${
                agent.publishStatus === 'published' 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : agent.publishStatus === 'draft'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
              }`}>
                {agent.publishStatus === 'published' ? '已发布' : agent.publishStatus === 'draft' ? '草稿' : '私有'}
              </span>
              <span className="text-gray-500 dark:text-gray-400">v{agent.version}</span>
            </div>
          </div>
        </div>
      </div>

      {agent.description && (
        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-4 leading-relaxed">
          {agent.description}
        </p>
      )}

      {agent.tags && agent.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {agent.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-lg">
              {tag}
            </span>
          ))}
          {agent.tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-lg">
              +{agent.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Download size={14} />
            {agent.downloadCount}
          </span>
          <span>⭐ {agent.rating.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onViewClick}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" 
            title="查看"
          >
            <Eye size={16} />
          </button>
          <button 
            onClick={onEditClick}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" 
            title="编辑"
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={() => onExport(agent.id, agent.name)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all" 
            title="导出"
          >
            <Download size={16} />
          </button>
          {agent.publishStatus === 'published' ? (
            <button 
              onClick={() => onPublish(agent.id, 'unpublish')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-all" 
              title="取消发布"
            >
              <Send size={16} />
            </button>
          ) : (
            <button 
              onClick={() => onPublish(agent.id, 'publish')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all" 
              title="发布"
            >
              <Send size={16} />
            </button>
          )}
          <button 
            onClick={() => onDeleteClick(agent.id, agent.name)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" 
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// AiTeams 列表组件
function AiTeamsList({ 
  aiteams,
  onPublish,
  onExport,
  onDeleteClick,
  onViewClick,
  onEditClick
}: { 
  aiteams: AiTeam[];
  onPublish: (id: string, action: 'publish' | 'unpublish') => void;
  onExport: (id: string, name: string) => void;
  onDeleteClick: (id: string, name: string) => void;
  onViewClick: (resource: AiTeam) => void;
  onEditClick: (resource: AiTeam) => void;
}) {
  if (aiteams.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-12 text-center">
        <Users className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          还没有 AiTeam
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          创建你的第一个AI团队，组合多个Agent协同工作
        </p>
        <button className="px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium inline-flex items-center gap-2">
          <Plus size={18} />
          创建 AiTeam
        </button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {aiteams.map((aiteam) => (
        <AiTeamCard 
          key={aiteam.id} 
          aiteam={aiteam}
          onPublish={onPublish}
          onExport={onExport}
          onDeleteClick={onDeleteClick}
          onViewClick={() => onViewClick(aiteam)}
          onEditClick={() => onEditClick(aiteam)}
        />
      ))}
    </div>
  );
}

// AiTeam 卡片组件
function AiTeamCard({ 
  aiteam,
  onPublish,
  onExport,
  onDeleteClick,
  onViewClick,
  onEditClick
}: { 
  aiteam: AiTeam;
  onPublish: (id: string, action: 'publish' | 'unpublish') => void;
  onExport: (id: string, name: string) => void;
  onDeleteClick: (id: string, name: string) => void;
  onViewClick: () => void;
  onEditClick: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-purple-300 dark:hover:border-purple-700 hover:-translate-y-1 hover:shadow-xl transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-linear-to-br from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-800/30 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
            <Users className="text-purple-600 dark:text-purple-400" size={28} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {aiteam.name}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full ${
                aiteam.publishStatus === 'published' 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : aiteam.publishStatus === 'draft'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
              }`}>
                {aiteam.publishStatus === 'published' ? '已发布' : aiteam.publishStatus === 'draft' ? '草稿' : '私有'}
              </span>
              <span className="text-gray-500 dark:text-gray-400">v{aiteam.version}</span>
              <span className="text-gray-500 dark:text-gray-400">{aiteam.members.length} 成员</span>
            </div>
          </div>
        </div>
      </div>

      {aiteam.description && (
        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-4 leading-relaxed">
          {aiteam.description}
        </p>
      )}

      {aiteam.tags && aiteam.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {aiteam.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs rounded-lg">
              {tag}
            </span>
          ))}
          {aiteam.tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-lg">
              +{aiteam.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Download size={14} />
            {aiteam.downloadCount}
          </span>
          <span>执行: {aiteam.executionCount}</span>
          <span>成功率: {aiteam.successRate.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onViewClick}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all" 
            title="查看"
          >
            <Eye size={16} />
          </button>
          <button 
            onClick={onEditClick}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all" 
            title="编辑"
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={() => onExport(aiteam.id, aiteam.name)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all" 
            title="导出"
          >
            <Download size={16} />
          </button>
          {aiteam.publishStatus === 'published' ? (
            <button 
              onClick={() => onPublish(aiteam.id, 'unpublish')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-all" 
              title="取消发布"
            >
              <Send size={16} />
            </button>
          ) : (
            <button 
              onClick={() => onPublish(aiteam.id, 'publish')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all" 
              title="发布"
            >
              <Send size={16} />
            </button>
          )}
          <button 
            onClick={() => onDeleteClick(aiteam.id, aiteam.name)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" 
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// 创建资源模态框
function CreateResourceModal({
  onClose,
  form,
  setForm,
  onSubmit,
  isPending
}: {
  onClose: () => void;
  form: { name: string; description: string; type: 'agent' | 'aiteam' };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; description: string; type: 'agent' | 'aiteam' }>>;
  onSubmit: (data: { name: string; description: string; type: 'agent' | 'aiteam' }) => void;
  isPending: boolean;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 shadow-2xl border-2 border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Plus className="text-blue-600" size={24} />
          创建新资源
        </h2>
        <form onSubmit={handleSubmit}>
          {/* 类型选择 */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              资源类型 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'agent' })}
                className={`p-4 border-2 rounded-xl transition-all ${
                  form.type === 'agent'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <Folder className={`mx-auto mb-2 ${form.type === 'agent' ? 'text-blue-600' : 'text-gray-400'}`} size={24} />
                <div className={`text-sm font-medium ${form.type === 'agent' ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                  Agent
                </div>
                <div className="text-xs text-gray-500 mt-1">单个智能体</div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'aiteam' })}
                className={`p-4 border-2 rounded-xl transition-all ${
                  form.type === 'aiteam'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-purple-300'
                }`}
              >
                <Users className={`mx-auto mb-2 ${form.type === 'aiteam' ? 'text-purple-600' : 'text-gray-400'}`} size={24} />
                <div className={`text-sm font-medium ${form.type === 'aiteam' ? 'text-purple-600' : 'text-gray-700 dark:text-gray-300'}`}>
                  AiTeam
                </div>
                <div className="text-xs text-gray-500 mt-1">多Agent团队</div>
              </button>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all"
              placeholder={`输入${form.type === 'agent' ? 'Agent' : 'AiTeam'}名称`}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              描述
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all resize-none"
              placeholder="输入描述（可选）"
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50"
            >
              {isPending ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
