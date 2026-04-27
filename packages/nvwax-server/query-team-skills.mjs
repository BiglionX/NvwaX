import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:123456@localhost:5432/nvwax'
});

(async () => {
  try {
    const result = await pool.query('SELECT id, name, category FROM team_skills ORDER BY category');
    
    console.log('\n📊 分类统计:');
    const stats = {};
    result.rows.forEach(r => {
      stats[r.category] = (stats[r.category] || 0) + 1;
    });
    console.log(JSON.stringify(stats, null, 2));
    
    console.log('\n📋 所有团队技能:');
    result.rows.forEach(r => {
      const icon = r.category === 'virtual-company' ? '🏢' : '👥';
      console.log(`${icon} ${r.name} (${r.category})`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
})();
