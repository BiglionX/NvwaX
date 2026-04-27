import { databaseService } from './src/services/database.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTenantIsolationMigration() {
  console.log('🚀 Running Tenant Isolation Migration...\n');

  try {
    const pool = databaseService.getPool();
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '007_tenant_isolation.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Reading migration file...');
    console.log('⚠️  WARNING: This migration will add tenant_id to existing tables\n');
    
    // Execute migration
    console.log('⚙️  Executing SQL migrations...\n');
    await pool.query('BEGIN');
    await pool.query(migrationSql);
    await pool.query('COMMIT');

    console.log('✅ Migration completed successfully!\n');
    console.log('Modified tables (added tenant_id):');
    console.log('  - agent_teams');
    console.log('  - team_skills');
    console.log('  - projects');
    console.log('  - bounties');
    console.log('  - agent_metadata');
    console.log('  - ai_teams');
    console.log('  - workflows (if exists)');
    console.log('  - skills (if exists)');
    console.log('\nCreated helper functions:');
    console.log('  - get_user_tenant_id()');
    console.log('  - check_tenant_access()');
    console.log('\nCreated views:');
    console.log('  - user_agent_teams');
    console.log('  - public_marketplace_skills');
    console.log('  - user_projects_with_tenant');
    console.log('\nAdded triggers:');
    console.log('  - Auto-set tenant_id on INSERT for agent_teams');
    console.log('  - Auto-set tenant_id on INSERT for projects');
    console.log('\n✨ Tenant isolation is now active!\n');
    console.log('📝 Next steps:');
    console.log('   1. Update Service layer to use tenantId parameter');
    console.log('   2. Test queries with tenant filtering');
    console.log('   3. Verify no cross-tenant data leakage\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\nRolling back transaction...');
    try {
      const pool = databaseService.getPool();
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback also failed:', rollbackError);
    }
    process.exit(1);
  }
}

runTenantIsolationMigration();
