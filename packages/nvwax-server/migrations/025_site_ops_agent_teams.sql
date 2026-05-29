-- ============================================
-- 网站运营与社交 AI Team 数据迁移 v1.0.0
-- 添加 4 个团队模板：1个网站运营 + 3个社交运营
-- ============================================

BEGIN;

-- 1. 网站运营 AI Team
INSERT INTO team_skills (
  id, name, description, category,
  leader_config, roles, workflow, binding_rules,
  is_public, version
)
VALUES (
  'team-skill-site-ops-001',
  '网站运营 AI Team',
  '专业的网站运营 AI 团队，覆盖 SEO 优化、内容运营、数据分析和转化优化。适用于企业网站流量提升、用户增长和收入优化等场景。',
  'website_operations',
  '{"name": "网站运营总监", "responsibilities": ["制定运营策略", "数据分析决策", "团队管理协调", "KPI 追踪"]}',
  '[
    {"role": "SEO 优化师", "specialty": "搜索引擎优化", "agent_type": "seo-agent", "responsibilities": ["关键词研究", "站内优化", "外链建设", "排名监控"]},
    {"role": "内容运营", "specialty": "内容策略与创作", "agent_type": "content-agent", "responsibilities": ["内容策划", "文章撰写", "内容分发", "效果追踪"]},
    {"role": "数据分析师", "specialty": "网站数据分析", "agent_type": "analytics-agent", "responsibilities": ["流量分析", "用户行为分析", "数据报表", "A/B 测试"]},
    {"role": "转化优化师", "specialty": "转化率优化", "agent_type": "cvr-agent", "responsibilities": ["漏斗分析", "着陆页优化", "CTA 优化", "用户留存提升"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "数据收集和现状分析", "performed_by": "网站运营总监", "output": "current_status_report"},
      {"step": 2, "action": "SEO 诊断和关键词策略", "performed_by": "SEO 优化师", "output": "seo_strategy"},
      {"step": 3, "action": "内容规划和创作", "performed_by": "内容运营", "output": "content_calendar"},
      {"step": 4, "action": "转化漏斗分析和优化方案", "performed_by": "转化优化师", "output": "conversion_plan"},
      {"step": 5, "action": "数据监控和效果复盘", "performed_by": "数据分析师", "output": "performance_dashboard"}
    ]
  }',
  '{
    "communication_protocol": "每周运营策略同步，数据日报自动推送",
    "conflict_resolution": "策略分歧通过 A/B 测试数据决策",
    "quality_standards": "SEO 排名前 10，内容原创度 > 90%，转化率提升 > 15%"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 2. 欧美社交运营 Team
INSERT INTO team_skills (
  id, name, description, category,
  leader_config, roles, workflow, binding_rules,
  is_public, version
)
VALUES (
  'team-skill-social-us-eu-001',
  '欧美社交运营 Team',
  '专业的欧美市场社交媒体运营团队，覆盖 Twitter、Facebook、Instagram、LinkedIn 等主流平台。适用于欧美品牌推广、用户增长和社群运营。',
  'social_media',
  '{"name": "欧美社交运营总监", "responsibilities": ["跨平台运营策略", "品牌调性把控", "团队管理", "ROI 追踪"]}',
  '[
    {"role": "Twitter 运营", "specialty": "Twitter 平台运营", "agent_type": "social-agent", "responsibilities": ["推文策划", "话题营销", "粉丝互动", "实时热点追踪"]},
    {"role": "Facebook 运营", "specialty": "Facebook 运营", "agent_type": "social-agent", "responsibilities": ["主页管理", "社群运营", "广告投放", "Facebook Insights"]},
    {"role": "Instagram 运营", "specialty": "Instagram 运营", "agent_type": "social-agent", "responsibilities": ["视觉内容策划", "Reels 制作", "KOL 合作", "品牌故事营销"]},
    {"role": "LinkedIn 运营", "specialty": "LinkedIn 专业社媒运营", "agent_type": "social-agent", "responsibilities": ["企业页面运营", "行业洞察", "专业内容创作", "Lead Gen 广告"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "市场调研和平台定位", "performed_by": "欧美社交运营总监", "output": "platform_strategy"},
      {"step": 2, "action": "多平台内容日历编排", "performed_by": "Twitter 运营", "output": "content_calendar"},
      {"step": 3, "action": "视觉内容和创意制作", "performed_by": "Instagram 运营", "output": "visual_content"},
      {"step": 4, "action": "广告投放和效果优化", "performed_by": "Facebook 运营", "output": "ad_performance"},
      {"step": 5, "action": "B2B 内容发布和 Lead 获取", "performed_by": "LinkedIn 运营", "output": "lead_generation"},
      {"step": 6, "action": "全平台数据汇总和策略优化", "performed_by": "欧美社交运营总监", "output": "optimization_report"}
    ]
  }',
  '{
    "communication_protocol": "每日跨平台运营简报，实时热点追踪",
    "conflict_resolution": "内容发布时间争议按排期优先级处理",
    "quality_standards": "内容符合当地文化规范，周更频率 > 5 篇/平台"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 3. 东南亚社交运营 Team
INSERT INTO team_skills (
  id, name, description, category,
  leader_config, roles, workflow, binding_rules,
  is_public, version
)
VALUES (
  'team-skill-social-sea-001',
  '东南亚社交运营 Team',
  '专业的东南亚市场社交媒体运营团队，聚焦 TikTok、Instagram、Facebook 三大热门平台。适用于出海品牌东南亚市场的社交推广和用户增长。',
  'social_media',
  '{"name": "东南亚社交运营总监", "responsibilities": ["区域运营策略", "本土化内容把控", "KOL 资源管理", "增长目标追踪"]}',
  '[
    {"role": "TikTok 运营", "specialty": "TikTok 平台运营", "agent_type": "social-agent", "responsibilities": ["短视频策划", "挑战赛运营", "TikTok Ads", "达人合作"]},
    {"role": "Instagram 运营", "specialty": "Instagram 运营", "agent_type": "social-agent", "responsibilities": ["视觉内容运营", "Stories 策略", "Reels 创作", "品牌合作"]},
    {"role": "Facebook 运营", "specialty": "Facebook 运营", "agent_type": "social-agent", "responsibilities": ["社群管理", "Messenger 营销", "Facebook Ads", "数据分析"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "东南亚市场趋势分析", "performed_by": "东南亚社交运营总监", "output": "market_analysis"},
      {"step": 2, "action": "TikTok 短视频内容策划", "performed_by": "TikTok 运营", "output": "short_video_plan"},
      {"step": 3, "action": "Instagram 视觉营销", "performed_by": "Instagram 运营", "output": "visual_campaign"},
      {"step": 4, "action": "Facebook 社群运营和广告", "performed_by": "Facebook 运营", "output": "community_report"},
      {"step": 5, "action": "全平台数据整合和优化", "performed_by": "东南亚社交运营总监", "output": "regional_report"}
    ]
  }',
  '{
    "communication_protocol": "日度平台数据同步，周度运营策略会",
    "conflict_resolution": "跨平台排期冲突由运营总监统筹",
    "quality_standards": "内容本地化适配，TikTok 完播率 > 30%，素材合规"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 4. 国内社交运营 Team
INSERT INTO team_skills (
  id, name, description, category,
  leader_config, roles, workflow, binding_rules,
  is_public, version
)
VALUES (
  'team-skill-social-cn-001',
  '国内社交运营 Team',
  '专业的国内市场社交媒体运营团队，专注微信、小红书、知乎、微博四大平台。适用于品牌国内社交营销、内容种草和用户运营。',
  'social_media',
  '{"name": "国内社交运营总监", "responsibilities": ["整合运营策略", "平台资源协调", "品牌声量管理", "转化目标追踪"]}',
  '[
    {"role": "微信运营", "specialty": "微信生态运营", "agent_type": "social-agent", "responsibilities": ["微信公众号运营", "视频号运营", "私域流量管理", "小程序推广"]},
    {"role": "小红书运营", "specialty": "小红书平台运营", "agent_type": "social-agent", "responsibilities": ["种草笔记策划", "达人合作", "搜索优化", "社区互动"]},
    {"role": "知乎运营", "specialty": "知乎平台运营", "agent_type": "social-agent", "responsibilities": ["问答营销", "专栏创作", "知+广告", "话题运营"]},
    {"role": "微博运营", "specialty": "微博平台运营", "agent_type": "social-agent", "responsibilities": ["热搜追踪", "话题营销", "粉丝头条", "舆情管理"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "国内社交媒体趋势分析", "performed_by": "国内社交运营总监", "output": "market_insight"},
      {"step": 2, "action": "微信生态内容布局", "performed_by": "微信运营", "output": "wechat_content"},
      {"step": 3, "action": "小红书种草内容策划", "performed_by": "小红书运营", "output": "xiaohongshu_notes"},
      {"step": 4, "action": "知乎专业内容运营", "performed_by": "知乎运营", "output": "zhihu_content"},
      {"step": 5, "action": "微博热点营销和互动", "performed_by": "微博运营", "output": "weibo_campaign"},
      {"step": 6, "action": "全平台数据分析报告", "performed_by": "国内社交运营总监", "output": "platform_report"}
    ]
  }',
  '{
    "communication_protocol": "日度平台数据同步，周度运营复盘会",
    "conflict_resolution": "跨平台内容争议由运营总监最终决策",
    "quality_standards": "内容符合各平台规范，小红书笔记互动率 > 5%，数据真实有效"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 验证插入结果
-- ============================================

SELECT id, name, category, is_public, version
FROM team_skills
WHERE category IN ('website_operations', 'social_media')
ORDER BY category, created_at DESC;

-- 查看所有分类的统计
SELECT category, COUNT(*) as count
FROM team_skills
GROUP BY category
ORDER BY category;

-- ============================================
-- 迁移完成
-- ============================================

COMMIT;
