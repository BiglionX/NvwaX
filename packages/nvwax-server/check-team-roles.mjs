import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  try {
    const result = await pool.query(
      'SELECT id, name, version, jsonb_array_length(roles) as role_count FROM team_skills WHERE id = $1',
      ['team-skill-dev-001']
    );
    
    console.log('📊 Team Info:');
    console.log(`  ID: ${result.rows[0].id}`);
    console.log(`  Name: ${result.rows[0].name}`);
    console.log(`  Version: ${result.rows[0].version}`);
    console.log(`  Role Count: ${result.rows[0].role_count}`);
    
    const rolesResult = await pool.query(
      'SELECT roles FROM team_skills WHERE id = $1',
      ['team-skill-dev-001']
    );
    
    console.log('\n👥 Current Roles:');
    rolesResult.rows[0].roles.forEach((role, index) => {
      console.log(`  ${index + 1}. ${role.role} (${role.agent_type})`);
    });
    
    console.log('\n💡 Expected 8 roles:');
    console.log('  1. 产品经理 (product-manager-agent)');
    console.log('  2. UI/UX设计师 (ui-designer-agent)');
    console.log('  3. 前端开发专家 (frontend-agent)');
    console.log('  4. 后端开发专家 (backend-agent)');
    console.log('  5. 数据库工程师 (database-agent)');
    console.log('  6. 测试工程师 (testing-agent)');
    console.log('  7. DevOps工程师 (devops-agent)');
    console.log('  8. ??? (需要添加第8个角色)');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
