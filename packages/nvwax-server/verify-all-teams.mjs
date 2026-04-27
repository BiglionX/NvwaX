import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  try {
    const ids = [
      'virtual-company-marketing-001',
      'virtual-company-dev-001', 
      'virtual-company-design-001',
      'team-skill-analysis-001',
      'team-skill-content-001'
    ];

    console.log('🔍 验证所有团队的角色计数:\n');
    
    for (const id of ids) {
      const result = await pool.query(
        'SELECT id, name, jsonb_array_length(roles) as role_count, leader_config FROM team_skills WHERE id = $1',
        [id]
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        let leader = null;
        try {
          leader = row.leader_config ? (typeof row.leader_config === 'string' ? JSON.parse(row.leader_config) : row.leader_config) : null;
        } catch(e) {}
        
        const total = row.role_count + (leader ? 1 : 0);
        console.log(`✅ ${row.name}`);
        console.log(`   Roles数组: ${row.role_count} 个`);
        console.log(`   Leader: ${leader ? leader.name : '无'}`);
        console.log(`   页面应显示: ${total} 个角色 (含领导者)\n`);
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
