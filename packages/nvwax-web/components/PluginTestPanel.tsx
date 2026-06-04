/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PluginTestPanel Component
 * 
 * 行业插件测试面板
 * 提供 Action 测试、上下文模拟、数据查询模拟功能
 * 对应 PRD v2.0 章节 4.2
 */

'use client';

import React, { useState } from 'react';

interface TestResult {
  text: string;
  outputs: any[];
  output_count: number;
}

interface SimulatedContext {
  plugin_id: string;
  plugin_name: string;
  action_name: string;
  parameters: string;
}

export default function PluginTestPanel() {
  // Action 测试状态
  const [llmResponse, setLlmResponse] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // 上下文模拟状态
  const [contextPlugins, setContextPlugins] = useState<SimulatedContext[]>([
    { plugin_id: '', plugin_name: '', action_name: '', parameters: '{}' }
  ]);
  const [contextResult, setContextResult] = useState<string>('');
  const [isContextLoading, setIsContextLoading] = useState(false);

  // API Base URL
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  /**
   * 测试 Action 输出解析
   */
  const handleTestAction = async () => {
    if (!llmResponse.trim()) {
      setTestError('请输入 LLM 回复文本');
      return;
    }

    setIsTesting(true);
    setTestError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/nvwa-agent/parse-action-output`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llm_response: llmResponse })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTestResult(data.data);
    } catch (error: any) {
      setTestError(error.message || 'Action 测试失败');
      setTestResult(null);
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * 模拟插件上下文请求
   */
  const handleSimulateContext = async () => {
    setIsContextLoading(true);
    setContextResult('');

    try {
      // 构建 X-Plugin-Capabilities header 值
      const capabilities = contextPlugins
        .filter(p => p.plugin_id && p.plugin_name)
        .map(p => ({
          plugin_id: p.plugin_id,
          plugin_name: p.plugin_name,
          actions: p.action_name ? [{
            name: p.action_name,
            label: p.action_name,
            description: `Simulated action: ${p.action_name}`,
            parameters: {}
          }] : [],
          data_queries: []
        }));

      if (capabilities.length === 0) {
        setContextResult('请至少添加一个插件上下文配置');
        setIsContextLoading(false);
        return;
      }

      // 模拟请求
      const response = await fetch(`${apiBaseUrl}/api/nvwa-agent/plugin-aware-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Plugin-Capabilities': JSON.stringify(capabilities)
        },
        body: JSON.stringify({ message: '测试消息' })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // 格式化结果
      const pluginContext = data.data.plugin_context;
      setContextResult(
        `插件感知状态: ${pluginContext.active ? '已激活' : '未激活'}\n` +
        `关联插件数: ${pluginContext.plugin_count}\n` +
        `插件名称: ${pluginContext.plugin_names.join(', ')}\n\n` +
        `--- 生成的 System Prompt ---\n${pluginContext.system_prompt}\n\n` +
        `--- Function Tools ---\n${JSON.stringify(pluginContext.function_tools, null, 2)}`
      );
    } catch (error: any) {
      setContextResult(`错误: ${error.message || '模拟失败'}`);
    } finally {
      setIsContextLoading(false);
    }
  };

  /**
   * 添加上下文插件配置行
   */
  const addContextPlugin = () => {
    setContextPlugins([...contextPlugins, { plugin_id: '', plugin_name: '', action_name: '', parameters: '{}' }]);
  };

  /**
   * 更新上下文插件字段
   */
  const updateContextPlugin = (index: number, field: keyof SimulatedContext, value: string) => {
    const updated = [...contextPlugins];
    updated[index] = { ...updated[index], [field]: value };
    setContextPlugins(updated);
  };

  /**
   * 移除上下文插件
   */
  const removeContextPlugin = (index: number) => {
    if (contextPlugins.length > 1) {
      setContextPlugins(contextPlugins.filter((_, i) => i !== index));
    }
  };

  /**
   * 快速填充示例数据
   */
  const fillSampleData = () => {
    setLlmResponse(`好的，我来帮您创建维修工单。

\`\`\`json
{
  "type": "action",
  "action_name": "create_repair_order",
  "plugin_id": "com.proclaw.plugin.repair",
  "label": "创建维修工单",
  "description": "根据以下信息创建维修工单",
  "parameters": {
    "customer_name": "张三",
    "customer_phone": "13800138000",
    "device_model": "iPhone 12",
    "fault_description": "屏幕破裂，触摸失灵",
    "estimated_cost": 599
  },
  "confirm_required": true,
  "confirm_message": "即将为张三创建 iPhone 12 屏幕维修工单，费用预估 ¥599，是否继续？"
}
\`\`\`

以上是维修工单的详细信息，需要您确认后执行。`);
  };

  return (
    <div className="plugin-test-panel" style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '24px' }}>
        行业插件测试面板
      </h2>

      {/* Action 测试区域 */}
      <section style={{ marginBottom: '32px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '12px' }}>
          Action 测试模拟器
        </h3>
        <p style={{ color: '#6b7280', marginBottom: '12px', fontSize: '0.9rem' }}>
          输入 Agent 的 LLM 回复文本，测试 Action 输出解析是否正确
        </p>

        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={fillSampleData}
            style={{
              padding: '6px 12px',
              fontSize: '0.85rem',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            填充示例数据
          </button>
        </div>

        <textarea
          value={llmResponse}
          onChange={(e) => setLlmResponse(e.target.value)}
          placeholder="在此粘贴 LLM 返回的完整文本（包含 JSON 块）..."
          rows={8}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            resize: 'vertical',
            marginBottom: '12px'
          }}
        />

        <button
          onClick={handleTestAction}
          disabled={isTesting}
          style={{
            padding: '10px 20px',
            background: isTesting ? '#9ca3af' : '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isTesting ? 'not-allowed' : 'pointer',
            fontWeight: 500
          }}
        >
          {isTesting ? '解析中...' : '解析 Action 输出'}
        </button>

        {testError && (
          <div style={{ marginTop: '12px', padding: '10px', background: '#fef2f2', borderRadius: '8px', color: '#dc2626' }}>
            {testError}
          </div>
        )}

        {testResult && (
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>
              解析结果（{testResult.output_count} 个输出）
            </h4>

            {/* 纯文本部分 */}
            {testResult.text && (
              <div style={{ marginBottom: '12px', padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
                <strong>文本内容:</strong>
                <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0', fontSize: '0.85rem' }}>{testResult.text}</pre>
              </div>
            )}

            {/* 结构化输出部分 */}
            {testResult.outputs.map((output: any, index: number) => (
              <div key={index} style={{
                marginBottom: '12px',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${output.type === 'action' ? '#dbeafe' : output.type === 'data_query' ? '#d1fae5' : '#e5e7eb'}`,
                background: output.type === 'action' ? '#eff6ff' : output.type === 'data_query' ? '#f0fdf4' : '#f9fafb'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: output.type === 'action' ? '#3b82f6' : output.type === 'data_query' ? '#10b981' : '#6b7280',
                    color: 'white'
                  }}>
                    {output.type}
                  </span>
                  {output.action_name && (
                    <span style={{ marginLeft: '8px', fontWeight: 500 }}>{output.action_name}</span>
                  )}
                  {output.query_name && (
                    <span style={{ marginLeft: '8px', fontWeight: 500 }}>{output.query_name}</span>
                  )}
                </div>
                <pre style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  whiteSpace: 'pre-wrap',
                  overflowX: 'auto'
                }}>
                  {JSON.stringify(output, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 上下文模拟区域 */}
      <section style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '12px' }}>
          插件上下文模拟器
        </h3>
        <p style={{ color: '#6b7280', marginBottom: '12px', fontSize: '0.9rem' }}>
          模拟 ProClaw 发送 X-Plugin-Capabilities header，测试 Agent 在不同插件环境下的行为
        </p>

        {contextPlugins.map((plugin, index) => (
          <div key={index} style={{
            padding: '12px',
            marginBottom: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#f9fafb'
          }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <input
                placeholder="插件 ID (如: com.proclaw.plugin.repair)"
                value={plugin.plugin_id}
                onChange={(e) => updateContextPlugin(index, 'plugin_id', e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
              />
              <input
                placeholder="插件名称 (如: 维修工作流)"
                value={plugin.plugin_name}
                onChange={(e) => updateContextPlugin(index, 'plugin_name', e.target.value)}
                style={{ flex: 1, minWidth: '150px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                placeholder="动作名称 (如: create_repair_order)"
                value={plugin.action_name}
                onChange={(e) => updateContextPlugin(index, 'action_name', e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
              />
              {contextPlugins.length > 1 && (
                <button
                  onClick={() => removeContextPlugin(index)}
                  style={{
                    padding: '8px 12px',
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  移除
                </button>
              )}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={addContextPlugin}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            + 添加插件
          </button>
          <button
            onClick={handleSimulateContext}
            disabled={isContextLoading}
            style={{
              padding: '8px 16px',
              background: isContextLoading ? '#9ca3af' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isContextLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500
            }}
          >
            {isContextLoading ? '模拟中...' : '模拟发送请求'}
          </button>
        </div>

        {contextResult && (
          <div style={{
            padding: '16px',
            background: '#1f2937',
            color: '#e5e7eb',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            overflowX: 'auto',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {contextResult}
          </div>
        )}
      </section>
    </div>
  );
}
