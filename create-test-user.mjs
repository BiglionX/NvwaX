/**
 * 创建测试账号脚本
 * 
 * 用法：
 * node create-test-user.mjs
 * 
 * 或者通过 API 直接测试：
 * curl -X POST http://localhost:3001/api/auth/register \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

// 测试账号信息
const TEST_USERS = [
  {
    email: 'test@example.com',
    password: 'test123',
    name: 'Test User'
  },
  {
    email: 'demo@example.com',
    password: 'demo123',
    name: 'Demo User'
  }
];

async function createTestUser(userData) {
  try {
    console.log(`\n📝 正在创建测试账号: ${userData.email}`);
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ 账号创建成功！`);
      console.log(`   邮箱: ${userData.email}`);
      console.log(`   密码: ${userData.password}`);
      console.log(`   名称: ${userData.name}`);
      return data;
    } else if (response.status === 409) {
      console.log(`⚠️  账号已存在: ${userData.email}`);
      console.log(`   可以直接使用以下信息登录：`);
      console.log(`   邮箱: ${userData.email}`);
      console.log(`   密码: ${userData.password}`);
      return data;
    } else {
      console.error(`❌ 创建失败:`, data);
      return null;
    }
  } catch (error) {
    console.error(`❌ 请求失败:`, error.message);
    return null;
  }
}

async function main() {
  console.log(' NvwaX 测试账号创建工具');
  console.log('═'.repeat(50));
  
  // 检查 API 是否可用
  try {
    const healthCheck = await fetch(`${API_BASE_URL}/health`);
    if (!healthCheck.ok && healthCheck.status !== 404) {
      console.error('❌ 后端服务返回异常状态码:', healthCheck.status);
      console.log('\n💡 提示：');
      console.log('   请确保 Railway 后端服务正常运行');
      process.exit(1);
    }
    console.log('✅ 后端服务连接正常');
  } catch (error) {
    console.error('❌ 无法连接到后端服务');
    console.log(`\n💡 提示：`);
    console.log(`   请设置 API_URL 环境变量指向正确的后端地址`);
    console.log(`   例如: API_URL=https://nvwax-production.up.railway.app/api`);
    console.log(`   或:   API_URL=http://localhost:3001/api`);
    process.exit(1);
  }
  
  // 创建所有测试账号
  console.log('\n 开始创建测试账号...\n');
  
  for (const user of TEST_USERS) {
    await createTestUser(user);
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('✅ 测试账号创建完成！');
  console.log('\n 测试账号信息：');
  TEST_USERS.forEach(user => {
    console.log(`\n  邮箱: ${user.email}`);
    console.log(`  密码: ${user.password}`);
    console.log(`  名称: ${user.name}`);
  });
  
  console.log('\n💡 使用方法：');
  console.log(`   1. 访问: https://nvwax.proclaw.cc`);
  console.log(`   2. 点击"登录"按钮`);
  console.log(`   3. 使用上述邮箱和密码登录`);
  console.log(`   4. 登录后即可使用虚拟公司功能`);
}

main().catch(console.error);
