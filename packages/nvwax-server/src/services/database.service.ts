import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

class DatabaseService {
  private pool: Pool | null = null;

  constructor() {
    // 立即初始化数据库连接池
    // 在 Railway 等环境中，环境变量在进程启动时已经注入
    this.initializePool();
  }

  private initializePool() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL is not set in environment variables');
      console.error('💡 Available environment variables:', Object.keys(process.env).sort().join(', '));
      throw new Error('DATABASE_URL is required. Please set it in Railway Variables.');
    }

    console.log('✅ DATABASE_URL found:', databaseUrl.substring(0, 30) + '...');
    console.log('Initializing PostgreSQL connection pool...');

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false // Neon requires SSL
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    console.log('✓ PostgreSQL connection pool initialized successfully');
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool;
  }

  async initializeDatabase() {
    const client = await this.getPool().connect();
    
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

      // 创建通知表
      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          data JSONB DEFAULT '{}'::jsonb,
          is_read BOOLEAN DEFAULT false,
          priority VARCHAR(20) DEFAULT 'normal',
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建虚拟公司会话表
      await client.query(`
        CREATE TABLE IF NOT EXISTS virtual_company_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'initiated',
          conversation_history JSONB DEFAULT '[]'::jsonb,
          requirements JSONB DEFAULT '{}'::jsonb,
          selected_roles JSONB DEFAULT '[]'::jsonb,
          team_design JSONB DEFAULT '{}'::jsonb,
          ceo_config JSONB DEFAULT '{}'::jsonb,
          agent_matches JSONB DEFAULT '{}'::jsonb,
          skill_matches JSONB DEFAULT '{}'::jsonb,
          progress JSONB DEFAULT '{"currentStep":0,"totalSteps":7,"percentage":0,"steps":[]}'::jsonb,
          final_team_skill_id TEXT,
          document_package_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP WITH TIME ZONE
        )
      `);

      // 确保虚拟公司会话表的额外列存在（兼容旧表）
      try {
        await client.query(`ALTER TABLE virtual_company_sessions ADD COLUMN IF NOT EXISTS team_design JSONB DEFAULT '{}'::jsonb`);
        await client.query(`ALTER TABLE virtual_company_sessions ADD COLUMN IF NOT EXISTS ceo_config JSONB DEFAULT '{}'::jsonb`);
        await client.query(`ALTER TABLE virtual_company_sessions ADD COLUMN IF NOT EXISTS agent_matches JSONB DEFAULT '{}'::jsonb`);
        await client.query(`ALTER TABLE virtual_company_sessions ADD COLUMN IF NOT EXISTS skill_matches JSONB DEFAULT '{}'::jsonb`);
        await client.query(`ALTER TABLE virtual_company_sessions ADD COLUMN IF NOT EXISTS document_package_url TEXT`);
      } catch (error) {
        console.log('Virtual company sessions extra columns already exist or not needed');
      }

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
        
        -- 通知表索引
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
        
        -- 虚拟公司会话表索引
        CREATE INDEX IF NOT EXISTS idx_vcs_user_id ON virtual_company_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_vcs_status ON virtual_company_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_vcs_created_at ON virtual_company_sessions(created_at DESC);
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
