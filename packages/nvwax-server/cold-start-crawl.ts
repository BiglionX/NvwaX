import dotenv from 'dotenv';
import { agentCrawlerService } from './src/services/agent-crawler.service.js';
import { databaseService } from './src/services/database.service.js';

// 加载环境变量
dotenv.config();

async function coldStartCrawl() {
  console.log('\n🚀 开始冷启动爬虫任务...\n');
  console.log('目标: 爬取 200+ 个 Agent (GitHub 4个关键词 x 50 + HuggingFace 100)\n');

  try {
    // 初始化数据库
    console.log('📦 初始化数据库连接...');
    await databaseService.initializeDatabase();
    console.log('✓ 数据库连接成功\n');

    // 执行爬取
    console.log('🕷️  开始爬取 Agent 数据...\n');
    const startTime = Date.now();
    
    const result = await agentCrawlerService.runFullCrawl();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n✅ 冷启动爬取完成！\n');
    console.log('📊 统计信息:');
    console.log(`   - GitHub Agents: ${result.github} 个`);
    console.log(`   - HuggingFace Agents: ${result.huggingface} 个`);
    console.log(`   - 总计: ${result.github + result.huggingface} 个`);
    console.log(`   - 耗时: ${duration} 秒\n`);

    // 验证数据库
    const pool = databaseService.getPool();
    const countResult = await pool.query('SELECT COUNT(*) FROM agent_metadata');
    const totalCount = parseInt(countResult.rows[0].count);

    console.log('💾 数据库验证:');
    console.log(`   - 数据库中 Agent 总数: ${totalCount} 个\n`);

    if (totalCount >= 150) {
      console.log('🎉 冷启动成功！数据库已填充足够的数据。');
    } else {
      console.log('⚠️  警告: 数据量较少，可能需要检查 API 连接或稍后重试。\n');
    }

  } catch (error) {
    console.error('\n❌ 爬取失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await databaseService.close();
    console.log('\n👋 数据库连接已关闭\n');
  }
}

// 运行冷启动
coldStartCrawl();
