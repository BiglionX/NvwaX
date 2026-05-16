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
  console.log('🚀 开始执行 agents 表创建迁移...\n');

  try {
    // 读取 SQL 文件
    const sqlPath = join(__dirname, 'migrations', '010_create_agents_table.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log(' 执行 SQL 迁移脚本...\n');

    // 执行迁移
    await pool.query(sql);

    console.log('✅ 迁移成功！\n');
    console.log(' 已创建的资源:');
    console.log('  - agents 表');
    console.log('  - 4 个索引');
    console.log('  - 触发器函数');
    console.log('  - 表注释\n');

    // 验证表创建
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'agents'
      )
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ agents 表验证成功\n');
      
      // 显示表结构
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'agents'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 agents 表结构:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
      console.log('\n🎯 Agent CRUD API 现在可以正常使用了！');
      console.log('  POST   /api/agents          - 创建 Agent');
      console.log('  GET    /api/agents          - 获取 Agent 列表');
      console.log('  GET    /api/agents/:id      - 获取 Agent 详情');
      console.log('  PUT    /api/agents/:id      - 更新 Agent');
      console.log('  DELETE /api/agents/:id      - 删除 Agent\n');
    } else {
      console.log('❌ agents 表创建失败');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ 迁移失败:\n');
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
