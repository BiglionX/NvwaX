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
      'SELECT id, name, version, jsonb_array_length(roles) as role_count, leader_config FROM team_skills ORDER BY created_at'
    );
    
    console.log('📊 所有团队技能列表:\n');
    
    if (result.rows.length === 0) {
      console.log('⚠️ 数据库中没有团队技能记录');
    } else {
      result.rows.forEach(row => {
        let leader = null;
        try {
          leader = row.leader_config ? (typeof row.leader_config === 'string' ? JSON.parse(row.leader_config) : row.leader_config) : null;
        } catch (e) {
          console.log(`解析 ${row.id} 的 leader_config 失败:`, e.message);
        }
        const totalRoles = row.role_count + (leader ? 1 : 0);
        
        console.log(`ID: ${row.id}`);
        console.log(`名称: ${row.name}`);
        console.log(`版本: ${row.version}`);
        console.log(`Roles数组: ${row.role_count} 个`);
        console.log(`Leader: ${leader ? leader.name : '无'}`);
        console.log(`总计: ${totalRoles} 个角色`);
        console.log('---\n');
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
