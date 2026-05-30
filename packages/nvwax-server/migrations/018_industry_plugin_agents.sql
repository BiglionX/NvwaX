-- ============================================
-- 行业插件 AI Agent 数据迁移 v1.0.0
-- 注册 4 个独立的行业 AiTeam + 12 个 Agent
-- 关联需求：docs/需求文档：行业插件AI Agent创建（给nvwax）.md
-- ============================================

BEGIN;

-- ============================================
-- 1. 创建行业 Agent 明细表（扩展 team_skills.roles）
--    存储每个 Agent 的完整元数据
-- ============================================
CREATE TABLE IF NOT EXISTS industry_agents (
  id TEXT PRIMARY KEY,
  team_skill_id TEXT NOT NULL REFERENCES team_skills(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  proclaw_agent_id TEXT NOT NULL,  -- 对应 ProClaw 中的 agent ID，如 'proclaw-catering-assistant'
  role TEXT NOT NULL,
  capabilities JSONB DEFAULT '[]'::jsonb,
  permissions JSONB DEFAULT '[]'::jsonb,
  input_schema JSONB DEFAULT '{}'::jsonb,
  output_schema JSONB DEFAULT '{}'::jsonb,
  api_bindings JSONB DEFAULT '[]'::jsonb,
  model_config JSONB DEFAULT '{"model":"deepseek","temperature":0.7}'::jsonb,
  system_prompt TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_industry_agents_team_skill ON industry_agents(team_skill_id);

-- ============================================
-- 2. 注册 4 个行业 AiTeam
-- ============================================

-- 2.1 餐饮行业 AI 团队 (Catering)
INSERT INTO team_skills (
  id, name, description, category,
  leader_config, roles, workflow, binding_rules,
  is_public, version
)
VALUES (
  'team-skill-catering-001',
  '餐饮行业 AI 团队',
  '面向餐饮行业的一站式 AI 助手团队。包含餐饮服务助手（前台点餐推荐/订单查询/桌台管理）、智能菜单顾问（菜品推荐/营养搭配/过敏原提示）、后厨调度助手（KDS订单监控/超时预警/打印联动），全方位提升餐饮门店运营效率。',
  'industry-plugin',
  '{"name": "餐饮运营主管", "responsibilities": ["协调前台服务与后厨调度", "审核菜品推荐策略", "监控门店运营数据"]}',
  '[
    {"role": "餐饮服务助手", "proclaw_agent_id": "proclaw-catering-assistant", "specialty": "前台服务/点餐推荐", "responsibilities": ["POS订单查询", "菜品推荐", "桌台状态查询", "营收统计", "会员查询"]},
    {"role": "智能菜单顾问", "proclaw_agent_id": "proclaw-catering-menu", "specialty": "菜品推荐/营养搭配", "responsibilities": ["口味推荐", "热销榜单", "搭配建议", "特殊饮食需求"]},
    {"role": "后厨调度助手", "proclaw_agent_id": "proclaw-catering-kds", "specialty": "后厨调度/超时预警", "responsibilities": ["KDS订单监控", "超时预警", "备餐预估", "打印联动"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "顾客点餐/咨询", "performed_by": "餐饮服务助手", "output": "订单/推荐结果"},
      {"step": 2, "action": "菜单推荐与搭配", "performed_by": "智能菜单顾问", "output": "菜品建议"},
      {"step": 3, "action": "后厨接单与排程", "performed_by": "后厨调度助手", "output": "出餐计划"},
      {"step": 4, "action": "出餐与上菜跟踪", "performed_by": "后厨调度助手", "output": "出餐状态"},
      {"step": 5, "action": "结账与数据汇总", "performed_by": "餐饮服务助手", "output": "日结报表"}
    ]
  }',
  '{
    "industry_type": "catering",
    "required_modules": ["catering"],
    "communication_protocol": "前台服务与后厨实时联动，超时订单自动预警",
    "conflict_resolution": "顾客满意度优先，特殊情况由主管决策",
    "quality_standards": "点餐响应<10秒，出餐超时预警<5分钟"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 2.2 美业行业 AI 团队 (Beauty)
INSERT INTO team_skills (
  id, name, description, category,
  leader_config, roles, workflow, binding_rules,
  is_public, version
)
VALUES (
  'team-skill-beauty-001',
  '美业行业 AI 团队',
  '面向美业门店的智能 AI 助手团队。包含美业服务顾问（预约管理/服务推荐/客户洞察）、智能排班助手（技师排班优化/高峰预测/提成计算）、营销活动助手（沉睡唤醒/生日礼/充值满赠活动），助力美业门店提升客单价和复购率。',
  'industry-plugin',
  '{"name": "美业运营主管", "responsibilities": ["管理预约与服务流程", "优化技师排班", "制定营销策略"]}',
  '[
    {"role": "美业服务顾问", "proclaw_agent_id": "proclaw-beauty-assistant", "specialty": "预约管理/客户洞察", "responsibilities": ["预约管理", "服务推荐", "技师排班查询", "客户洞察", "沉睡客户唤醒"]},
    {"role": "智能排班助手", "proclaw_agent_id": "proclaw-beauty-scheduler", "specialty": "排班优化/人效管理", "responsibilities": ["排班优化", "高峰预测", "请假管理", "提成计算"]},
    {"role": "营销活动助手", "proclaw_agent_id": "proclaw-beauty-marketing", "specialty": "营销活动/客户运营", "responsibilities": ["活动模板执行", "活动效果分析", "微信消息推送", "优惠券发放"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "客户预约/到店", "performed_by": "美业服务顾问", "output": "预约记录"},
      {"step": 2, "action": "服务项目推荐", "performed_by": "美业服务顾问", "output": "服务建议"},
      {"step": 3, "action": "技师排班与调配", "performed_by": "智能排班助手", "output": "排班表"},
      {"step": 4, "action": "服务完成与结算", "performed_by": "美业服务顾问", "output": "消费记录"},
      {"step": 5, "action": "客户维护与营销", "performed_by": "营销活动助手", "output": "营销计划"}
    ]
  }',
  '{
    "industry_type": "beauty",
    "required_modules": ["beauty"],
    "communication_protocol": "预约-服务-营销全链路闭环",
    "conflict_resolution": "客户体验优先，排班冲突由主管协调",
    "quality_standards": "预约准时率>90%，沉睡客户唤醒率>20%"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 2.3 宠物行业 AI 团队 (Pet)
INSERT INTO team_skills (
  id, name, description, category,
  leader_config, roles, workflow, binding_rules,
  is_public, version
)
VALUES (
  'team-skill-pet-001',
  '宠物行业 AI 团队',
  '面向宠物门店的专业 AI 助手团队。包含宠物养护顾问（养护建议/品种查询/洗护推荐/紧急指南）、寄养管理助手（房间管理/日常记录/费用计算/主人沟通）、健康管理助手（疫苗提醒/体重跟踪/健康日志），打造宠物全生命周期管理服务。',
  'industry-plugin',
  '{"name": "宠物店运营主管", "responsibilities": ["统筹养护服务", "管理寄养运营", "监控宠物健康"]}',
  '[
    {"role": "宠物养护顾问", "proclaw_agent_id": "proclaw-pet-assistant", "specialty": "养护建议/商品推荐", "responsibilities": ["养护建议", "品种查询", "洗护推荐", "商品推荐", "紧急指南"]},
    {"role": "寄养管理助手", "proclaw_agent_id": "proclaw-pet-boarding", "specialty": "寄养管理/客户沟通", "responsibilities": ["房间状态查询", "日常日志记录", "费用计算", "主人沟通", "需求预测"]},
    {"role": "健康管理助手", "proclaw_agent_id": "proclaw-pet-health", "specialty": "健康管理/疫苗提醒", "responsibilities": ["疫苗提醒", "疫苗计划", "体重跟踪", "健康日志", "异常预警"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "宠物到店接待", "performed_by": "宠物养护顾问", "output": "服务方案"},
      {"step": 2, "action": "洗护/寄养服务执行", "performed_by": "寄养管理助手", "output": "服务记录"},
      {"step": 3, "action": "健康检查与记录", "performed_by": "健康管理助手", "output": "健康档案"},
      {"step": 4, "action": "日常养护与沟通", "performed_by": "寄养管理助手", "output": "每日反馈"},
      {"step": 5, "action": "离店结算与回访", "performed_by": "宠物养护顾问", "output": "回访计划"}
    ]
  }',
  '{
    "industry_type": "pet",
    "required_modules": ["pet"],
    "communication_protocol": "宠物健康优先，每日向主人推送状态",
    "conflict_resolution": "宠物安全第一，异常情况立即通知兽医",
    "quality_standards": "健康记录完整率100%，寄养反馈每日更新"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 2.4 Cloud 平台 AI 团队
INSERT INTO team_skills (
  id, name, description, category,
  leader_config, roles, workflow, binding_rules,
  is_public, version
)
VALUES (
  'team-skill-cloud-001',
  'Cloud 平台 AI 团队',
  '面向 ProClaw Cloud 平台的智能运营 AI 团队。包含 Token 计费助手（余额查询/套餐推荐/消耗分析/预算预警）、云平台运营助手（商城监控/商品同步/订单监控/性能报告）、备份恢复助手（备份状态/自动备份/恢复引导/灾难恢复），确保云平台稳定高效运营。',
  'industry-plugin',
  '{"name": "云平台运营主管", "responsibilities": ["监控平台运营健康度", "优化Token计费策略", "确保数据安全可靠"]}',
  '[
    {"role": "Token 计费助手", "proclaw_agent_id": "proclaw-cloud-billing", "specialty": "Token计费/套餐推荐", "responsibilities": ["余额查询", "套餐推荐", "消耗分析", "预算预警", "账单查询"]},
    {"role": "云平台运营助手", "proclaw_agent_id": "proclaw-cloud-ops", "specialty": "平台运营/数据监控", "responsibilities": ["商城分析", "商品同步状态", "订单监控", "性能报告"]},
    {"role": "备份恢复助手", "proclaw_agent_id": "proclaw-cloud-backup", "specialty": "备份管理/灾备恢复", "responsibilities": ["备份状态查询", "自动备份配置", "恢复引导", "完整性检查", "灾难恢复"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "平台健康检查", "performed_by": "云平台运营助手", "output": "健康报告"},
      {"step": 2, "action": "Token消耗分析", "performed_by": "Token计费助手", "output": "消耗报告"},
      {"step": 3, "action": "数据备份执行", "performed_by": "备份恢复助手", "output": "备份状态"},
      {"step": 4, "action": "异常监控与告警", "performed_by": "云平台运营助手", "output": "告警记录"},
      {"step": 5, "action": "运营汇总报告", "performed_by": "云平台运营主管", "output": "日报"}
    ]
  }',
  '{
    "industry_type": "cloud",
    "required_modules": ["cloud"],
    "communication_protocol": "自动监控+定时报告，紧急事件即时通知",
    "conflict_resolution": "数据安全优先，重大变更需审批",
    "quality_standards": "平台可用性>99.9%，备份成功率>99.99%"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. 注册 12 个行业 Agent 明细
-- ============================================

-- 3.1 餐饮行业 Agent
INSERT INTO industry_agents (id, team_skill_id, name, description, proclaw_agent_id, role, capabilities, permissions, input_schema, output_schema, api_bindings, model_config, system_prompt, sort_order) VALUES
(
  'industry-agent-catering-assistant',
  'team-skill-catering-001',
  '餐饮服务助手',
  '面向餐厅前台/服务员，提供点餐推荐、订单查询、桌台管理一站式智能服务。',
  'proclaw-catering-assistant',
  '前台服务',
  '["pos_order_management","menu_recommendation","table_status_query","daily_summary","member_lookup"]'::jsonb,
  '["read_user","read_orders","send_message","show_notification"]'::jsonb,
  '{"required": ["query_type", "content"], "optional": ["table_id", "order_id", "member_id"]}',
  '{"response": "string", "data": "object", "recommendations": "array"}',
  '[{"backend_command": "catering_get_pos_orders"}, {"backend_command": "catering_get_daily_summary"}, {"backend_command": "catering_get_kds_orders"}]'::jsonb,
  '{"model":"deepseek","temperature":0.7}'::jsonb,
  '你是一位经验丰富的餐饮门店服务助手。根据服务员的问题，提供点餐推荐、订单查询、桌台管理、营收统计等智能服务。回复要简洁、专业，使用餐饮行业术语。',
  1
),
(
  'industry-agent-catering-menu',
  'team-skill-catering-001',
  '智能菜单顾问',
  '面向顾客自助点餐场景，提供菜品推荐、营养搭配建议和特殊饮食需求处理。',
  'proclaw-catering-menu',
  '菜单顾问',
  '["dish_recommendation","popular_dishes","dietary_pairing","special_diet"]'::jsonb,
  '["read_user","send_message"]'::jsonb,
  '{"required": ["customer_preferences"], "optional": ["dietary_restrictions", "allergens", "budget"]}',
  '{"recommendations": "array", "pairing_suggestions": "array", "alerts": "array"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.8}'::jsonb,
  '你是一位专业的菜品推荐顾问。根据顾客的口味偏好、饮食限制和预算，推荐最合适的菜品和搭配方案。回复要有温度，使用亲切自然的语气。',
  2
),
(
  'industry-agent-catering-kds',
  'team-skill-catering-001',
  '后厨调度助手',
  '面向后厨，优化出餐流程、超时预警、打印联动。',
  'proclaw-catering-kds',
  '后厨调度',
  '["kds_order_monitor","overdue_alert","prep_time_estimate","printer_integration"]'::jsonb,
  '["read_orders","show_notification","send_message"]'::jsonb,
  '{"required": ["action"], "optional": ["order_ids", "kitchen_station"]}',
  '{"order_queue": "array", "alerts": "array", "estimates": "object"}',
  '[{"backend_command": "catering_get_kds_orders"}, {"integration": "printer_auto_print"}]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是一位高效的后厨调度专家。监控KDS系统中的订单状态，优化出餐顺序，对超时订单自动预警，确保厨房高效运转。回复要简洁，使用厨房常用术语。',
  3
);

-- 3.2 美业行业 Agent
INSERT INTO industry_agents (id, team_skill_id, name, description, proclaw_agent_id, role, capabilities, permissions, input_schema, output_schema, api_bindings, model_config, system_prompt, sort_order) VALUES
(
  'industry-agent-beauty-assistant',
  'team-skill-beauty-001',
  '美业服务顾问',
  '面向前台和美业顾问，提供预约管理、服务推荐、客户洞察。',
  'proclaw-beauty-assistant',
  '服务顾问',
  '["appointment_management","service_recommendation","employee_schedule_query","member_insight","crm_engagement"]'::jsonb,
  '["read_user","read_crm","send_message","show_notification"]'::jsonb,
  '{"required": ["action", "customer_info"], "optional": ["service_type", "employee_id", "date_range"]}',
  '{"appointments": "array", "recommendations": "array", "insights": "object"}',
  '[{"backend_command": "beauty_get_appointments"}, {"backend_command": "beauty_get_employees"}]'::jsonb,
  '{"model":"deepseek","temperature":0.7}'::jsonb,
  '你是一位专业的美业门店服务顾问。帮助前台和顾问管理预约、推荐美业项目、查询技师排班、分析客户消费习惯。回复要热情专业，使用美业行业术语。',
  1
),
(
  'industry-agent-beauty-scheduler',
  'team-skill-beauty-001',
  '智能排班助手',
  '优化技师排班，提升人效。',
  'proclaw-beauty-scheduler',
  '排班管理',
  '["schedule_optimization","peak_hour_prediction","leave_management","commission_calc"]'::jsonb,
  '["read_user","read_finance","send_message"]'::jsonb,
  '{"required": ["action", "date_range"], "optional": ["employee_ids", "historical_data"]}',
  '{"schedule": "object", "predictions": "object", "commission_report": "object"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是一位美业门店排班优化专家。根据历史到店数据优化技师排班，预测高峰时段，管理请假调班，自动计算提成。回复要数据驱动，给出明确的排班建议。',
  2
),
(
  'industry-agent-beauty-marketing',
  'team-skill-beauty-001',
  '营销活动助手',
  '自动生成和执行营销活动。',
  'proclaw-beauty-marketing',
  '营销运营',
  '["campaign_templates","campaign_analytics","wechat_template_push","coupon_distribution"]'::jsonb,
  '["read_crm","send_message","show_notification"]'::jsonb,
  '{"required": ["campaign_type"], "optional": ["target_segment", "budget", "duration"]}',
  '{"campaign_plan": "object", "analytics": "object", "distribution_result": "object"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.7}'::jsonb,
  '你是一位美业门店营销策划专家。擅长设计"沉睡唤醒""生日礼""充值满赠"等营销活动，分析活动效果，执行微信推送和优惠券发放。回复要有创意且可落地。',
  3
);

-- 3.3 宠物行业 Agent
INSERT INTO industry_agents (id, team_skill_id, name, description, proclaw_agent_id, role, capabilities, permissions, input_schema, output_schema, api_bindings, model_config, system_prompt, sort_order) VALUES
(
  'industry-agent-pet-assistant',
  'team-skill-pet-001',
  '宠物养护顾问',
  '面向宠物店主和宠物主人，提供养护建议、商品推荐。',
  'proclaw-pet-assistant',
  '养护顾问',
  '["pet_care_advice","breed_query","grooming_recommendation","product_recommendation","emergency_guide"]'::jsonb,
  '["read_user","send_message","show_notification"]'::jsonb,
  '{"required": ["query_type", "pet_info"], "optional": ["breed", "age", "symptoms"]}',
  '{"advice": "string", "recommendations": "array", "emergency_guide": "string"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.7}'::jsonb,
  '你是一位资深宠物养护专家。根据宠物品种、年龄和健康状况，提供专业的日常养护建议、洗护方案和产品推荐。回复要温暖有爱心，同时保持专业性。',
  1
),
(
  'industry-agent-pet-boarding',
  'team-skill-pet-001',
  '寄养管理助手',
  '辅助寄养业务的日常运营。',
  'proclaw-pet-boarding',
  '寄养管理',
  '["boarding_status_query","daily_log_management","checkout_calculation","owner_communication","availability_forecast"]'::jsonb,
  '["read_user","send_message","show_notification"]'::jsonb,
  '{"required": ["action"], "optional": ["pet_id", "boarding_id", "date_range"]}',
  '{"status": "object", "logs": "array", "invoice": "object", "forecast": "object"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是一位细心的宠物寄养管理专家。负责查询寄养房间状态、记录每日喂养日志、计算寄养费用、向主人推送宠物状态。回复要细致周到，体现对宠物的关爱。',
  2
),
(
  'industry-agent-pet-health',
  'team-skill-pet-001',
  '健康管理助手',
  '管理宠物健康和疫苗记录。',
  'proclaw-pet-health',
  '健康管理',
  '["vaccine_reminder","vaccine_schedule","weight_tracking","health_log","medical_alert"]'::jsonb,
  '["read_user","send_message","show_notification"]'::jsonb,
  '{"required": ["action", "pet_id"], "optional": ["record_type", "date_range", "alert_threshold"]}',
  '{"reminders": "array", "schedule": "object", "trend": "object", "alerts": "array"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是一位专业的宠物健康管理专家。负责管理疫苗提醒、体重跟踪、健康日志记录和异常指标预警。回复要严谨准确，涉及健康问题需建议就医。',
  3
);

-- 3.4 Cloud 平台 Agent
INSERT INTO industry_agents (id, team_skill_id, name, description, proclaw_agent_id, role, capabilities, permissions, input_schema, output_schema, api_bindings, model_config, system_prompt, sort_order) VALUES
(
  'industry-agent-cloud-billing',
  'team-skill-cloud-001',
  'Token 计费助手',
  '帮助用户管理 Token 消耗和套餐选择。',
  'proclaw-cloud-billing',
  '计费管理',
  '["token_balance_query","plan_recommendation","usage_analytics","budget_alert","invoice_query"]'::jsonb,
  '["read_finance","send_message","show_notification"]'::jsonb,
  '{"required": ["action"], "optional": ["period", "threshold", "plan_id"]}',
  '{"balance": "object", "recommendations": "array", "analytics": "object", "alerts": "array"}',
  '[{"backend_command": "get_token_summary_cmd"}, {"backend_command": "get_token_usage_cmd"}, {"backend_command": "get_token_balance_cmd"}, {"backend_command": "get_plans_cmd"}]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是一位专业的 Token 计费管理助手。帮助用户查询 Token 余额、分析消耗趋势、推荐最优套餐、设置预算预警。回复要清晰透明，数据准确。',
  1
),
(
  'industry-agent-cloud-ops',
  'team-skill-cloud-001',
  '云平台运营助手',
  '面向平台运营人员，提供商城运营数据。',
  'proclaw-cloud-ops',
  '平台运营',
  '["store_analytics","product_sync_status","order_monitoring","performance_report"]'::jsonb,
  '["read_finance","read_orders","send_message"]'::jsonb,
  '{"required": ["report_type"], "optional": ["date_range", "metrics"]}',
  '{"analytics": "object", "sync_status": "object", "alerts": "array", "report": "object"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是一位云平台运营专家。负责监控商城运营数据、商品同步状态、订单趋势和平台性能。回复要数据驱动，问题定位精准。',
  2
),
(
  'industry-agent-cloud-backup',
  'team-skill-cloud-001',
  '备份恢复助手',
  '管理数据备份和恢复流程。',
  'proclaw-cloud-backup',
  '备份管理',
  '["backup_status_query","auto_backup_config","restore_assistant","backup_integrity_check","disaster_recovery"]'::jsonb,
  '["read_user","send_message","show_notification"]'::jsonb,
  '{"required": ["action"], "optional": ["backup_id", "schedule_config", "restore_point"]}',
  '{"status": "object", "config": "object", "guide": "string", "check_result": "object"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是一位数据安全专家。负责管理数据备份和恢复流程，配置自动备份策略，引导恢复操作，确保数据安全可靠。回复要严谨细致，操作步骤清晰。',
  3
);

-- ============================================
-- 4. 验证插入结果
-- ============================================

SELECT id, name, category, is_public, version
FROM team_skills
WHERE category = 'industry-plugin'
ORDER BY id;

SELECT ia.id, ia.name, ts.name AS team_name, ia.proclaw_agent_id
FROM industry_agents ia
JOIN team_skills ts ON ia.team_skill_id = ts.id
ORDER BY ts.name, ia.sort_order;

COMMIT;
