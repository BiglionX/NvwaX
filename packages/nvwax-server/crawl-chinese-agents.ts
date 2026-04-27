import dotenv from 'dotenv';
import { chineseAgentCrawlerService } from './src/services/chinese-agent-crawler.service.js';
import { databaseService } from './src/services/database.service.js';

// 加载环境变量
dotenv.config();

async function crawlChineseAgents() {
  console.log('\n🇨🇳 开始爬取中国科技公司开源 Agent...\n');
  console.log('目标公司: 百度、阿里巴巴、京东、腾讯、华为\n');

  try {
    // 初始化数据库
    console.log('📦 初始化数据库连接...');
    await databaseService.initializeDatabase();
    console.log('✓ 数据库连接成功\n');

    // 执行爬取
    console.log('🕷️  开始爬取中国公司 Agent 数据...\n');
    const startTime = Date.now();
    
    const result = await chineseAgentCrawlerService.runFullCrawl();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n✅ 中国公司 Agent 爬取完成！\n');
    console.log('📊 统计信息:');
    console.log(`   - 百度 Baidu: ${result.baidu} 个`);
    console.log(`   - 阿里巴巴 Alibaba: ${result.alibaba} 个`);
    console.log(`   - 京东 JD: ${result.jd} 个`);
    console.log(`   - 腾讯 Tencent: ${result.tencent} 个`);
    console.log(`   - 华为 Huawei: ${result.huawei} 个`);
    console.log(`   - 总计: ${Object.values(result).reduce((a, b) => a + b, 0)} 个`);
    console.log(`   - 耗时: ${duration} 秒\n`);

    // 验证数据库
    const pool = databaseService.getPool();
    const countResult = await pool.query('SELECT COUNT(*) FROM agent_metadata');
    const totalCount = parseInt(countResult.rows[0].count);

    console.log('💾 数据库验证:');
    console.log(`   - 数据库中 Agent 总数: ${totalCount} 个\n`);

    if (totalCount >= 100) {
      console.log('🎉 爬取成功！数据库已填充大量中国公司 Agent 数据。');
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

// 运行爬取
crawlChineseAgents();
