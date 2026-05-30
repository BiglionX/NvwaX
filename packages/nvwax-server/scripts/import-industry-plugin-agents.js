#!/usr/bin/env node

/**
 * 行业插件 AI Agent 数据迁移脚本 v1.0.0
 * 注册 4 个行业 AiTeam + 12 个 Agent
 * 
 * 使用: node scripts/import-industry-plugin-agents.js
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库配置
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'nvwax',
  user: process.env.DB_USER || 'nvwax',
  password: process.env.DB_PASSWORD || 'NvwaX@2024Secure!',
  connectionTimeoutMillis: 10000,
  query_timeout: 60000
};

console.log('🔧 数据库配置:');
console.log(`   主机: ${DB_CONFIG.host}`);
console.log(`   端口: ${DB_CONFIG.port}`);
console.log(`   数据库: ${DB_CONFIG.database}`);
console.log(`   用户: ${DB_CONFIG.user}`);
console.log('');

async function importIndustryPluginAgents() {
  console.log('🚀 开始导入行业插件 AiTeam + Agent 数据...\n');

  const pool = new Pool(DB_CONFIG);

  try {
    // 测试连接
    console.log('📡 测试数据库连接...');
    await pool.query('SELECT 1');
    console.log('✅ 数据库连接成功\n');

    // 读取 SQL 文件
    const sqlFilePath = path.join(__dirname, '../migrations/018_industry_plugin_agents.sql');
    console.log('📄 读取迁移文件:', sqlFilePath);

    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL文件不存在: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
    console.log('✅ SQL文件读取成功\n');

    // 执行 SQL
    console.log('⚙️  执行 SQL 迁移...');
    await pool.query(sqlContent);
    console.log('✅ SQL 迁移执行成功\n');

    // 验证结果
    console.log('🔍 验证导入结果...\n');

    // 验证 team_skills (industry-plugin)
    const teamResult = await pool.query(
      "SELECT id, name, category, is_public, version FROM team_skills WHERE category = 'industry-plugin' ORDER BY id"
    );
    console.log(`📊 行业 AiTeam 数量: ${teamResult.rows.length}`);
    teamResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.name} (${row.id}) - 公开: ${row.is_public}, 版本: ${row.version}`);
    });

    // 验证 industry_agents
    const agentResult = await pool.query(`
      SELECT ia.id, ia.name, ts.name AS team_name, ia.proclaw_agent_id
      FROM industry_agents ia
      JOIN team_skills ts ON ia.team_skill_id = ts.id
      ORDER BY ts.name, ia.sort_order
    `);
    console.log(`\n📊 Agent 总数: ${agentResult.rows.length}`);
    agentResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. [${row.team_name}] ${row.name} (${row.proclaw_agent_id})`);
    });

    console.log('\n🎉 迁移完成！');
    console.log(`✅ 成功导入 ${teamResult.rows.length} 个行业 AiTeam + ${agentResult.rows.length} 个 Agent`);

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 连接超时提示:');
      console.log('1. 检查网络连接是否正常');
      console.log('2. 确认数据库服务器是否可访问');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 连接拒绝提示:');
      console.log('1. 检查数据库服务是否正在运行');
      console.log('2. 确认主机和端口是否正确');
    }
    throw error;
  } finally {
    await pool.end();
  }
}

importIndustryPluginAgents()
  .then(() => {
    console.log('\n🏁 脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 脚本执行失败:', error.message);
    process.exit(1);
  });
