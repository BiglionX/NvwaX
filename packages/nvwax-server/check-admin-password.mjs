import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_LXRhMSb4YDO8@ep-gentle-pond-anyn7yme-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function checkAdminPassword() {
  try {
    console.log('Checking admin password...\n');
    
    const result = await pool.query(
      'SELECT id, username, email, password FROM admins WHERE username = $1 OR email = $1',
      ['1055603323@qq.com']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Admin not found');
    } else {
      const admin = result.rows[0];
      console.log('✅ Admin found:');
      console.log(`  ID: ${admin.id}`);
      console.log(`  Username: ${admin.username}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Password (stored): "${admin.password}"`);
      console.log(`  Password length: ${admin.password?.length || 0}`);
      
      // 测试几个常见密码
      const testPasswords = ['admin123', 'admin', 'password', '123456'];
      console.log('\n🔍 Testing common passwords:');
      testPasswords.forEach(pwd => {
        const match = admin.password === pwd;
        console.log(`  "${pwd}": ${match ? '✅ MATCH' : '❌ No match'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkAdminPassword();
