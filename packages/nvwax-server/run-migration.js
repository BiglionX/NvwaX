/**
 * 执行数据库迁移脚本
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }
  
  console.log('🔗 Connecting to database...');
  const client = new Client({ connectionString: databaseUrl });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '002_agent_factory.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Executing migration script...');
    console.log('File:', migrationPath);
    console.log('Size:', sql.length, 'bytes\n');
    
    // Execute SQL
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 New tables created:');
    console.log('  - skills (技能本体库)');
    console.log('  - bounties (悬赏系统)');
    console.log('  - user_points (用户积分)');
    console.log('  - point_transactions (积分流水)');
    console.log('  - template_collections (模板集合)');
    console.log('\n📝 Extended tables:');
    console.log('  - agent_metadata (新增 8 个字段)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) {
      console.error('Detail:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

runMigration();
