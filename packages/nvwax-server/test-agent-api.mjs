// Node.js 18+ 内置 fetch
const API_BASE = 'http://localhost:3001/api';

async function testAgentCreation() {
  console.log('🧪 测试 Agent 创建 API...\n');
  
  // 首先登录获取 token
  console.log('1. 登录获取 token...');
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testuser2026@example.com',
      password: 'test123'
    })
  });
  
  const loginData = await loginResponse.json();
  console.log('   登录状态:', loginResponse.status);
  
  if (!loginResponse.ok) {
    console.error('   ❌ 登录失败:', loginData);
    return;
  }
  
  const token = loginData.data.token;
  console.log('   ✅ Token 获取成功\n');
  
  // 测试创建 Agent
  console.log('2. 创建 Agent...');
  const createResponse = await fetch(`${API_BASE}/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'API测试-Agent',
      description: '通过直接 API 调用测试创建功能',
      config: {},
      skills: [],
      dataSources: [],
      outputTypes: []
    })
  });
  
  const createData = await createResponse.json();
  console.log('   响应状态:', createResponse.status);
  console.log('   响应数据:', JSON.stringify(createData, null, 2));
  
  if (createResponse.ok) {
    console.log('   ✅ Agent 创建成功!');
    console.log('   Agent ID:', createData.data.id);
  } else {
    console.log('   ❌ Agent 创建失败');
  }
}

testAgentCreation().catch(console.error);
