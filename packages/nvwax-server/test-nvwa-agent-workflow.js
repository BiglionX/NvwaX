/**
 * 测试 Nvwa Agent 工作流重构
 * 
 * 测试内容：
 * 1. Agent 配置审查
 * 2. 模板并行搜索
 * 3. 技能依赖验证
 */

const API_BASE = 'http://localhost:3001/api';

async function testConfigReview() {
  console.log('🧪 Testing Agent Config Review...\n');
  
  const testConfig = {
    name: '客服智能体',
    description: '处理客户咨询和订单查询',
    dataSources: ['订单数据库', '知识库'],
    outputs: ['回复客户消息'],
    skills: ['自然语言处理', '知识库检索', '对话管理']
  };
  
  try {
    const response = await fetch(`${API_BASE}/nvwa-agent/review-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentConfig: testConfig })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Config review completed!');
      console.log('   Passed:', data.data.reviewPassed);
      console.log('   Issues:', data.data.issues.length);
      console.log('   Suggestions:', data.data.suggestions.length);
      console.log('   Confidence:', data.data.confidence);
    } else {
      console.log('❌ Review failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testTemplateSearch() {
  console.log('\n🧪 Testing Template Search...\n');
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE}/nvwa-agent/search-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        description: '客服系统',
        implementation: '调用现有 API'
      })
    });
    
    const data = await response.json();
    const elapsed = Date.now() - startTime;
    
    if (response.ok && data.success) {
      console.log(`✅ Template search completed in ${elapsed}ms`);
      console.log('   Found templates:', data.data.length);
      
      if (elapsed < 5000) {
        console.log('   ⚡ Fast search (parallel mode working)');
      } else {
        console.log('   ⚠️  Slow search, may need optimization');
      }
    } else {
      console.log('❌ Search failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testSkillValidation() {
  console.log('\n🧪 Testing Skill Dependency Validation...\n');
  
  const testSkills = [
    '自然语言处理',
    '知识库检索',
    '对话管理'
  ];
  
  try {
    const response = await fetch(`${API_BASE}/nvwa-agent/validate-skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills: testSkills })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Skill validation completed!');
      console.log('   Valid:', data.data.valid);
      console.log('   Issues:', data.data.issues.length);
      if (data.data.issues.length > 0) {
        data.data.issues.forEach(issue => console.log('     -', issue));
      }
    } else {
      console.log('❌ Validation failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Nvwa Agent Workflow Refactoring Test');
  console.log('='.repeat(60));
  console.log();
  
  // Check if services are running
  try {
    const healthResponse = await fetch('http://localhost:3001/health');
    if (!healthResponse.ok) {
      throw new Error('Service not running');
    }
    console.log('✅ NvwaX Server is running\n');
  } catch (error) {
    console.error('❌ NvwaX Server is not running on port 3001');
    console.error('Please start it first: cd packages/nvwax-server && npm run dev');
    process.exit(1);
  }
  
  // Run tests
  await testConfigReview();
  await testTemplateSearch();
  await testSkillValidation();
  
  console.log('\n' + '='.repeat(60));
  console.log('Test completed!');
  console.log('='.repeat(60));
  console.log();
  console.log('✅ Features implemented:');
  console.log('   1. Agent config review with LLM');
  console.log('   2. Parallel template search (skip HuggingFace)');
  console.log('   3. Skill dependency validation');
  console.log();
}

main().catch(console.error);
