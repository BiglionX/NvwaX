/**
 * 快速创建并发布小红书运营团队到 Agent 市场
 */

const API_BASE = 'http://localhost:3001/api';

// Admin 用户信息
const ADMIN_EMAIL = '1055603323@qq.com';
const ADMIN_PASSWORD = 'admin123';

async function login() {
  console.log('🔐 Logging in as admin...');
  
  // Try user auth first
  let response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  });
  
  // If user auth fails, try admin auth
  if (!response.ok) {
    console.log('   User auth failed, trying admin auth...');
    response = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: ADMIN_EMAIL.split('@')[0], // Use email prefix as username
        password: ADMIN_PASSWORD
      })
    });
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Login failed: ${response.statusText} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log('✅ Login successful!');
  
  // Handle both response formats
  const userData = data.data || data;
  const token = userData.token || userData.accessToken;
  const userId = userData.user?.id || userData.admin?.id || userData.userId;
  
  console.log('   User ID:', userId);
  console.log('   Token:', token ? token.substring(0, 20) + '...' : 'N/A');
  
  return { token, userId };
}

async function createAiTeam(token, userId) {
  console.log('\n🏢 Creating AiTeam: 小红书运营团队...');
  
  // 直接创建一个完整的 AiTeam 会话
  const sessionData = {
    requirements: `我想创建一个小红书运营团队，实现完全自动化的内容运营。具体要求：

1. 热点收集：自动监测和收集小红书平台的热门话题、trending 内容
2. 文字提炼：从热点中提取关键信息，生成吸引人的文案要点
3. 内容创建：自动生成符合小红书风格的图文内容
4. 图文制作：创建精美的图片和配文组合
5. 推文发布：自动发布内容到小红书平台
6. 推送管理：智能安排发布时间，优化曝光效果

目标是建立一个全自动的小红书运营流水线，从热点发现到内容发布全程自动化。`,
    industry: 'social_media_marketing',
    teamType: 'xiaohongshu_operations'
  };
  
  const response = await fetch(`${API_BASE}/aiteam-creation/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(sessionData)
  });
  
  if (!response.ok) {
    throw new Error(`Create session failed: ${response.statusText}`);
  }
  
  const session = await response.json();
  console.log('✅ Virtual company session created!');
  console.log('   Session ID:', session.id);
  console.log('   Status:', session.status);
  
  return session;
}

async function sendMessageToSession(token, sessionId, message) {
  console.log(`\n💬 Sending message to session ${sessionId}...`);
  
  const response = await fetch(`${API_BASE}/aiteam-creation/sessions/${sessionId}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message })
  });
  
  if (!response.ok) {
    throw new Error(`Send message failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  console.log('✅ Message sent!');
  console.log('   Phase:', result.phase);
  console.log('   Response preview:', result.message?.substring(0, 100) + '...');
  
  return result;
}

async function confirmAndSaveTeam(token, sessionId) {
  console.log(`\n✅ Confirming and saving team for session ${sessionId}...`);
  
  const response = await fetch(`${API_BASE}/aiteam-creation/sessions/${sessionId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      confirmed: true,
      notes: 'Auto-confirmed for quick deployment'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Confirm team failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  console.log('✅ Team confirmed and saved!');
  console.log('   Team Skill ID:', result.teamSkillId);
  
  return result;
}

async function publishToMarketplace(token, teamSkillId) {
  console.log(`\n🚀 Publishing team skill ${teamSkillId} to marketplace...`);
  
  // 首先获取 team skill 详情
  const getResponse = await fetch(`${API_BASE}/team-skills/${teamSkillId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!getResponse.ok) {
    throw new Error(`Get team skill failed: ${getResponse.statusText}`);
  }
  
  const teamSkill = await getResponse.json();
  console.log('   Current status:', teamSkill.isPublished ? 'Published' : 'Not published');
  
  // 如果已经发布，先取消发布
  if (teamSkill.isPublished) {
    console.log('   Unpublishing first...');
    await fetch(`${API_BASE}/team-skills/${teamSkillId}/unpublish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
  
  // 更新团队技能信息，设置为可发布
  const updateResponse = await fetch(`${API_BASE}/team-skills/${teamSkillId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: '小红书运营团队',
      description: '全自动小红书内容运营解决方案，包含热点收集、内容创作、图文制作、自动发布等功能。支持账号定位分析、热点追踪、智能文案生成、图文排版、定时发布等全流程自动化操作。',
      category: 'virtual-company',
      tags: ['xiaohongshu', 'automation', 'content-creation', 'social-media', 'marketing', 'operations'],
      isPublished: false,
      price: 0,
      visibility: 'public'
    })
  });
  
  if (!updateResponse.ok) {
    throw new Error(`Update team skill failed: ${updateResponse.statusText}`);
  }
  
  // 发布到市场
  const publishResponse = await fetch(`${API_BASE}/team-skills/${teamSkillId}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      visibility: 'public',
      price: 0
    })
  });
  
  if (!publishResponse.ok) {
    const errorText = await publishResponse.text();
    throw new Error(`Publish failed: ${publishResponse.statusText} - ${errorText}`);
  }
  
  const publishResult = await publishResponse.json();
  console.log('✅ Published to marketplace successfully!');
  console.log('   Publish ID:', publishResult.publishId || teamSkillId);
  console.log('   Visibility:', publishResult.visibility || 'public');
  
  return publishResult;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🚀 Quick Create & Publish: 小红书运营团队');
  console.log('='.repeat(70));
  
  try {
    // Step 1: Login
    const authResult = await login();
    const token = authResult.token;
    const userId = authResult.user?.id || authResult.userId;
    
    if (!token) {
      throw new Error('No token received from login');
    }
    
    // Step 2: Create AiTeam session
    const session = await createAiTeam(token, userId);
    
    // Step 3: Send initial message to trigger CEO Agent
    const phase1Result = await sendMessageToSession(
      token,
      session.id,
      '确认创建小红书运营团队，需要自动化热点收集、内容创作、图文制作和发布功能'
    );
    
    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Confirm team design
    const confirmResult = await confirmAndSaveTeam(token, session.id);
    
    // Step 5: Publish to marketplace
    const teamSkillId = confirmResult.teamSkillId || session.teamSkillId;
    
    if (!teamSkillId) {
      console.warn('⚠️ No teamSkillId found, trying to get from session...');
      // Try to get session details
      const sessionResponse = await fetch(`${API_BASE}/aiteam-creation/sessions/${session.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const sessionDetails = await sessionResponse.json();
      console.log('Session details:', JSON.stringify(sessionDetails, null, 2));
      throw new Error('Cannot proceed without teamSkillId');
    }
    
    await publishToMarketplace(token, teamSkillId);
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 SUCCESS! All steps completed!');
    console.log('='.repeat(70));
    console.log('\nSummary:');
    console.log('  ✅ Logged in as admin');
    console.log('  ✅ Created AiTeam session:', session.id);
    console.log('  ✅ Confirmed team design');
    console.log('  ✅ Published to marketplace');
    console.log('\nYou can now view it at:');
    console.log(`  http://localhost:3000/marketplace/team-skills/${teamSkillId}`);
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
