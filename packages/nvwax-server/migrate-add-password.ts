import { databaseService } from './src/services/database.service.js';

async function addPasswordColumn() {
  console.log('Adding password column to users table...');
  
  const client = await databaseService.getPool().connect();
  
  try {
    // 检查 password 列是否已存在
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('Password column already exists.');
      return;
    }
    
    // 添加 password 列
    await client.query(`
      ALTER TABLE users ADD COLUMN password TEXT
    `);
    
    console.log('✓ Password column added successfully!');
  } catch (error) {
    console.error('Error adding password column:', error);
  } finally {
    client.release();
    await databaseService.close();
  }
}

addPasswordColumn().catch(console.error);
