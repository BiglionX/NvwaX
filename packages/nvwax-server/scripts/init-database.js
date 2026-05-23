#!/usr/bin/env node

/**
 * 初始化基础数据库表结构
 */

import { Pool } from 'pg';

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'nvwax',
  user: 'nvwax',
  password: 'NvwaX@2024Secure!',
};

async function initDatabase() {
  console.log('🚀 初始化数据库表结构...\n');
  
  const pool = new Pool(DB_CONFIG);
  
  try {
    // 创建users表
    console.log('📊 创建 users 表...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ users 表创建成功\n');
    
    // 创建team_skills表
    console.log('📊 创建 team_skills 表...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        leader_config JSONB DEFAULT '{}'::jsonb,
        roles JSONB DEFAULT '[]'::jsonb,
        workflow JSONB DEFAULT '{}'::jsonb,
        binding_rules JSONB DEFAULT '{}'::jsonb,
        author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        version TEXT DEFAULT '1.0.0',
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ team_skills 表创建成功\n');
    
    // 创建索引
    console.log('📊 创建索引...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_skills_category ON team_skills(category)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_skills_public ON team_skills(is_public)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_skills_author ON team_skills(author_id)');
    console.log('✅ 索引创建成功\n');
    
    console.log('🎉 数据库初始化完成！');
    
  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

initDatabase()
  .then(() => {
    console.log('\n🏁 初始化完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 初始化失败:', error.message);
    process.exit(1);
  });
