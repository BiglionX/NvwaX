// Node.js 18+ 内置 fetch
const API_BASE = 'http://localhost:3001/api';

async function testAiTeamAndDelete() {
  console.log('🧪 测试 AiTeam 创建和 Agent 删除...\n');
  
  // 登录获取 token
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
  if (!loginResponse.ok) {
    console.error('   ❌ 登录失败:', loginData);
    return;
  }
  
  const token = loginData.data.token;
  console.log('   ✅ Token 获取成功\n');
  
  // 测试创建 AiTeam
  console.log('2. 创建 AiTeam...');
  const createAiTeamResponse = await fetch(`${API_BASE}/aiteams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'API测试-AiTeam',
      description: '通过直接 API 调用测试 AiTeam 创建功能',
      members: [],
      workflow: {},
      triggers: {}
    })
  });
  
  const createAiTeamData = await createAiTeamResponse.json();
  console.log('   响应状态:', createAiTeamResponse.status);
  
  if (createAiTeamResponse.ok) {
    console.log('   ✅ AiTeam 创建成功!');
    console.log('   AiTeam ID:', createAiTeamData.data.id);
  } else {
    console.log('   ❌ AiTeam 创建失败');
    console.log('   错误详情:', JSON.stringify(createAiTeamData, null, 2));
  }
  
  console.log('\n3. 获取 Agents 列表...');
  const getAgentsResponse = await fetch(`${API_BASE}/agents`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const agentsData = await getAgentsResponse.json();
  console.log('   响应状态:', getAgentsResponse.status);
  
  if (getAgentsResponse.ok && agentsData.data?.agents?.length > 0) {
    const agentToDelete = agentsData.data.agents[0];
    console.log('   找到 Agent:', agentToDelete.name, '(ID:', agentToDelete.id + ')');
    
    // 测试删除 Agent
    console.log('\n4. 删除 Agent...');
    const deleteResponse = await fetch(`${API_BASE}/agents/${agentToDelete.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const deleteData = await deleteResponse.json();
    console.log('   响应状态:', deleteResponse.status);
    console.log('   响应数据:', JSON.stringify(deleteData, null, 2));
    
    if (deleteResponse.ok) {
      console.log('   ✅ Agent 删除成功!');
    } else {
      console.log('   ❌ Agent 删除失败');
    }
  } else {
    console.log('   ⚠️ 没有找到可删除的 Agent');
  }
}

testAiTeamAndDelete().catch(console.error);
