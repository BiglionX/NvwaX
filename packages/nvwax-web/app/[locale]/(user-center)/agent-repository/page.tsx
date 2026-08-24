'use client';

import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Folder, Users, Plus, Search, Filter, Download, Eye, Edit, Trash2, Send, Building2, Import, X, Loader2, CheckCircle } from 'lucide-react';
import LoadingState from '@/components/Layout/LoadingState';
import ExportModal, { ExportFormatType } from '@/components/ExportModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DetailModal from '@/components/DetailModal';
import EditModal from '@/components/EditModal';
import { Card, Button, Input, Space, Badge, Tag, ErrorState } from '@/components/UI';
import { agentApi } from '@/lib/api/agents';
import { aiteamApi } from '@/lib/api/aiteams';
import type { Agent } from '@/lib/api/agents';
import type { AiTeam } from '@/lib/api/aiteams';
import AiTeamCreatorModal from '@/components/aiteam-creator-modal';
import { authedFetch } from '@/lib/oidc/authed-fetch';
import { useAuth } from '@/hooks/useAuth';

type TabType = 'agents' | 'aiteams';

export default function AgentRepositoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('aiteams');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAiTeamCreateModal, setShowAiTeamCreateModal] = useState(false);
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

  // "从创建会话导入"状态（创建即入仓库的补录入口）
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importableSessions, setImportableSessions] = useState<Array<{
    sessionId: string;
    teamName: string | null;
    roleCount: number;
    imported: boolean;
    createdAt: string;
  }>>([]);
  const [importingSessions, setImportingSessions] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // 真实用户 ID（来自 OIDC session；authedFetch 走 cookie 鉴权，服务端取 user）
  const { userInfo, isLoggedIn } = useAuth();
  const userId = userInfo?.id;

  // 获取 Agents 列表
  const { data: agentsData, isLoading: agentsLoading, isError: agentsError, refetch: refetchAgents } = useQuery({
    queryKey: ['agents', userId],
    queryFn: () => agentApi.getUserAgents(),
    enabled: !!userId && activeTab === 'agents'
  });

  // 获取 AiTeams 列表
  const { data: aiteamsData, isLoading: aiteamsLoading, isError: aiteamsError, refetch: refetchAiteams } = useQuery({
    queryKey: ['aiteams', userId],
    queryFn: () => aiteamApi.getUserAiTeams(),
    enabled: !!userId && activeTab === 'aiteams'
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
  const handleExport = async (format: ExportFormatType) => {
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

  // 打开"从创建会话导入"弹窗，拉取可导入的会话
  const handleOpenImportDialog = async () => {
    if (!isLoggedIn) {
      alert('请先登录');
      return;
    }
    setShowImportDialog(true);
    try {
      const res = await authedFetch('/aiteam-creation/sessions/importable', {
        method: 'GET',
      });
      const data = await res.json();
      setImportableSessions(data.success ? (data.data || []) : []);
    } catch (err) {
      console.error('Failed to load importable sessions:', err);
      setImportableSessions([]);
    }
  };

  // 导入单个会话到仓库
  const handleImportSession = async (sessionId: string) => {
    if (importingSessions.has(sessionId)) return;
    setImportingSessions(prev => new Set(prev).add(sessionId));
    try {
      const res = await authedFetch(`/aiteam-creation/sessions/${sessionId}/import-to-repository`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '导入失败');
      }
      // 刷新仓库列表 + 会话列表
      queryClient.invalidateQueries({ queryKey: ['aiteams', userId] });
      setImportableSessions(prev =>
        prev.map(s => s.sessionId === sessionId ? { ...s, imported: true } : s)
      );
    } catch (err) {
      console.error('Failed to import session:', err);
      alert(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImportingSessions(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
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
  const isError = activeTab === 'agents' ? agentsError : aiteamsError;
  const refetchActive = activeTab === 'agents' ? refetchAgents : refetchAiteams;

  // 未登录：直接提示（query 被禁用不会自动加载）
  if (!isLoggedIn || !userId) {
    return (
      <Space direction="vertical" size="middle" className="w-full">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Folder className="text-blue-600" size={24} />
          人才库 · 员工管理
        </h2>
        <ErrorState
          title="请先登录"
          description="登录后即可查看和管理您的 AI 公司与 AI 合伙人（员工）"
          onRetry={() => window.location.reload()}
        />
      </Space>
    );
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return (
      <Space direction="vertical" size="middle" className="w-full">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Folder className="text-blue-600" size={24} />
          人才库 · 员工管理
        </h2>
        <ErrorState
          title="加载失败"
          description="暂时无法获取您的数据，请检查网络后重试"
          onRetry={() => refetchActive()}
        />
      </Space>
    );
  }

  return (
    <Space direction="vertical" size="middle" className="w-full">
      {/* 页面标题和操作栏 */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Folder className="text-blue-600" size={24} />
          人才库 · 员工管理
        </h2>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleOpenImportDialog}
            icon={<Import size={18} />}
          >
            从创建会话导入
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowAiTeamCreateModal(true)}
            icon={<Building2 size={18} />}
          >
            组建 AI 公司
          </Button>
        </div>
      </div>

      {/* 产品叙事提示条 */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
        <Building2 size={16} className="shrink-0 mt-0.5" />
        <span>
          💡 NvwaX 以组建 <b>AI 公司（虚拟公司）</b>为主：创建单个智能体现在是「招聘员工」，
          是组建公司的一个环节。查看和管理你的公司请前往<b>「我的 AI 公司」</b>。
        </span>
      </div>

      {/* 标签页导航：AI 公司优先 */}
      <Card padding="sm">
        <div className="flex gap-1">
          <Button
            variant={activeTab === 'aiteams' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('aiteams')}
            icon={<Users size={18} />}
            fullWidth
          >
            AI 公司 ({aiteamsData?.data?.total || 0})
          </Button>
          <Button
            variant={activeTab === 'agents' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('agents')}
            icon={<Folder size={18} />}
            fullWidth
          >
            员工 / Agent ({agentsData?.data?.total || 0})
          </Button>
        </div>
      </Card>

      {/* 搜索和过滤栏 */}
      <div className="flex gap-3">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`搜索${activeTab === 'agents' ? '员工 / Agent' : 'AI 公司'}...`}
          prefix={<Search size={18} />}
          className="flex-1"
        />
        <Button variant="outline" icon={<Filter size={18} />}>
          筛选
        </Button>
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

      {/* AiTeam 创建模态框 */}
      {showAiTeamCreateModal && (
        <AiTeamCreatorModal 
          onClose={() => setShowAiTeamCreateModal(false)}
          onSuccess={() => {
            setShowAiTeamCreateModal(false);
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

      {/* 从创建会话导入弹窗 */}
      {showImportDialog && (
        <ImportSessionsDialog
          sessions={importableSessions}
          importing={importingSessions}
          onImport={handleImportSession}
          onClose={() => setShowImportDialog(false)}
          onRefresh={handleOpenImportDialog}
        />
      )}
    </Space>
  );
}

// 从创建会话导入弹窗
function ImportSessionsDialog({
  sessions,
  importing,
  onImport,
  onClose,
  onRefresh
}: {
  sessions: Array<{
    sessionId: string;
    teamName: string | null;
    roleCount: number;
    imported: boolean;
    createdAt: string;
  }>;
  importing: Set<string>;
  onImport: (sessionId: string) => void;
  onClose: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Import className="text-indigo-600" size={24} />
            从创建会话导入
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            将你之前通过 Nvwa 创建、但尚未保存到仓库的 AI 公司导入进来。
            （新组建的公司已自动入「我的 AI 公司」）
          </p>

          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto text-green-500 mb-3" size={40} />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                没有可导入的创建会话
              </p>
              <Button variant="outline" onClick={onRefresh} icon={<Download size={16} />}>
                刷新
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {sessions.map((s) => (
                <div
                  key={s.sessionId}
                  className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white mb-0.5">
                      {s.teamName || `AI团队（${s.roleCount} 角色）`}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {s.roleCount} 个角色 · 创建于 {new Date(s.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <Button
                    variant={s.imported ? 'ghost' : 'primary'}
                    icon={s.imported ? <CheckCircle size={16} /> : (importing.has(s.sessionId) ? <Loader2 size={16} className="animate-spin" /> : <Import size={16} />)}
                    disabled={s.imported || importing.has(s.sessionId)}
                    onClick={() => onImport(s.sessionId)}
                  >
                    {s.imported ? '已导入' : importing.has(s.sessionId) ? '导入中...' : '导入'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" fullWidth onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
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
      <Card padding="lg">
        <div className="text-center py-12">
          <Folder className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            还没有招聘员工
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            在组建 AI 公司的过程中，「招聘」单个智能体作为员工，会出现在这里
          </p>
        </div>
      </Card>
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
    <Card padding="lg" className="hover:-translate-y-1 hover:shadow-xl transition-all group">
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
              <Badge variant={agent.publishStatus === 'published' ? 'success' : agent.publishStatus === 'draft' ? 'warning' : 'default'}>
                {agent.publishStatus === 'published' ? '已发布' : agent.publishStatus === 'draft' ? '草稿' : '私有'}
              </Badge>
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
            <Tag key={index} variant="primary" size="sm">
              {tag}
            </Tag>
          ))}
          {agent.tags.length > 3 && (
            <Tag variant="default" size="sm">
              +{agent.tags.length - 3}
            </Tag>
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
          <Button 
            variant="ghost"
            onClick={onViewClick}
            icon={<Eye size={16} />}
            title="查看"
          />
          <Button 
            variant="ghost"
            onClick={onEditClick}
            icon={<Edit size={16} />}
            title="编辑"
          />
          <Button 
            variant="ghost"
            onClick={() => onExport(agent.id, agent.name)}
            icon={<Download size={16} />}
            title="导出"
          />
          <Button 
            variant="ghost"
            onClick={() => onPublish(agent.id, agent.publishStatus === 'published' ? 'unpublish' : 'publish')}
            icon={<Send size={16} />}
            title={agent.publishStatus === 'published' ? '取消发布' : '发布'}
          />
          <Button 
            variant="ghost"
            onClick={() => onDeleteClick(agent.id, agent.name)}
            icon={<Trash2 size={16} />}
            title="删除"
          />
        </div>
      </div>
    </Card>
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
      <Card padding="lg">
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            还没有 AI 公司
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            组建你的第一支 AI 团队，让多个 AI 合伙人协同工作
          </p>
          <Button variant="primary" icon={<Plus size={18} />}>
            组建 AI 公司
          </Button>
        </div>
      </Card>
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
    <Card padding="lg" className="hover:-translate-y-1 hover:shadow-xl transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-linear-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/30 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
            <Users className="text-blue-600 dark:text-blue-400" size={28} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {aiteam.name}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant={aiteam.publishStatus === 'published' ? 'success' : aiteam.publishStatus === 'draft' ? 'warning' : 'default'}>
                {aiteam.publishStatus === 'published' ? '已发布' : aiteam.publishStatus === 'draft' ? '草稿' : '私有'}
              </Badge>
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
            <Tag key={index} variant="primary" size="sm">
              {tag}
            </Tag>
          ))}
          {aiteam.tags.length > 3 && (
            <Tag variant="default" size="sm">
              +{aiteam.tags.length - 3}
            </Tag>
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
          <Button 
            variant="ghost"
            onClick={onViewClick}
            icon={<Eye size={16} />}
            title="查看"
          />
          <Button 
            variant="ghost"
            onClick={onEditClick}
            icon={<Edit size={16} />}
            title="编辑"
          />
          <Button 
            variant="ghost"
            onClick={() => onExport(aiteam.id, aiteam.name)}
            icon={<Download size={16} />}
            title="导出"
          />
          <Button 
            variant="ghost"
            onClick={() => onPublish(aiteam.id, aiteam.publishStatus === 'published' ? 'unpublish' : 'publish')}
            icon={<Send size={16} />}
            title={aiteam.publishStatus === 'published' ? '取消发布' : '发布'}
          />
          <Button 
            variant="ghost"
            onClick={() => onDeleteClick(aiteam.id, aiteam.name)}
            icon={<Trash2 size={16} />}
            title="删除"
          />
        </div>
      </div>
    </Card>
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
      <Card padding="lg" className="max-w-md w-full shadow-2xl">
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
                  员工 (Agent)
                </div>
                <div className="text-xs text-gray-500 mt-1">招聘单个 AI 员工</div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'aiteam' })}
                className={`p-4 border-2 rounded-xl transition-all ${
                  form.type === 'aiteam'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <Users className={`mx-auto mb-2 ${form.type === 'aiteam' ? 'text-blue-600' : 'text-gray-400'}`} size={24} />
                <div className={`text-sm font-medium ${form.type === 'aiteam' ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                  AI 公司
                </div>
                <div className="text-xs text-gray-500 mt-1">多岗位 AI 公司</div>
              </button>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              名称 <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={`输入${form.type === 'agent' ? '员工' : 'AI 公司'}名称`}
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

          <Space size="small" className="w-full">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              fullWidth
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              loading={isPending}
              fullWidth
            >
              {isPending ? '创建中...' : '创建'}
            </Button>
          </Space>
        </form>
      </Card>
    </div>
  );
}
