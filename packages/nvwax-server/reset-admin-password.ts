import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function resetPassword() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // 生成新密码的哈希值
    const newPassword = 'admin123456';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('🔧 重置管理员密码...');
    console.log('用户名: 1055603323@qq.com');
    console.log('新密码: admin123456');
    
    // 更新密码
    await pool.query(
      "UPDATE admins SET password = $1 WHERE username = '1055603323@qq.com'",
      [hashedPassword]
    );
    
    console.log('✅ 密码重置成功！');
    console.log('\n现在可以使用以下凭据登录：');
    console.log('  邮箱: 1055603323@qq.com');
    console.log('  密码: admin123456');
    
  } catch (error) {
    console.error('❌ 密码重置失败:', error);
  } finally {
    await pool.end();
  }
}

resetPassword();
