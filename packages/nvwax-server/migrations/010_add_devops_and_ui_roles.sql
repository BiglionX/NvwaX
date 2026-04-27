-- ============================================
-- 全栈开发团队优化 v1.2.0
-- 添加 DevOps 工程师和 UI/UX 设计师角色
-- 从 5 个角色扩展到 7 个角色
-- ============================================

UPDATE team_skills 
SET 
  roles = '[
    {"role": "前端开发专家", "specialty": "React/Vue 前端开发", "agent_type": "frontend-agent", "responsibilities": ["组件开发", "状态管理", "性能优化", "响应式设计"]},
    {"role": "后端开发专家", "specialty": "Node.js/Python 后端开发", "agent_type": "backend-agent", "responsibilities": ["API设计", "业务逻辑", "数据库优化", "安全加固"]},
    {"role": "数据库工程师", "specialty": "数据库设计和优化", "agent_type": "database-agent", "responsibilities": ["表结构设计", "索引优化", "数据迁移", "备份策略"]},
    {"role": "测试工程师", "specialty": "自动化测试和质量保证", "agent_type": "testing-agent", "responsibilities": ["单元测试", "集成测试", "E2E测试", "性能测试", "Bug追踪"]},
    {"role": "DevOps工程师", "specialty": "CI/CD、容器化和云基础设施", "agent_type": "devops-agent", "responsibilities": ["CI/CD流水线", "Docker容器化", "Kubernetes部署", "监控告警", "安全审计"]},
    {"role": "UI/UX设计师", "specialty": "界面设计和用户体验", "agent_type": "ui-designer-agent", "responsibilities": ["界面原型设计", "视觉设计规范", "用户体验优化", "交互流程设计"]}
  ]',
  workflow = '{
    "steps": [
      {"step": 1, "action": "需求分析和产品规划", "performed_by": "产品经理", "output": "product_requirements"},
      {"step": 2, "action": "技术方案和架构设计", "performed_by": "产品经理", "output": "tech_design"},
      {"step": 3, "action": "UI/UX界面设计", "performed_by": "UI/UX设计师", "output": "ui_mockup"},
      {"step": 4, "action": "数据库设计和API接口定义", "performed_by": "数据库工程师", "output": "db_schema"},
      {"step": 5, "action": "后端核心功能开发", "performed_by": "后端开发专家", "output": "backend_code"},
      {"step": 6, "action": "前端界面开发", "performed_by": "前端开发专家", "output": "frontend_code"},
      {"step": 7, "action": "前后端集成和联调", "performed_by": "前端开发专家", "output": "integrated_app"},
      {"step": 8, "action": "编写测试用例", "performed_by": "测试工程师", "output": "test_cases"},
      {"step": 9, "action": "执行自动化测试", "performed_by": "测试工程师", "output": "test_results"},
      {"step": 10, "action": "修复Bug和优化", "performed_by": "后端开发专家", "output": "fixed_code"},
      {"step": 11, "action": "性能测试和安全审计", "performed_by": "测试工程师", "output": "performance_report"},
      {"step": 12, "action": "CI/CD流水线配置", "performed_by": "DevOps工程师", "output": "cicd_config"},
      {"step": 13, "action": "容器化打包", "performed_by": "DevOps工程师", "output": "docker_image"},
      {"step": 14, "action": "部署到生产环境", "performed_by": "DevOps工程师", "output": "deployed_app"},
      {"step": 15, "action": "监控配置和文档编写", "performed_by": "产品经理", "output": "deployment_guide"}
    ]
  }',
  binding_rules = '{
    "communication_protocol": "使用 Git Flow 工作流，每日站会同步进度",
    "conflict_resolution": "技术争议由产品经理组织讨论后决策",
    "quality_standards": "代码覆盖率>90%，ESLint检查通过，所有测试用例通过，API文档完整，CI/CD流水线绿色"
  }',
  version = '1.2.0',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'team-skill-dev-001';

-- 更新描述以反映新的团队结构
UPDATE team_skills 
SET description = '专业的全栈开发团队，包含产品经理、UI/UX设计师、前端/后端开发、数据库专家、测试工程师和DevOps工程师。适用于Web应用开发、SaaS平台建设、企业内部系统等场景，提供从设计到部署的端到端解决方案，确保高质量交付。'
WHERE id = 'team-skill-dev-001';
