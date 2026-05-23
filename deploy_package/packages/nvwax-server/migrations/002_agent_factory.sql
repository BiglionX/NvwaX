-- ============================================
-- NvwaX 智能体工厂数据库迁移脚本
-- 版本: 1.0.0
-- 日期: 2026-04-25
-- 描述: 扩展数据库以支持模板、技能和悬赏系统
-- ============================================

-- 启用 pg_trgm 扩展（用于全文搜索）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 1. 扩展现有 agent_metadata 表
-- ============================================

ALTER TABLE agent_metadata 
ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS use_cases TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS data_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS output_types TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_version VARCHAR(20),
ADD COLUMN IF NOT EXISTS compatibility JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS installation_guide TEXT;

-- 为新增字段创建索引
CREATE INDEX IF NOT EXISTS idx_agent_metadata_is_template ON agent_metadata(is_template);
CREATE INDEX IF NOT EXISTS idx_agent_metadata_skills ON agent_metadata USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_agent_metadata_use_cases ON agent_metadata USING GIN(use_cases);

-- ============================================
-- 2. 创建 skills 表（技能本体库）
-- ============================================

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  version VARCHAR(20) DEFAULT '1.0.0',
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  repository_url TEXT,
  documentation_url TEXT,
  dependencies JSONB DEFAULT '[]'::jsonb,
  config_schema JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  download_count INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT skills_name_unique UNIQUE (name),
  CONSTRAINT skills_slug_unique UNIQUE (slug),
  CONSTRAINT valid_status CHECK (status IN ('active', 'deprecated', 'pending_review'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_author ON skills(author_id);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
CREATE INDEX IF NOT EXISTS idx_skills_name_trgm ON skills USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_skills_slug_trgm ON skills USING gin(slug gin_trgm_ops);

-- ============================================
-- 3. 创建 bounties 表（悬赏系统）
-- ============================================

CREATE TABLE IF NOT EXISTS bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  required_skills JSONB NOT NULL,
  reward_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(20) DEFAULT 'points',
  status VARCHAR(50) DEFAULT 'open',
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claimer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  submission_url TEXT,
  verification_notes TEXT,
  deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed_at TIMESTAMP,
  submitted_at TIMESTAMP,
  verified_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  CONSTRAINT valid_bounty_status CHECK (status IN ('open', 'claimed', 'submitted', 'verified', 'completed', 'cancelled'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_bounties_creator ON bounties(creator_id);
CREATE INDEX IF NOT EXISTS idx_bounties_claimer ON bounties(claimer_id);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_created_at ON bounties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bounties_required_skills ON bounties USING gin(required_skills);
CREATE INDEX IF NOT EXISTS idx_bounties_deadline ON bounties(deadline);

-- ============================================
-- 4. 创建用户积分系统
-- ============================================

CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  total_earned DECIMAL(10, 2) DEFAULT 0.00,
  total_spent DECIMAL(10, 2) DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_transaction_type CHECK (type IN (
    'register_bonus',
    'daily_checkin',
    'bounty_reward',
    'bounty_payment',
    'system_adjustment',
    'skill_upload_bonus'
  ))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(type);

-- ============================================
-- 5. 创建模板集合表
-- ============================================

CREATE TABLE IF NOT EXISTS template_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  curator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  templates JSONB NOT NULL,
  is_public BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_template_collections_curator ON template_collections(curator_id);
CREATE INDEX IF NOT EXISTS idx_template_collections_public ON template_collections(is_public);

-- ============================================
-- 6. 创建触发器函数（自动更新 updated_at）
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为相关表添加触发器
DROP TRIGGER IF EXISTS update_skills_updated_at ON skills;
CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bounties_updated_at ON bounties;
CREATE TRIGGER update_bounties_updated_at
  BEFORE UPDATE ON bounties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_points_updated_at ON user_points;
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_template_collections_updated_at ON template_collections;
CREATE TRIGGER update_template_collections_updated_at
  BEFORE UPDATE ON template_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. 创建视图（简化常用查询）
-- ============================================

-- 活跃悬赏视图
CREATE OR REPLACE VIEW active_bounties AS
SELECT 
  b.*,
  u.name as creator_name,
  u.email as creator_email,
  c.name as claimer_name
FROM bounties b
LEFT JOIN users u ON b.creator_id = u.id
LEFT JOIN users c ON b.claimer_id = c.id
WHERE b.status IN ('open', 'claimed');

-- 热门技能视图
CREATE OR REPLACE VIEW popular_skills AS
SELECT 
  s.*,
  u.name as author_name
FROM skills s
LEFT JOIN users u ON s.author_id = u.id
WHERE s.status = 'active'
ORDER BY s.download_count DESC, s.rating DESC;

-- ============================================
-- 8. 插入初始数据
-- ============================================

-- 插入默认技能分类
INSERT INTO skills (name, slug, description, category, status) VALUES
('客户服务', 'customer-service', '处理客户咨询和投诉的技能', 'communication', 'active'),
('订单查询', 'order-query', '从数据库中查询订单信息', 'data_processing', 'active'),
('意图识别', 'intent-recognition', '识别用户意图和需求', 'ai_ml', 'active'),
('知识库检索', 'knowledge-retrieval', '从向量数据库中检索相关知识', 'data_processing', 'active'),
('代码生成', 'code-generation', '根据需求生成代码', 'development', 'active'),
('数据分析', 'data-analysis', '分析数据并生成报告', 'data_processing', 'active'),
('图像识别', 'image-recognition', '识别和分析图像内容', 'ai_ml', 'active'),
('语音处理', 'speech-processing', '处理语音输入和输出', 'ai_ml', 'active'),
('多语言翻译', 'translation', '在多语言之间进行翻译', 'communication', 'active'),
('情感分析', 'sentiment-analysis', '分析文本的情感倾向', 'ai_ml', 'active')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 9. 添加注释
-- ============================================

COMMENT ON TABLE agent_metadata IS 'Agent 元数据表，包含模板相关信息';
COMMENT ON TABLE skills IS '技能本体库，定义可用的技能';
COMMENT ON TABLE bounties IS '悬赏系统，发布和管理技能开发任务';
COMMENT ON TABLE user_points IS '用户积分余额表';
COMMENT ON TABLE point_transactions IS '用户积分流水表';
COMMENT ON TABLE template_collections IS '模板集合， curated 的模板列表';

COMMENT ON COLUMN agent_metadata.skills IS 'Agent 包含的技能列表';
COMMENT ON COLUMN agent_metadata.use_cases IS '适用场景列表';
COMMENT ON COLUMN agent_metadata.data_sources IS '支持的数据源列表';
COMMENT ON COLUMN agent_metadata.output_types IS '输出类型列表';
COMMENT ON COLUMN agent_metadata.is_template IS '是否为可复用模板';

COMMENT ON COLUMN bounties.required_skills IS '完成任务所需的技能列表';
COMMENT ON COLUMN bounties.reward_amount IS '悬赏金额（积分或其他货币）';
COMMENT ON COLUMN bounties.currency IS '货币类型：points, tokens, CNY';
COMMENT ON COLUMN bounties.status IS '悬赏状态：open, claimed, submitted, verified, completed, cancelled';

COMMENT ON COLUMN point_transactions.type IS '交易类型：register_bonus, daily_checkin, bounty_reward, bounty_payment, system_adjustment, skill_upload_bonus';

-- ============================================
-- 迁移完成
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ 数据库迁移成功完成！';
  RAISE NOTICE '新增表: skills, bounties, user_points, point_transactions, template_collections';
  RAISE NOTICE '扩展表: agent_metadata (新增 8 个字段)';
  RAISE NOTICE '初始数据: 已插入 10 个默认技能';
END $$;
