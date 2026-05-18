import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('🚀 开始执行 Agent 仓库重构迁移...\n');

  try {
    // 读取 SQL 文件
    const sqlPath = join(__dirname, 'migrations', '013_refactor_agent_repository.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📝 执行 SQL 迁移脚本...\n');

    // 执行迁移
    await pool.query(sql);

    console.log('✅ 迁移成功！\n');
    console.log('已创建/修改的资源:');
    console.log('  - agents 表：新增 9 个字段');
    console.log('  - aiteams 表：新建独立表');
    console.log('  - aiteam_members 表：成员关联表');
    console.log('  - agent_exports 表：导出历史记录\n');

    // 验证表创建
    const tables = ['agents', 'aiteams', 'aiteam_members', 'agent_exports'];
    
    for (const tableName of tables) {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tableName]);

      if (tableCheck.rows[0].exists) {
        console.log(`✅ ${tableName} 表验证成功`);
        
        // 显示表结构
        const columns = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        console.log(`\n📋 ${tableName} 表结构:`);
        columns.rows.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
        console.log('');
      } else {
        console.log(`❌ ${tableName} 表创建失败`);
      }
    }

    console.log('\n🎯 下一步：');
    console.log('  1. 实现 AgentService 完整 CRUD');
    console.log('  2. 创建独立的 AiTeamService');
    console.log('  3. 实现 ExportService（JSON/YAML/ProClaw格式）');
    console.log('  4. 更新 API 端点\n');

    await pool.end();
  } catch (error) {
    console.error('❌ 迁移失败:\n');
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
