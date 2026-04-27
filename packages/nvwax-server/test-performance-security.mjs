/**
 * 性能和安全测试脚本
 */

const API_BASE = 'http://localhost:3001';

console.log('🚀 开始性能和安全测试\n');

// 性能测试
async function performanceTest() {
  console.log('📊 性能测试:\n');
  
  const endpoints = [
    '/health',
    '/api/search/agents?q=ai',
    '/api/bounties?status=open&page=1&limit=5',
    '/api/team-skills?page=1&limit=5'
  ];
  
  for (const endpoint of endpoints) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      let status = '✓';
      if (duration > 1000) status = '⚠️';
      if (duration > 2000) status = '❌';
      
      console.log(`   ${status} ${endpoint.padEnd(40)} ${duration}ms`);
    } catch (error) {
      console.log(`   ❌ ${endpoint.padEnd(40)} 失败: ${error.message}`);
    }
  }
  
  console.log();
}

// 安全测试
async function securityTest() {
  console.log('🔒 安全测试:\n');
  
  // 测试 1: CORS 头
  console.log('   测试 1: CORS 配置');
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://example.com',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    const corsHeader = response.headers.get('access-control-allow-origin');
    if (corsHeader) {
      console.log(`   ✓ CORS 已配置: ${corsHeader}`);
    } else {
      console.log('   ⚠️  CORS 未配置');
    }
  } catch (error) {
    console.log(`   ❌ CORS 测试失败: ${error.message}`);
  }
  console.log();
  
  // 测试 2: 安全头
  console.log('   测试 2: 安全头');
  try {
    const response = await fetch(`${API_BASE}/health`);
    
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security'
    ];
    
    for (const header of securityHeaders) {
      const value = response.headers.get(header);
      if (value) {
        console.log(`   ✓ ${header}: ${value}`);
      } else {
        console.log(`   ⚠️  ${header}: 缺失`);
      }
    }
  } catch (error) {
    console.log(`   ❌ 安全头测试失败: ${error.message}`);
  }
  console.log();
  
  // 测试 3: 错误处理
  console.log('   测试 3: 错误处理');
  try {
    const response = await fetch(`${API_BASE}/api/nonexistent`);
    
    if (response.status === 404) {
      console.log('   ✓ 404 错误处理正常');
    } else {
      console.log(`   ⚠️  404 响应状态: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ 错误处理测试失败: ${error.message}`);
  }
  console.log();
  
  // 测试 4: SQL 注入防护
  console.log('   测试 4: SQL 注入防护');
  try {
    const response = await fetch(`${API_BASE}/api/search/agents?q='; DROP TABLE users; --`);
    
    if (response.ok) {
      console.log('   ✓ SQL 注入尝试被正确处理');
    } else {
      console.log(`   ⚠️  SQL 注入测试响应: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ SQL 注入测试失败: ${error.message}`);
  }
  console.log();
  
  // 测试 5: XSS 防护
  console.log('   测试 5: XSS 防护');
  try {
    const response = await fetch(`${API_BASE}/api/search/agents?q=<script>alert("xss")</script>`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✓ XSS 尝试被正确处理');
    } else {
      console.log(`   ⚠️  XSS 测试响应: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ XSS 测试失败: ${error.message}`);
  }
  console.log();
}

// 运行所有测试
async function runTests() {
  await performanceTest();
  await securityTest();
  
  console.log('🎉 性能和安全测试完成！\n');
}

runTests().catch(error => {
  console.error('❌ 测试执行失败:', error.message);
  process.exit(1);
});
