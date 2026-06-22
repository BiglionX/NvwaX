'use client';

/**
 * v2.2.0 集成测试页面
 * 
 * 用于测试所有新组件和 API 的集成情况：
 * - WizardStepper
 * - IndustryTemplateCard
 * - SandboxChat
 * - StateGraphVisualizer
 * - AgentWizardModal
 * - AiteamStateGraphView
 * - MCP 端点
 * - Agent Registry API
 * 
 * 访问路径: /test-v22
 */

import { useState } from 'react';
import {
  WizardStepper,
  type WizardStep,
  IndustryTemplateGrid,
  SandboxChat,
  type SandboxMessage,
  StateGraphVisualizer,
  type StateGraphNode,
  type StateGraphEdge,
} from '@/components/UI';
import AgentWizardModal from '@/components/Search/AgentWizardModal';
import {
  createStateMachineSession,
  getStateMachineGraph,
  getStateMachineState,
} from '@/lib/api/aiteam-state-machine';

export default function TestV22Page() {
  const [activeTab, setActiveTab] = useState<'components' | 'api' | 'integration'>('components');
  const [showAgentWizard, setShowAgentWizard] = useState(false);
  const [stateMachineSessionId, setStateMachineSessionId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string>('');

  // 测试数据
  const wizardSteps: WizardStep[] = [
    { id: 'identity', title: '身份定义', description: '设置 Agent 名称和角色', status: 'completed' },
    { id: 'capability', title: '能力配置', description: '配置技能和数据源', status: 'active' },
    { id: 'testing', title: '沙箱测试', description: '测试 Agent 行为', status: 'pending' },
  ];

  const graphNodes: StateGraphNode[] = [
    { id: 'requirements', label: '需求收集', status: 'completed', layer: 0, group: 'main' },
    { id: 'design', label: '团队设计', status: 'active', layer: 1, group: 'main' },
    { id: 'matching', label: 'Agent 匹配', status: 'pending', layer: 2, group: 'main' },
    { id: 'complete', label: '完成', status: 'pending', layer: 3, group: 'terminal' },
  ];

  const graphEdges: StateGraphEdge[] = [
    { from: 'requirements', to: 'design', type: 'primary' },
    { from: 'design', to: 'matching', type: 'primary' },
    { from: 'matching', to: 'complete', type: 'primary' },
  ];

  // API 测试
  const testMCPHealth = async () => {
    try {
      setTestResult('测试中...');
      const res = await fetch('/api/mcp/health');
      const data = await res.json();
      setTestResult(`✅ MCP 健康检查: ${JSON.stringify(data, null, 2)}`);
    } catch (err: any) {
      setTestResult(`❌ MCP 健康检查失败: ${err.message}`);
    }
  };

  const testMCPToolsList = async () => {
    try {
      setTestResult('测试中...');
      const res = await fetch('/api/mcp/tools/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setTestResult(`✅ MCP Tools: ${data.tools?.length || 0} 个工具可用`);
    } catch (err: any) {
      setTestResult(`❌ MCP Tools 列表失败: ${err.message}`);
    }
  };

  const testCreateStateMachineSession = async () => {
    try {
      setTestResult('创建 Session 中...');
      const result = await createStateMachineSession('test-user-001', {
        testMode: true,
      });
      setStateMachineSessionId(result.sessionId);
      setTestResult(`✅ Session 创建成功: ${result.sessionId}`);
    } catch (err: any) {
      setTestResult(`❌ Session 创建失败: ${err.message}`);
    }
  };

  const testGetStateMachineGraph = async () => {
    try {
      setTestResult('获取图定义中...');
      const graph = await getStateMachineGraph();
      setTestResult(`✅ 图定义: ${graph.nodes.length} 节点, ${graph.edges.length} 边`);
    } catch (err: any) {
      setTestResult(`❌ 获取图定义失败: ${err.message}`);
    }
  };

  const testGetStateMachineState = async () => {
    if (!stateMachineSessionId) {
      setTestResult('⚠️ 请先创建 Session');
      return;
    }
    try {
      setTestResult('获取状态中...');
      const state = await getStateMachineState(stateMachineSessionId);
      setTestResult(`✅ 当前状态: ${state.currentNode} (${state.status})`);
    } catch (err: any) {
      setTestResult(`❌ 获取状态失败: ${err.message}`);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">v2.2.0 集成测试页面</h1>
        <p className="text-muted-foreground">
          验证所有新组件、API 端点和集成功能
        </p>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-2 mb-6">
        {(['components', 'api', 'integration'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {tab === 'components' ? '组件测试' : tab === 'api' ? 'API 测试' : '集成测试'}
          </button>
        ))}
      </div>

      {/* 组件测试 */}
      {activeTab === 'components' && (
        <div className="space-y-8">
          {/* WizardStepper */}
          <section className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">1. WizardStepper</h2>
            <WizardStepper steps={wizardSteps} onStepClick={(step) => console.log('Clicked:', step)} />
          </section>

          {/* IndustryTemplateCard */}
          <section className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">2. IndustryTemplateGrid</h2>
            <IndustryTemplateGrid
              onSelect={(template) => console.log('Selected:', template.id)}
            />
          </section>

          {/* SandboxChat */}
          <section className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">3. SandboxChat</h2>
            <SandboxChat
              title="测试沙箱"
              placeholder="输入测试消息..."
              executor={async (input) => ({
                content: `模拟回复: ${input}`,
                tokens: 50,
                durationMs: 200,
              })}
            />
          </section>

          {/* StateGraphVisualizer */}
          <section className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">4. StateGraphVisualizer</h2>
            <StateGraphVisualizer nodes={graphNodes} edges={graphEdges} />
          </section>

          {/* AgentWizardModal */}
          <section className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">5. AgentWizardModal</h2>
            <button
              onClick={() => setShowAgentWizard(true)}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              打开 Agent 向导
            </button>
            <AgentWizardModal
              isOpen={showAgentWizard}
              onClose={() => setShowAgentWizard(false)}
              onSuccess={(agent) => {
                console.log('✅ Agent 创建成功:', agent);
                setShowAgentWizard(false);
              }}
            />
          </section>
        </div>
      )}

      {/* API 测试 */}
      {activeTab === 'api' && (
        <div className="space-y-4">
          <section className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">MCP 端点测试</h2>
            <div className="flex gap-2 mb-4">
              <button
                onClick={testMCPHealth}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                测试 /api/mcp/health
              </button>
              <button
                onClick={testMCPToolsList}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                测试 /api/mcp/tools/list
              </button>
            </div>
          </section>

          <section className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">状态机 API 测试</h2>
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={testCreateStateMachineSession}
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                创建 Session
              </button>
              <button
                onClick={testGetStateMachineGraph}
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                获取图定义
              </button>
              <button
                onClick={testGetStateMachineState}
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                获取状态
              </button>
            </div>
          </section>

          {testResult && (
            <section className="rounded-lg border bg-muted p-4">
              <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
            </section>
          )}
        </div>
      )}

      {/* 集成测试 */}
      {activeTab === 'integration' && (
        <div className="space-y-8">
          <section className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">AiteamStateGraphView 集成</h2>
            <p className="text-sm text-muted-foreground mb-4">
              需要先创建 Session 才能显示状态机视图
            </p>
            <button
              onClick={async () => {
                try {
                  const result = await createStateMachineSession('test-user-001');
                  setStateMachineSessionId(result.sessionId);
                  setTestResult(`✅ Session 已创建: ${result.sessionId}`);
                } catch (err: any) {
                  setTestResult(`❌ 失败: ${err.message}`);
                }
              }}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 mb-4"
            >
              创建测试 Session
            </button>

            {stateMachineSessionId && (
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-2">状态机视图</h3>
                {/* 这里可以集成 AiteamStateGraphView */}
                <p className="text-sm text-muted-foreground">
                  Session ID: {stateMachineSessionId}
                </p>
              </div>
            )}
          </section>

          {/* 测试结果输出 */}
          {testResult && (
            <section className="rounded-lg border bg-muted p-4">
              <h3 className="font-medium mb-2">测试输出</h3>
              <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
            </section>
          )}
        </div>
      )}

      {/* 底部说明 */}
      <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">⚠️ 测试说明</h3>
        <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <li>此页面仅用于开发和测试，生产环境应移除此页面</li>
          <li>API 测试需要后端服务运行在 localhost:3001</li>
          <li>状态机测试会创建真实的数据库记录</li>
          <li>所有测试操作都会输出到控制台和页面</li>
        </ul>
      </div>
    </div>
  );
}
