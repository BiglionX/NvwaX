import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  console.log('\n🚀 开始执行团队技能分类示例数据迁移...\n');
  
  try {
    // 插入全栈开发团队
    await pool.query(`
      INSERT INTO team_skills (
        id, name, description, category, 
        leader_config, roles, workflow, binding_rules, 
        is_public, version
      )
      VALUES (
        'team-skill-dev-001',
        '全栈开发团队',
        '专业的全栈开发团队，精通 React、Node.js、数据库设计等技术栈。适用于Web应用开发、SaaS平台建设、企业内部系统等场景。',
        'development',
        '{"name": "技术总监", "responsibilities": ["技术架构设计", "技术选型", "代码质量把控", "团队协调"]}',
        '[
          {"role": "前端开发专家", "specialty": "React/Vue 前端开发", "agent_type": "frontend-agent", "responsibilities": ["组件开发", "状态管理", "性能优化", "响应式设计"]},
          {"role": "后端开发专家", "specialty": "Node.js/Python 后端开发", "agent_type": "backend-agent", "responsibilities": ["API设计", "业务逻辑", "数据库优化", "安全加固"]},
          {"role": "数据库工程师", "specialty": "数据库设计和优化", "agent_type": "backend-agent", "responsibilities": ["表结构设计", "索引优化", "数据迁移", "备份策略"]}
        ]',
        '{
          "steps": [
            {"step": 1, "action": "需求分析和技术方案设计", "performed_by": "技术总监", "output": "tech_design"},
            {"step": 2, "action": "数据库设计和API接口定义", "performed_by": "数据库工程师", "output": "db_schema"},
            {"step": 3, "action": "后端核心功能开发", "performed_by": "后端开发专家", "output": "backend_code"},
            {"step": 4, "action": "前端界面开发", "performed_by": "前端开发专家", "output": "frontend_code"},
            {"step": 5, "action": "前后端集成和联调", "performed_by": "前端开发专家", "output": "integrated_app"},
            {"step": 6, "action": "性能优化和代码审查", "performed_by": "技术总监", "output": "optimized_code"},
            {"step": 7, "action": "部署和文档编写", "performed_by": "技术总监", "output": "deployment_guide"}
          ]
        }',
        '{
          "communication_protocol": "使用 Git Flow 工作流，每日代码审查",
          "conflict_resolution": "技术争议由技术总监最终决策",
          "quality_standards": "代码覆盖率>85%，ESLint检查通过，API文档完整"
        }',
        true,
        '1.0.0'
      ) ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ 插入: 全栈开发团队 (development)');

    // 插入数据分析团队
    await pool.query(`
      INSERT INTO team_skills (
        id, name, description, category, 
        leader_config, roles, workflow, binding_rules, 
        is_public, version
      )
      VALUES (
        'team-skill-analysis-001',
        '数据分析团队',
        '专业的数据分析团队，擅长数据挖掘、商业智能、可视化报表。适用于市场调研、用户行为分析、业务决策支持等场景。',
        'analysis',
        '{"name": "数据分析总监", "responsibilities": ["分析框架设计", "业务洞察", "报告审核", "客户沟通"]}',
        '[
          {"role": "数据工程师", "specialty": "数据采集和清洗", "agent_type": "backend-agent", "responsibilities": ["数据抓取", "ETL流程", "数据仓库建设", "数据质量监控"]},
          {"role": "数据分析师", "specialty": "统计分析和建模", "agent_type": "backend-agent", "responsibilities": ["数据探索", "统计分析", "预测建模", "A/B测试"]},
          {"role": "可视化专家", "specialty": "数据可视化和报表", "agent_type": "frontend-agent", "responsibilities": ["Dashboard设计", "交互式图表", "自动化报表", "数据故事"]}
        ]',
        '{
          "steps": [
            {"step": 1, "action": "业务需求沟通和指标定义", "performed_by": "数据分析总监", "output": "analysis_brief"},
            {"step": 2, "action": "数据源评估和采集", "performed_by": "数据工程师", "output": "raw_data"},
            {"step": 3, "action": "数据清洗和预处理", "performed_by": "数据工程师", "output": "clean_data"},
            {"step": 4, "action": "探索性数据分析和建模", "performed_by": "数据分析师", "output": "analysis_results"},
            {"step": 5, "action": "可视化设计和报表制作", "performed_by": "可视化专家", "output": "dashboard"},
            {"step": 6, "action": "业务洞察和建议", "performed_by": "数据分析总监", "output": "insights_report"},
            {"step": 7, "action": "汇报和反馈收集", "performed_by": "数据分析总监", "output": "final_presentation"}
          ]
        }',
        '{
          "communication_protocol": "每周分析进度同步，关键发现即时汇报",
          "conflict_resolution": "数据解读分歧通过额外验证实验解决",
          "quality_standards": "数据准确率>99%，分析方法可复现，结论有数据支撑"
        }',
        true,
        '1.0.0'
      ) ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ 插入: 数据分析团队 (analysis)');

    // 插入内容创作团队
    await pool.query(`
      INSERT INTO team_skills (
        id, name, description, category, 
        leader_config, roles, workflow, binding_rules, 
        is_public, version
      )
      VALUES (
        'team-skill-content-001',
        '内容创作团队',
        '专业的内容创作团队，涵盖文案策划、视频制作、社交媒体运营。适用于品牌内容营销、自媒体运营、产品推广等场景。',
        'content',
        '{"name": "内容总监", "responsibilities": ["内容策略", "品牌调性把控", "质量审核", "数据分析"]}',
        '[
          {"role": "文案策划师", "specialty": "创意文案和故事创作", "agent_type": "backend-agent", "responsibilities": ["品牌文案", "产品描述", "故事脚本", "SEO优化"]},
          {"role": "视频制作师", "specialty": "视频拍摄和后期制作", "agent_type": "frontend-agent", "responsibilities": ["视频脚本", "拍摄剪辑", "特效制作", "音频处理"]},
          {"role": "社交媒体运营师", "specialty": "平台运营和粉丝互动", "agent_type": "backend-agent", "responsibilities": ["内容排期", "社群管理", "数据分析", "活动策划"]}
        ]',
        '{
          "steps": [
            {"step": 1, "action": "内容策略和选题规划", "performed_by": "内容总监", "output": "content_strategy"},
            {"step": 2, "action": "文案创作和脚本编写", "performed_by": "文案策划师", "output": "copywriting"},
            {"step": 3, "action": "视频拍摄和制作", "performed_by": "视频制作师", "output": "video_content"},
            {"step": 4, "action": "内容审核和优化", "performed_by": "内容总监", "output": "reviewed_content"},
            {"step": 5, "action": "多平台发布和推广", "performed_by": "社交媒体运营师", "output": "published_content"},
            {"step": 6, "action": "数据监控和效果分析", "performed_by": "社交媒体运营师", "output": "performance_report"},
            {"step": 7, "action": "策略调整和优化", "performed_by": "内容总监", "output": "optimization_plan"}
          ]
        }',
        '{
          "communication_protocol": "每日内容排期同步，重要内容需总监审核",
          "conflict_resolution": "创意分歧通过A/B测试数据决策",
          "quality_standards": "内容原创度>90%，符合平台规范，数据驱动优化"
        }',
        true,
        '1.0.0'
      ) ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ 插入: 内容创作团队 (content)');

    // 验证结果
    console.log('\n📊 验证插入结果:\n');
    const result = await pool.query(`
      SELECT id, name, category, is_public, version 
      FROM team_skills 
      WHERE category IN ('development', 'analysis', 'content')
      ORDER BY category
    `);
    
    result.rows.forEach(row => {
      const icons = {
        'development': '💻',
        'analysis': '📊',
        'content': '✍️'
      };
      console.log(`${icons[row.category] || '👥'} ${row.name} (${row.category}) - v${row.version}`);
    });

    // 统计所有分类
    console.log('\n📈 分类统计:');
    const statsResult = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM team_skills 
      GROUP BY category 
      ORDER BY category
    `);
    
    statsResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} 个`);
    });

    console.log('\n✅ 迁移完成！\n');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await pool.end();
  }
})();
