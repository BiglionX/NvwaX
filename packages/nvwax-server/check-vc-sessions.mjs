#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkDatabase() {
  try {
    console.log('\n📊 虚拟公司会话数据检查\n');
    
    // 检查表是否存在
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'virtual_company_sessions'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ virtual_company_sessions 表不存在');
      await pool.end();
      process.exit(1);
    }
    
    console.log('✅ virtual_company_sessions 表存在\n');
    
    // 获取最近创建的会话
    const sessions = await pool.query(`
      SELECT id, user_id, status, created_at
      FROM virtual_company_sessions
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`📋 最近创建的会话 (${sessions.rows.length} 条):\n`);
    
    sessions.rows.forEach((row, i) => {
      console.log(`${i + 1}. ID: ${row.id.substring(0, 8)}...`);
      console.log(`   用户: ${row.user_id}`);
      console.log(`   状态: ${row.status}`);
      console.log(`   创建时间: ${new Date(row.created_at).toLocaleString('zh-CN')}`);
      console.log('');
    });
    
    // 统计信息
    const stats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM virtual_company_sessions
      GROUP BY status
      ORDER BY count DESC
    `);
    
    console.log('📈 会话状态统计:\n');
    stats.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} 个`);
    });
    
    await pool.end();
    console.log('\n✅ 数据库检查完成\n');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkDatabase();
