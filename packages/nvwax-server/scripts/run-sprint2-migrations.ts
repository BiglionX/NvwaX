/**
 * Sprint 2 migration runner.
 *
 * Executes the Sprint 2 migration files in order:
 *   027_oidc_clients_rps.sql
 *   028_user_activation.sql
 *
 * Usage:
 *   pnpm --filter nvwax-server migrate:sprint2
 *   # or
 *   tsx scripts/run-sprint2-migrations.ts
 *
 * Idempotent — both files use CREATE TABLE IF NOT EXISTS / INSERT ... ON CONFLICT DO NOTHING.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { databaseService } from '../src/services/database.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations');

const SPRINT2_MIGRATIONS = ['027_oidc_clients_rps.sql', '028_user_activation.sql'];

async function main() {
  console.log('[sprint2-migrate] connecting to database…');
  await databaseService.initializeDatabase();
  const pool = databaseService.getPool();

  for (const file of SPRINT2_MIGRATIONS) {
    const full = path.join(MIGRATIONS_DIR, file);
    if (!fs.existsSync(full)) {
      throw new Error(`Migration not found: ${file}`);
    }
    const sql = fs.readFileSync(full, 'utf8');
    console.log(`[sprint2-migrate] applying ${file}…`);
    await pool.query(sql);
  }

  // Verify the 4 RP rows landed
  const clients = await pool.query(
    `SELECT client_id, name FROM oidc_clients WHERE is_active = TRUE ORDER BY client_id`,
  );
  console.log('[sprint2-migrate] active OIDC clients:');
  for (const row of clients.rows) {
    console.log(`  - ${row.client_id}  (${row.name})`);
  }

  await databaseService.close();
  console.log('[sprint2-migrate] done');
}

main().catch((err) => {
  console.error('[sprint2-migrate] FAILED:', err);
  process.exit(1);
});
