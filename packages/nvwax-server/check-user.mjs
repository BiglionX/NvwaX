import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_LXRhMSb4YDO8@ep-gentle-pond-anyn7yme-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function checkUser() {
  try {
    console.log('Checking user with email: 1055603323@qq.com\n');
    
    const result = await pool.query(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE email = $1',
      ['1055603323@qq.com']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found in database');
      console.log('\nThis email is not registered. You need to register first.');
    } else {
      console.log('✅ User found:');
      console.log(JSON.stringify(result.rows[0], null, 2));
      console.log('\nNote: Password is hashed and cannot be displayed.');
      console.log('If login fails, the password might be incorrect.');
    }
    
    // List all users for reference
    console.log('\n--- All Users in Database ---');
    const allUsers = await pool.query(
      'SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );
    
    console.log(`Total users: ${allUsers.rows.length}`);
    allUsers.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name || 'No name'}) - Created: ${user.created_at}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUser();
