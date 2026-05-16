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
      ['user-123']
    );
    
    if (existing.rows.length > 0) {
      console.log('✅ 测试用户已存在');
      console.log('  User ID: user-123');
    } else {
      // 创建测试用户
      await pool.query(`
        INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'user-123',
        'test@nvwax.com',
        'Test User',
        'hashed_password_placeholder',
        new Date(),
        new Date()
      ]);
      
      console.log('✅ 测试用户创建成功');
      console.log('  User ID: user-123');
      console.log('  Email: test@nvwax.com');
      console.log('  Name: Test User');
    }
    
    // 验证迁移结果
    console.log('\n📊 验证虚拟公司会话表...\n');
    
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'virtual_company_sessions'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ virtual_company_sessions 表存在');
      
      // 检查表结构
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'virtual_company_sessions'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 表结构:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
      // 检查索引
      const indexes = await pool.query(`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'virtual_company_sessions'
      `);
      
      console.log('\n🔍 索引:');
      indexes.rows.forEach(idx => {
        console.log(`  - ${idx.indexname}`);
      });
      
    } else {
      console.log('❌ virtual_company_sessions 表不存在');
    }
    
    await pool.end();
    
    console.log('\n 所有检查完成！');
    console.log('\n🎯 现在可以测试 API:');
    console.log('  POST http://localhost:3001/api/virtual-company/sessions');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

createTestUser();
