-- ============================================
-- MicroBiz 作为行业插件数据迁移 v1.0.0
-- 将小商家经营套件(3个团队+10个Agent)注册到行业插件分类
-- ============================================

BEGIN;

-- ============================================
-- 1. 注册 3 个 MicroBiz AiTeam (作为行业插件)
-- ============================================

-- ---------- 1.1 新媒体运营 Team ----------
INSERT INTO team_skills (
  id, name, description, category,
  leader_config, roles, workflow, binding_rules,
  is_public, version
)
VALUES (
  'team-skill-microbiz-social-001',
  '新媒体运营 Team',
  '小商家经营套件 - 新媒体运营团队。自动生成图文/短视频脚本；定时发布到抖音、小红书、视频号；自动回复用户评论/私信；生成粉丝画像和互动报表。',
  'industry-plugin',
  '{"name": "新媒体运营主管", "responsibilities": ["协调内容创作与发布节奏", "审核客服回复质量", "制定数据分析策略"]}',
  '[
    {"role": "内容创作 Agent", "proclaw_agent_id": "proclaw-microbiz-content-creation", "specialty": "文案生成/视频脚本", "responsibilities": ["文案生成", "短视频脚本", "多平台适配"]},
    {"role": "社媒发布 Agent", "proclaw_agent_id": "proclaw-microbiz-social-publish", "specialty": "定时发布/多账号管理", "responsibilities": ["定时发布", "多账号管理", "发布状态跟踪"]},
    {"role": "客服互动 Agent", "proclaw_agent_id": "proclaw-microbiz-customer-interaction", "specialty": "评论回复/私信处理", "responsibilities": ["评论回复", "私信处理", "FAQ知识库", "人工审核转接"]},
    {"role": "数据分析 Agent", "proclaw_agent_id": "proclaw-microbiz-data-analysis", "specialty": "多平台数据/报表生成", "responsibilities": ["多平台数据拉取", "指标计算", "趋势分析", "可读报告生成"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "内容创作", "performed_by": "内容创作Agent", "output": "文案+剪辑建议"},
      {"step": 2, "action": "内容发布", "performed_by": "社媒发布Agent", "output": "发布链接+状态"},
      {"step": 3, "action": "用户互动", "performed_by": "客服互动Agent", "output": "回复用户评论/私信"},
      {"step": 4, "action": "数据分析", "performed_by": "数据分析Agent", "output": "粉丝画像+互动报表"}
    ]
  }',
  '{
    "industry_type": "小商家经营",
    "platform": "nvwax",
    "account_bindings": [
      {"platform": "douyin", "label": "抖音", "type": "oauth", "required": true},
      {"platform": "xiaohongshu", "label": "小红书企业号", "type": "oauth", "required": true}
    ]
  }',
  true, '1.0.0'
);

-- ---------- 1.2 本地团购 Team ----------
INSERT INTO team_skills (
  id, name, description, category,
  leader_config, roles, workflow, binding_rules,
  is_public, version
)
VALUES (
  'team-skill-microbiz-deals-001',
  '本地团购 Team',
  '小商家经营套件 - 本地团购运营团队。同步美团/闪购商品；接收新订单并语音提醒；自动扣减本地库存；分析静销和动销品。',
  'industry-plugin',
  '{"name": "团购运营主管", "responsibilities": ["管理团单上架策略", "监控订单流转", "分析商品销售表现"]}',
  '[
    {"role": "团单管理 Agent", "proclaw_agent_id": "proclaw-microbiz-deal-manager", "specialty": "团单同步/价格更新", "responsibilities": ["团单拉取", "价格更新", "库存更新", "活动管理"]},
    {"role": "订单监控 Agent", "proclaw_agent_id": "proclaw-microbiz-order-monitor", "specialty": "订单接收/桌面提醒", "responsibilities": ["订单接收", "桌面通知", "语音提醒", "订单分类"]},
    {"role": "进销存同步 Agent", "proclaw_agent_id": "proclaw-microbiz-inventory-sync", "specialty": "库存扣减/补货建议", "responsibilities": ["库存自动扣减", "阈值告警", "补货建议", "库存报表"]},
    {"role": "静/动销分析 Agent", "proclaw_agent_id": "proclaw-microbiz-sales-analysis", "specialty": "销售分析/商品策略", "responsibilities": ["销售频率分析", "滞销标记", "热卖标记", "策略建议"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "团单管理", "performed_by": "团单管理Agent", "output": "团单同步状态"},
      {"step": 2, "action": "订单监控", "performed_by": "订单监控Agent", "output": "新订单通知"},
      {"step": 3, "action": "库存同步", "performed_by": "进销存同步Agent", "output": "库存更新"},
      {"step": 4, "action": "销售分析", "performed_by": "静/动销分析Agent", "output": "分析报告"}
    ]
  }',
  '{
    "industry_type": "小商家经营",
    "platform": "nvwax",
    "account_bindings": [
      {"platform": "meituan", "label": "美团商家", "type": "api_key", "required": true},
      {"platform": "shanguo", "label": "闪购商家", "type": "api_key", "required": false}
    ]
  }',
  true, '1.0.0'
);

-- ---------- 1.3 小程序商城 Team ----------
INSERT INTO team_skills (
  id, name, description, category,
  leader_config, roles, workflow, binding_rules,
  is_public, version
)
VALUES (
  'team-skill-microbiz-miniprogram-001',
  '小程序商城 Team',
  '小商家经营套件 - 小程序商城运营团队。一键将进销存商品发布到微信小程序；订单自动写入进销存；客户标签化管理。',
  'industry-plugin',
  '{"name": "商城运营主管", "responsibilities": ["管理商品上架策略", "确保订单同步准确", "优化客户管理"]}',
  '[
    {"role": "商品上架 Agent", "proclaw_agent_id": "proclaw-microbiz-product-listing", "specialty": "商品发布/批量上传", "responsibilities": ["商品格式转换", "批量上传", "增量同步", "图片处理"]},
    {"role": "订单同步 Agent", "proclaw_agent_id": "proclaw-microbiz-order-sync", "specialty": "订单监听/库存扣减", "responsibilities": ["订单监听", "格式转换", "本地写入", "库存扣减"]},
    {"role": "客户管理 Agent", "proclaw_agent_id": "proclaw-microbiz-customer-manager", "specialty": "客户整合/营销推送", "responsibilities": ["客户信息整合", "自动打标签", "客户分群", "促销消息发送"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "商品上架", "performed_by": "商品上架Agent", "output": "商品批量上架状态"},
      {"step": 2, "action": "订单同步", "performed_by": "订单同步Agent", "output": "订单写入记录"},
      {"step": 3, "action": "客户管理", "performed_by": "客户管理Agent", "output": "客户标签更新"}
    ]
  }',
  '{
    "industry_type": "小商家经营",
    "platform": "nvwax",
    "account_bindings": [
      {"platform": "weixin_mini", "label": "微信小程序", "type": "oauth", "fields": ["app_id", "app_secret"], "required": true}
    ]
  }',
  true, '1.0.0'
);

-- ============================================
-- 2. 注册 10 个 MicroBiz Agent (到 industry_agents 表)
-- ============================================

-- 新媒体运营 Team 的 Agents
INSERT INTO industry_agents (id, team_skill_id, name, description, proclaw_agent_id, role,
  capabilities, permissions, input_schema, output_schema, api_bindings, model_config, system_prompt, sort_order)
VALUES
(
  'industry-agent-microbiz-content-creation',
  'team-skill-microbiz-social-001',
  '内容创作 Agent',
  '根据商品信息、行业关键词和目标平台，生成符合平台风格的文案和剪辑建议',
  'proclaw-microbiz-content-creation',
  '内容创作',
  '["文案生成", "短视频脚本", "图片/视频剪辑建议", "多平台适配"]'::jsonb,
  '["read_user", "send_message"]'::jsonb,
  '{"required": ["product_info", "industry_keywords", "target_platform"], "optional": ["reference_links", "brand_voice"]}',
  '{"content": "string", "editing_suggestions": "array", "platform_format": "string", "estimated_time": "string"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.8}'::jsonb,
  '你是一位专业的新媒体内容创作者。根据提供的商品信息和行业关键词，为目标平台（抖音/小红书/视频号）创作符合平台风格的文案。输出应包含核心文案、配图建议和剪辑思路。',
  1
),
(
  'industry-agent-microbiz-social-publish',
  'team-skill-microbiz-social-001',
  '社媒发布 Agent',
  '支持定时发布、多账号管理，自动添加话题标签',
  'proclaw-microbiz-social-publish',
  '社媒发布',
  '["定时发布", "多账号管理", "话题标签管理", "发布状态跟踪"]'::jsonb,
  '["read_user", "send_message", "show_notification"]'::jsonb,
  '{"required": ["content", "platforms", "schedule"], "optional": ["hashtags", "@mentions", "account_ids"]}',
  '{"publish_results": "array", "links": "array", "status": "string"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是一位社媒发布管理专家。负责将创作好的内容按计划发布到指定平台，并跟踪发布状态。确保话题标签准确、@官方号正确。',
  2
),
(
  'industry-agent-microbiz-customer-interaction',
  'team-skill-microbiz-social-001',
  '客服互动 Agent',
  '通过Webhook接收社媒私信/评论，使用大模型生成回复',
  'proclaw-microbiz-customer-interaction',
  '客服互动',
  '["评论回复", "私信处理", "FAQ知识库", "人工审核转接"]'::jsonb,
  '["read_user", "send_message", "show_notification"]'::jsonb,
  '{"required": ["message_type", "content", "user_info"], "optional": ["faq_database", "auto_reply_rules"]}',
  '{"reply": "string", "need_human_review": "boolean", "category": "string"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.5}'::jsonb,
  '你是一位专业的社交媒体客服代表。根据用户评论/私信内容，生成友好、专业、符合品牌调性的回复。支持查询FAQ知识库，需要人工审核的标注出来。',
  3
),
(
  'industry-agent-microbiz-data-analysis',
  'team-skill-microbiz-social-001',
  '数据分析 Agent',
  '每日拉取各平台数据，生成可读报告',
  'proclaw-microbiz-data-analysis',
  '数据分析',
  '["多平台数据拉取", "指标计算", "趋势分析", "可读报告生成"]'::jsonb,
  '["read_user", "send_message"]'::jsonb,
  '{"required": ["platforms", "date_range"], "optional": ["metrics", "comparison_period"]}',
  '{"report": "string", "highlights": "array", "recommendations": "array", "charts": "array"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是一位数据分析专家。负责汇总各社交媒体平台的数据，计算播放量、点赞、评论、分享、粉丝增长等指标，生成易懂的业务报告，并给出下一步行动建议。',
  4
),

-- 本地团购 Team 的 Agents
(
  'industry-agent-microbiz-deal-manager',
  'team-skill-microbiz-deals-001',
  '团单管理 Agent',
  '从美团/闪购拉取当前活动团单，支持一键更新价格/库存',
  'proclaw-microbiz-deal-manager',
  '团单管理',
  '["团单拉取", "价格更新", "库存更新", "活动管理"]'::jsonb,
  '["read_user", "send_message"]'::jsonb,
  '{"required": ["platform", "action"], "optional": ["deal_ids", "price_updates", "inventory_updates"]}',
  '{"deals": "array", "updated_count": "number", "status": "string"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是团单管理专家。负责从美团/闪购平台同步团购活动信息，确保价格和库存数据准确。支持批量更新操作。',
  1
),
(
  'industry-agent-microbiz-order-monitor',
  'team-skill-microbiz-deals-001',
  '订单监控 Agent',
  '长轮询或Webhook接收新订单，桌面端弹出醒目通知',
  'proclaw-microbiz-order-monitor',
  '订单监控',
  '["订单接收", "桌面通知", "语音提醒", "订单分类"]'::jsonb,
  '["read_user", "send_message", "show_notification"]'::jsonb,
  '{"required": ["notification_type"], "optional": ["polling_interval"]}',
  '{"orders": "array", "notifications": "array", "alert": "string"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.2}'::jsonb,
  '你是订单监控专员。实时监控来自美团/闪购的新订单，通过桌面通知和语音播报及时提醒商家处理。',
  2
),
(
  'industry-agent-microbiz-inventory-sync',
  'team-skill-microbiz-deals-001',
  '进销存同步 Agent',
  '订单产生后自动减少本地库存，库存低于阈值时发起补货建议',
  'proclaw-microbiz-inventory-sync',
  '进销存同步',
  '["库存自动扣减", "阈值告警", "补货建议", "库存报表"]'::jsonb,
  '["read_user", "send_message"]'::jsonb,
  '{"required": ["order_items"], "optional": ["inventory_threshold", "supplier_info"]}',
  '{"updated_inventory": "array", "alerts": "array", "restock_suggestions": "array"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是进销存管理专家。负责自动扣减库存，监控库存水位，当商品库存低于阈值时自动生成补货建议。',
  3
),
(
  'industry-agent-microbiz-sales-analysis',
  'team-skill-microbiz-deals-001',
  '静/动销分析 Agent',
  '分析指定周期内每个商品的销售频率，标记滞销和热卖品',
  'proclaw-microbiz-sales-analysis',
  '静/动销分析',
  '["销售频率分析", "滞销标记", "热卖标记", "策略建议"]'::jsonb,
  '["read_user", "send_message"]'::jsonb,
  '{"required": ["period_days"], "optional": ["category_filter", "price_range"]}',
  '{"slow_moving": "array", "fast_moving": "array", "recommendations": "array"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是商品销售分析专家。分析指定周期内的商品销售数据，识别静销品（滞销）和动销品（热卖），为每个商品提供定价、促销或下架建议。',
  4
),

-- 小程序商城 Team 的 Agents
(
  'industry-agent-microbiz-product-listing',
  'team-skill-microbiz-miniprogram-001',
  '商品上架 Agent',
  '读取本地商品表，转换为小程序商城所需格式，支持批量上传和增量同步',
  'proclaw-microbiz-product-listing',
  '商品上架',
  '["商品格式转换", "批量上传", "增量同步", "图片处理"]'::jsonb,
  '["read_user", "send_message"]'::jsonb,
  '{"required": ["products"], "optional": ["sync_type", "category_mapping"]}',
  '{"uploaded_count": "number", "failed_count": "number", "errors": "array", "product_urls": "array"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是电商商品上架专家。负责将本地进销存系统的商品数据转换为微信小程序商城支持的格式，执行批量上传和增量同步操作，确保线上线下商品信息一致。',
  1
),
(
  'industry-agent-microbiz-order-sync',
  'team-skill-microbiz-miniprogram-001',
  '订单同步 Agent',
  '监听小程序商城的订单创建，转换格式后写入本地销售单，自动扣减库存',
  'proclaw-microbiz-order-sync',
  '订单同步',
  '["订单监听", "格式转换", "本地写入", "库存扣减"]'::jsonb,
  '["read_user", "send_message"]'::jsonb,
  '{"required": ["webhook_data"], "optional": ["local_format"]}',
  '{"synced": "boolean", "order_id": "string", "inventory_updated": "boolean"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是订单同步专家。监听微信小程序商城的订单创建通知，将订单转换为本地格式并写入进销存系统，同步扣减库存。',
  2
),
(
  'industry-agent-microbiz-customer-manager',
  'team-skill-microbiz-miniprogram-001',
  '客户管理 Agent',
  '整合来自社媒、团购、小程序的客户信息，自动打标签，支持批量发送促销消息',
  'proclaw-microbiz-customer-manager',
  '客户管理',
  '["客户信息整合", "自动打标签", "客户分群", "促销消息发送"]'::jsonb,
  '["read_user", "send_message", "show_notification"]'::jsonb,
  '{"required": ["action"], "optional": ["customer_ids", "tag_rules", "campaign_config"]}',
  '{"customers_updated": "number", "tags_applied": "array", "segments": "array"}',
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.5}'::jsonb,
  '你是客户关系管理专家。负责整合多渠道客户信息，基于客户行为自动打标签（如"抖音粉丝""高频复购"），支持客户分群管理和批量消息发送。',
  3
);

-- ============================================
-- 3. 验证插入结果
-- ============================================

SELECT id, name, category, is_public, version
FROM team_skills
WHERE category = 'industry-plugin'
ORDER BY id;

SELECT ia.id, ia.name, ts.name AS team_name, ia.proclaw_agent_id
FROM industry_agents ia
JOIN team_skills ts ON ia.team_skill_id = ts.id
WHERE ts.category = 'industry-plugin'
ORDER BY ts.name, ia.sort_order;

COMMIT;
