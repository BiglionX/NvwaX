import dotenv from 'dotenv';
import { databaseService } from './src/services/database.service.js';

// 加载环境变量
dotenv.config();

async function checkAgentData() {
  console.log('\n🔍 检查云数据库中的 Agent 元数据...\n');

  try {
    // 初始化数据库
    console.log('📦 连接云数据库...');
    await databaseService.initializeDatabase();
    console.log('✓ 数据库连接成功\n');

    const pool = databaseService.getPool();

    // 1. 总数量统计
    console.log('📊 总体统计:');
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM agent_metadata');
    const totalCount = parseInt(totalResult.rows[0].total);
    console.log(`   总计: ${totalCount} 个 Agent\n`);

    // 2. 按来源统计
    console.log('📈 按来源分布:');
    const sourceResult = await pool.query(`
      SELECT source, COUNT(*) as count 
      FROM agent_metadata 
      GROUP BY source 
      ORDER BY count DESC
    `);
    
    sourceResult.rows.forEach((row: any) => {
      const percentage = ((parseInt(row.count) / totalCount) * 100).toFixed(1);
      console.log(`   - ${row.source.padEnd(15)}: ${row.count.padStart(4)} 个 (${percentage}%)`);
    });
    console.log();

    // 3. 按公司/分类统计
    console.log('🏢 按公司/分类分布:');
    const categoryResult = await pool.query(`
      SELECT 
        COALESCE(category, 'uncategorized') as category,
        COUNT(*) as count 
      FROM agent_metadata 
      WHERE category IS NOT NULL OR source IN ('github', 'gitee')
      GROUP BY category 
      ORDER BY count DESC
      LIMIT 15
    `);
    
    categoryResult.rows.forEach((row: any) => {
      const category = row.category === 'uncategorized' ? '未分类' : row.category;
      console.log(`   - ${category.padEnd(20)}: ${row.count} 个`);
    });
    console.log();

    // 4. 最新爬取时间
    console.log('⏰ 数据新鲜度:');
    const freshnessResult = await pool.query(`
      SELECT 
        MAX(last_crawled_at) as latest,
        MIN(last_crawled_at) as earliest,
        COUNT(CASE WHEN last_crawled_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_7days
      FROM agent_metadata
    `);
    
    const freshness = freshnessResult.rows[0];
    if (freshness.latest) {
      console.log(`   - 最新数据: ${new Date(freshness.latest).toLocaleString('zh-CN')}`);
      console.log(`   - 最早数据: ${freshness.earliest ? new Date(freshness.earliest).toLocaleString('zh-CN') : 'N/A'}`);
      console.log(`   - 7天内更新: ${freshness.recent_7days} 个\n`);
    }

    // 5. 高质量 Agent（Stars > 1000）
    console.log('⭐ 高质量 Agent (Stars > 1000):');
    const highQualityResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM agent_metadata 
      WHERE stars > 1000
    `);
    console.log(`   - 数量: ${highQualityResult.rows[0].count} 个\n`);

    // 6. 示例数据
    console.log('📋 示例数据（前 5 个）:');
    const sampleResult = await pool.query(`
      SELECT name, source, category, stars, url
      FROM agent_metadata
      ORDER BY stars DESC NULLS LAST
      LIMIT 5
    `);
    
    sampleResult.rows.forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. ${row.name}`);
      console.log(`      来源: ${row.source} | 分类: ${row.category || 'N/A'} | Stars: ${row.stars || 0}`);
      console.log(`      URL: ${row.url}\n`);
    });

    // 7. 数据库连接信息
    console.log('💾 数据库信息:');
    const dbInfoResult = await pool.query(`
      SELECT 
        current_database() as database_name,
        current_user as user_name,
        version() as db_version
    `);
    console.log(`   - 数据库: ${dbInfoResult.rows[0].database_name}`);
    console.log(`   - 用户: ${dbInfoResult.rows[0].user_name}`);
    console.log(`   - 版本: ${dbInfoResult.rows[0].db_version.split(',')[0]}\n`);

    console.log('✅ 检查完成！\n');

    if (totalCount >= 200) {
      console.log('🎉 云数据库已同步大量 Agent 数据！');
    } else if (totalCount > 0) {
      console.log('⚠️  云数据库有部分数据，但数量较少。');
    } else {
      console.log('❌ 云数据库中没有 Agent 数据，需要运行爬虫。');
    }

  } catch (error) {
    console.error('\n❌ 检查失败:', error);
    process.exit(1);
  } finally {
    await databaseService.close();
    console.log('\n👋 数据库连接已关闭\n');
  }
}

checkAgentData();
