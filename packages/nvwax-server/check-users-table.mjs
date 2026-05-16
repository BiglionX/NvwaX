import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUsersTable() {
  try {
    console.log('📋 检查 users 表结构...\n');
    
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log(' users 表字段:');
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(可空)' : '(必填)';
      console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

checkUsersTable();
