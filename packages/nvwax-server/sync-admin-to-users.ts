import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

async function syncAdminToUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const adminEmail = '1055603323@qq.com';
    const adminPassword = 'admin123456';
    const adminName = '管理员';
    
    console.log('🔧 同步管理员账户到Users表...\n');
    console.log(`邮箱: ${adminEmail}`);
    console.log(`密码: ${adminPassword}`);
    console.log(`姓名: ${adminName}\n`);
    
    // 检查用户是否已存在
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (existing.rows.length > 0) {
      console.log('⚠️  用户已存在，更新密码...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, adminEmail]);
    } else {
      console.log('✨ 创建新用户...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const userId = crypto.randomUUID();
      
      await pool.query(
        'INSERT INTO users (id, email, password, name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [userId, adminEmail, hashedPassword, adminName]
      );
    }
    
    console.log('\n✅ 管理员账户已同步到Users表！');
    console.log('\n现在可以使用以下凭据在前端登录：');
    console.log('  邮箱: 1055603323@qq.com');
    console.log('  密码: admin123456');
    console.log('\n这个账户同时可以：');
    console.log('  ✓ 在前端登录（通过Users表）');
    console.log('  ✓ 在管理后台登录（通过Admins表）');
    
  } catch (error) {
    console.error('❌ 同步失败:', error);
  } finally {
    await pool.end();
  }
}

syncAdminToUsers();
