import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  console.log('\n🚀 开始优化全栈开发团队配置...\n');
  
  try {
    // 读取 SQL 文件
    const sqlPath = join(__dirname, 'migrations', '009_optimize_fullstack_team.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // 执行迁移
    await pool.query(sql);
    
    console.log('✅ 全栈开发团队优化完成!\n');
    console.log('主要改进:');
    console.log('  1. 技术总监 → 产品经理 (product-manager-agent)');
    console.log('  2. 新增测试工程师角色 (testing-agent)');
    console.log('  3. 工作流程从 7 步扩展到 11 步');
    console.log('  4. 质量标准提升到 90% 代码覆盖率\n');
    
    // 验证更新
    const result = await pool.query(
      `SELECT id, name, version, 
              jsonb_array_length(roles) as role_count,
              jsonb_array_length(workflow->'steps') as step_count
       FROM team_skills 
       WHERE id = 'team-skill-dev-001'`
    );
    
    if (result.rows[0]) {
      const team = result.rows[0];
      console.log('当前配置:');
      console.log(`  ID: ${team.id}`);
      console.log(`  名称: ${team.name}`);
      console.log(`  版本: ${team.version}`);
      console.log(`  角色数量: ${team.role_count}`);
      console.log(`  工作流步骤: ${team.step_count}\n`);
      
      // 显示角色列表
      const rolesResult = await pool.query(
        `SELECT roles FROM team_skills WHERE id = 'team-skill-dev-001'`
      );
      const roles = rolesResult.rows[0].roles;
      console.log('团队成员:');
      roles.forEach((role, index) => {
        console.log(`  ${index + 1}. ${role.role} (${role.specialty})`);
        console.log(`     Agent: ${role.agent_type}`);
        console.log(`     职责: ${role.responsibilities.join(', ')}`);
      });
    }
    
    console.log('\n✨ 优化完成!请访问 http://localhost:3000/marketplace/team-skills/team-skill-dev-001 查看\n');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
