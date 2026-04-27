import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 获取数据库连接字符串
const databaseUrl = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_LXRhMSb4YDO8@ep-gentle-pond-anyn7yme-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function runMigration() {
  console.log('🚀 开始执行虚拟公司模板迁移...\n');
  
  const client = new Client({
    connectionString: databaseUrl
  });

  try {
    // 连接数据库
    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // 读取迁移脚本
    const migrationPath = join(__dirname, 'migrations', '004_virtual_company_templates.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('📋 执行迁移脚本...');
    
    // 直接执行三个 INSERT 语句
    const insertStatements = [
      // 智能营销策划公司
      `INSERT INTO team_skills (
        id, name, description, category, 
        leader_config, roles, workflow, binding_rules, 
        is_public, version
      )
      VALUES (
        'virtual-company-marketing-001',
        '智能营销策划公司',
        '专业的营销活动策划团队，从策略制定到内容生成全流程覆盖。适用于电商促销、品牌活动、内容营销等场景。',
        'virtual-company',
        '{"name": "策划总监", "responsibilities": ["需求分析", "策略制定", "质量把控", "进度管理"]}',
        '[
          {"role": "数据分析师", "specialty": "市场数据挖掘和用户洞察", "agent_type": "backend-agent", "responsibilities": ["历史数据分析", "目标人群画像", "竞品调研"]},
          {"role": "文案专员", "specialty": "营销文案和话术创作", "agent_type": "backend-agent", "responsibilities": ["广告文案", "社交媒体内容", "邮件营销"]},
          {"role": "设计专员", "specialty": "视觉设计和物料制作", "agent_type": "frontend-agent", "responsibilities": ["活动海报", "详情页设计", "品牌视觉"]}
        ]',
        '{
          "steps": [
            {"step": 1, "action": "需求分析和目标设定", "performed_by": "策划总监", "output": "brief"},
            {"step": 2, "action": "历史数据分析和市场洞察", "performed_by": "数据分析师", "output": "insights"},
            {"step": 3, "action": "营销策略制定", "performed_by": "策划总监", "output": "strategy"},
            {"step": 4, "action": "营销文案生成", "performed_by": "文案专员", "output": "copywriting"},
            {"step": 5, "action": "视觉设计", "performed_by": "设计专员", "output": "visual_assets"},
            {"step": 6, "action": "最终审核和优化", "performed_by": "策划总监", "output": "final_campaign"}
          ]
        }',
        '{
          "communication_protocol": "每个环节完成后提交策划总监审核",
          "conflict_resolution": "由策划总监决定最终方案",
          "quality_standards": "符合品牌调性，数据驱动决策"
        }',
        true,
        '1.0.0'
      ) ON CONFLICT (id) DO NOTHING`,
      
      // 虚拟开发团队
      `INSERT INTO team_skills (
        id, name, description, category, 
        leader_config, roles, workflow, binding_rules, 
        is_public, version
      )
      VALUES (
        'virtual-company-dev-001',
        '虚拟开发团队',
        '全栈软件开发团队，从需求到部署一站式服务。适用于小程序开发、网站搭建、API开发等场景。',
        'virtual-company',
        '{"name": "技术负责人", "responsibilities": ["技术选型", "架构设计", "代码审查", "进度管理"]}',
        '[
          {"role": "产品经理", "specialty": "需求分析和产品设计", "agent_type": "backend-agent", "responsibilities": ["需求梳理", "原型设计", "用户故事"]},
          {"role": "后端开发", "specialty": "API开发和业务逻辑", "agent_type": "backend-agent", "responsibilities": ["数据库设计", "API开发", "性能优化"]},
          {"role": "前端开发", "specialty": "界面开发和用户体验", "agent_type": "frontend-agent", "responsibilities": ["UI组件", "交互逻辑", "响应式设计"]},
          {"role": "测试工程师", "specialty": "质量保证和测试", "agent_type": "test-agent", "responsibilities": ["单元测试", "集成测试", "Bug修复"]}
        ]',
        '{
          "steps": [
            {"step": 1, "action": "需求分析和系统设计", "performed_by": "产品经理", "output": "requirements"},
            {"step": 2, "action": "技术架构设计", "performed_by": "技术负责人", "output": "architecture"},
            {"step": 3, "action": "数据库设计", "performed_by": "后端开发", "output": "db_schema"},
            {"step": 4, "action": "API接口开发", "performed_by": "后端开发", "output": "api_code"},
            {"step": 5, "action": "前端界面开发", "performed_by": "前端开发", "output": "ui_code"},
            {"step": 6, "action": "集成测试", "performed_by": "测试工程师", "output": "test_report"},
            {"step": 7, "action": "部署和文档", "performed_by": "技术负责人", "output": "deployment_guide"}
          ]
        }',
        '{
          "communication_protocol": "每日站会同步进度，代码提交前需审查",
          "conflict_resolution": "由技术负责人最终决策",
          "quality_standards": "代码覆盖率>80%，API符合RESTful规范"
        }',
        true,
        '1.0.0'
      ) ON CONFLICT (id) DO NOTHING`,
      
      // 定制设计工作室
      `INSERT INTO team_skills (
        id, name, description, category, 
        leader_config, roles, workflow, binding_rules, 
        is_public, version
      )
      VALUES (
        'virtual-company-design-001',
        '定制设计工作室',
        '专业的设计团队，提供品牌视觉、UI/UX、3D建模等服务。适用于Logo设计、包装设计、UI设计等场景。',
        'virtual-company',
        '{"name": "创意总监", "responsibilities": ["创意方向", "风格把控", "客户沟通", "质量审核"]}',
        '[
          {"role": "平面设计师", "specialty": "品牌视觉和平面设计", "agent_type": "frontend-agent", "responsibilities": ["Logo设计", "海报设计", "包装设计"]},
          {"role": "UI/UX设计师", "specialty": "界面设计和用户体验", "agent_type": "frontend-agent", "responsibilities": ["APP界面", "网页设计", "交互原型"]},
          {"role": "3D建模师", "specialty": "三维建模和渲染", "agent_type": "frontend-agent", "responsibilities": ["产品建模", "场景渲染", "动画制作"]}
        ]',
        '{
          "steps": [
            {"step": 1, "action": "需求沟通和创意构思", "performed_by": "创意总监", "output": "creative_brief"},
            {"step": 2, "action": "市场调研和灵感收集", "performed_by": "平面设计师", "output": "mood_board"},
            {"step": 3, "action": "初稿设计", "performed_by": "平面设计师", "output": "draft_design"},
            {"step": 4, "action": "UI界面设计", "performed_by": "UI/UX设计师", "output": "ui_mockup"},
            {"step": 5, "action": "3D建模和渲染", "performed_by": "3D建模师", "output": "3d_models"},
            {"step": 6, "action": "整合和优化", "performed_by": "创意总监", "output": "final_design"},
            {"step": 7, "action": "交付和反馈", "performed_by": "创意总监", "output": "delivery_package"}
          ]
        }',
        '{
          "communication_protocol": "每个设计阶段需客户确认后再进入下一阶段",
          "conflict_resolution": "由创意总监协调不同设计风格",
          "quality_standards": "符合品牌规范，输出高清源文件"
        }',
        true,
        '1.0.0'
      ) ON CONFLICT (id) DO NOTHING`
    ];

    let executedCount = 0;
    const companyNames = ['智能营销策划公司', '虚拟开发团队', '定制设计工作室'];
    
    for (let i = 0; i < insertStatements.length; i++) {
      try {
        await client.query(insertStatements[i]);
        executedCount++;
        console.log(`  ✅ 插入: ${companyNames[i]}`);
      } catch (error) {
        if (error.message.includes('duplicate key')) {
          console.log(`  ⚠️  ${companyNames[i]} 已存在，跳过`);
        } else {
          console.error(`  ❌ ${companyNames[i]} 执行失败:`, error.message);
          throw error;
        }
      }
    }

    console.log(`\n✅ 成功执行 ${executedCount} 条 INSERT 语句\n`);

    // 验证数据
    console.log('📊 验证插入结果...\n');
    const result = await client.query(`
      SELECT id, name, category, is_public, version,
             jsonb_array_length(roles) as role_count,
             jsonb_array_length(workflow->'steps') as workflow_steps
      FROM team_skills 
      WHERE category = 'virtual-company'
      ORDER BY created_at DESC
    `);

    console.log(`找到 ${result.rows.length} 个虚拟公司:\n`);
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.name}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   角色数: ${row.role_count}`);
      console.log(`   工作流步骤: ${row.workflow_steps}`);
      console.log(`   公开: ${row.is_public ? '是' : '否'}`);
      console.log(`   版本: ${row.version}`);
      console.log();
    });

    console.log('✅ 迁移完成！\n');
    console.log('💡 下一步:');
    console.log('   1. 启动后端服务: npm run dev');
    console.log('   2. 启动前端服务: cd ../nvwax-web && npm run dev');
    console.log('   3. 访问: http://localhost:3000/marketplace?category=virtual-company\n');

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    if (error.detail) {
      console.error('详情:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
