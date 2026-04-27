import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_LXRhMSb4YDO8@ep-gentle-pond-anyn7yme-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function checkAdmin() {
  try {
    console.log('Checking admin with email/username: 1055603323@qq.com\n');
    
    const result = await pool.query(
      'SELECT id, username, email FROM admins WHERE email = $1 OR username = $1',
      ['1055603323@qq.com']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Admin not found in admins table');
      console.log('\n💡 This email exists in users table but NOT in admins table');
      console.log('💡 You should use the regular login page (/login), not admin login');
    } else {
      console.log('✅ Admin found in admins table:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkAdmin();
