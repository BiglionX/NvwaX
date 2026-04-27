/**
 * 运行 Agent Team 集成迁移脚本
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL 未配置');
  process.exit(1);
}

console.log('🔗 连接到数据库...\n');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  },
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('✅ 已连接到数据库\n');
    
    // 读取迁移文件
    const migrationFile = path.join(__dirname, 'migrations', '003_agent_team_integration.sql');
    const migrationSql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('📄 执行迁移脚本: 003_agent_team_integration.sql\n');
    
    // 分割SQL语句并逐个执行
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let executedCount = 0;
    for (const statement of statements) {
      try {
        await client.query(statement);
        executedCount++;
      } catch (error) {
        // 忽略已存在的错误（ON CONFLICT DO NOTHING）
        if (!error.message.includes('already exists')) {
          console.warn(`⚠️  警告: ${error.message}`);
        }
      }
    }
    
    console.log(`✅ 迁移执行完成！共执行 ${executedCount} 条语句\n`);
    
    // 验证表是否创建成功
    console.log('🔍 验证表结构...\n');
    const tablesToCheck = [
      'agent_team_executions',
      'team_skills',
      'team_workspaces'
    ];
    
    for (const table of tablesToCheck) {
      const checkResult = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [table]
      );
      
      const exists = checkResult.rows[0].exists;
      if (exists) {
        console.log(`   ✓ ${table}: 创建成功`);
      } else {
        console.log(`   ❌ ${table}: 创建失败`);
      }
    }
    
    console.log('\n🎉 Agent Team 集成迁移完成！\n');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('🔌 数据库连接已关闭\n');
  }
}

runMigration().catch(console.error);
