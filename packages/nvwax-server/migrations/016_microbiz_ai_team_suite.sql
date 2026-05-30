-- ============================================
-- MicroBiz AI Team Suite 数据迁移 v1.0.0
-- 小商家经营 AI Team 套件
-- 包含3个预定义的AI团队 + 10个Agent
-- ============================================

BEGIN;

-- ============================================
-- 1. 创建 MicroBiz 团队表
-- ============================================
CREATE TABLE IF NOT EXISTS microbiz_teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,  -- 'social_media', 'local_deals', 'mini_program'
  icon TEXT,
  color TEXT DEFAULT '#7C3AED',
  
  -- 团队配置
  leader_config JSONB DEFAULT '{}'::jsonb,
  workflow JSONB DEFAULT '{}'::jsonb,
  
  -- 账号绑定模板（定义需要用户绑定的外部账号类型）
  account_bindings_template JSONB DEFAULT '[]'::jsonb,
  
  -- 通知配置模板
  notification_config JSONB DEFAULT '{}'::jsonb,
  
  -- 数据来源说明
  data_sources JSONB DEFAULT '[]'::jsonb,
  
  -- 元数据
  version TEXT DEFAULT '1.0.0',
  is_public BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. 创建 MicroBiz Agent 表
-- ============================================
CREATE TABLE IF NOT EXISTS microbiz_agents (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES microbiz_teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  role TEXT NOT NULL,
  
  -- Agent 能力配置
  capabilities JSONB DEFAULT '[]'::jsonb,
  input_schema JSONB DEFAULT '{}'::jsonb,
  output_schema JSONB DEFAULT '{}'::jsonb,
  
  -- 外部 API 绑定
  api_bindings JSONB DEFAULT '[]'::jsonb,
  
  -- LLM 配置
  model_config JSONB DEFAULT '{"model":"deepseek","temperature":0.7}'::jsonb,
  system_prompt TEXT,
  
  -- 排序
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. 创建 MicroBiz 安装记录表
-- ============================================
CREATE TABLE IF NOT EXISTS microbiz_installations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 安装状态
  status TEXT NOT NULL DEFAULT 'installing',  -- 'installing', 'active', 'paused', 'uninstalled'
  
  -- 选择的团队列表
  selected_teams JSONB DEFAULT '[]'::jsonb,
  
  -- 账号绑定信息
  account_bindings JSONB DEFAULT '{}'::jsonb,
  
  -- 运营偏好
  preferences JSONB DEFAULT '{}'::jsonb,
  
  -- Agent 运行状态
  agent_status JSONB DEFAULT '{}'::jsonb,
  
  -- 安装来源
  installed_from TEXT DEFAULT 'marketplace',  -- 'marketplace', 'proclaw-light', 'api'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id)
);

-- ============================================
-- 4. 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_microbiz_teams_category ON microbiz_teams(category);
CREATE INDEX IF NOT EXISTS idx_microbiz_teams_public ON microbiz_teams(is_public);
CREATE INDEX IF NOT EXISTS idx_microbiz_agents_team ON microbiz_agents(team_id);
CREATE INDEX IF NOT EXISTS idx_microbiz_installations_user ON microbiz_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_microbiz_installations_status ON microbiz_installations(status);

-- ============================================
-- 5. 种子数据：3个 MicroBiz Team
-- ============================================

-- ---------- 5.1 新媒体运营 Team ----------
INSERT INTO microbiz_teams (id, name, description, category, icon, color, leader_config, workflow, account_bindings_template, notification_config, data_sources, sort_order)
VALUES (
  'microbiz-team-social-media',
  '新媒体运营 Team',
  '自动生成图文/短视频脚本；定时发布到抖音、小红书、视频号；自动回复用户评论/私信；生成粉丝画像和互动报表',
  'social_media',
  'megaphone',
  '#7C3AED',
  '{
    "name": "新媒体运营主管",
    "responsibilities": ["协调内容创作与发布节奏", "审核客服回复质量", "制定数据分析策略"]
  }'::jsonb,
  '{
    "steps": [
      {"step": 1, "action": "内容创作", "performed_by": "内容创作Agent", "output": "文案+剪辑建议"},
      {"step": 2, "action": "内容发布", "performed_by": "社媒发布Agent", "output": "发布链接+状态"},
      {"step": 3, "action": "用户互动", "performed_by": "客服互动Agent", "output": "回复用户评论/私信"},
      {"step": 4, "action": "数据分析", "performed_by": "数据分析Agent", "output": "粉丝画像+互动报表"}
    ]
  }'::jsonb,
  '[
    {"platform": "douyin", "label": "抖音", "type": "oauth", "fields": ["app_id", "app_secret", "access_token"], "required": true},
    {"platform": "xiaohongshu", "label": "小红书企业号", "type": "oauth", "fields": ["app_id", "app_secret", "access_token"], "required": true},
    {"platform": "weixin_video", "label": "微信视频号", "type": "oauth", "fields": ["app_id", "app_secret"], "required": false}
  ]'::jsonb,
  '{
    "default_schedule": "09:00,12:00,18:00",
    "notification_channels": ["desktop", "sound"],
    "auto_reply_enabled": true,
    "manual_review_required": false
  }'::jsonb,
  '[
    {"name": "抖音开放平台 API", "url": "https://open.douyin.com"},
    {"name": "小红书企业号 API", "url": "https://open.xiaohongshu.com"},
    {"name": "微信视频号 API", "url": "https://channels.weixin.qq.com"}
  ]'::jsonb,
  1
);

-- 新媒体运营 Team 的 Agents
INSERT INTO microbiz_agents (id, team_id, name, description, role, capabilities, input_schema, output_schema, api_bindings, model_config, system_prompt, sort_order) VALUES
(
  'microbiz-agent-content-creation',
  'microbiz-team-social-media',
  '内容创作 Agent',
  '根据商品信息、行业关键词和目标平台，生成符合平台风格的文案和剪辑建议',
  '内容创作',
  '["文案生成", "短视频脚本", "图片/视频剪辑建议", "多平台适配"]'::jsonb,
  '{"required": ["product_info", "industry_keywords", "target_platform"], "optional": ["reference_links", "brand_voice"]}'::jsonb,
  '{"content": "string", "editing_suggestions": "array", "platform_format": "string", "estimated_time": "string"}'::jsonb,
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.8}'::jsonb,
  '你是一位专业的新媒体内容创作者。根据提供的商品信息和行业关键词，为目标平台（抖音/小红书/视频号）创作符合平台风格的文案。输出应包含核心文案、配图建议和剪辑思路。',
  1
),
(
  'microbiz-agent-social-publish',
  'microbiz-team-social-media',
  '社媒发布 Agent',
  '支持定时发布、多账号管理，自动添加话题标签',
  '社媒发布',
  '["定时发布", "多账号管理", "话题标签管理", "发布状态跟踪"]'::jsonb,
  '{"required": ["content", "platforms", "schedule"], "optional": ["hashtags", "@mentions", "account_ids"]}'::jsonb,
  '{"publish_results": "array", "links": "array", "status": "string"}'::jsonb,
  '[
    {"platform": "douyin", "endpoint": "/api/douyin/publish", "method": "POST"},
    {"platform": "xiaohongshu", "endpoint": "/api/xiaohongshu/publish", "method": "POST"},
    {"platform": "weixin_video", "endpoint": "/api/weixin/publish", "method": "POST"}
  ]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是一位社媒发布管理专家。负责将创作好的内容按计划发布到指定平台，并跟踪发布状态。确保话题标签准确、@官方号正确。',
  2
),
(
  'microbiz-agent-customer-interaction',
  'microbiz-team-social-media',
  '客服互动 Agent',
  '通过Webhook接收社媒私信/评论，使用大模型生成回复',
  '客服互动',
  '["评论回复", "私信处理", "FAQ知识库", "人工审核转接"]'::jsonb,
  '{"required": ["message_type", "content", "user_info"], "optional": ["faq_database", "auto_reply_rules"]}'::jsonb,
  '{"reply": "string", "need_human_review": "boolean", "category": "string"}'::jsonb,
  '[
    {"platform": "douyin", "endpoint": "/webhook/douyin/comment", "method": "POST"},
    {"platform": "xiaohongshu", "endpoint": "/webhook/xiaohongshu/comment", "method": "POST"}
  ]'::jsonb,
  '{"model":"deepseek","temperature":0.5}'::jsonb,
  '你是一位专业的社交媒体客服代表。根据用户评论/私信内容，生成友好、专业、符合品牌调性的回复。支持查询FAQ知识库，需要人工审核的标注出来。',
  3
),
(
  'microbiz-agent-data-analysis',
  'microbiz-team-social-media',
  '数据分析 Agent',
  '每日拉取各平台数据，生成可读报告',
  '数据分析',
  '["多平台数据拉取", "指标计算", "趋势分析", "可读报告生成"]'::jsonb,
  '{"required": ["platforms", "date_range"], "optional": ["metrics", "comparison_period"]}'::jsonb,
  '{"report": "string", "highlights": "array", "recommendations": "array", "charts": "array"}'::jsonb,
  '[
    {"platform": "douyin", "endpoint": "/api/douyin/analytics", "method": "GET"},
    {"platform": "xiaohongshu", "endpoint": "/api/xiaohongshu/analytics", "method": "GET"}
  ]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是一位数据分析专家。负责汇总各社交媒体平台的数据，计算播放量、点赞、评论、分享、粉丝增长等指标，生成易懂的业务报告，并给出下一步行动建议。',
  4
);

-- ---------- 5.2 本地团购 Team ----------
INSERT INTO microbiz_teams (id, name, description, category, icon, color, leader_config, workflow, account_bindings_template, notification_config, data_sources, sort_order)
VALUES (
  'microbiz-team-local-deals',
  '本地团购 Team',
  '同步美团/闪购商品；接收新订单并语音提醒；自动扣减本地库存；分析静销和动销品',
  'local_deals',
  'tag',
  '#E67E22',
  '{
    "name": "团购运营主管",
    "responsibilities": ["管理团单上架策略", "监控订单流转", "分析商品销售表现"]
  }'::jsonb,
  '{
    "steps": [
      {"step": 1, "action": "团单管理", "performed_by": "团单管理Agent", "output": "团单同步状态"},
      {"step": 2, "action": "订单监控", "performed_by": "订单监控Agent", "output": "新订单通知"},
      {"step": 3, "action": "库存同步", "performed_by": "进销存同步Agent", "output": "库存更新"},
      {"step": 4, "action": "销售分析", "performed_by": "静/动销分析Agent", "output": "分析报告"}
    ]
  }'::jsonb,
  '[
    {"platform": "meituan", "label": "美团商家", "type": "api_key", "fields": ["shop_id", "api_key", "api_secret"], "required": true},
    {"platform": "shanguo", "label": "闪购商家", "type": "api_key", "fields": ["shop_id", "api_key"], "required": false}
  ]'::jsonb,
  '{
    "order_notification": {"sound": true, "tts": true, "desktop": true},
    "inventory_alert_threshold": 10,
    "analysis_period_days": 30
  }'::jsonb,
  '[
    {"name": "美团商家 API", "url": "https://open.meituan.com"},
    {"name": "闪购商家 API", "url": "https://open.shanguo.com"},
    {"name": "ProClaw-Light 本地 SQLite", "url": "local://database"}
  ]'::jsonb,
  2
);

-- 本地团购 Team 的 Agents
INSERT INTO microbiz_agents (id, team_id, name, description, role, capabilities, input_schema, output_schema, api_bindings, model_config, system_prompt, sort_order) VALUES
(
  'microbiz-agent-deal-manager',
  'microbiz-team-local-deals',
  '团单管理 Agent',
  '从美团/闪购拉取当前活动团单，支持一键更新价格/库存',
  '团单管理',
  '["团单拉取", "价格更新", "库存更新", "活动管理"]'::jsonb,
  '{"required": ["platform", "action"], "optional": ["deal_ids", "price_updates", "inventory_updates"]}'::jsonb,
  '{"deals": "array", "updated_count": "number", "status": "string"}'::jsonb,
  '[
    {"platform": "meituan", "endpoint": "/api/meituan/deals", "method": "GET"},
    {"platform": "meituan", "endpoint": "/api/meituan/deals/update", "method": "PUT"}
  ]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是团单管理专家。负责从美团/闪购平台同步团购活动信息，确保价格和库存数据准确。支持批量更新操作。',
  1
),
(
  'microbiz-agent-order-monitor',
  'microbiz-team-local-deals',
  '订单监控 Agent',
  '长轮询或Webhook接收新订单，桌面端弹出醒目通知',
  '订单监控',
  '["订单接收", "桌面通知", "语音提醒", "订单分类"]'::jsonb,
  '{"required": ["notification_type"], "optional": ["polling_interval"]}'::jsonb,
  '{"orders": "array", "notifications": "array", "alert": "string"}'::jsonb,
  '[
    {"platform": "meituan", "endpoint": "/webhook/meituan/order", "method": "POST"},
    {"platform": "shanguo", "endpoint": "/webhook/meituan/order", "method": "POST"}
  ]'::jsonb,
  '{"model":"deepseek","temperature":0.2}'::jsonb,
  '你是订单监控专员。实时监控来自美团/闪购的新订单，通过桌面通知和语音播报及时提醒商家处理。',
  2
),
(
  'microbiz-agent-inventory-sync',
  'microbiz-team-local-deals',
  '进销存同步 Agent',
  '订单产生后自动减少本地库存，库存低于阈值时发起补货建议',
  '进销存同步',
  '["库存自动扣减", "阈值告警", "补货建议", "库存报表"]'::jsonb,
  '{"required": ["order_items"], "optional": ["inventory_threshold", "supplier_info"]}'::jsonb,
  '{"updated_inventory": "array", "alerts": "array", "restock_suggestions": "array"}'::jsonb,
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是进销存管理专家。负责自动扣减库存，监控库存水位，当商品库存低于阈值时自动生成补货建议。',
  3
),
(
  'microbiz-agent-sales-analysis',
  'microbiz-team-local-deals',
  '静/动销分析 Agent',
  '分析指定周期内每个商品的销售频率，标记滞销和热卖品',
  '静/动销分析',
  '["销售频率分析", "滞销标记", "热卖标记", "策略建议"]'::jsonb,
  '{"required": ["period_days"], "optional": ["category_filter", "price_range"]}'::jsonb,
  '{"slow_moving": "array", "fast_moving": "array", "recommendations": "array"}'::jsonb,
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是商品销售分析专家。分析指定周期内的商品销售数据，识别静销品（滞销）和动销品（热卖），为每个商品提供定价、促销或下架建议。',
  4
);

-- ---------- 5.3 小程序商城 Team ----------
INSERT INTO microbiz_teams (id, name, description, category, icon, color, leader_config, workflow, account_bindings_template, notification_config, data_sources, sort_order)
VALUES (
  'microbiz-team-mini-program',
  '小程序商城 Team',
  '一键将进销存商品发布到微信小程序；订单自动写入进销存；客户标签化管理',
  'mini_program',
  'shopping-bag',
  '#10B981',
  '{
    "name": "商城运营主管",
    "responsibilities": ["管理商品上架策略", "确保订单同步准确", "优化客户管理"]
  }'::jsonb,
  '{
    "steps": [
      {"step": 1, "action": "商品上架", "performed_by": "商品上架Agent", "output": "商品批量上架状态"},
      {"step": 2, "action": "订单同步", "performed_by": "订单同步Agent", "output": "订单写入记录"},
      {"step": 3, "action": "客户管理", "performed_by": "客户管理Agent", "output": "客户标签更新"}
    ]
  }'::jsonb,
  '[
    {"platform": "weixin_mini", "label": "微信小程序", "type": "oauth", "fields": ["app_id", "app_secret"], "required": true}
  ]'::jsonb,
  '{
    "auto_sync_products": true,
    "sync_interval_minutes": 15,
    "auto_tag_customers": true
  }'::jsonb,
  '[
    {"name": "微信小程序云开发 API", "url": "https://developers.weixin.qq.com"},
    {"name": "本地数据库", "url": "local://database"}
  ]'::jsonb,
  3
);

-- 小程序商城 Team 的 Agents
INSERT INTO microbiz_agents (id, team_id, name, description, role, capabilities, input_schema, output_schema, api_bindings, model_config, system_prompt, sort_order) VALUES
(
  'microbiz-agent-product-listing',
  'microbiz-team-mini-program',
  '商品上架 Agent',
  '读取本地商品表，转换为小程序商城所需格式，支持批量上传和增量同步',
  '商品上架',
  '["商品格式转换", "批量上传", "增量同步", "图片处理"]'::jsonb,
  '{"required": ["products"], "optional": ["sync_type", "category_mapping"]}'::jsonb,
  '{"uploaded_count": "number", "failed_count": "number", "errors": "array", "product_urls": "array"}'::jsonb,
  '[
    {"platform": "weixin_mini", "endpoint": "/api/weixin/product/batch_add", "method": "POST"},
    {"platform": "weixin_mini", "endpoint": "/api/weixin/product/update", "method": "PUT"}
  ]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是电商商品上架专家。负责将本地进销存系统的商品数据转换为微信小程序商城支持的格式，执行批量上传和增量同步操作，确保线上线下商品信息一致。',
  1
),
(
  'microbiz-agent-order-sync',
  'microbiz-team-mini-program',
  '订单同步 Agent',
  '监听小程序商城的订单创建，转换格式后写入本地销售单，自动扣减库存',
  '订单同步',
  '["订单监听", "格式转换", "本地写入", "库存扣减"]'::jsonb,
  '{"required": ["webhook_data"], "optional": ["local_format"]}'::jsonb,
  '{"synced": "boolean", "order_id": "string", "inventory_updated": "boolean"}'::jsonb,
  '[
    {"platform": "weixin_mini", "endpoint": "/webhook/weixin/order", "method": "POST"}
  ]'::jsonb,
  '{"model":"deepseek","temperature":0.3}'::jsonb,
  '你是订单同步专家。监听微信小程序商城的订单创建通知，将订单转换为本地格式并写入进销存系统，同步扣减库存。',
  2
),
(
  'microbiz-agent-customer-manager',
  'microbiz-team-mini-program',
  '客户管理 Agent',
  '整合来自社媒、团购、小程序的客户信息，自动打标签，支持批量发送促销消息',
  '客户管理',
  '["客户信息整合", "自动打标签", "客户分群", "促销消息发送"]'::jsonb,
  '{"required": ["action"], "optional": ["customer_ids", "tag_rules", "campaign_config"]}'::jsonb,
  '{"customers_updated": "number", "tags_applied": "array", "segments": "array"}'::jsonb,
  '[]'::jsonb,
  '{"model":"deepseek","temperature":0.5}'::jsonb,
  '你是客户关系管理专家。负责整合多渠道客户信息，基于客户行为自动打标签（如"抖音粉丝""高频复购"），支持客户分群管理和批量消息发送。',
  3
);

COMMIT;
