import { databaseService } from './src/services/database.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🚀 Running SDK Integration Migration...\n');

  try {
    const pool = databaseService.getPool();
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '006_sdk_integration.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Reading migration file...');
    
    // Execute migration
    console.log('⚙️  Executing SQL migrations...\n');
    await pool.query(migrationSql);

    console.log('✅ Migration completed successfully!\n');
    console.log('Created tables:');
    console.log('  - tenants');
    console.log('  - api_keys');
    console.log('  - roles');
    console.log('  - user_roles');
    console.log('  - api_usage');
    console.log('  - webhooks');
    console.log('  - webhook_events');
    console.log('  - billing_plans');
    console.log('\nInserted default billing plans:');
    console.log('  - Free (1,000 requests/month)');
    console.log('  - Pro (50,000 requests/month)');
    console.log('  - Enterprise (Unlimited)');
    console.log('\n✨ SDK infrastructure is ready!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
