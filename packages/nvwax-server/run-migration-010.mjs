import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  try {
    console.log('🚀 开始执行迁移 010: 添加 DevOps 和 UI/UX 角色...\n');
    
    // 读取 SQL 文件
    const sqlPath = path.join(__dirname, 'migrations', '010_add_devops_and_ui_roles.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // 执行迁移
    await pool.query(sql);
    
    console.log('✅ 迁移执行成功!\n');
    
    // 验证更新结果
    const result = await pool.query(
      'SELECT id, name, version, jsonb_array_length(roles) as role_count FROM team_skills WHERE id = $1',
      ['team-skill-dev-001']
    );
    
    console.log('📊 团队配置信息:');
    console.log(`  ID: ${result.rows[0].id}`);
    console.log(`  名称: ${result.rows[0].name}`);
    console.log(`  版本: ${result.rows[0].version}`);
    console.log(`  角色数量: ${result.rows[0].role_count}\n`);
    
    const rolesResult = await pool.query(
      'SELECT roles FROM team_skills WHERE id = $1',
      ['team-skill-dev-001']
    );
    
    console.log('👥 完整角色列表:');
    console.log(`  Leader: 产品经理 (product-manager-agent)\n`);
    rolesResult.rows[0].roles.forEach((role, index) => {
      console.log(`  ${index + 1}. ${role.role} (${role.agent_type})`);
      console.log(`     专长: ${role.specialty}`);
      console.log(`     职责: ${role.responsibilities.join(', ')}`);
      console.log();
    });
    
    const workflowResult = await pool.query(
      'SELECT workflow FROM team_skills WHERE id = $1',
      ['team-skill-dev-001']
    );
    
    console.log('📋 工作流程步骤:');
    workflowResult.rows[0].workflow.steps.forEach(step => {
      console.log(`  Step ${step.step}: ${step.action} (${step.performed_by})`);
    });
    
    console.log('\n✨ 优化完成!请访问以下地址查看:');
    console.log('  http://localhost:3000/marketplace/team-skills/team-skill-dev-001\n');
    
    await pool.end();
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
})();
