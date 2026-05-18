import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function diagnoseAdminLogin() {
  try {
    console.log('🔍 诊断管理员登录问题...\n');
    
    const email = '1055603323@qq.com';
    
    // 检查 admins 表
    console.log('1️⃣ 检查 admins 表...');
    const adminResult = await pool.query(
      'SELECT id, username, email, password FROM admins WHERE username = $1 OR email = $1',
      [email]
    );
    
    if (adminResult.rows.length === 0) {
      console.log('❌ admins 表中未找到该用户');
      console.log('💡 该邮箱可能只在 users 表中存在\n');
    } else {
      const admin = adminResult.rows[0];
      console.log('✅ admins 表中找到用户:');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password (stored): "${admin.password}"`);
      console.log(`   Password length: ${admin.password?.length || 0}\n`);
      
      // 测试常见密码
      console.log('2️⃣ 测试常见密码:');
      const testPasswords = ['admin123456', 'admin123', '12345678', 'password'];
      testPasswords.forEach(pwd => {
        const match = admin.password === pwd;
        console.log(`   "${pwd}": ${match ? '✅ MATCH' : '❌ No match'}`);
      });
    }
    
    // 检查 users 表
    console.log('\n3️⃣ 检查 users 表...');
    const userResult = await pool.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ users 表中未找到该用户');
    } else {
      const user = userResult.rows[0];
      console.log('✅ users 表中找到用户:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
    }
    
    console.log('\n📋 建议:');
    console.log('   - 如果 admins 表中没有该用户，需要先创建管理员账号');
    console.log('   - 如果密码不匹配，需要重置密码');
    console.log('   - 确保使用正确的登录页面 (/admin/login)');
    
  } catch (error) {
    console.error('❌ 诊断失败:', error);
  } finally {
    await pool.end();
  }
}

diagnoseAdminLogin();
