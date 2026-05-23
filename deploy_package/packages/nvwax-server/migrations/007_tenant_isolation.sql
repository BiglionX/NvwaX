-- Tenant Isolation Migration
-- Adds tenant_id to existing tables for data isolation

-- This migration adds tenant_id column to core tables and updates all queries
-- to filter by tenant_id for data isolation

BEGIN;

-- 1. Add tenant_id to agent_teams table
ALTER TABLE agent_teams 
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;

-- Create index for faster tenant-based queries
CREATE INDEX IF NOT EXISTS idx_agent_teams_tenant_id ON agent_teams(tenant_id);

-- Update existing records to use owner's tenant (for backward compatibility)
UPDATE agent_teams at
SET tenant_id = t.id
FROM ai_teams ait
JOIN projects p ON ait.project_id = p.id
JOIN users u ON p.user_id = u.id
JOIN tenants t ON t.owner_id = u.id
WHERE at.tenant_id IS NULL AND at.team_id = ait.id;

-- Make tenant_id NOT NULL after populating existing data
ALTER TABLE agent_teams ALTER COLUMN tenant_id SET NOT NULL;

COMMENT ON COLUMN agent_teams.tenant_id IS 'Tenant ID for data isolation';


-- 2. Add tenant_id to team_skills table
ALTER TABLE team_skills 
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_team_skills_tenant_id ON team_skills(tenant_id);

-- Update existing records
UPDATE team_skills ts
SET tenant_id = t.id
FROM users u
JOIN tenants t ON t.owner_id = u.id
WHERE ts.tenant_id IS NULL AND ts.author_id = u.id;

ALTER TABLE team_skills ALTER COLUMN tenant_id SET NOT NULL;

COMMENT ON COLUMN team_skills.tenant_id IS 'Tenant ID for data isolation';


-- 3. Add tenant_id to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);

-- Update existing records
UPDATE projects p
SET tenant_id = t.id
FROM users u
JOIN tenants t ON t.owner_id = u.id
WHERE p.tenant_id IS NULL AND p.user_id = u.id;

ALTER TABLE projects ALTER COLUMN tenant_id SET NOT NULL;

COMMENT ON COLUMN projects.tenant_id IS 'Tenant ID for data isolation';


-- 4. Add tenant_id to bounties table
ALTER TABLE bounties 
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bounties_tenant_id ON bounties(tenant_id);

-- Update existing records
UPDATE bounties b
SET tenant_id = t.id
FROM users u
JOIN tenants t ON t.owner_id = u.id
WHERE b.tenant_id IS NULL AND b.created_by = u.id;

ALTER TABLE bounties ALTER COLUMN tenant_id SET NOT NULL;

COMMENT ON COLUMN bounties.tenant_id IS 'Tenant ID for data isolation';


-- 5. Add tenant_id to agent_metadata table
ALTER TABLE agent_metadata 
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_agent_metadata_tenant_id ON agent_metadata(tenant_id);

-- For agent_metadata, we need to link through agent_teams
UPDATE agent_metadata am
SET tenant_id = at.tenant_id
FROM agent_teams at
WHERE am.tenant_id IS NULL AND am.agent_team_id = at.id;

-- For agents not linked to teams, use a default approach
-- These should be reviewed manually
UPDATE agent_metadata am
SET tenant_id = (
  SELECT t.id 
  FROM users u 
  JOIN tenants t ON t.owner_id = u.id 
  LIMIT 1
)
WHERE am.tenant_id IS NULL;

ALTER TABLE agent_metadata ALTER COLUMN tenant_id SET NOT NULL;

COMMENT ON COLUMN agent_metadata.tenant_id IS 'Tenant ID for data isolation';


-- 6. Add tenant_id to ai_teams table
ALTER TABLE ai_teams 
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ai_teams_tenant_id ON ai_teams(tenant_id);

-- Update existing records
UPDATE ai_teams ait
SET tenant_id = t.id
FROM projects p
JOIN users u ON p.user_id = u.id
JOIN tenants t ON t.owner_id = u.id
WHERE ait.tenant_id IS NULL AND ait.project_id = p.id;

ALTER TABLE ai_teams ALTER COLUMN tenant_id SET NOT NULL;

COMMENT ON COLUMN ai_teams.tenant_id IS 'Tenant ID for data isolation';


-- 7. Add tenant_id to workflows table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workflows') THEN
    ALTER TABLE workflows 
    ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_workflows_tenant_id ON workflows(tenant_id);
    
    UPDATE workflows w
    SET tenant_id = t.id
    FROM users u
    JOIN tenants t ON t.owner_id = u.id
    WHERE w.tenant_id IS NULL AND w.user_id = u.id;
    
    ALTER TABLE workflows ALTER COLUMN tenant_id SET NOT NULL;
    
    COMMENT ON COLUMN workflows.tenant_id IS 'Tenant ID for data isolation';
  END IF;
END $$;


-- 8. Add tenant_id to skills table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'skills') THEN
    ALTER TABLE skills 
    ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_skills_tenant_id ON skills(tenant_id);
    
    COMMENT ON COLUMN skills.tenant_id IS 'Tenant ID for data isolation';
  END IF;
END $$;


-- 9. Update existing indexes to include tenant_id for better query performance
-- This helps with composite queries like "get all X for tenant Y"

-- Drop old indexes and create new composite indexes where beneficial
DROP INDEX IF EXISTS idx_agent_teams_team_id;
CREATE INDEX idx_agent_teams_team_tenant ON agent_teams(team_id, tenant_id);

DROP INDEX IF EXISTS idx_team_skills_category;
CREATE INDEX idx_team_skills_category_tenant ON team_skills(category, tenant_id) WHERE is_public = true;

DROP INDEX IF EXISTS idx_projects_user_id;
CREATE INDEX idx_projects_user_tenant ON projects(user_id, tenant_id);


-- 10. Create helper functions for tenant-scoped queries

-- Function to get current user's tenant ID
CREATE OR REPLACE FUNCTION get_user_tenant_id(p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_tenant_id TEXT;
BEGIN
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE owner_id = p_user_id
  LIMIT 1;
  
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to check if user has access to a tenant
CREATE OR REPLACE FUNCTION check_tenant_access(p_user_id TEXT, p_tenant_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM tenants
    WHERE id = p_tenant_id AND (
      owner_id = p_user_id OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND r.tenant_id = p_tenant_id
      )
    )
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 11. Create views for common tenant-scoped queries

-- View: User's agent teams
CREATE OR REPLACE VIEW user_agent_teams AS
SELECT at.*, t.name as tenant_name
FROM agent_teams at
JOIN tenants t ON at.tenant_id = t.id;

-- View: Public team skills across all tenants (for marketplace)
CREATE OR REPLACE VIEW public_marketplace_skills AS
SELECT ts.*, t.name as tenant_name, t.plan as tenant_plan
FROM team_skills ts
JOIN tenants t ON ts.tenant_id = t.id
WHERE ts.is_public = true;

-- View: User's projects with tenant info
CREATE OR REPLACE VIEW user_projects_with_tenant AS
SELECT p.*, t.name as tenant_name, t.plan as tenant_plan
FROM projects p
JOIN tenants t ON p.tenant_id = t.id;


-- 12. Add constraints to prevent cross-tenant data leakage

-- Ensure agent_teams belong to the same tenant as their parent ai_team
ALTER TABLE agent_teams
ADD CONSTRAINT chk_agent_team_tenant_match
CHECK (
  tenant_id = (
    SELECT ait.tenant_id 
    FROM ai_teams ait 
    WHERE ait.id = agent_teams.team_id
  )
);

-- Ensure projects belong to the same tenant as their owner
ALTER TABLE projects
ADD CONSTRAINT chk_project_tenant_match
CHECK (
  tenant_id = (
    SELECT t.id 
    FROM users u 
    JOIN tenants t ON t.owner_id = u.id 
    WHERE u.id = projects.user_id
    LIMIT 1
  )
);


-- 13. Update triggers to automatically set tenant_id on insert

-- Trigger for agent_teams
CREATE OR REPLACE FUNCTION set_agent_team_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    -- Get tenant from parent ai_team
    SELECT ait.tenant_id INTO NEW.tenant_id
    FROM ai_teams ait
    WHERE ait.id = NEW.team_id;
    
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Parent ai_team does not have a tenant_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_agent_team_tenant ON agent_teams;
CREATE TRIGGER trg_set_agent_team_tenant
BEFORE INSERT ON agent_teams
FOR EACH ROW
EXECUTE FUNCTION set_agent_team_tenant_id();


-- Trigger for projects
CREATE OR REPLACE FUNCTION set_project_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    -- Get tenant from user
    SELECT t.id INTO NEW.tenant_id
    FROM tenants t
    WHERE t.owner_id = NEW.user_id
    LIMIT 1;
    
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'User does not have a tenant. Please create a tenant first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_project_tenant ON projects;
CREATE TRIGGER trg_set_project_tenant
BEFORE INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION set_project_tenant_id();


-- 14. Add comments for documentation
COMMENT ON TABLE agent_teams IS 'Agent teams with tenant isolation - all queries must filter by tenant_id';
COMMENT ON TABLE team_skills IS 'Team skills templates with tenant isolation';
COMMENT ON TABLE projects IS 'User projects with tenant isolation';
COMMENT ON TABLE bounties IS 'Bounty tasks with tenant isolation';
COMMENT ON TABLE agent_metadata IS 'Agent metadata with tenant isolation';
COMMENT ON TABLE ai_teams IS 'AI teams with tenant isolation';


COMMIT;

-- Verification queries (run these after migration to verify)
-- SELECT COUNT(*) FROM agent_teams WHERE tenant_id IS NULL; -- Should be 0
-- SELECT COUNT(*) FROM team_skills WHERE tenant_id IS NULL; -- Should be 0
-- SELECT COUNT(*) FROM projects WHERE tenant_id IS NULL; -- Should be 0
-- SELECT COUNT(*) FROM bounties WHERE tenant_id IS NULL; -- Should be 0
-- SELECT COUNT(*) FROM agent_metadata WHERE tenant_id IS NULL; -- Should be 0
