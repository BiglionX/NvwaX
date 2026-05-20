/**
 * 测试国内源搜索功能
 * 
 * 测试 Gitee 和 ModelScope 搜索是否正常工作
 */

const API_BASE = 'http://localhost:3001/api';

async function testDomesticSourcesSearch() {
  console.log('🧪 Testing Domestic Sources Search (Gitee + ModelScope)...\n');
  
  const testQueries = [
    'ai agent',
    '客服智能体',
    '数据分析'
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Testing query: "${query}"`);
    console.log('─'.repeat(60));
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE}/agents/search?q=${encodeURIComponent(query)}&page=1&limit=10`);
      const data = await response.json();
      
      const elapsed = Date.now() - startTime;
      
      console.log(`   ⏱️  Search completed in ${elapsed}ms`);
      console.log(`   📊 Found ${data.total || 0} agents`);
      console.log(`   📍 From local: ${data.fromLocal ? 'Yes' : 'No'}`);
      
      if (data.data && data.data.length > 0) {
        console.log(`\n   🔍 Top results:`);
        data.data.slice(0, 5).forEach((agent, index) => {
          const sourceIcon = agent.source === 'gitee' ? '🇨🇳' : 
                           agent.source === 'modelscope' ? '🎯' : 
                           agent.source === 'github' ? '🐙' : '❓';
          
          console.log(`      ${index + 1}. ${sourceIcon} ${agent.name}`);
          console.log(`         Source: ${agent.source}`);
          console.log(`         Stars: ${agent.stars || 'N/A'}`);
          if (agent.author) {
            console.log(`         Author: ${agent.author}`);
          }
        });
        
        // 统计各源的数量
        const sourceStats = data.data.reduce((acc, agent) => {
          acc[agent.source] = (acc[agent.source] || 0) + 1;
          return acc;
        }, {});
        
        console.log(`\n   📈 Source distribution:`);
        Object.entries(sourceStats).forEach(([source, count]) => {
          const icon = source === 'gitee' ? '🇨🇳' : 
                      source === 'modelscope' ? '🎯' : 
                      source === 'github' ? '🐙' : '❓';
          console.log(`      ${icon} ${source}: ${count}`);
        });
      } else {
        console.log('   ⚠️  No results found');
      }
      
      // 性能评估
      if (elapsed < 3000) {
        console.log(`   ✅ Search is fast (< 3s)`);
      } else if (elapsed < 8000) {
        console.log(`   ⚠️  Search is moderate (3-8s)`);
      } else {
        console.log(`   ❌ Search is slow (> 8s)`);
      }
      
    } catch (error) {
      console.error(`   ❌ Search failed:`, error.message);
    }
  }
}

async function testNvwaAgentSearchAPI() {
  console.log('\n\n🧪 Testing Nvwa Agent Search API...\n');
  
  const testQuery = '客服智能体';
  
  console.log(`📝 Testing query: "${testQuery}"`);
  console.log('─'.repeat(60));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE}/nvwa-agent/search-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        description: testQuery,
        implementation: '调用现有 API'
      })
    });
    
    const data = await response.json();
    const elapsed = Date.now() - startTime;
    
    console.log(`   ⏱️  Search completed in ${elapsed}ms`);
    
    if (response.ok && data.success) {
      const templates = data.data || [];
      console.log(`   📊 Found ${templates.length} templates`);
      
      if (templates.length > 0) {
        console.log(`\n   🔍 Top results:`);
        templates.slice(0, 5).forEach((template, index) => {
          const sourceIcon = template.source === 'gitee' ? '🇨🇳' : 
                           template.source === 'modelscope' ? '🎯' : 
                           template.source === 'github' ? '🐙' : '❓';
          
          console.log(`      ${index + 1}. ${sourceIcon} ${template.name || template.title}`);
          console.log(`         Source: ${template.source}`);
          console.log(`         Match Score: ${template.matchScore || 'N/A'}%`);
          console.log(`         Rating: ${template.rating || 'N/A'}`);
        });
        
        // 统计各源的数量
        const sourceStats = templates.reduce((acc, t) => {
          acc[t.source] = (acc[t.source] || 0) + 1;
          return acc;
        }, {});
        
        console.log(`\n   📈 Source distribution:`);
        Object.entries(sourceStats).forEach(([source, count]) => {
          const icon = source === 'gitee' ? '🇨🇳' : 
                      source === 'modelscope' ? '🎯' : 
                      source === 'github' ? '🐙' : '❓';
          console.log(`      ${icon} ${source}: ${count}`);
        });
      }
    } else {
      console.log(`   ❌ API error:`, data.error);
    }
    
  } catch (error) {
    console.error(`   ❌ Request failed:`, error.message);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Domestic Sources Search Test');
  console.log('Testing Gitee and ModelScope integration');
  console.log('='.repeat(60));
  
  await testDomesticSourcesSearch();
  await testNvwaAgentSearchAPI();
  
  console.log('\n' + '='.repeat(60));
  console.log('Test completed!');
  console.log('='.repeat(60));
  console.log();
  console.log('✅ Features tested:');
  console.log('   1. Agent search with domestic sources (Gitee + ModelScope)');
  console.log('   2. Nvwa Agent template search API');
  console.log('   3. Multi-source parallel search performance');
  console.log();
  console.log('💡 Expected behavior:');
  console.log('   - Search should include results from GitHub, Gitee, and ModelScope');
  console.log('   - Response time should be < 8 seconds');
  console.log('   - Each source should have proper error handling');
  console.log();
}

main().catch(console.error);
