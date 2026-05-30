'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { microbizApi } from '@/lib/api/microbiz';
import { Button, Card, Badge } from '@/components/UI';
import { Store, Users, Check, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

interface MicroBizInstallWizardProps {
  onComplete: () => void;
  onClose: () => void;
}

type WizardStep = 'select' | 'bind' | 'configure' | 'done';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

export default function MicroBizInstallWizard({ onComplete, onClose }: MicroBizInstallWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('select');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [accountBindings, setAccountBindings] = useState<Record<string, JsonValue>>({});
  const [preferences, setPreferences] = useState<Record<string, JsonValue>>({
    auto_reply_enabled: true,
    manual_review_required: false,
    order_notification: { sound: true, desktop: true, tts: true },
    inventory_alert_threshold: 10,
    analysis_period_days: 30,
    auto_sync_products: true,
    default_schedule: '09:00,12:00,18:00'
  });
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState('');

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['microbiz-teams'],
    queryFn: () => microbizApi.getTeams()
  });

  const teams = teamsData?.data || [];

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleInstall = async () => {
    setInstalling(true);
    setError('');
    try {
      const token = localStorage.getItem('user_token') || undefined;
      const result = await microbizApi.install(selectedTeams, accountBindings, preferences, token);
      if (result.success) {
        setCurrentStep('done');
      } else {
        setError(result.message || '安装失败');
      }
    } catch {
      setError('安装过程中发生错误');
    } finally {
      setInstalling(false);
    }
  };

  const selectedTeamObjects = teams.filter(t => selectedTeams.includes(t.id));

  const renderStepIndicator = () => {
    const steps = [
      { key: 'select', label: '选择团队' },
      { key: 'bind', label: '绑定账号' },
      { key: 'configure', label: '运营偏好' },
      { key: 'done', label: '完成安装' }
    ];

    return (
      <div className="flex items-center justify-center gap-4 mb-8">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.key;
          const isPast = ['select', 'bind', 'configure', 'done'].indexOf(currentStep) > idx;
          return (
            <div key={step.key} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                isActive ? 'bg-purple-600 text-white' :
                isPast ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {isPast ? <Check size={16} /> : idx + 1}
              </div>
              <span className={`text-sm ${isActive ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                {step.label}
              </span>
              {idx < steps.length - 1 && <div className="w-8 h-0.5 bg-gray-200 mx-1" />}
            </div>
          );
        })}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'select':
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">选择要启用的团队</h3>
            <p className="text-gray-500 text-sm mb-6">选择一个或多个 AI 团队来帮助您经营业务</p>
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : (
              <div className="grid gap-4">
                {teams.map(team => (
                  <Card key={team.id}
                    className={`cursor-pointer transition-all ${
                      selectedTeams.includes(team.id) ? 'ring-2 ring-purple-500 border-purple-500' : ''
                    }`}
                    onClick={() => toggleTeam(team.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{team.name}</h4>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{team.description}</p>
                        {team.agents && (
                          <div className="flex items-center gap-1 text-sm text-gray-400 mt-2">
                            <Users size={14} />
                            <span>{team.agents.length} 个 Agent</span>
                          </div>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedTeams.includes(team.id) ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                      }`}>
                        {selectedTeams.includes(team.id) && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={onClose}>取消</Button>
              <Button variant="primary" onClick={() => setCurrentStep('bind')} disabled={selectedTeams.length === 0}>
                下一步
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        );

      case 'bind':
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">绑定账号</h3>
            <p className="text-gray-500 text-sm mb-6">为每个团队绑定对应的外部平台账号</p>
            
            {selectedTeamObjects.map(team => (
              <div key={team.id} className="mb-6 p-4 border rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Store size={16} />
                  {team.name}
                </h4>
                {team.accountBindingsTemplate && team.accountBindingsTemplate.length > 0 ? (
                  team.accountBindingsTemplate.map((binding: Record<string, JsonValue>, idx: number) => (
                    <div key={idx} className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{binding.label}</span>
                        {binding.required && <Badge variant="warning" size="sm">必填</Badge>}
                      </div>
                      {binding.fields.map((field: string) => (
                        <input
                          key={field}
                          type="text"
                          placeholder={field}
                          className="w-full px-3 py-2 border rounded-md text-sm mb-2 bg-white dark:bg-gray-700"
                          onChange={(e) => {
                            setAccountBindings(prev => ({
                              ...prev,
                              [binding.platform]: {
                                ...prev[binding.platform],
                                [field]: e.target.value
                              }
                            }));
                          }}
                        />
                      ))}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">无需绑定外部账号</p>
                )}
              </div>
            ))}
            
            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setCurrentStep('select')}>
                <ArrowLeft size={16} /> 上一步
              </Button>
              <Button variant="primary" onClick={() => setCurrentStep('configure')}>
                下一步 <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        );

      case 'configure':
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">设置运营偏好</h3>
            <p className="text-gray-500 text-sm mb-6">配置 AI 团队的自动化工作方式</p>
            
            <div className="space-y-6">
              {/* 内容发布时间段 */}
              <div className="p-4 border rounded-lg">
                <label className="block text-sm font-medium mb-2">内容发布时间段</label>
                <input
                  type="text"
                  value={preferences.default_schedule}
                  onChange={(e) => setPreferences(prev => ({ ...prev, default_schedule: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="例如: 09:00,12:00,18:00"
                />
                <p className="text-xs text-gray-400 mt-1">多个时间用逗号分隔</p>
              </div>

              {/* 通知方式 */}
              <div className="p-4 border rounded-lg">
                <label className="block text-sm font-medium mb-3">订单通知方式</label>
                <div className="space-y-2">
                  {['sound', 'tts', 'desktop'].map(key => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(preferences.order_notification as Record<string, boolean>)[key]}
                        onChange={(e) => {
                          setPreferences(prev => ({
                            ...prev,
                            order_notification: { ...prev.order_notification, [key]: e.target.checked }
                          }));
                        }}
                        className="rounded"
                      />
                      {key === 'sound' ? '声音提醒' : key === 'tts' ? '语音朗读' : '桌面弹窗'}
                    </label>
                  ))}
                </div>
              </div>

              {/* 库存告警阈值 */}
              <div className="p-4 border rounded-lg">
                <label className="block text-sm font-medium mb-2">
                  库存告警阈值: {preferences.inventory_alert_threshold}
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={preferences.inventory_alert_threshold}
                  onChange={(e) => setPreferences(prev => ({ ...prev, inventory_alert_threshold: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <p className="text-xs text-gray-400 mt-1">当库存低于该值时触发补货提醒</p>
              </div>

              {/* 客服自动回复 */}
              <div className="p-4 border rounded-lg">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={preferences.auto_reply_enabled}
                    onChange={(e) => setPreferences(prev => ({ ...prev, auto_reply_enabled: e.target.checked }))}
                    className="rounded"
                  />
                  启用自动回复
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-6">开启后，客服 Agent 将自动回复常见问题</p>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setCurrentStep('bind')}>
                <ArrowLeft size={16} /> 上一步
              </Button>
              <Button variant="primary" onClick={handleInstall} disabled={installing}>
                {installing ? <><Loader2 size={16} className="animate-spin" /> 安装中...</> : '完成安装'}
              </Button>
            </div>
          </div>
        );

      case 'done':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">安装成功！</h3>
            <p className="text-gray-500 mb-2">已成功安装 {selectedTeams.length} 个团队，共 {selectedTeamObjects.reduce((sum, t) => sum + (t.agents?.length || 0), 0)} 个 Agent</p>
            <p className="text-sm text-gray-400 mb-8">Agent 正在自动运行中，您可以在"我的安装"中查看状态</p>
            <Button variant="primary" onClick={onComplete}>
              开始使用
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {currentStep !== 'done' && renderStepIndicator()}
      {renderStepContent()}
    </div>
  );
}
