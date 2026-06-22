#!/usr/bin/env node
/**
 * v2.2.0 UI 组件结构验证脚本
 *
 * 验证新组件的：
 * 1. 文件存在
 * 2. 默认导出存在
 * 3. 关键 props 接口定义完整
 * 4. 已在 UI 组件库 index.ts 中导出
 *
 * 不需要测试运行时 - 纯静态分析
 */

import fs from 'fs';
import path from 'path';

const BASE = path.resolve(process.cwd(), 'packages/nvwax-web');
const UI_DIR = path.join(BASE, 'components', 'UI');
const INDEX_FILE = path.join(UI_DIR, 'index.ts');

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const checks: CheckResult[] = [];

// ============================================================
// 验证函数
// ============================================================

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

// 1. 检查 4 个新组件文件存在
const NEW_COMPONENTS = [
  { file: 'WizardStepper.tsx', exports: ['WizardStepper', 'WizardStepperProps', 'WizardStep', 'WizardStepStatus'] },
  { file: 'IndustryTemplateCard.tsx', exports: ['IndustryTemplateCard', 'IndustryTemplateGrid', 'INDUSTRY_TEMPLATES', 'IndustryTemplate', 'IndustryType'] },
  { file: 'SandboxChat.tsx', exports: ['SandboxChat', 'SandboxChatProps', 'SandboxMessage', 'SandboxMessageRole', 'SandboxExecutor'] },
  { file: 'StateGraphVisualizer.tsx', exports: ['StateGraphVisualizer', 'StateGraphVisualizerProps', 'StateGraphNode', 'StateGraphEdge', 'DEFAULT_STATE_MACHINE_NODES', 'DEFAULT_STATE_MACHINE_EDGES'] },
];

console.log('🔍 v2.2.0 UI 组件结构验证\n');
console.log('='.repeat(60));

for (const comp of NEW_COMPONENTS) {
  const filePath = path.join(UI_DIR, comp.file);
  const exists = fileExists(filePath);
  checks.push({
    name: `1.${comp.file.replace('.tsx', '')}.tsx 文件存在`,
    passed: exists,
    message: exists ? `✓ ${comp.file} 已创建` : `✗ 未找到 ${comp.file}`
  });
}

// 2. 检查每个组件都有 default export
console.log('\n[1/5] 文件存在性检查');
console.log('-'.repeat(60));
for (const comp of NEW_COMPONENTS) {
  const filePath = path.join(UI_DIR, comp.file);
  if (!fileExists(filePath)) {
    checks.push({
      name: `2.${comp.file}.tsx 有默认导出`,
      passed: false,
      message: `✗ 文件不存在`
    });
    continue;
  }
  const content = readFile(filePath);
  const hasDefaultExport = /export\s+default\s+(function|class|const)\s+\w+/.test(content);
  checks.push({
    name: `2.${comp.file.replace('.tsx', '')}.tsx 有默认导出`,
    passed: hasDefaultExport,
    message: hasDefaultExport ? `✓ 默认导出存在` : `✗ 缺少 default export`
  });
}

// 3. 检查 index.ts 已导出新组件
console.log('\n[2/5] 导出索引检查');
console.log('-'.repeat(60));
if (fileExists(INDEX_FILE)) {
  const indexContent = readFile(INDEX_FILE);
  for (const comp of NEW_COMPONENTS) {
    const mainExport = comp.exports[0];
    const exported = indexContent.includes(`export { default as ${mainExport} }`) ||
                     indexContent.includes(`export { default as ${mainExport},`) ||
                     new RegExp(`export\\s*\\{[^}]*${mainExport}[^}]*\\}\\s*from`).test(indexContent);
    checks.push({
      name: `3.${mainExport} 已在 index.ts 导出`,
      passed: exported,
      message: exported ? `✓ ${mainExport} 已导出` : `✗ ${mainExport} 未导出`
    });
  }
} else {
  checks.push({
    name: '3.index.ts 文件存在',
    passed: false,
    message: '✗ 未找到 index.ts'
  });
}

// 4. 检查关键 props 定义
console.log('\n[3/5] 关键 Props 定义检查');
console.log('-'.repeat(60));

// WizardStepper 必须有 WizardStepperProps
const wizardPath = path.join(UI_DIR, 'WizardStepper.tsx');
if (fileExists(wizardPath)) {
  const content = readFile(wizardPath);
  const hasProps = /export\s+interface\s+WizardStepperProps/.test(content);
  const hasStatus = /WizardStepStatus\s*=.*pending.*active.*completed.*error.*skipped/.test(content);
  checks.push({
    name: '4.WizardStepper 包含完整 Props 接口',
    passed: hasProps && hasStatus,
    message: `Props: ${hasProps ? '✓' : '✗'}, Status 5态: ${hasStatus ? '✓' : '✗'}`
  });
}

// IndustryTemplateCard 必须有 INDUSTRY_TEMPLATES
const cardPath = path.join(UI_DIR, 'IndustryTemplateCard.tsx');
if (fileExists(cardPath)) {
  const content = readFile(cardPath);
  const hasTemplates = /export\s+const\s+INDUSTRY_TEMPLATES\s*:\s*IndustryTemplate\[\]/.test(content);
  const has4Templates = (content.match(/id:\s*['"]marketing['"]|id:\s*['"]development['"]|id:\s*['"]customer-service['"]|id:\s*['"]data-analysis['"]/g) || []).length >= 4;
  checks.push({
    name: '4.IndustryTemplateCard 包含 4 个行业模板',
    passed: hasTemplates && has4Templates,
    message: `Templates: ${hasTemplates ? '✓' : '✗'}, 4 模板: ${has4Templates ? '✓' : '✗'}`
  });
}

// SandboxChat 必须有 executor prop
const chatPath = path.join(UI_DIR, 'SandboxChat.tsx');
if (fileExists(chatPath)) {
  const content = readFile(chatPath);
  const hasExecutor = /executor\?:\s*SandboxExecutor/.test(content);
  const hasMock = /defaultExecutor/.test(content);
  checks.push({
    name: '4.SandboxChat 包含 executor 接口和默认实现',
    passed: hasExecutor && hasMock,
    message: `Executor: ${hasExecutor ? '✓' : '✗'}, Mock: ${hasMock ? '✓' : '✗'}`
  });
}

// StateGraphVisualizer 必须有 13 个预定义节点
const graphPath = path.join(UI_DIR, 'StateGraphVisualizer.tsx');
if (fileExists(graphPath)) {
  const content = readFile(graphPath);
  const nodeCount = (content.match(/id:\s*['"](requirements_gathering|team_design|agent_matching|skill_matching|ceo_generation|document_generation|human_review|confirm|clarify|revise_design|create_agent_guide|complete|failed)['"]/g) || []).length;
  checks.push({
    name: '4.StateGraphVisualizer 包含 13 个预定义节点',
    passed: nodeCount >= 13,
    message: `节点数: ${nodeCount} ${nodeCount >= 13 ? '✓' : '✗ (期望 ≥13)'}`
  });
}

// 5. 检查文件大小合理性
console.log('\n[4/5] 文件大小检查');
console.log('-'.repeat(60));
for (const comp of NEW_COMPONENTS) {
  const filePath = path.join(UI_DIR, comp.file);
  if (!fileExists(filePath)) continue;
  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(1);
  const reasonable = stats.size > 3000 && stats.size < 50000; // 3KB-50KB
  checks.push({
    name: `5.${comp.file.replace('.tsx', '')} 大小合理 (3-50KB)`,
    passed: reasonable,
    message: `当前: ${sizeKB}KB ${reasonable ? '✓' : '✗ (异常)'}`
  });
}

// 6. 检查关键的 v2.2.0 兼容性
console.log('\n[5/5] v2.2.0 后端兼容性检查');
console.log('-'.repeat(60));

// WizardStepper 必须能处理 CreationStateMachine 5 状态
const wizard5Status = (() => {
  if (!fileExists(wizardPath)) return false;
  const content = readFile(wizardPath);
  return content.includes('pending') && content.includes('active') &&
         content.includes('completed') && content.includes('error') && content.includes('skipped');
})();
checks.push({
  name: '6.WizardStepper 支持 CreationStateMachine 5 状态',
  passed: wizard5Status,
  message: wizard5Status ? '✓ 5 状态完整支持' : '✗ 缺少部分状态'
});

// StateGraphVisualizer 必须包含 v2.2.0 状态机节点
const graphCompat = (() => {
  if (!fileExists(graphPath)) return false;
  const content = readFile(graphPath);
  return content.includes('DEFAULT_STATE_MACHINE_NODES') && content.includes('requirements_gathering');
})();
checks.push({
  name: '6.StateGraphVisualizer 默认展示 v2.2.0 状态机',
  passed: graphCompat,
  message: graphCompat ? '✓ 默认展示 v2.2.0 节点' : '✗ 缺少默认节点'
});

// ============================================================
// 输出结果
// ============================================================
console.log('\n' + '='.repeat(60));
let allPassed = true;
let passedCount = 0;

for (const check of checks) {
  const icon = check.passed ? '✓' : '✗';
  const color = check.passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m ${check.name}`);
  console.log(`    ${check.message}`);
  if (check.passed) {
    passedCount++;
  } else {
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`总计: ${passedCount}/${checks.length} 项通过`);
console.log(`通过率: ${((passedCount / checks.length) * 100).toFixed(1)}%`);

if (allPassed) {
  console.log('\n✅ 所有检查通过！v2.2.0 UI 组件库构建完成。');
  process.exit(0);
} else {
  console.log('\n❌ 部分检查未通过，请修正后重试。');
  process.exit(1);
}
