/**
 * 测试 DeepSeek Reviewer Node - 使用真实 API
 */

const API_BASE = 'http://localhost:3002/api';

async function testDeepSeekReviewer() {
  console.log('\n🧪 Testing DeepSeek Reviewer Node with Real API...\n');
  
  // 创建工作流
  const workflow = {
    name: 'DeepSeek Team Design Review',
    description: 'Test reviewer with DeepSeek API',
    nodes: [
      {
        id: 'review_team',
        type: 'reviewer',
        params: {
          reviewType: 'team_design',
          dataToReview: {
            roles: [
              { 
                roleName: '产品经理', 
                responsibilities: ['需求分析', '产品设计', '用户研究'],
                requiredSkills: ['product-management', 'user-research']
              },
              { 
                roleName: '前端开发工程师', 
                responsibilities: ['UI开发', '交互实现', '性能优化'],
                requiredSkills: ['react', 'typescript', 'tailwind-css']
              },
              { 
                roleName: '后端开发工程师', 
                responsibilities: ['API开发', '数据库设计', '系统架构'],
                requiredSkills: ['nodejs', 'postgresql', 'express']
              },
              { 
                roleName: '测试工程师', 
                responsibilities: ['单元测试', '集成测试', '质量保证'],
                requiredSkills: ['jest', 'cypress', 'test-automation']
              }
            ],
            collaborationFlow: '产品 → 前端 ↔ 后端 → 测试',
            industry: '电商'
          },
          qualityCriteria: {
            minRoles: 3,
            maxRoles: 5,
            requireWorkflow: true
          }
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
    
    console.log('\nExecuting workflow with DeepSeek API...');
    console.log('⏳ This may take 5-10 seconds...\n');
    
    const startTime = Date.now();
    const executeResponse = await fetch(`${API_BASE}/workflows/${createData.id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: {} })
    });
    
    const executeData = await executeResponse.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Workflow executed successfully in ${duration}s!`);
    
    const reviewResult = executeData.result.results.review_team;
    
    console.log('\n📊 Review Results:');
    console.log('='.repeat(60));
    console.log(`Review Passed: ${reviewResult.reviewPassed ? '✅ YES' : '❌ NO'}`);
    console.log(`Confidence: ${(reviewResult.confidence * 100).toFixed(1)}%`);
    
    if (reviewResult.issues && reviewResult.issues.length > 0) {
      console.log('\n⚠️ Issues Found:');
      reviewResult.issues.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ No issues found');
    }
    
    if (reviewResult.suggestions && reviewResult.suggestions.length > 0) {
      console.log('\n💡 Suggestions:');
      reviewResult.suggestions.forEach((suggestion, idx) => {
        console.log(`  ${idx + 1}. ${suggestion}`);
      });
    }
    
    console.log('\n🔍 Detailed Review:');
    console.log(JSON.stringify(reviewResult.reviewDetails, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('🚀 DeepSeek Reviewer Node Test');
  console.log('='.repeat(70));
  
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
  const testPassed = await testDeepSeekReviewer();
  
  console.log('\n' + '='.repeat(70));
  console.log('Test Summary');
  console.log('='.repeat(70));
  console.log(`DeepSeek Reviewer: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(70));
  
  if (testPassed) {
    console.log('\n🎉 DeepSeek API integration is working correctly!');
    console.log('\nYou can now:');
    console.log('1. Use the reviewer node in your workflows');
    console.log('2. Configure different models via REVIEWER_MODEL environment variable');
    console.log('3. Adjust temperature via REVIEWER_TEMPERATURE for different strictness levels');
  }
  
  process.exit(testPassed ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
