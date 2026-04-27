import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔍 检查数据库中的用户...\n');
    
    // 检查 users 表
    const usersResult = await pool.query('SELECT id, email, name, created_at FROM users LIMIT 5');
    console.log('📋 Users 表中的用户:');
    if (usersResult.rows.length === 0) {
      console.log('  (空)');
    } else {
      usersResult.rows.forEach(user => {
        console.log(`  - ${user.email} (${user.name || 'No name'})`);
      });
    }
    
    console.log('\n📋 Admins 表中的管理员:');
    const adminsResult = await pool.query('SELECT id, username, email, created_at FROM admins LIMIT 5');
    if (adminsResult.rows.length === 0) {
      console.log('  (空)');
    } else {
      adminsResult.rows.forEach(admin => {
        console.log(`  - ${admin.username}`);
      });
    }
    
    console.log('\n💡 提示:');
    console.log('  - 前端登录使用的是 users 表');
    console.log('  - 管理后台登录使用的是 admins 表');
    console.log('  - 如果 users 表为空，需要先注册一个用户账户');
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await pool.end();
  }
}

checkUsers();
