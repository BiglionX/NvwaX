#!/usr/bin/env node
/**
 * Sprint 3 Aiteam 状态机集成验证脚本
 *
 * 验证 v2.2.0 Aiteam 状态机集成的：
 * 1. 后端路由已挂载
 * 2. 前端组件和 API 客户端文件结构
 * 3. 状态机服务引用正确
 * 4. UI 导出索引完整
 */

import fs from 'fs';
import path from 'path';

const BASE = path.resolve(process.cwd(), 'packages');
const SERVER_SRC = path.join(BASE, 'nvwax-server', 'src');
const WEB_COMPONENTS = path.join(BASE, 'nvwax-web', 'components');
const WEB_LIB = path.join(BASE, 'nvwax-web', 'lib');

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const checks: CheckResult[] = [];

// ============================================================
// 1. 后端路由集成
// ============================================================

console.log('🔍 Sprint 3 Aiteam 状态机集成验证\n');
console.log('='.repeat(60));

// 1.1 路由文件存在
const stateMachineRoutes = path.join(SERVER_SRC, 'routes', 'aiteam-state-machine.routes.ts');
const routesFileExists = fs.existsSync(stateMachineRoutes);
checks.push({
  name: '1.1 后端状态机路由文件存在',
  passed: routesFileExists,
  message: routesFileExists ? stateMachineRoutes : '文件未找到',
});

// 1.2 路由已挂载到主路由
const indexRoutes = path.join(SERVER_SRC, 'routes', 'index.ts');
if (fs.existsSync(indexRoutes)) {
  const indexContent = fs.readFileSync(indexRoutes, 'utf-8');
  const hasImport = /import.*aiteamStateMachineRouter/.test(indexContent);
  const hasUse = /\/aiteam-state-machine/.test(indexContent);
  checks.push({
    name: '1.2 状态机路由已导入并挂载',
    passed: hasImport && hasUse,
    message: `import: ${hasImport}, use: ${hasUse}`,
  });
} else {
  checks.push({
    name: '1.2 状态机路由已导入并挂载',
    passed: false,
    message: 'routes/index.ts 未找到',
  });
}

// 1.3 引用 CreationStateMachine 服务
if (routesFileExists) {
  const routesContent = fs.readFileSync(stateMachineRoutes, 'utf-8');
  const hasServiceImport = /CreationStateMachine/.test(routesContent);
  const hasHandleEvent = /handleEvent/.test(routesContent);
  const hasGetState = /\.state\b/.test(routesContent);
  checks.push({
    name: '1.3 引用 CreationStateMachine 服务',
    passed: hasServiceImport && hasHandleEvent,
    message: `import: ${hasServiceImport}, handleEvent: ${hasHandleEvent}, getState: ${hasGetState}`,
  });
}

// 1.4 支持的事件类型
if (routesFileExists) {
  const routesContent = fs.readFileSync(stateMachineRoutes, 'utf-8');
  const events = ['PROCEED', 'CLARIFY', 'APPROVE', 'REJECT', 'GO_BACK', 'ERROR'];
  const foundEvents = events.filter((e) => new RegExp(`'${e}'`).test(routesContent));
  checks.push({
    name: '1.4 支持 6 种事件类型',
    passed: foundEvents.length === 6,
    message: `找到 ${foundEvents.length}/6: ${foundEvents.join(', ')}`,
  });
}

// ============================================================
// 2. 前端组件和 API 客户端
// ============================================================

// 2.1 API 客户端文件
const apiClient = path.join(WEB_LIB, 'api', 'aiteam-state-machine.ts');
const apiExists = fs.existsSync(apiClient);
checks.push({
  name: '2.1 前端 API 客户端文件存在',
  passed: apiExists,
  message: apiExists ? apiClient : '文件未找到',
});

// 2.2 API 函数完整性
if (apiExists) {
  const apiContent = fs.readFileSync(apiClient, 'utf-8');
  const functions = [
    'createStateMachineSession',
    'getStateMachineState',
    'getStateMachineGraph',
    'triggerStateMachineEvent',
    'resetStateMachineSession',
    'approveNode',
    'rejectNode',
    'proceedNode',
    'goBackNode',
    'clarifyNode',
  ];
  const foundFunctions = functions.filter((f) => new RegExp(`export.*${f}`).test(apiContent));
  checks.push({
    name: '2.2 API 函数完整性',
    passed: foundFunctions.length === 10,
    message: `找到 ${foundFunctions.length}/10`,
  });
}

// 2.3 StateGraphView 组件文件
const stateGraphView = path.join(WEB_COMPONENTS, 'Search', 'AiteamStateGraphView.tsx');
const viewExists = fs.existsSync(stateGraphView);
checks.push({
  name: '2.3 AiteamStateGraphView 组件存在',
  passed: viewExists,
  message: viewExists ? stateGraphView : '文件未找到',
});

// 2.4 组件集成 StateGraphVisualizer
if (viewExists) {
  const viewContent = fs.readFileSync(stateGraphView, 'utf-8');
  const hasVisualizer = /StateGraphVisualizer/.test(viewContent);
  const hasApprove = /approveNode/.test(viewContent);
  const hasReject = /rejectNode/.test(viewContent);
  const hasGoBack = /goBackNode/.test(viewContent);
  checks.push({
    name: '2.4 集成 StateGraphVisualizer + 操作',
    passed: hasVisualizer && hasApprove && hasReject && hasGoBack,
    message: `Visualizer: ${hasVisualizer}, Approve: ${hasApprove}, Reject: ${hasReject}, GoBack: ${hasGoBack}`,
  });
}

// 2.5 UI 导出索引
const uiIndex = path.join(WEB_COMPONENTS, 'UI', 'index.ts');
if (fs.existsSync(uiIndex)) {
  const indexContent = fs.readFileSync(uiIndex, 'utf-8');
  const hasStateGraphView = /AiteamStateGraphView/.test(indexContent);
  checks.push({
    name: '2.5 UI 导出索引包含 AiteamStateGraphView',
    passed: hasStateGraphView,
    message: hasStateGraphView ? '已导出' : '未找到',
  });
}

// ============================================================
// 3. 状态机类型定义
// ============================================================

const typesFile = path.join(SERVER_SRC, 'types', 'creation-state.ts');
if (fs.existsSync(typesFile)) {
  const typesContent = fs.readFileSync(typesFile, 'utf-8');
  const hasStateNodeId = /StateNodeId/.test(typesContent);
  const hasEvents = /StateMachineEvent/.test(typesContent);
  const hasNodes = /DEFAULT_STATE_NODES/.test(typesContent);
  const hasTransitions = /DEFAULT_TRANSITIONS/.test(typesContent);
  checks.push({
    name: '3.1 状态机类型定义完整',
    passed: hasStateNodeId && hasEvents && hasNodes && hasTransitions,
    message: `StateNodeId: ${hasStateNodeId}, Event: ${hasEvents}, Nodes: ${hasNodes}, Transitions: ${hasTransitions}`,
  });
}

// ============================================================
// 4. 服务层文件
// ============================================================

const stateMachineService = path.join(SERVER_SRC, 'services', 'creation-state-machine.service.ts');
const serviceExists = fs.existsSync(stateMachineService);
checks.push({
  name: '4.1 CreationStateMachine 服务文件存在',
  passed: serviceExists,
  message: serviceExists ? stateMachineService : '文件未找到',
});

if (serviceExists) {
  const serviceContent = fs.readFileSync(stateMachineService, 'utf-8');
  const hasClass = /export.*class.*CreationStateMachine/.test(serviceContent);
  const hasHandleEvent = /async.*handleEvent/.test(serviceContent);
  const hasCheckpoint = /saveCheckpoint|loadCheckpoint/.test(serviceContent);
  checks.push({
    name: '4.2 服务包含核心方法',
    passed: hasClass && hasHandleEvent && hasCheckpoint,
    message: `Class: ${hasClass}, handleEvent: ${hasHandleEvent}, Checkpoint: ${hasCheckpoint}`,
  });
}

// ============================================================
// 打印结果
// ============================================================

console.log('\n📋 验证结果:\n');

let passedCount = 0;
let failedCount = 0;

checks.forEach((check) => {
  const icon = check.passed ? '✅' : '❌';
  console.log(`${icon} ${check.name}`);
  console.log(`   ${check.message}\n`);
  if (check.passed) {
    passedCount++;
  } else {
    failedCount++;
  }
});

console.log('='.repeat(60));
console.log(`\n📊 总计: ${passedCount} 通过, ${failedCount} 未通过, ${checks.length} 总计\n`);

if (failedCount > 0) {
  console.log('⚠️  存在未通过的检查项，请修复后重试\n');
  process.exit(1);
} else {
  console.log('✅ Sprint 3 集成验证全部通过！\n');
  console.log('下一步：');
  console.log('  1. 在 /nvwa 页面中引入 <AiteamStateGraphView>');
  console.log('  2. 替换旧的 7 步进度条 UI');
  console.log('  3. 测试状态机事件流转\n');
}
