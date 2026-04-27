import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

async function createTestUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const email = 'testuser@example.com';
    const password = 'test123456';
    const name = '测试用户';
    
    console.log('🔧 创建测试用户...');
    console.log(`邮箱: ${email}`);
    console.log(`密码: ${password}`);
    console.log(`姓名: ${name}\n`);
    
    // 检查用户是否已存在
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      console.log('⚠️  用户已存在，重置密码...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);
    } else {
      console.log('✨ 创建新用户...');
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = crypto.randomUUID();
      
      await pool.query(
        'INSERT INTO users (id, email, password, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [userId, email, hashedPassword, name]
      );
    }
    
    console.log('\n✅ 用户创建成功！');
    console.log('\n现在可以使用以下凭据在前端登录：');
    console.log('  邮箱: testuser@example.com');
    console.log('  密码: test123456');
    
  } catch (error) {
    console.error('❌ 创建用户失败:', error);
  } finally {
    await pool.end();
  }
}

createTestUser();
