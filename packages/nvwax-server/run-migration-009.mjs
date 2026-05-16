#!/usr/bin/env node
/**
 * 执行虚拟公司会话系统数据库迁移
 * 
 * 用法:
 *   node run-migration-009.mjs
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库配置
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nvwax',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function runMigration() {
  console.log('🚀 开始执行虚拟公司会话系统迁移...\n');
  
  try {
    // 读取迁移脚本
    const migrationPath = join(__dirname, 'migrations', '009_virtual_company_sessions.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 执行 SQL 迁移脚本...');
    
    // 执行迁移
    await pool.query(sql);
    
    console.log('✅ 迁移成功完成！\n');
    
    // 验证表是否创建成功
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'virtual_company_sessions'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ 验证通过: virtual_company_sessions 表已创建\n');
      
      // 显示表结构
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'virtual_company_sessions'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 表结构:');
      console.log('─'.repeat(60));
      columns.rows.forEach(col => {
        console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable}`);
      });
      console.log('─'.repeat(60));
    } else {
      console.error('❌ 验证失败: virtual_company_sessions 表未找到');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    console.error('\n错误详情:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
  
  console.log('\n✨ 迁移完成！可以开始使用虚拟公司创建功能了。\n');
}

// 运行迁移
runMigration();
