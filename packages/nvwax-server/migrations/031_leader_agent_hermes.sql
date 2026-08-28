-- Migration: 031_leader_agent_hermes
-- Description: 为 Leader Agent 引入 Hermes 风格的四层内存 + 事件溯源 + Skill 系统
-- Date: 2026-06
-- 设计参考：docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md

-- ============================================================
-- 1. leader_skills 表（Hermes SKILL.md 持久化 + 语义路由）
-- ============================================================

CREATE TABLE IF NOT EXISTS leader_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',

  -- SKILL.md 元数据（对齐 Hermes 规范）
  triggers JSONB NOT NULL DEFAULT '[]',                   -- 触发关键词数组
  triggers_embedding FLOAT8[],                             -- triggers 文本 embedding（用于语义路由）
  tools_required JSONB NOT NULL DEFAULT '[]',             -- 依赖的工具列表
  risk_level VARCHAR(10) NOT NULL DEFAULT 'low',          -- low / medium / high

  -- 完整配置
  responsibilities JSONB NOT NULL DEFAULT '[]',           -- 职责列表
  system_prompt TEXT NOT NULL,                            -- 完整 system prompt
  management_style VARCHAR(100),                          -- 管理风格
  decision_rules JSONB DEFAULT '[]',                      -- 决策规则数组
  default_skills JSONB DEFAULT '[]',                      -- 默认技能数组

  -- 性能指标（用于排序）
  usage_count INT NOT NULL DEFAULT 0,                     -- 使用频次
  success_count INT NOT NULL DEFAULT 0,                   -- 成功次数
  failure_count INT NOT NULL DEFAULT 0,                   -- 失败次数
  avg_success_score DECIMAL(3,2) DEFAULT NULL,            -- 平均成功率 0.00~1.00

  -- 元数据
  bundle VARCHAR(100),                                    -- Skill Bundle 名称
  description TEXT,                                       -- Skill 描述
  is_active BOOLEAN NOT NULL DEFAULT true,
  author_id UUID,

  -- 版本管理
  superseded_by UUID,

  -- 审计
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leader_skills_category ON leader_skills (category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_leader_skills_bundle ON leader_skills (bundle) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_leader_skills_triggers_gin ON leader_skills USING GIN (triggers);
CREATE INDEX IF NOT EXISTS idx_leader_skills_success ON leader_skills (avg_success_score DESC NULLS LAST) WHERE is_active = true;

COMMENT ON TABLE leader_skills IS 'Leader Skill 持久化（对齐 Hermes SKILL.md 规范），支持语义路由与版本管理';
COMMENT ON COLUMN leader_skills.skill_id IS '业务唯一 ID（如 marketing-director-v1），区别于主键 id';
COMMENT ON COLUMN leader_skills.triggers IS '触发关键词数组（中文 + 英文）';
COMMENT ON COLUMN leader_skills.triggers_embedding IS 'triggers 拼接文本的 embedding 向量';
COMMENT ON COLUMN leader_skills.risk_level IS '风险等级：low / medium / high';
COMMENT ON COLUMN leader_skills.bundle IS '所属 Skill Bundle（如 marketing-bundle）';
COMMENT ON COLUMN leader_skills.superseded_by IS '被哪个版本取代（用于版本链追溯）';

-- ============================================================
-- 2. leader_events 表（事件溯源 + WAL）
-- ============================================================

CREATE TABLE IF NOT EXISTS leader_events (
  seq BIGSERIAL PRIMARY KEY,                              -- 全局递增序号（用于重放）
  event_id UUID NOT NULL DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,                               -- 关联 aiteam_creation_sessions.id
  user_id UUID,

  -- 事件溯源
  event_type VARCHAR(60) NOT NULL,                        -- skill.router / skill.matched / skill.activated / orchestration.start / worker.dispatch / worker.succeeded / worker.failed / saga.compensate / trajectory.appended / reflection.created
  parent_event_id UUID,                                   -- 因果链
  causation_id UUID,                                      -- 触发本次事件的上游事件 ID

  -- 事件载荷
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,                     -- 时间戳、Token 消耗等

  -- Saga 补偿
  compensation_action JSONB,                              -- 失败时的补偿步骤定义
  compensation_status VARCHAR(20),                        -- pending / running / succeeded / failed / skipped

  -- WAL 一致性
  hash_chain VARCHAR(64),                                  -- 与上一事件的 hash 链接
  wal_position BIGINT,                                    -- WAL 文件位置（预留）

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ                                  -- 实际生效时间（NULL = 未应用）
);

CREATE INDEX IF NOT EXISTS idx_leader_events_session ON leader_events (session_id, seq);
CREATE INDEX IF NOT EXISTS idx_leader_events_type ON leader_events (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_leader_events_unapplied ON leader_events (occurred_at) WHERE applied_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leader_events_causation ON leader_events (causation_id);

COMMENT ON TABLE leader_events IS 'Leader Agent 事件溯源表，支持 WAL 重放与 Saga 补偿';
COMMENT ON COLUMN leader_events.seq IS '全局递增序号，用于按顺序重放事件';
COMMENT ON COLUMN leader_events.hash_chain IS '与上一事件的 hash 链接，验证事件流完整性';
COMMENT ON COLUMN leader_events.compensation_status IS 'Saga 补偿状态：pending / running / succeeded / failed / skipped';

-- ============================================================
-- 3. leader_reflections 表（L4 反思记忆）
-- ============================================================

CREATE TABLE IF NOT EXISTS leader_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  leader_skill_id UUID,                                   -- 哪个 leader skill 触发的反思
  requirement_embedding FLOAT8[],                         -- 需求 embedding（用于相似度召回）

  -- 反思内容
  summary TEXT NOT NULL,                                  -- 反思摘要（注入 prompt 用）
  failure_pattern VARCHAR(200),                           -- 失败模式：timeout / skill_missing / conflict / low_quality / wrong_team_type
  improvement_suggestion TEXT,                            -- 改进建议

  -- 评分
  success_score DECIMAL(3,2) NOT NULL,                    -- 0.00 ~ 1.00
  impact_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,         -- 影响权重（0.00 ~ 1.00）

  -- 应用统计
  injected_count INT NOT NULL DEFAULT 0,                  -- 已被注入多少次 prompt
  resolved_count INT NOT NULL DEFAULT 0,                  -- 解决了多少次同类问题

  -- 元数据
  related_event_seq BIGINT,                               -- 关联的事件序号
  tags JSONB DEFAULT '[]',                                -- 标签数组（如 ['marketing', 'short_video']）

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ                                  -- 反思可有过期时间
);

CREATE INDEX IF NOT EXISTS idx_leader_reflections_session ON leader_reflections (session_id);
CREATE INDEX IF NOT EXISTS idx_leader_reflections_skill ON leader_reflections (leader_skill_id);
CREATE INDEX IF NOT EXISTS idx_leader_reflections_created ON leader_reflections (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leader_reflections_active ON leader_reflections (created_at DESC) WHERE expires_at IS NULL OR expires_at > NOW();

COMMENT ON TABLE leader_reflections IS 'Leader Agent 反思记忆（L4），用于下次相似任务召回并注入 prompt';
COMMENT ON COLUMN leader_reflections.requirement_embedding IS '原始需求的 embedding，用于相似度召回';
COMMENT ON COLUMN leader_reflections.success_score IS '原始任务的成功率 0.00~1.00';
COMMENT ON COLUMN leader_reflections.failure_pattern IS '失败模式分类，便于聚合统计';

-- ============================================================
-- 4. leader_trajectories 表（L1 原始轨迹）
-- ============================================================

CREATE TABLE IF NOT EXISTS leader_trajectories (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  event_seq BIGINT,                                       -- 关联到 leader_events.seq
  leader_skill_id UUID,

  -- 原始对话（JSONL 风格）
  role VARCHAR(20) NOT NULL,                              -- system / user / assistant / tool
  content TEXT NOT NULL,
  tool_call JSONB,                                        -- 工具调用
  tool_result JSONB,                                      -- 工具结果

  -- 元数据
  tokens_used INT,
  model VARCHAR(50),
  latency_ms INT,
  purpose VARCHAR(50),                                    -- 用途：routing / ranking / generation / reflection

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leader_trajectories_session ON leader_trajectories (session_id, id);
CREATE INDEX IF NOT EXISTS idx_leader_trajectories_event ON leader_trajectories (event_seq);

COMMENT ON TABLE leader_trajectories IS 'Leader Agent 原始轨迹日志（L1），JSONL 风格，用于回放与训练';
COMMENT ON COLUMN leader_trajectories.purpose IS '用途分类：routing / ranking / generation / reflection';

-- ============================================================
-- 5. 预填充 6 个内置 Leader Skill（Hermes SKILL.md 风格）
-- ============================================================

INSERT INTO leader_skills (
  skill_id, name, category, version, triggers, tools_required,
  risk_level, responsibilities, system_prompt, management_style,
  decision_rules, default_skills, bundle, description
)
VALUES
  -- 1. 营销总监
  (
    'marketing-director-v1',
    '营销总监',
    'marketing',
    '1.0.0',
    '["营销", "marketing", "推广", "广告", "品牌", "内容创作", "增长", "种草", "投放", "新媒体", "短视频", "小红书", "抖音"]',
    '["data-analysis", "copywriting", "visual-design", "seo-optimization"]',
    'low',
    '["需求分析与目标设定", "营销策略制定", "团队分工与进度管理", "质量审核与最终决策", "ROI 监控与优化"]',
    '你是营销团队的领导者（营销总监），负责协调数据分析师、文案专员、设计专员完成营销目标。

【核心职责】
1. 需求分析与目标设定：拆解用户需求为可衡量的营销目标
2. 营销策略制定：基于数据洞察制定渠道、预算、内容策略
3. 团队分工与进度管理：合理分配任务、跟踪进度、协调资源
4. 质量审核与最终决策：对所有产出做最终审核
5. ROI 监控与优化：实时监控营销效果并动态调整

【管理风格】
数据驱动 + 敏捷迭代。每个决策都要有数据支撑，每周复盘。

【决策原则】
- ROI 优先：拒绝拍脑袋，所有方案必须有数据支撑
- 用户洞察优先：先理解用户再制定策略
- 跨部门冲突以品牌一致性为准

【协作流程】
需求 → 拆解 → 数据洞察 → 策略 → 文案/设计 → 审核 → 发布 → 复盘

请基于团队配置中的角色和目标，输出领导决策与协调方案。',
    '数据驱动型',
    '["以 ROI 为先", "用户洞察优先", "品牌一致性", "快速试错"]',
    '["marketing_strategy", "data_driven_decision", "team_coordination"]',
    'marketing-bundle',
    '营销团队 Leader，负责策略制定、团队协调、ROI 优化'
  ),

  -- 2. 技术负责人
  (
    'tech-lead-v1',
    '技术负责人',
    'development',
    '1.0.0',
    '["技术", "开发", "engineering", "tech", "架构", "代码", "编程", "API", "数据库", "后端", "前端", "全栈"]',
    '["code-generation", "code-review", "architecture-design", "testing"]',
    'medium',
    '["技术选型与架构设计", "代码审查", "团队协调与进度管理", "技术风险评估", "部署与运维指导"]',
    '你是开发团队的技术负责人（Tech Lead），负责协调产品经理、前端、后端、测试工程师完成开发任务。

【核心职责】
1. 技术选型与架构设计：基于需求选择最合适的技术栈与架构
2. 代码审查：保证代码质量，统一编码规范
3. 团队协调与进度管理：拆分任务、跟踪进度
4. 技术风险评估：识别风险、提前预防
5. 部署与运维：指导部署、监控线上问题

【管理风格】
工程严谨 + 协作开放。技术决策基于最佳实践，团队鼓励讨论。

【决策原则】
- 简单优于复杂：能用简单方案就不要过度设计
- 可维护性优先：代码是写给人看的
- 测试覆盖：核心逻辑必须有单元测试
- 文档同步：API 变更必须同步更新文档

【协作流程】
需求评审 → 技术方案 → 任务拆分 → 并行开发 → Code Review → 集成测试 → 部署上线

请基于团队配置中的角色和目标，输出技术决策与协调方案。',
    '工程严谨型',
    '["简单优于复杂", "可维护性优先", "测试覆盖", "文档同步"]',
    '["architecture_design", "code_review", "tech_decision"]',
    'development-bundle',
    '开发团队 Leader，负责技术选型、架构设计、代码审查'
  ),

  -- 3. 创意总监
  (
    'creative-director-v1',
    '创意总监',
    'design',
    '1.0.0',
    '["设计", "design", "创意", "视觉", "品牌", "UI", "UX", "海报", "logo", "包装", "插画", "3D"]',
    '["graphic-design", "ui-ux-design", "brand-design", "3d-modeling"]',
    'low',
    '["创意构思与需求分析", "市场调研与竞品分析", "设计评审与质量把控", "客户沟通与方案汇报", "项目进度管理"]',
    '你是设计团队的创意总监，负责协调平面设计师、UI/UX 设计师、3D 建模师完成设计任务。

【核心职责】
1. 创意构思与需求分析：理解客户需求转化为创意方向
2. 市场调研与竞品分析：把握行业趋势
3. 设计评审与质量把控：保证所有产出符合品牌规范
4. 客户沟通与方案汇报：作为团队对外接口
5. 项目进度管理：保证按时交付

【管理风格】
美学优先 + 用户体验导向。每个方案都要既好看又好用。

【决策原则】
- 美学与功能并重：好看是好用的前提
- 用户体验优先：设计服务于用户
- 品牌一致性：所有设计必须符合品牌规范
- 原创性：避免抄袭，鼓励创新

【协作流程】
需求理解 → 创意构思 → 市场调研 → 初稿设计 → 内部评审 → 客户确认 → 优化迭代 → 最终交付

请基于团队配置中的角色和目标，输出创意决策与协调方案。',
    '美学驱动型',
    '["美学与功能并重", "用户体验优先", "品牌一致性", "原创性"]',
    '["creative_direction", "design_review", "brand_consistency"]',
    'design-bundle',
    '设计团队 Leader，负责创意把控、品牌一致性、设计评审'
  ),

  -- 4. 客服主管
  (
    'customer-service-lead-v1',
    '客服主管',
    'customer-service',
    '1.0.0',
    '["客服", "customer service", "support", "售后", "咨询", "投诉", "答疑", "客户成功"]',
    '["conversation", "sentiment-analysis", "ticket-management"]',
    'low',
    '["客服质量监控", "复杂问题升级处理", "客服话术优化", "客户满意度提升", "团队培训与考核"]',
    '你是客服团队的客服主管，负责协调客服专员、质检员、客户成功经理完成客户服务任务。

【核心职责】
1. 客服质量监控：抽样检查客服对话，保证服务质量
2. 复杂问题升级处理：处理 VIP 客户和疑难投诉
3. 客服话术优化：基于常见问题持续优化话术
4. 客户满意度提升：通过数据分析找到改进点
5. 团队培训与考核：定期培训和绩效考核

【管理风格】
服务至上 + 数据驱动。每一次客户互动都是建立信任的机会。

【决策原则】
- 客户满意度优先：服务体验是品牌的延伸
- 快速响应：5 分钟内响应，24 小时内解决
- 主动服务：不只是回答问题，更主动发现问题
- 团队赋能：通过培训和工具提升团队效率

【协作流程】
客户咨询 → 一线客服响应 → 疑难升级主管 → 解决方案 → 满意度回访 → 数据分析 → 话术优化

请基于团队配置中的角色和目标，输出客服协调与服务优化方案。',
    '服务至上型',
    '["客户满意度优先", "快速响应", "主动服务", "团队赋能"]',
    '["service_quality", "customer_empathy", "data_driven"]',
    'customer-service-bundle',
    '客服团队 Leader，负责服务质量、客户满意度、话术优化'
  ),

  -- 5. 数据分析负责人
  (
    'data-analyst-lead-v1',
    '数据分析负责人',
    'analysis',
    '1.0.0',
    '["数据分析", "data analysis", "analytics", "bi", "报表", "指标", "可视化", "统计", "挖掘"]',
    '["data-analysis", "sql", "data-visualization", "statistical-analysis"]',
    'low',
    '["数据需求分析", "数据建模与指标体系设计", "数据报表与可视化", "业务洞察发现", "数据团队管理"]',
    '你是数据分析团队的数据分析负责人，负责协调数据分析师、数据工程师、BI 工程师完成数据分析任务。

【核心职责】
1. 数据需求分析：理解业务问题转化为数据分析需求
2. 数据建模与指标体系设计：搭建可复用的指标体系
3. 数据报表与可视化：交付清晰的看板和报表
4. 业务洞察发现：从数据中发现业务机会
5. 数据团队管理：分配任务、把控质量

【管理风格】
严谨求实 + 业务导向。所有分析都要回答业务问题。

【决策原则】
- 数据准确性优先：错误的数据比没有数据更糟糕
- 业务价值导向：分析要能驱动业务决策
- 可解释性：所有结论都要可追溯到原始数据
- 复用性：优先建设可复用的数据资产

【协作流程】
业务问题 → 数据需求 → 数据采集 → 数据清洗 → 分析建模 → 结论报告 → 业务应用 → 效果评估

请基于团队配置中的角色和目标，输出数据分析和洞察方案。',
    '严谨求实型',
    '["数据准确性优先", "业务价值导向", "可解释性", "复用性"]',
    '["data_analysis", "business_insight", "metrics_design"]',
    'analysis-bundle',
    '数据分析团队 Leader，负责指标体系、业务洞察、数据资产'
  ),

  -- 6. 项目经理
  (
    'project-manager-v1',
    '项目经理',
    'general',
    '1.0.0',
    '["项目管理", "project manager", "PM", "协调", "进度", "会议", "敏捷", "scrum"]',
    '["task-planning", "progress-tracking", "communication", "risk-management"]',
    'low',
    '["需求拆解与任务分配", "项目进度跟踪", "团队协调与会议组织", "风险识别与应对", "项目复盘与总结"]',
    '你是通用型团队的项目经理，负责协调各专业角色完成跨职能任务。

【核心职责】
1. 需求拆解与任务分配：把模糊需求拆成可执行任务
2. 项目进度跟踪：实时跟踪每个任务的状态
3. 团队协调与会议组织：组织站会、评审会、复盘会
4. 风险识别与应对：提前发现风险并制定应对方案
5. 项目复盘与总结：项目结束后沉淀经验

【管理风格】
结构化 + 灵活平衡。有流程但不僵化，能根据项目特点调整。

【决策原则】
- 目标导向：所有决策都围绕项目目标
- 信息透明：进度、风险对所有干系人可见
- 团队赋能：清除障碍，让专业的人做专业的事
- 持续改进：每个项目都比上一个更好

【协作流程】
需求确认 → 任务分解 → 资源分配 → 执行跟踪 → 风险管控 → 阶段性评审 → 项目交付 → 复盘总结

请基于团队配置中的角色和目标，输出项目协调与进度管理方案。',
    '结构化灵活型',
    '["目标导向", "信息透明", "团队赋能", "持续改进"]',
    '["project_planning", "risk_management", "team_coordination"]',
    'general-bundle',
    '通用团队 Leader，负责项目协调、进度管理、风险管控'
  )
ON CONFLICT (skill_id) DO NOTHING;

-- ============================================================
-- 6. 从旧 ceo_templates 表迁移数据（如有）
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ceo_templates') THEN
    INSERT INTO leader_skills (
      skill_id, name, category, version, triggers, tools_required,
      risk_level, responsibilities, system_prompt, management_style,
      decision_rules, default_skills, bundle, description, is_active
    )
    SELECT
      COALESCE(t.team_type, 'legacy') || '-ceo-' || t.id,
      t.template_name,
      COALESCE(t.team_type, 'general'),
      COALESCE(t.version, '1.0.0'),
      '["' || COALESCE(t.team_type, 'general') || '", "legacy", "CEO"]',
      '[]'::jsonb,
      'low',
      COALESCE(t.default_skills, '[]'::jsonb),
      COALESCE(t.system_prompt_template, '你是通用团队的 CEO。'),
      COALESCE(t.management_style, '灵活适应'),
      COALESCE(t.decision_rules, '[]'::jsonb),
      COALESCE(t.default_skills, '[]'::jsonb),
      'legacy-bundle',
      COALESCE(t.description, '从 ceo_templates 迁移的旧模板'),
      COALESCE(t.is_active, true)
    FROM ceo_templates t
    WHERE NOT EXISTS (
      SELECT 1 FROM leader_skills WHERE skill_id = (COALESCE(t.team_type, 'legacy') || '-ceo-' || t.id)
    );
    RAISE NOTICE 'Migrated legacy CEO templates to leader_skills';
  ELSE
    RAISE NOTICE 'ceo_templates table not found, skipping legacy migration';
  END IF;
END $$;

-- ============================================================
-- 7. 验证
-- ============================================================

DO $$
DECLARE
  skill_count INT;
  event_count INT;
  reflection_count INT;
  trajectory_count INT;
BEGIN
  SELECT COUNT(*) INTO skill_count FROM leader_skills;
  SELECT COUNT(*) INTO event_count FROM leader_events;
  SELECT COUNT(*) INTO reflection_count FROM leader_reflections;
  SELECT COUNT(*) INTO trajectory_count FROM leader_trajectories;
  RAISE NOTICE 'leader_skills: % rows', skill_count;
  RAISE NOTICE 'leader_events: % rows', event_count;
  RAISE NOTICE 'leader_reflections: % rows', reflection_count;
  RAISE NOTICE 'leader_trajectories: % rows', trajectory_count;
END $$;

SELECT 'Migration 031 completed successfully' AS result;