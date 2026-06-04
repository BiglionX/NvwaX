/**
 * 行业插件增强功能 - 集成测试
 * 
 * 验证端到端流程：
 * 1. ProClaw 注册插件能力 -> Nvwax 存储
 * 2. Agent 预设提示词生成（含插件上下文）
 * 3. Action 输出解析
 * 4. Action 验证（参数完整性检查）
 * 5. 推荐 Agent 和 Skills
 */

import { pluginCapabilitiesService } from '../services/plugin-capabilities.service.js';
import { pluginActionService } from '../services/plugin-action.service.js';
import { pluginContextService } from '../services/plugin-context.service.js';
import { presetService } from '../services/preset.service.js';
import { recommendationService } from '../services/recommendation.service.js';
import { databaseService } from '../services/database.service.js';
import {
  PluginCapability,
  RegisterCapabilityRequest,
  ActionValidationRequest
} from '../types/plugin-capabilities.types.js';

// ============ Test Data ============

const REPAIR_PLUGIN: RegisterCapabilityRequest = {
  plugin_id: 'com.proclaw.plugin.repair',
  plugin_name: '维修工作流',
  actions: [
    {
      name: 'create_repair_order',
      label: '创建维修工单',
      description: '创建新的维修工单',
      parameters: {
        customer_name: { name: 'customer_name', type: 'string', description: '客户姓名', required: true },
        customer_phone: { name: 'customer_phone', type: 'string', description: '客户手机号', required: true },
        device_model: { name: 'device_model', type: 'string', description: '设备型号', required: true },
        fault_description: { name: 'fault_description', type: 'string', description: '故障描述', required: true },
        estimated_cost: { name: 'estimated_cost', type: 'number', description: '预估费用', required: false }
      },
      confirm_required: true,
      confirm_message: '即将创建维修工单，请确认信息正确'
    },
    {
      name: 'query_repair_status',
      label: '查询维修状态',
      description: '查询维修工单的当前状态',
      parameters: {
        order_id: { name: 'order_id', type: 'string', description: '工单编号', required: true }
      }
    }
  ],
  data_queries: [
    {
      name: 'get_pending_orders',
      description: '获取当前未完成的维修工单',
      parameters: {},
      returns: 'array of order objects',
      query: `SELECT * FROM repair_orders WHERE status = 'pending'`
    }
  ],
  skill_ids: ['维修', 'repair', '维修工单']
};

const RESTAURANT_PLUGIN: RegisterCapabilityRequest = {
  plugin_id: 'com.proclaw.plugin.restaurant',
  plugin_name: '餐厅工作流',
  actions: [
    {
      name: 'create_order',
      label: '创建订单',
      description: '创建新的点餐订单',
      parameters: {
        table_number: { name: 'table_number', type: 'string', description: '桌号', required: true },
        items: { name: 'items', type: 'array', description: '菜品列表', required: true }
      }
    },
    {
      name: 'print_ticket',
      label: '打印小票',
      description: '打印订单小票',
      parameters: {
        order_id: { name: 'order_id', type: 'string', description: '订单编号', required: true }
      }
    }
  ],
  skill_ids: ['餐饮', 'restaurant', '点餐']
};

// ============ Test Runner ============

async function runAllTests() {
  console.log('\n========================================');
  console.log('  行业插件增强功能 - 集成测试套件');
  console.log('========================================\n');

  // 初始化数据库（确保表存在）
  try {
    await databaseService.initializeDatabase();
    console.log('✓ 数据库初始化完成\n');
  } catch (error) {
    console.error('✗ 数据库初始化失败:', error);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      console.log(`[测试] ${name}`);
      await fn();
      console.log(`  ✅ 通过\n`);
      passed++;
    } catch (error: any) {
      console.log(`  ❌ 失败: ${error.message || error}\n`);
      failed++;
    }
  }

  // ======== Test 1: 插件能力注册 ========
  await test('1. 注册插件能力', async () => {
    // 注册维修工单插件
    const repairRecord = await pluginCapabilitiesService.registerCapability(REPAIR_PLUGIN);
    
    if (!repairRecord.plugin_id) throw new Error('plugin_id is missing');
    if (repairRecord.plugin_id !== 'com.proclaw.plugin.repair') throw new Error('plugin_id mismatch');
    if (repairRecord.actions.length !== 2) throw new Error(`Expected 2 actions, got ${repairRecord.actions.length}`);
    if (repairRecord.data_queries.length !== 1) throw new Error(`Expected 1 data_query, got ${repairRecord.data_queries.length}`);

    // 注册餐厅插件
    const restaurantRecord = await pluginCapabilitiesService.registerCapability(RESTAURANT_PLUGIN);
    
    if (!restaurantRecord.plugin_id) throw new Error('Restaurant plugin_id is missing');
    if (restaurantRecord.actions.length !== 2) throw new Error(`Expected 2 actions, got ${restaurantRecord.actions.length}`);

    // 验证 UPSERT（重复注册应更新）
    const reRegistered = await pluginCapabilitiesService.registerCapability(REPAIR_PLUGIN);
    if (reRegistered.plugin_id !== 'com.proclaw.plugin.repair') throw new Error('Upsert failed');

    console.log('  - 维修工单插件已注册: 2 actions, 1 data_query');
    console.log('  - 餐厅工作流插件已注册: 2 actions');
    console.log('  - UPSERT 功能验证通过');
  });

  // ======== Test 2: 查询插件能力 ========
  await test('2. 查询插件能力', async () => {
    const record = await pluginCapabilitiesService.getCapability('com.proclaw.plugin.repair');
    
    if (!record) throw new Error('Capability not found');
    if (record.plugin_name !== '维修工作流') throw new Error('plugin_name mismatch');

    console.log(`  - 插件名称: ${record.plugin_name}`);
    console.log(`  - 动作数: ${record.actions.length}`);
    console.log(`  - 数据查询数: ${record.data_queries.length}`);

    // 查询不存在的插件
    const notFound = await pluginCapabilitiesService.getCapability('non.existent.plugin');
    if (notFound !== null) throw new Error('Should return null for non-existent plugin');
    console.log('  - 不存在的插件查询返回 null: 通过');
  });

  // ======== Test 3: 查询所有插件能力 ========
  await test('3. 查询所有已注册插件能力', async () => {
    const all = await pluginCapabilitiesService.getAllCapabilities();
    
    if (all.length < 2) throw new Error(`Expected at least 2 capabilities, got ${all.length}`);

    console.log(`  - 已注册插件数: ${all.length}`);
    all.forEach(cap => console.log(`    - ${cap.plugin_name} (${cap.plugin_id})`));
  });

  // ======== Test 4: 按行业标签查询 ========
  await test('4. 按行业标签查询插件能力', async () => {
    const repairResults = await pluginCapabilitiesService.getCapabilitiesByIndustry(['维修', 'repair']);
    
    if (repairResults.length === 0) throw new Error('Expected at least 1 result for repair industry tags');
    
    const hasRepair = repairResults.some(r => r.plugin_id === 'com.proclaw.plugin.repair');
    if (!hasRepair) throw new Error('Expected repair plugin in results');

    console.log(`  - 维修标签匹配: ${repairResults.length} 个结果`);

    const restaurantResults = await pluginCapabilitiesService.getCapabilitiesByIndustry(['餐饮']);
    const hasRestaurant = restaurantResults.some(r => r.plugin_id === 'com.proclaw.plugin.restaurant');
    if (!hasRestaurant) throw new Error('Expected restaurant plugin in results');
    console.log(`  - 餐饮标签匹配: ${restaurantResults.length} 个结果`);
  });

  // ======== Test 5: 插件上下文注入 ========
  await test('5. 插件上下文 System Prompt 生成', async () => {
    const repairRecord = await pluginCapabilitiesService.getCapability('com.proclaw.plugin.repair');
    if (!repairRecord) throw new Error('Repair capability not found');

    const restaurantRecord = await pluginCapabilitiesService.getCapability('com.proclaw.plugin.restaurant');
    if (!restaurantRecord) throw new Error('Restaurant capability not found');

    const capabilities = [
      pluginCapabilitiesService.toCapabilityResponse(repairRecord),
      pluginCapabilitiesService.toCapabilityResponse(restaurantRecord)
    ];

    const systemPrompt = pluginContextService.generateSystemPrompt(capabilities);

    if (!systemPrompt.includes('维修工作流')) throw new Error('System prompt should include repair plugin name');
    if (!systemPrompt.includes('餐厅工作流')) throw new Error('System prompt should include restaurant plugin name');
    if (!systemPrompt.includes('create_repair_order')) throw new Error('System prompt should include action name');
    if (!systemPrompt.includes('data_query')) throw new Error('System prompt should mention data_query');

    console.log(`  - 提示词长度: ${systemPrompt.length} 字符`);
    console.log('  - 包含插件信息: 维修工作流 + 餐厅工作流');
    console.log('  - 包含动作定义: create_repair_order');
    console.log('  - 包含 data_query 提示');
  });

  // ======== Test 6: Action 输出解析 ========
  await test('6. Action 输出解析', async () => {
    const llmResponse = `好的，我来帮您创建维修工单。

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
    "fault_description": "屏幕破裂",
    "estimated_cost": 599
  },
  "confirm_required": true,
  "confirm_message": "即将为张三创建维修工单，是否继续？"
}
\`\`\`

以上是维修工单详情，请确认。`;

    const result = pluginActionService.parseActionOutput(llmResponse);

    if (result.outputs.length === 0) throw new Error('Expected at least 1 output');
    if (result.outputs[0].type !== 'action') throw new Error('Expected action type output');
    
    const actionOutput = result.outputs[0] as any;
    if (actionOutput.action_name !== 'create_repair_order') throw new Error('action_name mismatch');
    if (!actionOutput.parameters.customer_name) throw new Error('Missing parameter: customer_name');

    console.log(`  - 解析出 ${result.outputs.length} 个输出`);
    console.log(`  - 动作类型: ${result.outputs[0].type}`);
    console.log(`  - 动作名称: ${actionOutput.action_name}`);
    console.log(`  - 参数数量: ${Object.keys(actionOutput.parameters).length}`);
    console.log(`  - 剩余文本: "${result.text.substring(0, 30)}..."`);
  });

  // ======== Test 7: 组合输出解析 ========
  await test('7. 组合输出 (Mixed) 解析', async () => {
    const llmResponse = `\`\`\`json
{
  "type": "mixed",
  "parts": [
    {
      "type": "text",
      "content": "已为您查询到张三的维修记录。"
    },
    {
      "type": "action",
      "action_name": "create_repair_order",
      "plugin_id": "com.proclaw.plugin.repair",
      "parameters": {
        "customer_name": "张三",
        "customer_phone": "13800138000",
        "device_model": "iPhone 12",
        "fault_description": "屏幕破裂"
      }
    },
    {
      "type": "card",
      "title": "近期维修记录",
      "fields": [
        { "label": "上次维修", "value": "2026-01-15" }
      ]
    }
  ]
}
\`\`\``;

    const result = pluginActionService.parseActionOutput(llmResponse);

    if (result.outputs.length === 0) throw new Error('Expected at least 1 output');
    
    const mixedOutput = result.outputs[0] as any;
    if (mixedOutput.type !== 'mixed') throw new Error('Expected mixed type');
    if (!mixedOutput.parts || mixedOutput.parts.length !== 3) throw new Error('Expected 3 parts');

    const actionPart = mixedOutput.parts.find((p: any) => p.type === 'action');
    const textPart = mixedOutput.parts.find((p: any) => p.type === 'text');
    const cardPart = mixedOutput.parts.find((p: any) => p.type === 'card');

    if (!actionPart) throw new Error('Missing action part');
    if (!textPart) throw new Error('Missing text part');
    if (!cardPart) throw new Error('Missing card part');

    console.log('  - 混合输出包含: text + action + card');
    console.log(`  - 文本内容: "${textPart.content}"`);
    console.log(`  - 动作名称: ${actionPart.action_name}`);
    console.log(`  - 卡片标题: ${cardPart.title}`);
  });

  // ======== Test 8: Action 验证 ========
  await test('8. Action 验证 - 完整参数', async () => {
    const record = await pluginCapabilitiesService.getCapability('com.proclaw.plugin.repair');
    if (!record) throw new Error('Repair capability not found');
    const capability = pluginCapabilitiesService.toCapabilityResponse(record);

    const request: ActionValidationRequest = {
      action_name: 'create_repair_order',
      parameters: {
        customer_name: '张三',
        customer_phone: '13800138000',
        device_model: 'iPhone 12',
        fault_description: '屏幕破裂'
      },
      plugin_id: 'com.proclaw.plugin.repair'
    };

    const result = await pluginActionService.validateAction(request, capability);

    if (!result.valid) throw new Error('Expected valid result');
    if (result.missing_params.length > 0) throw new Error(`Unexpected missing params: ${result.missing_params.join(', ')}`);

    console.log('  - 验证结果: valid = true');
    console.log(`  - 必填参数: ${result.required_params.join(', ')}`);
  });

  // ======== Test 9: Action 验证 - 缺失参数 ========
  await test('9. Action 验证 - 缺失参数', async () => {
    const record = await pluginCapabilitiesService.getCapability('com.proclaw.plugin.repair');
    if (!record) throw new Error('Repair capability not found');
    const capability = pluginCapabilitiesService.toCapabilityResponse(record);

    const request: ActionValidationRequest = {
      action_name: 'create_repair_order',
      parameters: {
        customer_name: '张三',
        device_model: 'iPhone 12'
      },
      plugin_id: 'com.proclaw.plugin.repair'
    };

    const result = await pluginActionService.validateAction(request, capability);

    if (result.valid) throw new Error('Expected invalid result (missing params)');
    if (result.missing_params.length === 0) throw new Error('Expected missing params');
    if (result.suggestions.length === 0) throw new Error('Expected suggestions');

    console.log('  - 验证结果: valid = false');
    console.log(`  - 缺失参数: ${result.missing_params.join(', ')}`);
    console.log(`  - 建议: ${result.suggestions[0]}`);
  });

  // ======== Test 10: Plugin Context Middleware ========
  await test('10. 插件上下文 Header 解析', async () => {
    const headerValue = JSON.stringify([
      {
        plugin_id: 'com.proclaw.plugin.repair',
        plugin_name: '维修工作流',
        actions: [{ name: 'create_repair_order', label: '创建维修工单', parameters: {} }],
        data_queries: []
      }
    ]);

    const capabilities = pluginContextService.parseHeaderValue(headerValue);

    if (capabilities.length !== 1) throw new Error('Expected 1 capability');
    if (capabilities[0].plugin_id !== 'com.proclaw.plugin.repair') throw new Error('plugin_id mismatch');

    console.log('  - Header 解析成功');
    console.log(`  - 解析出 ${capabilities.length} 个插件能力`);

    // 测试空 header
    const emptyResult = pluginContextService.parseHeaderValue('');
    if (emptyResult.length !== 0) throw new Error('Expected empty result for empty header');
    console.log('  - 空 Header 返回空数组: 通过');
  });

  // ======== Test 11: 推荐引擎 ========
  await test('11. 推荐引擎', async () => {
    const recommendation = await recommendationService.getRecommendedAgents({
      plugin_ids: ['com.proclaw.plugin.repair'],
      industry_tags: ['维修'],
      limit: 5,
      include_skills: true
    });

    console.log('  - 推荐引擎执行完成');
    console.log(`  - 推荐 Agent 数: ${recommendation.total_agents}`);
    console.log(`  - 推荐 Skill 数: ${recommendation.total_skills}`);

    if (recommendation.recommended_agents.length > 0) {
      console.log(`  - 最高匹配 Agent: ${recommendation.recommended_agents[0].name} (${recommendation.recommended_agents[0].match_score})`);
    }
  });

  // ======== Test 12: Preset 提示词生成 ========
  await test('12. Preset 预设提示词生成', async () => {
    const record = await pluginCapabilitiesService.getCapability('com.proclaw.plugin.repair');
    if (!record) throw new Error('Repair capability not found');

    const preset = await presetService.generatePreset('test-agent-id', ['com.proclaw.plugin.repair']);

    if (!preset.base_prompt) throw new Error('base_prompt is empty');
    if (preset.plugins.length !== 1) throw new Error(`Expected 1 plugin, got ${preset.plugins.length}`);

    console.log('  - 基础提示词已生成');
    console.log(`  - 关联插件数: ${preset.plugins.length}`);
    console.log(`  - 插件名称: ${preset.plugins[0].plugin_name}`);
    console.log(`  - 可用动作数: ${preset.plugins[0].action_count}`);

    const hasContext = preset.combined_prompt.includes(preset.plugin_context);
    if (preset.plugin_context && !hasContext) throw new Error('Combined prompt should include plugin context');
    console.log('  - 合并提示词包含插件上下文: 通过');
  });

  // ======== Test 13: 插件能力注销 ========
  await test('13. 插件能力注销', async () => {
    // 先确认存在
    const beforeUnregister = await pluginCapabilitiesService.getCapability('com.proclaw.plugin.repair');
    if (!beforeUnregister) throw new Error('Capability should exist before unregister');

    // 注销
    const success = await pluginCapabilitiesService.unregisterCapability('com.proclaw.plugin.repair');
    if (!success) throw new Error('Unregister should return true');

    // 验证已删除
    const afterUnregister = await pluginCapabilitiesService.getCapability('com.proclaw.plugin.repair');
    if (afterUnregister !== null) throw new Error('Capability should be null after unregister');

    console.log('  - 注销成功');
    console.log('  - 注销后查询返回 null: 通过');

    // 重新注册（为了后续测试）
    await pluginCapabilitiesService.registerCapability(REPAIR_PLUGIN);
    console.log('  - 已重新注册（供后续测试使用）');
  });

  // ======== Test 14: Function Tools 生成 ========
  await test('14. Function Calling Tools 生成', async () => {
    const record = await pluginCapabilitiesService.getCapability('com.proclaw.plugin.repair');
    if (!record) throw new Error('Repair capability not found');
    const capability = pluginCapabilitiesService.toCapabilityResponse(record);

    const tools = pluginContextService.generateActionList([capability]);

    if (tools.length !== 2) throw new Error(`Expected 2 tools, got ${tools.length}`);

    const createOrderTool = tools.find(t => t.function.name.includes('create_repair_order'));
    if (!createOrderTool) throw new Error('Expected create_repair_order tool');
    if (!createOrderTool.function.parameters.properties) throw new Error('Expected parameters in tool');

    console.log(`  - 生成了 ${tools.length} 个 function tool`);
    console.log(`  - Tool 名称: ${tools.map(t => t.function.name).join(', ')}`);
  });

  // ============ Summary ============
  const total = passed + failed;
  console.log('========================================');
  console.log(`  测试完成: ${total} 个测试`);
  console.log(`  ✅ 通过: ${passed}`);
  console.log(`  ❌ 失败: ${failed}`);
  console.log(`  成功率: ${(passed / total * 100).toFixed(1)}%`);
  console.log('========================================\n');

  return { passed, failed, total };
}

// 运行测试
runAllTests().then(result => {
  process.exit(result.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('测试套件执行错误:', error);
  process.exit(1);
});
