import { databaseService } from './src/services/database.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🚀 Running migration 010_nvwax_fields.sql...');
    
    const sqlPath = path.join(__dirname, 'migrations', '010_nvwax_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    await databaseService.getPool().query(sql);
    
    console.log('✅ Migration 010 completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
