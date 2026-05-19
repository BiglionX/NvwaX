import { databaseService } from './src/services/database.service.js';

async function getTestUser() {
  try {
    console.log('🔍 Finding test user...\n');
    
    const result = await databaseService.getPool().query(
      'SELECT id, email FROM users LIMIT 1'
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log(`✅ Found user: ${user.email} (${user.id})`);
      return user.id;
    } else {
      console.log('❌ No users found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

getTestUser();
