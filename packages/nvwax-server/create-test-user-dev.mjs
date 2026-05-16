import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTestUser() {
  try {
    console.log('👤 创建测试用户...\n');
    
    // 检查用户是否已存在
    const existing = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      ['test-user-dev']
    );
    
    if (existing.rows.length > 0) {
      console.log('✅ 测试用户已存在');
    } else {
      // 创建测试用户（使用最小字段）
      await pool.query(`
        INSERT INTO users (id, email, name, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, ['test-user-dev', 'test@dev.local', 'Test User']);
      
      console.log('✅ 测试用户创建成功: test-user-dev');
    }
    
    await pool.end();
    console.log('\n✨ 完成！\n');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

createTestUser();
