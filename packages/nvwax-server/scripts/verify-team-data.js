#!/usr/bin/env node

/**
 * 验证 AiTeam 团队数据脚本
 * 检查team_skills表中的数据情况
 */

import { Pool } from 'pg';

// 数据库配置
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'nvwax',
  user: process.env.DB_USER || 'nvwax',
  password: process.env.DB_PASSWORD || 'NvwaX@2024Secure!'
});

async function verifyTeamData() {
  console.log('🔍 开始验证 AiTeam 团队数据...\n');
  
  try {
    // 检查总数
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM team_skills');
    const totalCount = parseInt(totalResult.rows[0].total);
    
    console.log(`📊 团队总数: ${totalCount}`);
    
    if (totalCount === 0) {
      console.log('\n⚠️  警告: 数据库中没有任何团队数据！');
      console.log('💡 建议: 请运行导入脚本来添加冷启动数据');
      console.log('   - PowerShell: .\\import-popular-teams.ps1');
      console.log('   - Batch: import-popular-teams.bat');
      console.log('   - 手动SQL: psql -h localhost -U nvwax -d nvwax -f packages/nvwax-server/migrations/014_popular_agent_teams_cold_start.sql');
      return;
    }
    
    // 按分类统计
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
    
    // 显示最近的团队
    const recentResult = await pool.query(`
      SELECT id, name, category, is_public, created_at 
      FROM team_skills 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n🆕 最近添加的团队:');
    recentResult.rows.forEach((row, index) => {
      const date = new Date(row.created_at).toLocaleDateString('zh-CN');
      console.log(`${index + 1}. ${row.name} (${row.category}) - ${row.is_public ? '公开' : '私有'} - ${date}`);
    });
    
    // 检查是否有预期的冷启动数据
    const coldStartTeams = [
      'Web应用开发团队',
      '移动应用开发团队', 
      'AI/机器学习开发团队',
      '商业智能分析团队',
      '数字营销团队',
      'UI/UX设计团队',
      '电商运营团队'
    ];
    
    const existingTeamNames = recentResult.rows.map(row => row.name);
    const foundColdStartTeams = coldStartTeams.filter(name => 
      existingTeamNames.some(existing => existing.includes(name.replace('团队', '')))
    );
    
    console.log('\n✅ 冷启动数据状态:');
    if (foundColdStartTeams.length >= 5) {
      console.log(`已找到 ${foundColdStartTeams.length} 个预期的冷启动团队`);
      console.log('🎉 冷启动数据导入成功！');
    } else {
      console.log(`只找到 ${foundColdStartTeams.length} 个预期的冷启动团队`);
      console.log('💡 可能需要重新运行导入脚本');
    }
    
    console.log('\n✨ 验证完成！');
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 提示: 无法连接到数据库，请确保:');
      console.log('1. PostgreSQL服务正在运行');
      console.log('2. 数据库连接配置正确');
      console.log('3. 网络连通性正常');
    }
  } finally {
    await pool.end();
  }
}

// 运行验证
verifyTeamData()
  .then(() => {
    console.log('\n🏁 验证脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 验证脚本执行失败:', error);
    process.exit(1);
  });

export { verifyTeamData };
