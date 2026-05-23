-- Create virtual_company_sessions table
BEGIN;

CREATE TABLE IF NOT EXISTS virtual_company_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN (
    'initiated',
    'requirements_gathering',
    'role_selection',
    'agent_searching',
    'skill_matching',
    'confirming',
    'building',
    'completed',
    'failed',
    'cancelled'
  )),
  
  conversation_history JSONB DEFAULT '[]'::jsonb,
  requirements JSONB DEFAULT '{}'::jsonb,
  selected_roles JSONB DEFAULT '[]'::jsonb,
  
  progress JSONB DEFAULT '{
    "currentStep": 0,
    "totalSteps": 7,
    "percentage": 0,
    "steps": []
  }'::jsonb,
  
  final_team_skill_id TEXT REFERENCES team_skills(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_vcs_user_id ON virtual_company_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_vcs_status ON virtual_company_sessions(status);
CREATE INDEX IF NOT EXISTS idx_vcs_created_at ON virtual_company_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vcs_final_team_skill_id ON virtual_company_sessions(final_team_skill_id);

ALTER TABLE team_skills 
ADD COLUMN IF NOT EXISTS creation_session_id TEXT REFERENCES virtual_company_sessions(id),
ADD COLUMN IF NOT EXISTS source_agents JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_skills JSONB DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION update_virtual_company_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vcs_updated_at ON virtual_company_sessions;
CREATE TRIGGER trigger_update_vcs_updated_at
  BEFORE UPDATE ON virtual_company_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_virtual_company_sessions_updated_at();

COMMIT;
