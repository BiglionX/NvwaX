import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

class DatabaseService {
  private pool: Pool | null = null;

  constructor() {
    // 延迟初始化，等待显式调用 initializePool()
    // 这样可以确保在 Railway 等部署环境中环境变量已经准备好
  }

  async initializePool() {
    if (this.pool) {
      console.log('Database pool already initialized');
      return;
    }

    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('DATABASE_URL is not set in environment variables');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DB') || k.includes('POSTGRES')));
      throw new Error('DATABASE_URL is required');
    }

    console.log('Initializing PostgreSQL connection pool...');
    console.log('DATABASE_URL found:', databaseUrl.substring(0, 20) + '...');

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false // Neon requires SSL
      },
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    console.log('✓ PostgreSQL connection pool initialized');
  }

  async getPool(): Promise<Pool> {
    if (!this.pool) {
      await this.initializePool();
    }
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool;
  }

  async initializeDatabase() {
    const pool = await this.getPool();
    const client = await pool.connect();
    
    try {
      console.log('Initializing database schema...');

      // 创建用户表
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          name TEXT,
          avatar TEXT,
          bio TEXT,
          is_banned BOOLEAN DEFAULT FALSE,
          ban_reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 添加用户状态字段（如果表已存在）
      try {
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT`);
      } catch (error) {
        console.log('User status columns already exist or not needed');
      }

      // 创建项目表
      await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'active', -- active, suspended, under_review
          review_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 添加项目状态字段（如果表已存在）
      try {
        await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`);
        await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS review_notes TEXT`);
      } catch (error) {
        console.log('Project status columns already exist or not needed');
      }

      // 创建 AiTeam 表
      await client.query(`
        CREATE TABLE IF NOT EXISTS ai_teams (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建 Agent Team 表
      await client.query(`
        CREATE TABLE IF NOT EXISTS agent_teams (
          id TEXT PRIMARY KEY,
          team_id TEXT NOT NULL REFERENCES ai_teams(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          agents JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建管理员表
      await client.query(`
        CREATE TABLE IF NOT EXISTS admins (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          role TEXT DEFAULT 'admin',
          permissions JSONB,
          avatar TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP
        )
      `);

      // 创建系统配置表
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_config (
          key TEXT PRIMARY KEY,
          value TEXT,
          description TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建系统日志表
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_logs (
          id TEXT PRIMARY KEY,
          level TEXT NOT NULL,
          action TEXT NOT NULL,
          admin_id TEXT REFERENCES admins(id) ON DELETE SET NULL,
          details TEXT,
          ip_address TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建 Agent 元数据表
      await client.query(`
        CREATE TABLE IF NOT EXISTS agent_metadata (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          source TEXT NOT NULL, -- 'github', 'huggingface', 'custom'
          url TEXT NOT NULL,
          download_url TEXT,
          stars INTEGER DEFAULT 0,
          downloads INTEGER DEFAULT 0,
          tags JSONB,
          category TEXT,
          author TEXT,
          license TEXT,
          last_crawled_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建 Agent Team Executions 表（执行记录）
      await client.query(`
        CREATE TABLE IF NOT EXISTS agent_team_executions (
          id TEXT PRIMARY KEY,
          agent_team_id TEXT NOT NULL REFERENCES agent_teams(id) ON DELETE CASCADE,
          
          -- 执行状态
          status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed, cancelled
          progress JSONB DEFAULT '{}'::jsonb,
          
          -- 执行结果
          results JSONB,
          error_message TEXT,
          
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建 Team Skills 表（团队技能模板）
      await client.query(`
        CREATE TABLE IF NOT EXISTS team_skills (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT,  -- 'development', 'research', 'content', 'analysis', etc.
          
          -- Team Skills 结构化数据
          leader_config JSONB DEFAULT '{}'::jsonb,
          roles JSONB DEFAULT '[]'::jsonb,
          workflow JSONB DEFAULT '{}'::jsonb,
          binding_rules JSONB DEFAULT '{}'::jsonb,
          
          -- 元数据
          author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          version TEXT DEFAULT '1.0.0',
          is_public BOOLEAN DEFAULT false,
          
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建 Team Workspaces 表（共享工作区）
      await client.query(`
        CREATE TABLE IF NOT EXISTS team_workspaces (
          id TEXT PRIMARY KEY,
          team_id TEXT NOT NULL REFERENCES ai_teams(id) ON DELETE CASCADE,
          
          -- 工作区内容
          files JSONB DEFAULT '[]'::jsonb,
          shared_data JSONB DEFAULT '{}'::jsonb,
          
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建索引以提高查询性能
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
        CREATE INDEX IF NOT EXISTS idx_ai_teams_project_id ON ai_teams(project_id);
        CREATE INDEX IF NOT EXISTS idx_agent_teams_team_id ON agent_teams(team_id);
        CREATE INDEX IF NOT EXISTS idx_system_logs_admin_id ON system_logs(admin_id);
        CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_agent_metadata_name ON agent_metadata(name);
        CREATE INDEX IF NOT EXISTS idx_agent_metadata_source ON agent_metadata(source);
        CREATE INDEX IF NOT EXISTS idx_agent_metadata_tags ON agent_metadata USING GIN(tags);
        CREATE INDEX IF NOT EXISTS idx_agent_metadata_category ON agent_metadata(category);
        
        -- 新增索引
        CREATE INDEX IF NOT EXISTS idx_team_skills_category ON team_skills(category);
        CREATE INDEX IF NOT EXISTS idx_team_skills_public ON team_skills(is_public);
        CREATE INDEX IF NOT EXISTS idx_team_skills_author ON team_skills(author_id);
        CREATE INDEX IF NOT EXISTS idx_workspaces_team ON team_workspaces(team_id);
        CREATE INDEX IF NOT EXISTS idx_executions_agent_team ON agent_team_executions(agent_team_id);
        CREATE INDEX IF NOT EXISTS idx_executions_status ON agent_team_executions(status);
        CREATE INDEX IF NOT EXISTS idx_executions_created_at ON agent_team_executions(created_at DESC);
      `);

      console.log('✓ Database schema initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection pool closed');
    }
  }
}

export const databaseService = new DatabaseService();
