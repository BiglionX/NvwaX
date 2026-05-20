/**
 * 简单测试国内源搜索
 */

const API_BASE = 'http://localhost:3001/api';

async function testSearch() {
  console.log('Testing search for "ai agent"...\n');
  
  try {
    const response = await fetch(`${API_BASE}/nvwa-agent/search-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        description: 'ai agent',
        implementation: 'test'
      })
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Success:', data.success);
    console.log('Templates found:', data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      console.log('\nResults:');
      data.data.forEach((t, i) => {
        console.log(`  ${i + 1}. [${t.source}] ${t.name} - Score: ${t.matchScore}%`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSearch();
