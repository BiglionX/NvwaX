/**
 * 列出 dev DB 当前所有表
 */
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL!;
const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const r = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
`);

console.log(`Found ${r.rows.length} tables in public schema:`);
for (const row of r.rows) {
  console.log(' -', row.table_name);
}

await client.end();