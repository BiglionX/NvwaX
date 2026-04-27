import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_LXRhMSb4YDO8@ep-gentle-pond-anyn7yme-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function resetAdminPassword() {
  try {
    const username = '1055603323@qq.com';
    const newPassword = 'admin123'; // 新密码
    
    console.log(`Resetting password for admin: ${username}`);
    console.log(`New password: ${newPassword}\n`);
    
    // 更新密码
    await pool.query(
      'UPDATE admins SET password = $1 WHERE username = $2 OR email = $2',
      [newPassword, username]
    );
    
    console.log('✅ Password reset successfully!');
    console.log('\nYou can now login with:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
