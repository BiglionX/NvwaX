#!/usr/bin/env node

/**
 * 简化的热门 Agent 团队导入脚本
 * 直接连接到数据库并执行SQL
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从.env文件读取配置或提供默认值 - 使用本地Docker PostgreSQL
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'nvwax',
  user: process.env.DB_USER || 'nvwax',
  password: process.env.DB_PASSWORD || 'NvwaX@2024Secure!',
  connectionTimeoutMillis: 10000, // 10秒超时
  query_timeout: 30000 // 30秒查询超时
};

console.log('🔧 数据库配置:');
console.log(`   主机: ${DB_CONFIG.host}`);
console.log(`   端口: ${DB_CONFIG.port}`);
console.log(`   数据库: ${DB_CONFIG.database}`);
console.log(`   用户: ${DB_CONFIG.user}`);
console.log('');

async function importTeams() {
  console.log('🚀 开始导入热门 Agent 团队数据...\n');
  
  const pool = new Pool(DB_CONFIG);
  
  try {
    // 测试连接
    console.log('📡 测试数据库连接...');
    await pool.query('SELECT 1');
    console.log('✅ 数据库连接成功\n');
    
    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, '../migrations/014_popular_agent_teams_cold_start.sql');
    console.log('📄 读取迁移文件:', sqlFilePath);
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL文件不存在: ${sqlFilePath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
    console.log('✅ SQL文件读取成功\n');
    
    // 执行SQL
    console.log('⚙️  执行SQL迁移...');
    await pool.query(sqlContent);
    console.log('✅ SQL迁移执行成功\n');
    
    // 验证结果
    console.log('🔍 验证导入结果...\n');
    
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM team_skills');
    const totalCount = parseInt(totalResult.rows[0].total);
    console.log(`📊 团队总数: ${totalCount}`);
    
    const categoryResult = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM team_skills 
      GROUP BY category 
      ORDER BY category
    `);
    
    console.log('\n📋 分类统计:');
    console.log('分类 | 数量');
    console.log('---|---');
    categoryResult.rows.forEach(row => {
      console.log(`${row.category.padEnd(15)} | ${row.count}`);
    });
    
    // 显示部分团队
    const sampleResult = await pool.query(`
      SELECT name, category, is_public 
      FROM team_skills 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n🆕 最近添加的团队示例:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.name} (${row.category}) - ${row.is_public ? '公开' : '私有'}`);
    });
    
    console.log('\n🎉 导入完成！');
    console.log(`✨ 成功导入 ${totalCount} 个Agent团队到数据库`);
    
  } catch (error) {
    console.error('\n❌ 导入失败:', error.message);
    
    if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 连接超时提示:');
      console.log('1. 检查网络连接是否正常');
      console.log('2. 确认数据库服务器是否可访问');
      console.log('3. 检查防火墙设置');
      console.log('4. 尝试使用本地数据库');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 连接拒绝提示:');
      console.log('1. 检查数据库服务是否正在运行');
      console.log('2. 确认主机和端口是否正确');
      console.log('3. 检查数据库配置');
    }
    
    throw error;
  } finally {
    await pool.end();
  }
}

// 运行导入
importTeams()
  .then(() => {
    console.log('\n🏁 脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 脚本执行失败:', error.message);
    process.exit(1);
  });
