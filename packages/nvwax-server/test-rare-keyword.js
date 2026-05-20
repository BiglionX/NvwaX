/**
 * 测试国内源搜索 - 使用罕见关键词触发在线搜索
 */

const API_BASE = 'http://localhost:3001/api';

async function testRareKeyword() {
  console.log('Testing search with rare keyword to trigger online search...\n');
  
  // 使用一个不太可能存在于本地数据库的关键词
  const rareKeyword = 'quantum-computing-agent-xyz-2026';
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE}/nvwa-agent/search-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        description: rareKeyword,
        implementation: 'test'
      })
    });
    
    const elapsed = Date.now() - startTime;
    const data = await response.json();
    
    console.log(`Response time: ${elapsed}ms`);
    console.log('Status:', response.status);
    console.log('Success:', data.success);
    console.log('Templates found:', data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      console.log('\nResults by source:');
      const sourceStats = {};
      data.data.forEach(t => {
        sourceStats[t.source] = (sourceStats[t.source] || 0) + 1;
      });
      
      Object.entries(sourceStats).forEach(([source, count]) => {
        const icon = source === 'gitee' ? '🇨🇳' : 
                    source === 'modelscope' ? '🎯' : 
                    source === 'github' ? '🐙' : '❓';
        console.log(`  ${icon} ${source}: ${count}`);
      });
      
      console.log('\nTop 5 results:');
      data.data.slice(0, 5).forEach((t, i) => {
        const icon = t.source === 'gitee' ? '🇨🇳' : 
                    t.source === 'modelscope' ? '🎯' : 
                    t.source === 'github' ? '🐙' : '❓';
        console.log(`  ${i + 1}. ${icon} [${t.source}] ${t.name} - Score: ${t.matchScore}%`);
      });
    } else {
      console.log('\nNo results found (this is expected for very rare keywords)');
    }
    
    // 性能评估
    if (elapsed < 8000) {
      console.log(`\n✅ Performance OK (< 8s)`);
    } else {
      console.log(`\n⚠️  Performance slow (> 8s)`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRareKeyword();
