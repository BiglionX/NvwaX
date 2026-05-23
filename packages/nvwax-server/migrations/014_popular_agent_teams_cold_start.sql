-- ============================================
-- 热门 Agent 团队冷启动数据迁移 v1.0.0
-- 添加 20 个热门的 Agent 团队作为初始数据
-- ============================================

BEGIN;

-- 1. 软件开发类团队 (5个)

-- 1.1 Web应用开发团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-web-dev-001',
  'Web应用开发团队',
  '专业的Web应用开发团队，精通现代前端框架和后端技术栈。适用于企业级Web应用、电商平台、管理系统等场景。',
  'development',
  '{"name": "技术架构师", "responsibilities": ["系统架构设计", "技术选型", "性能优化", "团队协调"]}',
  '[
    {"role": "前端开发工程师", "specialty": "React/Vue/Angular", "agent_type": "frontend-agent", "responsibilities": ["UI组件开发", "状态管理", "响应式设计", "性能优化"]},
    {"role": "后端开发工程师", "specialty": "Node.js/Python/Java", "agent_type": "backend-agent", "responsibilities": ["API开发", "业务逻辑", "数据库设计", "安全加固"]},
    {"role": "DevOps工程师", "specialty": "CI/CD和部署", "agent_type": "devops-agent", "responsibilities": ["自动化部署", "监控告警", "容器化", "基础设施"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "需求分析和架构设计", "performed_by": "技术架构师", "output": "architecture_design"},
      {"step": 2, "action": "前端界面开发", "performed_by": "前端开发工程师", "output": "frontend_code"},
      {"step": 3, "action": "后端API开发", "performed_by": "后端开发工程师", "output": "backend_api"},
      {"step": 4, "action": "集成测试和联调", "performed_by": "前端开发工程师", "output": "integrated_app"},
      {"step": 5, "action": "部署和运维配置", "performed_by": "DevOps工程师", "output": "deployment_config"}
    ]
  }',
  '{
    "communication_protocol": "每日站会同步进度，使用Git Flow工作流",
    "conflict_resolution": "技术争议由架构师组织讨论后决策",
    "quality_standards": "代码覆盖率>85%，通过ESLint检查，API文档完整"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 1.2 移动应用开发团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-mobile-dev-001',
  '移动应用开发团队',
  '专业的移动应用开发团队，支持iOS和Android平台开发。适用于原生应用、跨平台应用、小程序等场景。',
  'development',
  '{"name": "移动技术总监", "responsibilities": ["技术方案设计", "平台适配", "性能优化", "发布管理"]}',
  '[
    {"role": "iOS开发工程师", "specialty": "Swift/Objective-C", "agent_type": "mobile-agent", "responsibilities": ["iOS应用开发", "App Store发布", "性能优化", "用户体验"]},
    {"role": "Android开发工程师", "specialty": "Kotlin/Java", "agent_type": "mobile-agent", "responsibilities": ["Android应用开发", "Google Play发布", "兼容性处理", "电池优化"]},
    {"role": "UI/UX设计师", "specialty": "移动端界面设计", "agent_type": "design-agent", "responsibilities": ["界面设计", "交互设计", "原型制作", "用户测试"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "产品需求和技术方案设计", "performed_by": "移动技术总监", "output": "tech_spec"},
      {"step": 2, "action": "UI/UX设计和原型制作", "performed_by": "UI/UX设计师", "output": "design_prototype"},
      {"step": 3, "action": "iOS应用开发", "performed_by": "iOS开发工程师", "output": "ios_app"},
      {"step": 4, "action": "Android应用开发", "performed_by": "Android开发工程师", "output": "android_app"},
      {"step": 5, "action": "跨平台测试和优化", "performed_by": "移动技术总监", "output": "optimized_apps"}
    ]
  }',
  '{
    "communication_protocol": "每周设计评审，每日构建测试",
    "conflict_resolution": "平台差异问题由技术总监决策",
    "quality_standards": "应用崩溃率<0.1%，启动时间<3秒，内存使用优化"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 1.3 AI/机器学习开发团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-ai-ml-001',
  'AI/机器学习开发团队',
  '专业的AI和机器学习开发团队，擅长深度学习、自然语言处理、计算机视觉等领域。',
  'development',
  '{"name": "AI技术总监", "responsibilities": ["算法选型", "模型架构设计", "技术路线规划", "项目把控"]}',
  '[
    {"role": "机器学习工程师", "specialty": "模型训练和优化", "agent_type": "ml-agent", "responsibilities": ["数据预处理", "模型训练", "超参数调优", "模型评估"]},
    {"role": "数据科学家", "specialty": "数据分析和特征工程", "agent_type": "data-agent", "responsibilities": ["数据探索", "特征工程", "统计分析", "洞察发现"]},
    {"role": "MLOps工程师", "specialty": "模型部署和监控", "agent_type": "devops-agent", "responsibilities": ["模型部署", "服务化", "监控告警", "版本管理"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "问题定义和数据收集", "performed_by": "数据科学家", "output": "data_collection"},
      {"step": 2, "action": "数据探索和特征工程", "performed_by": "数据科学家", "output": "feature_engineering"},
      {"step": 3, "action": "模型选择和训练", "performed_by": "机器学习工程师", "output": "trained_model"},
      {"step": 4, "action": "模型评估和优化", "performed_by": "机器学习工程师", "output": "optimized_model"},
      {"step": 5, "action": "模型部署和监控", "performed_by": "MLOps工程师", "output": "deployed_model"}
    ]
  }',
  '{
    "communication_protocol": "每周模型评审会议，实验结果共享",
    "conflict_resolution": "算法选择通过A/B测试验证",
    "quality_standards": "模型准确率>90%，推理延迟<100ms，可解释性强"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 1.4 区块链开发团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-blockchain-001',
  '区块链开发团队',
  '专业的区块链开发团队，精通智能合约、DApp开发、DeFi协议等。适用于加密货币项目、NFT平台、去中心化应用等场景。',
  'development',
  '{"name": "区块链架构师", "responsibilities": ["链选型", "架构设计", "安全审计", "技术攻关"]}',
  '[
    {"role": "智能合约工程师", "specialty": "Solidity/Rust", "agent_type": "blockchain-agent", "responsibilities": ["合约开发", "Gas优化", "安全审计", "测试网部署"]},
    {"role": "前端开发工程师", "specialty": "Web3集成", "agent_type": "frontend-agent", "responsibilities": ["钱包集成", "交易处理", "UI开发", "用户体验"]},
    {"role": "后端开发工程师", "specialty": "节点服务", "agent_type": "backend-agent", "responsibilities": ["索引服务", "事件监听", "数据存储", "API开发"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "需求分析和链选型", "performed_by": "区块链架构师", "output": "chain_selection"},
      {"step": 2, "action": "智能合约开发和审计", "performed_by": "智能合约工程师", "output": "audited_contracts"},
      {"step": 3, "action": "前端DApp开发", "performed_by": "前端开发工程师", "output": "dapp_frontend"},
      {"step": 4, "action": "后端服务和索引", "performed_by": "后端开发工程师", "output": "backend_services"},
      {"step": 5, "action": "集成测试和主网部署", "performed_by": "区块链架构师", "output": "mainnet_deployment"}
    ]
  }',
  '{
    "communication_protocol": "每日安全审查，重要变更需多重签名",
    "conflict_resolution": "安全问题优先，由架构师最终决策",
    "quality_standards": "合约通过形式化验证，Gas效率优化，无已知漏洞"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 1.5 游戏开发团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-game-dev-001',
  '游戏开发团队',
  '专业的游戏开发团队，擅长Unity/Unreal引擎开发。适用于2D/3D游戏、手机游戏、VR/AR游戏等场景。',
  'development',
  '{"name": "游戏制作人", "responsibilities": ["游戏设计", "项目管理", "质量控制", "市场定位"]}',
  '[
    {"role": "游戏程序员", "specialty": "Unity/Unreal开发", "agent_type": "game-agent", "responsibilities": ["核心玩法实现", "物理引擎", "AI行为", "性能优化"]},
    {"role": "游戏美术师", "specialty": "2D/3D美术", "agent_type": "art-agent", "responsibilities": ["角色设计", "场景建模", "动画制作", "特效设计"]},
    {"role": "游戏策划师", "specialty": "关卡和系统设计", "agent_type": "design-agent", "responsibilities": ["关卡设计", "数值平衡", "剧情编写", "用户测试"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "游戏概念和原型设计", "performed_by": "游戏制作人", "output": "game_concept"},
      {"step": 2, "action": "美术资源制作", "performed_by": "游戏美术师", "output": "art_assets"},
      {"step": 3, "action": "核心玩法开发", "performed_by": "游戏程序员", "output": "core_gameplay"},
      {"step": 4, "action": "关卡设计和测试", "performed_by": "游戏策划师", "output": "level_design"},
      {"step": 5, "action": "整合测试和优化", "performed_by": "游戏制作人", "output": "polished_game"}
    ]
  }',
  '{
    "communication_protocol": "每周游戏评审，快速迭代开发",
    "conflict_resolution": "游戏体验优先，由制作人决策",
    "quality_standards": "帧率稳定60FPS，加载时间<5秒，无严重bug"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 2. 数据分析类团队 (4个)

-- 2.1 商业智能分析团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-bi-001',
  '商业智能分析团队',
  '专业的商业智能团队，擅长数据仓库建设、BI报表、业务洞察。适用于企业决策支持、市场分析、运营优化等场景。',
  'analysis',
  '{"name": "BI总监", "responsibilities": ["分析策略", "业务对接", "报告审核", "价值挖掘"]}',
  '[
    {"role": "数据工程师", "specialty": "ETL和数据仓库", "agent_type": "data-engineer", "responsibilities": ["数据采集", "清洗转换", "数仓建模", "性能优化"]},
    {"role": "BI分析师", "specialty": "报表和可视化", "agent_type": "analyst", "responsibilities": ["指标定义", "报表开发", "趋势分析", "异常检测"]},
    {"role": "业务分析师", "specialty": "业务洞察和建议", "agent_type": "business-analyst", "responsibilities": ["需求调研", "根因分析", "策略建议", "效果评估"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "业务需求沟通和指标体系设计", "performed_by": "BI总监", "output": "kpi_framework"},
      {"step": 2, "action": "数据源接入和数仓建设", "performed_by": "数据工程师", "output": "data_warehouse"},
      {"step": 3, "action": "BI报表和Dashboard开发", "performed_by": "BI分析师", "output": "bi_dashboard"},
      {"step": 4, "action": "深度分析和洞察挖掘", "performed_by": "业务分析师", "output": "business_insights"},
      {"step": 5, "action": "汇报和行动计划制定", "performed_by": "BI总监", "output": "action_plan"}
    ]
  }',
  '{
    "communication_protocol": "每周业务同步会议，关键指标日报",
    "conflict_resolution": "数据口径统一由BI总监决策",
    "quality_standards": "数据准确率>99.9%，报表T+1更新，洞察可落地"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 2.2 用户行为分析团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-user-analytics-001',
  '用户行为分析团队',
  '专注于用户行为数据的采集、分析和优化。适用于产品迭代、用户体验优化、增长黑客等场景。',
  'analysis',
  '{"name": "用户研究总监", "responsibilities": ["研究框架", "方法论", "洞察转化", "团队协作"]}',
  '[
    {"role": "数据分析师", "specialty": "行为数据分析", "agent_type": "analyst", "responsibilities": ["漏斗分析", "留存分析", "路径分析", "分群分析"]},
    {"role": "用研专家", "specialty": "定性研究", "agent_type": "researcher", "responsibilities": ["用户访谈", "可用性测试", "问卷设计", "洞察提炼"]},
    {"role": "产品经理", "specialty": "产品优化建议", "agent_type": "pm", "responsibilities": ["需求转化", "功能设计", "A/B测试", "效果追踪"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "研究目标和问题定义", "performed_by": "用户研究总监", "output": "research_brief"},
      {"step": 2, "action": "数据采集和埋点设计", "performed_by": "数据分析师", "output": "tracking_plan"},
      {"step": 3, "action": "定量分析和模式发现", "performed_by": "数据分析师", "output": "quantitative_analysis"},
      {"step": 4, "action": "定性研究和深度洞察", "performed_by": "用研专家", "output": "qualitative_insights"},
      {"step": 5, "action": "产品优化建议和实验设计", "performed_by": "产品经理", "output": "optimization_plan"}
    ]
  }',
  '{
    "communication_protocol": "双周用户洞察分享，实时异常预警",
    "conflict_resolution": "定性和定量结论冲突时进行三角验证",
    "quality_standards": "样本代表性>95%，统计显著性p<0.05，建议可执行"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 2.3 市场调研团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-market-research-001',
  '市场调研团队',
  '专业的市场调研团队，擅长竞品分析、行业研究、消费者洞察。适用于市场进入策略、产品定位、投资决策等场景。',
  'analysis',
  '{"name": "市场研究总监", "responsibilities": ["研究设计", "质量控制", "客户沟通", "报告审核"]}',
  '[
    {"role": "行业分析师", "specialty": "宏观和行业分析", "agent_type": "analyst", "responsibilities": ["PEST分析", "市场规模", "竞争格局", "趋势预测"]},
    {"role": "竞品分析师", "specialty": "竞争对手研究", "agent_type": "analyst", "responsibilities": ["竞品对标", "SWOT分析", "策略拆解", "机会识别"]},
    {"role": "消费者研究员", "specialty": "消费者行为研究", "agent_type": "researcher", "responsibilities": ["用户画像", "需求洞察", "购买决策", "满意度调研"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "研究目标和方法设计", "performed_by": "市场研究总监", "output": "research_design"},
      {"step": 2, "action": "二手资料收集和整理", "performed_by": "行业分析师", "output": "secondary_research"},
      {"step": 3, "action": "一手数据采集", "performed_by": "消费者研究员", "output": "primary_data"},
      {"step": 4, "action": "竞品深度分析", "performed_by": "竞品分析师", "output": "competitive_analysis"},
      {"step": 5, "action": "综合分析和战略建议", "performed_by": "市场研究总监", "output": "strategic_recommendations"}
    ]
  }',
  '{
    "communication_protocol": "每周进度同步，重要发现即时汇报",
    "conflict_resolution": "不同来源数据冲突时进行交叉验证",
    "quality_standards": "数据来源可靠，样本量充足，结论有证据支撑"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 2.4 金融量化分析团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-quant-001',
  '金融量化分析团队',
  '专业的量化分析团队，擅长量化策略开发、风险管理、算法交易。适用于对冲基金、资产管理、自营交易等场景。',
  'analysis',
  '{"name": "量化投资总监", "responsibilities": ["策略方向", "风险控制", "资金管理", "绩效评估"]}',
  '[
    {"role": "量化研究员", "specialty": "策略研发", "agent_type": "quant-researcher", "responsibilities": ["因子挖掘", "策略建模", "回测验证", "参数优化"]},
    {"role": "数据工程师", "specialty": "金融数据处理", "agent_type": "data-engineer", "responsibilities": ["行情数据", "另类数据", "数据清洗", "特征工程"]},
    {"role": "风控专家", "specialty": "风险管理和合规", "agent_type": "risk-manager", "responsibilities": ["风险评估", "压力测试", "合规检查", "实时监控"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "策略idea生成和可行性分析", "performed_by": "量化投资总监", "output": "strategy_idea"},
      {"step": 2, "action": "数据准备和因子构建", "performed_by": "数据工程师", "output": "factor_library"},
      {"step": 3, "action": "策略建模和回测", "performed_by": "量化研究员", "output": "backtest_results"},
      {"step": 4, "action": "风险评估和优化", "performed_by": "风控专家", "output": "risk_assessment"},
      {"step": 5, "action": "实盘部署和监控", "performed_by": "量化投资总监", "output": "live_trading"}
    ]
  }',
  '{
    "communication_protocol": "每日晨会复盘，策略变更需审批",
    "conflict_resolution": "风险和收益权衡由投资总监决策",
    "quality_standards": "夏普比率>1.5，最大回撤<15%，策略稳定性强"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 3. 内容创作类团队 (4个)

-- 3.1 数字营销团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-digital-marketing-001',
  '数字营销团队',
  '专业的数字营销团队，擅长SEO、SEM、社交媒体营销、内容营销。适用于品牌推广、获客增长、转化率优化等场景。',
  'content',
  '{"name": "营销总监", "responsibilities": ["营销策略", "预算管理", "ROI分析", "团队协调"]}',
  '[
    {"role": "SEO专家", "specialty": "搜索引擎优化", "agent_type": "seo-specialist", "responsibilities": ["关键词研究", "站内优化", "外链建设", "排名监控"]},
    {"role": "内容营销师", "specialty": "内容策划和创作", "agent_type": "content-creator", "responsibilities": ["内容日历", "博客文章", "白皮书", "案例研究"]},
    {"role": "社交媒体经理", "specialty": "社交平台运营", "agent_type": "social-media-manager", "responsibilities": ["平台运营", "社群管理", "KOL合作", "活动策划"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "营销目标设定和策略规划", "performed_by": "营销总监", "output": "marketing_strategy"},
      {"step": 2, "action": "SEO优化和内容创作", "performed_by": "SEO专家", "output": "seo_optimized_content"},
      {"step": 3, "action": "多渠道内容分发", "performed_by": "内容营销师", "output": "distributed_content"},
      {"step": 4, "action": "社交媒体运营和互动", "performed_by": "社交媒体经理", "output": "social_engagement"},
      {"step": 5, "action": "效果分析和策略调整", "performed_by": "营销总监", "output": "performance_report"}
    ]
  }',
  '{
    "communication_protocol": "每周营销例会，实时数据监控",
    "conflict_resolution": "渠道优先级由ROI数据决定",
    "quality_standards": "转化率提升>20%，CAC降低>15%，品牌曝光增长"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 3.2 视频制作团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-video-production-001',
  '视频制作团队',
  '专业的视频制作团队，擅长短视频、宣传片、直播内容制作。适用于品牌宣传、产品推广、教育培训等场景。',
  'content',
  '{"name": "视频导演", "responsibilities": ["创意构思", "拍摄指导", "后期把控", "质量审核"]}',
  '[
    {"role": "编剧/策划", "specialty": "脚本创作", "agent_type": "scriptwriter", "responsibilities": ["故事构思", "脚本编写", "分镜设计", "台词打磨"]},
    {"role": "摄影师/剪辑师", "specialty": "拍摄和后期", "agent_type": "video-editor", "responsibilities": ["现场拍摄", "灯光布置", "视频剪辑", "特效制作"]},
    {"role": "运营专员", "specialty": "发布和推广", "agent_type": "content-operator", "responsibilities": ["平台适配", "标题优化", "发布时间", "数据分析"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "创意脑暴和脚本确定", "performed_by": "视频导演", "output": "final_script"},
      {"step": 2, "action": "前期筹备和场地确认", "performed_by": "摄影师", "output": "preparation_checklist"},
      {"step": 3, "action": "现场拍摄", "performed_by": "摄影师", "output": "raw_footage"},
      {"step": 4, "action": "后期剪辑和特效", "performed_by": "剪辑师", "output": "edited_video"},
      {"step": 5, "action": "审核修改和发布", "performed_by": "视频导演", "output": "published_video"}
    ]
  }',
  '{
    "communication_protocol": "每日拍摄进度同步，后期每日review",
    "conflict_resolution": "创意分歧以导演意见为主",
    "quality_standards": "画质1080P+，音画同步，节奏紧凑，完播率高"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 3.3 品牌策划团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-brand-strategy-001',
  '品牌策划团队',
  '专业的品牌策划团队，擅长品牌定位、VI设计、传播策略。适用于新品牌创立、品牌升级、营销活动 etc.。',
  'content',
  '{"name": "品牌总监", "responsibilities": ["品牌战略", "创意把关", "资源整合", "效果评估"]}',
  '[
    {"role": "品牌策略师", "specialty": "品牌定位和策略", "agent_type": "brand-strategist", "responsibilities": ["市场调研", "品牌定位", "核心价值", "品牌故事"]},
    {"role": "视觉设计师", "specialty": "VI和视觉设计", "agent_type": "visual-designer", "responsibilities": ["Logo设计", "VI系统", "包装设计", "视觉规范"]},
    {"role": "文案策划", "specialty": "品牌文案", "agent_type": "copywriter", "responsibilities": ["slogan创作", "品牌手册", "传播文案", "公关稿"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "品牌诊断和策略制定", "performed_by": "品牌总监", "output": "brand_strategy"},
      {"step": 2, "action": "品牌定位和核心价值提炼", "performed_by": "品牌策略师", "output": "brand_positioning"},
      {"step": 3, "action": "VI系统设计和规范", "performed_by": "视觉设计师", "output": "vi_system"},
      {"step": 4, "action": "品牌文案和传播素材", "performed_by": "文案策划", "output": "brand_copywriting"},
      {"step": 5, "action": "整合传播和效果监测", "performed_by": "品牌总监", "output": "campaign_results"}
    ]
  }',
  '{
    "communication_protocol": "每周品牌委员会，重要决策集体讨论",
    "conflict_resolution": "品牌一致性优先，由品牌总监决策",
    "quality_standards": "品牌识别度高，传播一致性强，用户认知清晰"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 3.4 教育培训内容团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-edu-content-001',
  '教育培训内容团队',
  '专业的教育内容开发团队，擅长课程设计、教学视频、在线学习平台内容。适用于K12教育、职业培训、企业内训等场景。',
  'content',
  '{"name": "教学总监", "responsibilities": ["课程体系", "教学质量", "师资管理", "学习效果"]}',
  '[
    {"role": "课程设计师", "specialty": "课程结构和教学法", "agent_type": "instructional-designer", "responsibilities": ["学习目标", "课程大纲", "教学活动", "评估设计"]},
    {"role": "内容创作者", "specialty": "教学内容制作", "agent_type": "content-creator", "responsibilities": ["课件制作", "视频录制", "练习题", "案例编写"]},
    {"role": "学习体验设计师", "specialty": "用户体验和互动", "agent_type": "ux-designer", "responsibilities": ["学习路径", "互动设计", "游戏化元素", "反馈机制"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "学习需求分析和目标设定", "performed_by": "教学总监", "output": "learning_objectives"},
      {"step": 2, "action": "课程结构和教学设计", "performed_by": "课程设计师", "output": "course_outline"},
      {"step": 3, "action": "教学内容开发和制作", "performed_by": "内容创作者", "output": "course_materials"},
      {"step": 4, "action": "学习体验和互动设计", "performed_by": "学习体验设计师", "output": "learning_experience"},
      {"step": 5, "action": "试点测试和优化", "performed_by": "教学总监", "output": "optimized_course"}
    ]
  }',
  '{
    "communication_protocol": "每周教学研讨，学员反馈及时响应",
    "conflict_resolution": "教学效果优先，基于数据决策",
    "quality_standards": "完成率>80%，满意度>4.5/5，学习效果可衡量"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 4. 产品设计类团队 (3个)

-- 4.1 UI/UX设计团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-ui-ux-001',
  'UI/UX设计团队',
  '专业的用户体验设计团队，擅长用户研究、交互设计、视觉设计。适用于产品设计、用户体验优化、设计系统等场景。',
  'design',
  '{"name": "设计总监", "responsibilities": ["设计方向", "质量标准", "团队管理", "客户沟通"]}',
  '[
    {"role": "UX研究员", "specialty": "用户研究和洞察", "agent_type": "ux-researcher", "responsibilities": ["用户访谈", "可用性测试", "竞品分析", "用户画像"]},
    {"role": "交互设计师", "specialty": "信息架构和交互", "agent_type": "interaction-designer", "responsibilities": ["流程图", "线框图", "原型制作", "交互规范"]},
    {"role": "视觉设计师", "specialty": "UI和视觉表现", "agent_type": "visual-designer", "responsibilities": ["视觉风格", "界面设计", "图标设计", "设计规范"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "用户研究和需求洞察", "performed_by": "UX研究员", "output": "user_insights"},
      {"step": 2, "action": "信息架构和交互设计", "performed_by": "交互设计师", "output": "interaction_design"},
      {"step": 3, "action": "视觉设计和UI实现", "performed_by": "视觉设计师", "output": "ui_design"},
      {"step": 4, "action": "原型测试和迭代", "performed_by": "UX研究员", "output": "usability_test_results"},
      {"step": 5, "action": "设计规范和交付", "performed_by": "设计总监", "output": "design_system"}
    ]
  }',
  '{
    "communication_protocol": "每日设计评审，用户测试及时反馈",
    "conflict_resolution": "用户体验优先，基于用户数据决策",
    "quality_standards": "任务完成率>90%，用户满意度>4.5，设计一致性高"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 4.2 产品设计团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-product-design-001',
  '产品设计团队',
  '全栈产品设计团队，从0到1打造优秀产品。适用于新产品孵化、产品迭代、功能创新等场景。',
  'design',
  '{"name": "产品总监", "responsibilities": ["产品愿景", "路线图", "资源协调", "成功指标"]}',
  '[
    {"role": "产品经理", "specialty": "产品规划和需求", "agent_type": "product-manager", "responsibilities": ["市场调研", "需求分析", "功能设计", "优先级排序"]},
    {"role": "UX设计师", "specialty": "用户体验设计", "agent_type": "ux-designer", "responsibilities": ["用户流程", "原型设计", "可用性测试", "体验优化"]},
    {"role": "数据分析师", "specialty": "产品数据分析", "agent_type": "data-analyst", "responsibilities": ["指标定义", "A/B测试", "漏斗分析", "洞察发现"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "市场机会和用户痛点分析", "performed_by": "产品总监", "output": "opportunity_analysis"},
      {"step": 2, "action": "产品规划和功能设计", "performed_by": "产品经理", "output": "product_specs"},
      {"step": 3, "action": "原型设计和用户测试", "performed_by": "UX设计师", "output": "tested_prototype"},
      {"step": 4, "action": "数据指标定义和埋点", "performed_by": "数据分析师", "output": "analytics_plan"},
      {"step": 5, "action": "上线后数据分析和迭代", "performed_by": "产品总监", "output": "iteration_plan"}
    ]
  }',
  '{
    "communication_protocol": "每周产品评审会，数据驱动决策",
    "conflict_resolution": "用户价值和商业价值平衡，由产品总监决策",
    "quality_standards": "用户留存率高，功能使用率高，NPS>30"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 4.3 工业设计团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-industrial-design-001',
  '工业设计团队',
  '专业的工业产品设计团队，擅长产品造型、结构设计、CMF设计。适用于消费电子、家居用品、医疗器械等场景。',
  'design',
  '{"name": "设计总监", "responsibilities": ["设计方向", "技术创新", "成本控制", "量产可行性"]}',
  '[
    {"role": "工业设计师", "specialty": "产品造型和外观", "agent_type": "industrial-designer", "responsibilities": ["概念设计", "3D建模", "渲染效果图", "设计提案"]},
    {"role": "结构工程师", "specialty": "内部结构和工艺", "agent_type": "mechanical-engineer", "responsibilities": ["结构设计", "DFM分析", "材料选择", "模具开发"]},
    {"role": "CMF设计师", "specialty": "色彩材料和表面处理", "agent_type": "cmf-designer", "responsibilities": ["色彩方案", "材质选择", "表面工艺", "质感设计"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "设计brief和市场调研", "performed_by": "设计总监", "output": "design_brief"},
      {"step": 2, "action": "概念设计和草图", "performed_by": "工业设计师", "output": "concept_sketches"},
      {"step": 3, "action": "3D建模和结构设计", "performed_by": "结构工程师", "output": "3d_models"},
      {"step": 4, "action": "CMF设计和打样", "performed_by": "CMF设计师", "output": "cmf_samples"},
      {"step": 5, "action": "原型制作和测试", "performed_by": "设计总监", "output": "functional_prototype"}
    ]
  }',
  '{
    "communication_protocol": "每周设计评审，与供应链紧密协作",
    "conflict_resolution": "美学和功能平衡，考虑成本和可制造性",
    "quality_standards": "外观精美，结构合理，成本可控，可量产"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 5. 运营类团队 (4个)

-- 5.1 电商运营团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-ecommerce-ops-001',
  '电商运营团队',
  '专业的电商运营团队，擅长店铺运营、商品管理、营销活动策划。适用于天猫、京东、亚马逊等平台运营。',
  'operations',
  '{"name": "运营总监", "responsibilities": ["运营策略", "GMV目标", "团队管理", "资源协调"]}',
  '[
    {"role": "店铺运营", "specialty": "店铺日常运营", "agent_type": "store-operator", "responsibilities": ["商品上架", "页面优化", "客服管理", "评价维护"]},
    {"role": "营销策划", "specialty": "促销活动和推广", "agent_type": "marketing-planner", "responsibilities": ["活动策划", "优惠券设计", "广告投放", "ROI分析"]},
    {"role": "数据分析师", "specialty": "电商数据分析", "agent_type": "data-analyst", "responsibilities": ["销售分析", "流量分析", "转化优化", "库存预测"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "运营目标和策略制定", "performed_by": "运营总监", "output": "operation_strategy"},
      {"step": 2, "action": "商品管理和页面优化", "performed_by": "店铺运营", "output": "optimized_listings"},
      {"step": 3, "action": "营销活动策划和执行", "performed_by": "营销策划", "output": "campaign_execution"},
      {"step": 4, "action": "数据监控和分析", "performed_by": "数据分析师", "output": "performance_analysis"},
      {"step": 5, "action": "策略调整和优化", "performed_by": "运营总监", "output": "optimization_actions"}
    ]
  }',
  '{
    "communication_protocol": "每日销售数据同步，每周运营复盘",
    "conflict_resolution": "短期销售和长期品牌平衡，由运营总监决策",
    "quality_standards": "转化率提升，复购率高，DSR评分>4.8"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 5.2 社群运营团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-community-ops-001',
  '社群运营团队',
  '专业的社群运营团队，擅长用户增长、活跃度提升、社群变现。适用于私域流量、知识付费、品牌社群等场景。',
  'operations',
  '{"name": "社群总监", "responsibilities": ["社群战略", "增长目标", "内容方向", "商业化"]}',
  '[
    {"role": "社群运营师", "specialty": "日常运营和互动", "agent_type": "community-manager", "responsibilities": ["内容发布", "话题引导", "用户答疑", "活动组织"]},
    {"role": "用户增长专家", "specialty": "拉新和裂变", "agent_type": "growth-hacker", "responsibilities": ["获客渠道", "裂变活动", "转化漏斗", "留存策略"]},
    {"role": "内容策划", "specialty": "社群内容生产", "agent_type": "content-strategist", "responsibilities": ["内容日历", "干货分享", "案例包装", "UGC激励"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "社群定位和目标设定", "performed_by": "社群总监", "output": "community_strategy"},
      {"step": 2, "action": "内容规划和生产", "performed_by": "内容策划", "output": "content_calendar"},
      {"step": 3, "action": "用户拉新和裂变活动", "performed_by": "用户增长专家", "output": "acquisition_campaign"},
      {"step": 4, "action": "日常运营和互动", "performed_by": "社群运营师", "output": "daily_operations"},
      {"step": 5, "action": "数据分析和策略优化", "performed_by": "社群总监", "output": "optimization_plan"}
    ]
  }',
  '{
    "communication_protocol": "每日社群数据播报，每周运营复盘",
    "conflict_resolution": "用户体验和商业目标平衡，由社群总监决策",
    "quality_standards": "活跃度高，留存率高，转化率高，口碑好"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 5.3 客户服务团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-customer-service-001',
  '客户服务团队',
  '专业的客户服务团队，提供多渠道客户支持。适用于电商客服、SaaS客服、技术支持等场景。',
  'operations',
  '{"name": "客服总监", "responsibilities": ["服务标准", "团队建设", "质量管理", "客户满意度"]}',
  '[
    {"role": "客服专员", "specialty": "客户咨询和投诉处理", "agent_type": "customer-service", "responsibilities": ["在线咨询", "电话接待", "工单处理", "问题解决"]},
    {"role": "技术支持", "specialty": "技术问题解答", "agent_type": "tech-support", "responsibilities": ["故障排查", "技术指导", "Bug反馈", "文档更新"]},
    {"role": "质检专员", "specialty": "服务质量监控", "agent_type": "qa-specialist", "responsibilities": ["通话录音质检", "聊天记录审核", "满意度调查", "培训改进"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "客户咨询接收和分类", "performed_by": "客服专员", "output": "ticket_created"},
      {"step": 2, "action": "问题诊断和解决", "performed_by": "客服专员", "output": "issue_resolved"},
      {"step": 3, "action": "复杂技术问题升级", "performed_by": "技术支持", "output": "technical_solution"},
      {"step": 4, "action": "服务质量检查和反馈", "performed_by": "质检专员", "output": "quality_report"},
      {"step": 5, "action": "满意度跟进和改进", "performed_by": "客服总监", "output": "improvement_plan"}
    ]
  }',
  '{
    "communication_protocol": "实时工单系统，紧急情况即时沟通",
    "conflict_resolution": "客户满意度优先，特殊情况上报总监",
    "quality_standards": "响应时间<1分钟，解决率>95%，满意度>4.5"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- 5.4 HR招聘团队
INSERT INTO team_skills (
  id, name, description, category, 
  leader_config, roles, workflow, binding_rules, 
  is_public, version
)
VALUES (
  'team-skill-hr-recruitment-001',
  'HR招聘团队',
  '专业的人力资源招聘团队，擅长人才寻访、面试评估、雇主品牌。适用于快速扩张期、高端人才引进、校园招聘等场景。',
  'operations',
  '{"name": "招聘总监", "responsibilities": ["招聘策略", "编制管理", "渠道拓展", "团队建设"]}',
  '[
    {"role": "招聘专员", "specialty": "简历筛选和邀约", "agent_type": "recruiter", "responsibilities": ["职位发布", "简历筛选", "电话邀约", "面试安排"]},
    {"role": "猎头顾问", "specialty": "高端人才寻访", "agent_type": "headhunter", "responsibilities": ["人才Mapping", "主动寻访", "关系维护", "offer谈判"]},
    {"role": "面试官", "specialty": "专业能力评估", "agent_type": "interviewer", "responsibilities": ["技术面试", "行为面试", "能力评估", "录用建议"]}
  ]',
  '{
    "steps": [
      {"step": 1, "action": "职位需求分析和JD编写", "performed_by": "招聘总监", "output": "job_description"},
      {"step": 2, "action": "多渠道简历收集和筛选", "performed_by": "招聘专员", "output": "qualified_candidates"},
      {"step": 3, "action": "初试和复试安排", "performed_by": "招聘专员", "output": "interview_scheduled"},
      {"step": 4, "action": "专业面试和评估", "performed_by": "面试官", "output": "interview_evaluation"},
      {"step": 5, "action": "Offer谈判和入职", "performed_by": "猎头顾问", "output": "candidate_hired"}
    ]
  }',
  '{
    "communication_protocol": "每日招聘进度同步，候选人信息共享",
    "conflict_resolution": "用人部门需求和候选人期望平衡",
    "quality_standards": "招聘周期短，人选匹配度高，试用期通过率高"
  }',
  true,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 验证插入结果
-- ============================================

SELECT id, name, category, is_public, version 
FROM team_skills 
ORDER BY category, created_at DESC;

-- 查看所有分类的统计
SELECT category, COUNT(*) as count 
FROM team_skills 
GROUP BY category 
ORDER BY category;

-- ============================================
-- 迁移完成
-- ============================================

COMMENT ON SCHEMA public IS '热门 Agent 团队冷启动数据迁移 v1.0.0 已完成 - 共20个团队';

COMMIT;
