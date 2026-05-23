-- ============================================
-- 修复虚拟公司会话表外键约束 v1.0.1
-- 允许管理员和普通用户都能创建虚拟公司会话
-- ============================================

BEGIN;

-- 1. 删除原有的外键约束
ALTER TABLE virtual_company_sessions 
DROP CONSTRAINT IF EXISTS virtual_company_sessions_user_id_fkey;

-- 2. 添加新的外键约束，同时引用 users 和 admins 表
-- 由于 PostgreSQL 不支持多表外键，我们改为不强制外键约束
-- 而是在应用层验证用户/管理员是否存在
ALTER TABLE virtual_company_sessions 
ALTER COLUMN user_id SET NOT NULL;

-- 3. 添加注释说明
COMMENT ON COLUMN virtual_company_sessions.user_id IS '用户ID或管理员ID（可以是 users 表或 admins 表中的ID）';

-- ============================================
-- 迁移完成
-- ============================================

COMMIT;

COMMENT ON SCHEMA public IS 'NvwaX 虚拟公司会话表外键约束修复 v1.0.1 已完成';
