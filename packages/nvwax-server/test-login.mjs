import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

console.log('='.repeat(60));
console.log('🧪 NvwaX 登录功能测试');
console.log('='.repeat(60));
console.log('');

// 创建测试用户
async function createTestUser() {
  console.log('📋 准备：创建测试用户');
  console.log('-'.repeat(60));
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: 'test@example.com',
      password: 'Test123456',
      name: 'Test User'
    });
    
    console.log('✅ 测试用户创建成功');
    console.log(`   邮箱: test@example.com`);
    console.log(`   密码: Test123456`);
    console.log('');
    return true;
  } catch (error) {
    if (error.response && error.response.status === 409) {
      console.log('️  测试用户已存在，跳过创建');
      console.log('');
      return true;
    } else {
      console.log('❌ 创建测试用户失败');
      console.log(`   错误: ${error.response?.data?.error || error.message}`);
      console.log('');
      return false;
    }
  }
}

// 测试普通用户登录
async function testUserLogin() {
  console.log('📋 测试 1: 普通用户登录');
  console.log('-'.repeat(60));
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'Test123456'
    });
    
    console.log('✅ 普通用户登录成功');
    console.log(`   状态码: ${response.status}`);
    console.log(`   用户: ${response.data.data?.user?.name || response.data.data?.user?.email}`);
    console.log(`   Token 长度: ${response.data.data?.token?.length || 0}`);
    console.log('');
    return true;
  } catch (error) {
    if (error.response) {
      console.log('❌ 普通用户登录失败');
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   错误: ${error.response.data?.error || error.response.data?.message || '未知错误'}`);
      console.log('');
    } else {
      console.log('❌ 普通用户登录请求失败');
      console.log(`   错误: ${error.message}`);
      console.log('');
    }
    return false;
  }
}

// 测试管理员登录
async function testAdminLogin() {
  console.log('📋 测试 2: 管理员登录');
  console.log('-'.repeat(60));
  
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/login`, {
      username: '1055603323@qq.com',
      password: 'admin123'
    });
    
    console.log('✅ 管理员登录成功');
    console.log(`   状态码: ${response.status}`);
    console.log(`   管理员: ${response.data.data?.admin?.name || response.data.data?.admin?.username}`);
    console.log(`   角色: ${response.data.data?.admin?.role}`);
    console.log(`   Token 长度: ${response.data.data?.token?.length || 0}`);
    console.log('');
    return true;
  } catch (error) {
    if (error.response) {
      console.log('❌ 管理员登录失败');
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   错误: ${error.response.data?.error || error.response.data?.message || '未知错误'}`);
      console.log('');
    } else {
      console.log(' 管理员登录请求失败');
      console.log(`   错误: ${error.message}`);
      console.log('');
    }
    return false;
  }
}

// 测试管理员用错误的密码
async function testAdminWrongPassword() {
  console.log('📋 测试 3: 管理员错误密码');
  console.log('-'.repeat(60));
  
  try {
    await axios.post(`${API_BASE_URL}/admin/login`, {
      username: '1055603323@qq.com',
      password: 'wrongpassword'
    });
    
    console.log('❌ 测试失败：应该返回 401 错误');
    console.log('');
    return false;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ 错误密码正确返回 401');
      console.log(`   错误信息: ${error.response.data?.error || '认证失败'}`);
      console.log('');
      return true;
    } else {
      console.log('❌ 未返回预期的 401 错误');
      console.log(`   状态码: ${error.response?.status || '无'}`);
      console.log('');
      return false;
    }
  }
}

// 测试普通用户用错误的密码
async function testUserWrongPassword() {
  console.log('📋 测试 4: 普通用户错误密码');
  console.log('-'.repeat(60));
  
  try {
    await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'wrongpassword'
    });
    
    console.log('❌ 测试失败：应该返回 401 错误');
    console.log('');
    return false;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ 错误密码正确返回 401');
      console.log(`   错误信息: ${error.response.data?.error || '认证失败'}`);
      console.log('');
      return true;
    } else {
      console.log('❌ 未返回预期的 401 错误');
      console.log(`   状态码: ${error.response?.status || '无'}`);
      console.log('');
      return false;
    }
  }
}

// 运行所有测试
async function runAllTests() {
  console.log(` API 地址: ${API_BASE_URL}`);
  console.log('');
  
  const results = [];
  
  // 先创建测试用户
  const userCreated = await createTestUser();
  if (!userCreated) {
    console.log('⚠️  无法创建测试用户，跳过用户登录测试');
    console.log('');
  } else {
    // 测试普通用户登录
    results.push(await testUserLogin());
  }
  
  // 测试管理员登录
  results.push(await testAdminLogin());
  
  // 测试错误密码
  results.push(await testAdminWrongPassword());
  results.push(await testUserWrongPassword());
  
  // 汇总结果
  console.log('='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ 通过: ${passed}/${total}`);
  console.log(`❌ 失败: ${total - passed}/${total}`);
  console.log('');
  
  if (passed === total) {
    console.log('🎉 所有测试通过！');
  } else {
    console.log('⚠️  部分测试失败，请检查日志');
  }
  
  console.log('='.repeat(60));
  process.exit(passed === total ? 0 : 1);
}

// 执行测试
runAllTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
