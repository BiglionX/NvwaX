#!/usr/bin/env node

/**
 * 执行所有数据库迁移脚本
 * 按顺序执行migrations目录下的所有SQL文件
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库配置 - 使用本地Docker PostgreSQL
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'nvwax',
  user: 'nvwax',
  password: 'NvwaX@2024Secure!',
  connectionTimeoutMillis: 10000,
};

async function runAllMigrations() {
  console.log('🚀 开始执行所有数据库迁移...\n');
  
  const pool = new Pool(DB_CONFIG);
  
  try {
    // 测试连接
    console.log('📡 测试数据库连接...');
    await pool.query('SELECT 1');
    console.log('✅ 数据库连接成功\n');
    
    // 获取所有迁移文件
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // 按文件名排序确保执行顺序
    
    console.log(`📄 找到 ${files.length} 个迁移文件\n`);
    
    // 依次执行每个迁移文件
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`⚙️  执行迁移: ${file}`);
      
      try {
        const sqlContent = fs.readFileSync(filePath, 'utf-8');
        await pool.query(sqlContent);
        console.log(`   ✅ ${file} 执行成功\n`);
      } catch (error) {
        console.error(`   ❌ ${file} 执行失败:`, error.message);
        console.error('   继续执行下一个迁移...\n');
      }
    }
    
    // 验证结果
    console.log('🔍 验证迁移结果...\n');
    
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`📊 创建的表数量: ${tablesResult.rows.length}`);
    console.log('\n表列表:');
    tablesResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.table_name}`);
    });
    
    // 检查team_skills表
    const teamSkillsResult = await pool.query('SELECT COUNT(*) as count FROM team_skills');
    console.log(`\n🎯 team_skills表中的团队数量: ${teamSkillsResult.rows[0].count}`);
    
    console.log('\n🎉 所有迁移执行完成！');
    
  } catch (error) {
    console.error('\n❌ 迁移执行失败:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// 运行迁移
runAllMigrations()
  .then(() => {
    console.log('\n🏁 迁移脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 迁移脚本执行失败:', error.message);
    process.exit(1);
  });
