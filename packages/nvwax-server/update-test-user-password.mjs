import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateTestUserPassword() {
  try {
    console.log('🔑 更新测试用户密码...\n');
    
    const email = 'test@example.com';
    const password = 'Test123456';
    
    // 检查用户是否存在
    const existing = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );
    
    if (existing.rows.length === 0) {
      console.log(' 用户不存在，请先创建用户');
      await pool.end();
      process.exit(1);
    }
    
    const user = existing.rows[0];
    console.log(`✅ 找到用户: ${user.email} (ID: ${user.id})`);
    
    // 生成 bcrypt 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`🔐 密码已哈希`);
    
    // 更新密码
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, user.id]
    );
    
    console.log('✅ 密码更新成功！');
    console.log(`\n📋 测试用户信息:`);
    console.log(`   邮箱: ${email}`);
    console.log(`   密码: ${password}`);
    console.log(`   哈希: ${hashedPassword.substring(0, 20)}...\n`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    await pool.end();
    process.exit(1);
  }
}

updateTestUserPassword();
