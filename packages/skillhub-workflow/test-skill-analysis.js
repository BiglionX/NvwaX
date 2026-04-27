/**
 * 测试技能分析 API
 */

async function testSkillAnalysis() {
  console.log('🧪 Testing Skill Analysis API...\n');
  
  const testCases = [
    {
      name: '客服智能体',
      requirement: '我需要一个客服智能体，能够查询订单状态和生成报表',
      templateId: 'fullstack-crud'
    },
    {
      name: '数据分析助手',
      requirement: '想要一个能分析销售数据并生成可视化报表的助手',
      templateId: null
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('Requirement:', testCase.requirement);
    console.log('Template:', testCase.templateId || 'None');
    
    try {
      const response = await fetch('http://localhost:3002/api/skills/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRequirement: testCase.requirement,
          templateId: testCase.templateId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log('\n✅ Result:');
      console.log('  Required Skills:', result.data.requiredSkills.length);
      console.log('  Available Skills:', result.data.availableSkills.length);
      console.log('  Missing Skills:', result.data.missingSkills.length);
      console.log('  Coverage Rate:', result.data.coverageRate + '%');
      
      if (result.data.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        result.data.recommendations.forEach((rec, idx) => {
          console.log(`  ${idx + 1}. ${rec.skillName}`);
          if (rec.recommendations.length > 0) {
            rec.recommendations.forEach((skill, sidx) => {
              console.log(`     - ${skill.name} (${skill.matchScore}%)`);
            });
          } else {
            console.log(`     - ${rec.note || 'No recommendations'}`);
          }
        });
      }
      
      console.log('\n' + '='.repeat(60));
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

testSkillAnalysis().catch(console.error);
