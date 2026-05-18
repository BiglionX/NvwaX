import { databaseService } from './src/services/database.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🔗 Connecting to database...');
  
  try {
    // 读取迁移文件
    const migrationPath = path.join(__dirname, 'migrations', '012_create_notifications_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration script...');
    console.log(`File: ${migrationPath}`);
    
    const pool = databaseService.getPool();
    
    // 执行迁移
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Notifications table created');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await databaseService.close();
    console.log('🔌 Database connection closed');
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
