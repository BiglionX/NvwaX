/**
 * 查看 dev DB users 表当前数据
 */
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
const client = new pg.Client({ connectionString: process.env.DATABASE_URL! });
await client.connect();

const r = await client.query<{ id: string; email: string; name: string; created_at: Date }>(
  'SELECT id, email, name, created_at FROM users ORDER BY created_at LIMIT 20',
);

console.log(`Found ${r.rows.length} users:`);
for (const u of r.rows) {
  console.log(`  - id=${u.id}, email=${u.email}, name=${u.name ?? '(null)'}`);
}

await client.end();