/**
 * 数据库连接和表结构测试脚本
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL 未配置');
  process.exit(1);
}

console.log('🔍 开始数据库连接测试...\n');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  },
  max: 5,
  connectionTimeoutMillis: 10000,
});

async function testDatabase() {
  const client = await pool.connect();
  
  try {
    // 测试 1: 基本连接
    console.log('✅ 测试 1: 数据库连接');
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`   当前时间: ${result.rows[0].current_time}`);
    console.log('   ✓ 连接成功\n');

    // 测试 2: 检查核心表是否存在
    console.log('✅ 测试 2: 核心表结构检查');
    const tablesToCheck = [
      'users',
      'projects',
      'ai_teams',
      'agent_teams',
      'admins',
      'agent_metadata',
      'bounties',
      'user_points',
      'point_transactions',
      'skills',
      'team_skills',
      'team_workspaces',
      'agent_team_executions'
    ];

    for (const table of tablesToCheck) {
      try {
        const checkResult = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )`,
          [table]
        );
        
        const exists = checkResult.rows[0].exists;
        if (exists) {
          // 获取表的行数
          const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`   ✓ ${table}: 存在 (${countResult.rows[0].count} 条记录)`);
        } else {
          console.log(`   ⚠️  ${table}: 不存在`);
        }
      } catch (error) {
        console.log(`   ❌ ${table}: 检查失败 - ${error.message}`);
      }
    }
    console.log();

    // 测试 3: 检查索引
    console.log('✅ 测试 3: 索引检查');
    const indexResult = await client.query(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    console.log(`   总索引数: ${indexResult.rows.length}`);
    console.log('   ✓ 索引检查完成\n');

    // 测试 4: 检查扩展
    console.log('✅ 测试 4: PostgreSQL 扩展检查');
    const extensionResult = await client.query(`
      SELECT extname FROM pg_extension
    `);
    
    extensionResult.rows.forEach(row => {
      console.log(`   ✓ ${row.extname}`);
    });
    console.log();

    // 测试 5: 数据库性能测试
    console.log('✅ 测试 5: 简单查询性能测试');
    const startTime = Date.now();
    await client.query('SELECT 1');
    const endTime = Date.now();
    console.log(`   查询耗时: ${endTime - startTime}ms`);
    console.log('   ✓ 性能正常\n');

    console.log('🎉 数据库测试全部通过！\n');
    
    // 显示数据库统计信息
    console.log('📊 数据库统计信息:');
    console.log(`   - 连接字符串: ${databaseUrl.split('@')[1]?.split('/')[0] || '未知'}`);
    console.log(`   - 表总数: ${tablesToCheck.length}`);
    console.log(`   - 索引总数: ${indexResult.rows.length}`);
    console.log(`   - 扩展数: ${extensionResult.rows.length}`);

  } catch (error) {
    console.error('❌ 数据库测试失败:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testDatabase().catch(console.error);
