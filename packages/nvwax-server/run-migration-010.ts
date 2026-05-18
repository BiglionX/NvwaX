import { databaseService } from './src/services/database.service.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('🚀 Running migration: 010_fix_virtual_company_sessions_fk.sql\n');
  
  try {
    // 读取迁移文件
    const migrationPath = join(__dirname, 'migrations', '010_fix_virtual_company_sessions_fk.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration file loaded\n');
    
    // 执行迁移
    await databaseService.getPool().query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('虚拟公司会话表现在支持管理员和普通用户创建会话\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
