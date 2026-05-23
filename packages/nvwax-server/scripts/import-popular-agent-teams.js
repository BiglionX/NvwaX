#!/usr/bin/env node

/**
 * 热门 Agent 团队冷启动数据导入脚本
 * 将20个热门的Agent团队导入到数据库中
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库配置
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'nvwax',
  user: process.env.DB_USER || 'nvwax',
  password: process.env.DB_PASSWORD || 'NvwaX@2024Secure!'
});

async function importPopularAgentTeams() {
  console.log('🚀 开始导入热门 Agent 团队冷启动数据...');
  
  try {
    // 读取迁移SQL文件
    const sqlFilePath = path.join(__dirname, '../migrations/014_popular_agent_teams_cold_start.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
    
    console.log('📄 读取迁移文件:', sqlFilePath);
    
    // 执行SQL迁移
    await pool.query(sqlContent);
    
    console.log('✅ SQL迁移执行成功');
    
    // 验证导入结果
    const result = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM team_skills 
      GROUP BY category 
      ORDER BY category
    `);
    
    console.log('\n📊 导入统计结果:');
    console.log('分类 | 数量');
    console.log('---|---');
    result.rows.forEach(row => {
      console.log(`${row.category} | ${row.count}`);
    });
    
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM team_skills');
    console.log(`\n🎉 总共导入 ${totalResult.rows[0].total} 个 Agent 团队`);
    
    // 显示部分团队信息
    const sampleResult = await pool.query(`
      SELECT id, name, category, is_public 
      FROM team_skills 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 最近导入的团队示例:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.name} (${row.category}) - ${row.is_public ? '公开' : '私有'}`);
    });
    
    console.log('\n✨ 热门 Agent 团队冷启动数据导入完成！');
    
  } catch (error) {
    console.error('❌ 导入失败:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// 运行导入
importPopularAgentTeams()
  .then(() => {
    console.log('\n🏁 脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 脚本执行失败:', error);
    process.exit(1);
  });

export { importPopularAgentTeams };
