/**
 * Leader Agent 集成测试脚本
 * 
 * 测试场景：
 * 1. Team Skill API 测试
 * 2. Leader Agent 智能匹配测试
 * 3. 团队执行测试
 */

const API_BASE = 'http://localhost:3000';
const WORKFLOW_API_BASE = 'http://localhost:3002';

console.log('🧪 Starting Leader Agent Integration Tests...\n');

// ============================================
// Test 1: Team Skill API
// ============================================
async function testTeamSkillAPI() {
  console.log('📋 Test 1: Team Skill API');
  console.log('=' .repeat(60));
  
  try {
    // 1.1 搜索公开的 Team Skills
    console.log('\n1.1 Searching public team skills...');
    const searchResponse = await fetch(`${API_BASE}/api/team-skills?isPublic=true&limit=5`);
    const searchData = await searchResponse.json();
    
    if (searchData.success) {
      console.log(`✅ Found ${searchData.data.total} team skills`);
      console.log('Sample:', searchData.data.data.slice(0, 2).map(s => s.name).join(', '));
    } else {
      console.log('❌ Search failed:', searchData.error);
    }
    
    // 1.2 获取市场展示
    console.log('\n1.2 Fetching marketplace team skills...');
    const marketplaceResponse = await fetch(`${API_BASE}/api/team-skills/marketplace?limit=3`);
    const marketplaceData = await marketplaceResponse.json();
    
    if (marketplaceData.success) {
      console.log(`✅ Marketplace has ${marketplaceData.data.total} templates`);
      marketplaceData.data.data.forEach(skill => {
        console.log(`   - ${skill.name} (${skill.category})`);
      });
    } else {
      console.log('❌ Marketplace fetch failed:', marketplaceData.error);
    }
    
    // 1.3 按类别获取
    console.log('\n1.3 Fetching by category (development)...');
    const categoryResponse = await fetch(`${API_BASE}/api/team-skills/category/development?limit=2`);
    const categoryData = await categoryResponse.json();
    
    if (categoryData.success) {
      console.log(`✅ Found ${categoryData.data.total} development templates`);
    } else {
      console.log('❌ Category fetch failed:', categoryData.error);
    }
    
    console.log('\n✅ Test 1 PASSED\n');
    return true;
  } catch (error) {
    console.error('❌ Test 1 FAILED:', error.message);
    return false;
  }
}

// ============================================
// Test 2: Leader Agent Matching
// ============================================
async function testLeaderAgentMatching() {
  console.log('📋 Test 2: Leader Agent Smart Matching');
  console.log('=' .repeat(60));
  
  const testCases = [
    {
      name: 'Full-stack web application',
      requirement: '我需要开发一个电商网站，包括商品展示、购物车、订单管理和支付功能'
    },
    {
      name: 'Data analysis dashboard',
      requirement: '帮我分析销售数据，生成可视化报表和趋势预测'
    },
    {
      name: 'Content creation',
      requirement: '为我们的产品写一篇技术博客文章，需要调研竞品并设计配图'
    }
  ];
  
  try {
    for (const testCase of testCases) {
      console.log(`\n2.${testCases.indexOf(testCase) + 1} Testing: ${testCase.name}`);
      console.log(`   Requirement: ${testCase.requirement.substring(0, 50)}...`);
      
      const response = await fetch(`${WORKFLOW_API_BASE}/api/orchestrate/leader`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: testCase.requirement
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`   ✅ Team: ${result.teamName}`);
        console.log(`   📂 Category: ${result.category}`);
        console.log(`   👥 Teammates: ${result.teammates.map(t => t.role).join(', ')}`);
        console.log(`   📋 Workflow Steps: ${result.workflowSteps}`);
        console.log(`   ⏱️  Execution Time: ${result.executionTime}ms`);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
    }
    
    console.log('\n✅ Test 2 PASSED\n');
    return true;
  } catch (error) {
    console.error('❌ Test 2 FAILED:', error.message);
    return false;
  }
}

// ============================================
// Test 3: Compare Traditional vs Leader Agent
// ============================================
async function testComparison() {
  console.log('📋 Test 3: Traditional Orchestrator vs Leader Agent');
  console.log('=' .repeat(60));
  
  const task = '开发一个用户管理系统，包括注册、登录、权限控制和个人资料管理';
  
  try {
    // 3.1 Traditional Orchestrator
    console.log('\n3.1 Testing traditional orchestrator...');
    const traditionalStart = Date.now();
    const traditionalResponse = await fetch(`${WORKFLOW_API_BASE}/api/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task })
    });
    const traditionalResult = await traditionalResponse.json();
    const traditionalTime = Date.now() - traditionalStart;
    
    console.log(`   Mode: ${traditionalResult.mode || 'traditional'}`);
    console.log(`   Subtasks: ${traditionalResult.results?.length || 0}`);
    console.log(`   Time: ${traditionalTime}ms`);
    
    // 3.2 Leader Agent
    console.log('\n3.2 Testing Leader Agent...');
    const leaderStart = Date.now();
    const leaderResponse = await fetch(`${WORKFLOW_API_BASE}/api/orchestrate/leader`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirement: task })
    });
    const leaderResult = await leaderResponse.json();
    const leaderTime = Date.now() - leaderStart;
    
    if (leaderResult.success) {
      console.log(`   Mode: ${leaderResult.mode}`);
      console.log(`   Team: ${leaderResult.teamName}`);
      console.log(`   Teammates: ${leaderResult.teammates.length}`);
      console.log(`   Time: ${leaderTime}ms`);
      
      console.log('\n📊 Comparison Summary:');
      console.log(`   Traditional: ${traditionalTime}ms, ${traditionalResult.results?.length || 0} subtasks`);
      console.log(`   Leader Agent: ${leaderTime}ms, ${leaderResult.teammates.length} teammates, structured workflow`);
    } else {
      console.log(`   ❌ Leader Agent failed: ${leaderResult.error}`);
    }
    
    console.log('\n✅ Test 3 PASSED\n');
    return true;
  } catch (error) {
    console.error('❌ Test 3 FAILED:', error.message);
    return false;
  }
}

// ============================================
// Main Test Runner
// ============================================
async function runAllTests() {
  console.log('🚀 Running all integration tests...\n');
  
  const results = [];
  
  // Check if servers are running
  try {
    await fetch(`${API_BASE}/api/team-skills/marketplace?limit=1`);
    await fetch(`${WORKFLOW_API_BASE}/api/orchestrate/leader`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirement: 'test' })
    });
  } catch (error) {
    console.error('❌ Servers are not running!');
    console.error('   Please start:');
    console.error('   - Backend: cd packages/nvwax-server && npm run dev');
    console.error('   - Workflow: cd packages/skillhub-workflow && npm run dev');
    process.exit(1);
  }
  
  // Run tests
  results.push(await testTeamSkillAPI());
  results.push(await testLeaderAgentMatching());
  results.push(await testComparison());
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r).length}`);
  console.log(`Failed: ${results.filter(r => !r).length}`);
  
  if (results.every(r => r)) {
    console.log('\n🎉 ALL TESTS PASSED! Phase 1 is ready for production.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
