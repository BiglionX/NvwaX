/**
 * Sprint 2.2.1 Task 7 — DB migration runner
 * 顺序跑 026 → 027 → 028（dev DB 缺 OIDC schema）
 */
import dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import pg from 'pg';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL!;
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations');

const TO_RUN = ['026_oidc_idp.sql', '027_oidc_clients_rps.sql', '028_user_activation.sql'];

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

let failed = 0;

for (const file of TO_RUN) {
  const fullPath = path.join(MIGRATIONS_DIR, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`✗ ${file}: NOT FOUND at ${fullPath}`);
    failed++;
    continue;
  }
  const sql = fs.readFileSync(fullPath, 'utf-8');
  try {
    await client.query(sql);
    console.log(`✓ ${file}: applied`);
  } catch (err: any) {
    console.error(`✗ ${file}: FAILED`);
    console.error('  ', err.message);
    failed++;
  }
}

// 验证 oidc_clients 表是否真的有数据
const r = await client.query<{ client_id: string; redirect_uris: string[] }>(
  'SELECT client_id, redirect_uris FROM oidc_clients ORDER BY client_id',
);
console.log(`\n📋 oidc_clients (${r.rows.length} rows):`);
for (const row of r.rows) {
  console.log(`  - ${row.client_id} → ${row.redirect_uris.join(', ')}`);
}

await client.end();
process.exit(failed === 0 ? 0 : 1);