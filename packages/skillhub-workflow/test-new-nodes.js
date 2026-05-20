/**
 * 测试 Reviewer 和 Parallel Search 节点
 */

const API_BASE = 'http://localhost:3002/api';

async function testReviewerNode() {
  console.log('\n🧪 Testing Reviewer Node...\n');
  
  // 创建工作流
  const workflow = {
    name: 'Test Reviewer Workflow',
    description: 'Test the reviewer node',
    nodes: [
      {
        id: 'review_team',
        type: 'reviewer',
        params: {
          reviewType: 'team_design',
          dataToReview: {
            roles: [
              { roleName: '产品经理', responsibilities: ['需求分析'] },
              { roleName: '前端开发', responsibilities: ['UI开发'] },
              { roleName: '后端开发', responsibilities: ['API开发'] }
            ],
            collaborationFlow: '产品 → 前端 → 后端'
          },
          qualityCriteria: {
            minRoles: 3,
            maxRoles: 5
          }
        }
      }
    ],
    edges: []
  };
  
  try {
    // 创建工作流
    console.log('Creating workflow...');
    const createResponse = await fetch(`${API_BASE}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow)
    });
    
    const createData = await createResponse.json();
    console.log('✅ Workflow created:', createData.id);
    
    // 执行工作流
    console.log('Executing workflow...');
    const executeResponse = await fetch(`${API_BASE}/workflows/${createData.id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: {} })
    });
    
    const executeData = await executeResponse.json();
    console.log('✅ Workflow executed successfully!');
    console.log('Review result:', JSON.stringify(executeData.result.results.review_team, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function testParallelSearchNode() {
  console.log('\n🧪 Testing Parallel Search Node...\n');
  
  const workflow = {
    name: 'Test Parallel Search Workflow',
    description: 'Test the parallel search node',
    nodes: [
      {
        id: 'parallel_search',
        type: 'parallel_search',
        params: {
          searchTasks: [
            { id: 'task1', type: 'skill_search', query: 'customer-service' },
            { id: 'task2', type: 'skill_search', query: 'data-analysis' }
          ],
          timeout: 10000
        }
      }
    ],
    edges: []
  };
  
  try {
    console.log('Creating workflow...');
    const createResponse = await fetch(`${API_BASE}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow)
    });
    
    const createData = await createResponse.json();
    console.log('✅ Workflow created:', createData.id);
    
    console.log('Executing workflow...');
    const executeResponse = await fetch(`${API_BASE}/workflows/${createData.id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: {} })
    });
    
    const executeData = await executeResponse.json();
    console.log('✅ Workflow executed successfully!');
    console.log('Search results:', JSON.stringify(executeData.result.results.parallel_search, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Testing New Workflow Nodes');
  console.log('='.repeat(60));
  
  // 检查服务是否运行
  try {
    const healthResponse = await fetch('http://localhost:3002/health');
    if (!healthResponse.ok) {
      throw new Error('Service not running');
    }
    console.log('✅ SkillHub Workflow service is running\n');
  } catch (error) {
    console.error('❌ SkillHub Workflow service is not running on port 3002');
    console.error('Please start it first: cd packages/skillhub-workflow && npm run dev');
    process.exit(1);
  }
  
  // 运行测试
  const test1Passed = await testReviewerNode();
  const test2Passed = await testParallelSearchNode();
  
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Reviewer Node: ${test1Passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Parallel Search Node: ${test2Passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(60));
  
  process.exit(test1Passed && test2Passed ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
