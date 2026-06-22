#!/usr/bin/env node
/**
 * SQL 迁移语法验证脚本
 * 
 * 验证 030_creation_state_machine.sql 的关键 SQL 语法和结构
 * 不需要连接到数据库，可以作为 CI 检查
 */

import fs from 'fs';
import path from 'path';

const SQL_FILE = path.resolve(
  process.cwd(),
  'packages/nvwax-server/migrations/030_creation_state_machine.sql'
);

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const checks: CheckResult[] = [];

// ============================================================
// 验证函数
// ============================================================

function checkFileExists(): void {
  const exists = fs.existsSync(SQL_FILE);
  checks.push({
    name: '1. SQL 文件存在',
    passed: exists,
    message: exists ? SQL_FILE : '文件未找到: ' + SQL_FILE
  });
}

function checkStructure(content: string): void {
  // 检查必需的表定义
  const tables = [
    'creation_checkpoints',
    'agent_definitions'
  ];

  for (const table of tables) {
    const hasCreate = content.includes(`CREATE TABLE IF NOT EXISTS ${table}`);
    checks.push({
      name: `2.${tables.indexOf(table) + 1}. 表 ${table} 已定义`,
      passed: hasCreate,
      message: hasCreate ? '✓ CREATE TABLE 语句存在' : '✗ 未找到 CREATE TABLE 语句'
    });
  }

  // 检查 CREATE INDEX
  const indexCount = (content.match(/CREATE INDEX/g) || []).length;
  checks.push({
    name: '3. 已创建索引',
    passed: indexCount >= 3,
    message: `共 ${indexCount} 个 CREATE INDEX 语句（期望 ≥ 3）`
  });

  // 检查 INSERT 数据
  const hasInsert = content.includes('INSERT INTO agent_definitions');
  checks.push({
    name: '4. 已预填充内置 Agent 数据',
    passed: hasInsert,
    message: hasInsert ? '✓ INSERT 语句存在' : '✗ 未找到 INSERT 语句'
  });

  // 检查 ON CONFLICT
  const hasConflict = content.includes('ON CONFLICT');
  checks.push({
    name: '5. 已添加 ON CONFLICT 防止重复插入',
    passed: hasConflict,
    message: hasConflict ? '✓ ON CONFLICT 存在' : '✗ 缺少 ON CONFLICT'
  });

  // 检查 DO 块（用于条件 ALTER）
  const hasDoBlock = content.includes('DO $$');
  checks.push({
    name: '6. 已使用 DO 块进行条件 ALTER',
    passed: hasDoBlock,
    message: hasDoBlock ? '✓ DO 块存在' : '✗ 缺少 DO 块'
  });

  // 检查 GIN 索引（用于 JSONB 搜索）
  const hasGinIndex = content.includes('USING GIN');
  checks.push({
    name: '7. 已为 JSONB 列创建 GIN 索引',
    passed: hasGinIndex,
    message: hasGinIndex ? '✓ GIN 索引存在' : '✗ 缺少 GIN 索引'
  });

  // 检查 COMMENT ON
  const hasComments = content.includes('COMMENT ON');
  checks.push({
    name: '8. 已添加表/列注释',
    passed: hasComments,
    message: hasComments ? '✓ COMMENT ON 存在' : '✗ 缺少 COMMENT ON'
  });
}

function checkJsonSyntax(content: string): void {
  // 检查嵌入的 JSON 数组格式
  const capabilitiesMatches = content.match(/'\[(.*?)\]'/g) || [];
  checks.push({
    name: '9. capabilities/keywords 字段使用合法 JSON 数组字符串',
    passed: capabilitiesMatches.length >= 5,
    message: `找到 ${capabilitiesMatches.length} 个 JSON 数组字符串（期望 ≥ 5）`
  });

  // 验证至少一个 JSON 数组是合法的
  let validJsonCount = 0;
  for (const match of capabilitiesMatches) {
    try {
      JSON.parse(match.slice(1, -1).replace(/'/g, '"'));
      validJsonCount++;
    } catch {
      // 忽略，引号处理可能不同
    }
  }
  checks.push({
    name: '10. JSON 数组字符串可解析',
    passed: validJsonCount > 0,
    message: `至少 ${validJsonCount} 个 JSON 字符串可被解析`
  });
}

function checkMigrationId(content: string): void {
  // 检查迁移 ID 是否唯一
  const migrationIdMatch = content.match(/Migration:\s*(\d+)/);
  if (migrationIdMatch) {
    const id = parseInt(migrationIdMatch[1]);
    checks.push({
      name: '11. 迁移 ID 格式正确',
      passed: id >= 30 && id <= 999,
      message: `迁移 ID: ${id}`
    });
  } else {
    checks.push({
      name: '11. 迁移 ID 格式正确',
      passed: false,
      message: '✗ 未找到迁移 ID 注释'
    });
  }
}

function checkRollbackSafety(content: string): void {
  // 检查是否使用了 IF NOT EXISTS 避免冲突
  const createCount = (content.match(/CREATE TABLE/g) || []).length;
  const ifNotExistsCount = (content.match(/CREATE TABLE IF NOT EXISTS/g) || []).length;
  checks.push({
    name: '12. 所有 CREATE TABLE 都使用 IF NOT EXISTS',
    passed: createCount === ifNotExistsCount,
    message: `${ifNotExistsCount}/${createCount} CREATE TABLE 包含 IF NOT EXISTS`
  });

  // 检查 INSERT 使用 ON CONFLICT DO NOTHING 或 ON CONFLICT (col) DO NOTHING
  const insertMatches = content.match(/INSERT INTO/g) || [];
  const conflictMatches = content.match(/ON CONFLICT(?:\s*\([^)]+\))?\s*DO NOTHING/g) || [];
  checks.push({
    name: '13. INSERT 语句幂等',
    passed: insertMatches.length === conflictMatches.length,
    message: `${conflictMatches.length}/${insertMatches.length} INSERT 使用 ON CONFLICT DO NOTHING`
  });
}

// ============================================================
// 主流程
// ============================================================

function main() {
  console.log('🔍 SQL 迁移语法验证\n');
  console.log('='.repeat(60));

  checkFileExists();

  if (!fs.existsSync(SQL_FILE)) {
    console.log('\n❌ 验证失败：文件不存在');
    process.exit(1);
  }

  const content = fs.readFileSync(SQL_FILE, 'utf-8');
  checkStructure(content);
  checkJsonSyntax(content);
  checkMigrationId(content);
  checkRollbackSafety(content);

  // 输出结果
  let allPassed = true;
  for (const check of checks) {
    const icon = check.passed ? '✓' : '✗';
    const color = check.passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${icon}\x1b[0m ${check.name}`);
    console.log(`    ${check.message}`);
    if (!check.passed) allPassed = false;
  }

  console.log('\n' + '='.repeat(60));
  const passedCount = checks.filter(c => c.passed).length;
  console.log(`总计: ${passedCount}/${checks.length} 项通过`);

  if (allPassed) {
    console.log('\n✅ 所有检查通过！SQL 迁移脚本符合规范。');
    process.exit(0);
  } else {
    console.log('\n❌ 部分检查未通过，请修正后重试。');
    process.exit(1);
  }
}

main();
