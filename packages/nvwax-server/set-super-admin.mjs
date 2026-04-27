import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_LXRhMSb4YDO8@ep-gentle-pond-anyn7yme-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function setSuperAdmin() {
  try {
    const email = '1055603323@qq.com';
    const newPassword = '123456';
    
    console.log('Setting up super admin account...\n');
    console.log(`Email: ${email}`);
    console.log(`New Password: ${newPassword}\n`);
    
    // 检查用户是否存在
    const userResult = await pool.query(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found. Creating new admin account...');
      
      // 哈希密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 创建新用户
      await pool.query(
        'INSERT INTO users (id, email, password, name) VALUES ($1, $2, $3, $4)',
        [id, email, hashedPassword, '超级管理员']
      );
      console.log('✅ Admin account created successfully!');
    } else {
      const user = userResult.rows[0];
      console.log('✅ User found:', user);
      
      // 更新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.query(
        'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
        [hashedPassword, email]
      );
      console.log('✅ Password updated successfully!');
    }
    
    // 验证更新
    const verifyResult = await pool.query(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    
    console.log('\n--- Final Account Status ---');
    console.log(JSON.stringify(verifyResult.rows[0], null, 2));
    
    console.log('\n--- Login Credentials ---');
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log('\nYou can now login with these credentials.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

setSuperAdmin();
