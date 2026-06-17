/**
 * Sprint 2.2.1 Task 7 — 创建 dev 测试用户
 * 邮箱: dev-test@nvwax.local  密码: DevTest2026!
 */
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import pg from 'pg';

dotenv.config();
const client = new pg.Client({ connectionString: process.env.DATABASE_URL! });
await client.connect();

const email = 'dev-test@nvwax.local';
const password = 'DevTest2026!';
const id = `user_${Date.now()}_devtest`;
const name = 'Dev Test User';
const hash = await bcrypt.hash(password, 10);

try {
  // 先删后插（幂等）
  await client.query('DELETE FROM users WHERE email = $1', [email]);
  await client.query(
    `INSERT INTO users (id, email, name, password, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())`,
    [id, email, name, hash],
  );
  console.log(`✓ Created dev test user:`);
  console.log(`    id       = ${id}`);
  console.log(`    email    = ${email}`);
  console.log(`    password = ${password}`);
} catch (err: any) {
  console.error('✗ FAIL:', err.message);
  process.exit(1);
}

await client.end();