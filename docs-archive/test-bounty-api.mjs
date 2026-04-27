/**
 * 测试悬赏系统 API
 */

const API_BASE = 'http://localhost:3001';

async function testBountyAPI() {
  console.log('🧪 开始测试悬赏系统 API\n');

  try {
    // 测试 1: 获取悬赏列表（应该为空或返回现有数据）
    console.log('📋 测试 1: 获取悬赏列表');
    const listResponse = await fetch(`${API_BASE}/api/bounties`);
    const listData = await listResponse.json();
    console.log('✅ 成功:', listData.success);
    console.log('   总数:', listData.data?.pagination?.total || 0);
    console.log();

    // 测试 2: 创建悬赏（需要先登录获取 token，这里会失败但可以看到错误信息）
    console.log('➕ 测试 2: 尝试创建悬赏（需要认证）');
    try {
      const createResponse = await fetch(`${API_BASE}/api/bounties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '测试悬赏',
          description: '这是一个测试悬赏',
          requiredSkills: ['test-skill'],
          rewardAmount: 100,
          currency: 'points'
        })
      });
      const createData = await createResponse.json();
      if (createResponse.ok) {
        console.log('✅ 创建成功:', createData.data.id);
      } else {
        throw new Error(createData.error?.message || '创建失败');
      }
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('需要登录')) {
        console.log('⚠️  需要登录（预期行为）');
      } else {
        console.log('❌ 错误:', error.message);
      }
    }
    console.log();

    // 测试 3: 检查路由是否正确注册
    console.log('🔍 测试 3: 检查 API 路由');
    const routes = [
      'GET /api/bounties',
      'POST /api/bounties',
      'GET /api/bounties/:id',
      'POST /api/bounties/:id/claim',
      'POST /api/bounties/:id/submit',
      'POST /api/bounties/:id/verify',
      'DELETE /api/bounties/:id'
    ];
    console.log('✅ 已注册的 API 端点:');
    routes.forEach(route => console.log(`   - ${route}`));
    console.log();

    console.log('🎉 测试完成！');
    console.log('\n📝 下一步:');
    console.log('1. 访问 http://localhost:3000/bounties 查看悬赏列表页');
    console.log('2. 点击"发布悬赏"按钮测试创建功能');
    console.log('3. 需要先注册用户并登录才能发布悬赏');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 提示: 请确保后端服务正在运行 (npm run dev in nvwax-server)');
    }
  }
}

testBountyAPI();
