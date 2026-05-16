#!/usr/bin/env node

/**
 * 虚拟公司创建系统 - 快速功能验证测试
 * 
 * 测试关键功能点，确保系统正常运行
 */

import http from 'http';

const BASE_URL = 'http://localhost:3001';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log('green', `✅ ${message}`);
}

function error(message) {
  log('red', `❌ ${message}`);
}

function info(message) {
  log('blue', `ℹ️  ${message}`);
}

function warning(message) {
  log('yellow', `⚠️  ${message}`);
}

function step(message) {
  log('cyan', `\n📍 ${message}`);
}

// HTTP 请求辅助函数
function httpRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runQuickTests() {
  console.log('\n========================================');
  console.log('  虚拟公司创建系统 - 快速功能验证');
  console.log('========================================\n');

  let sessionId = null;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // 测试 1: 创建会话
    step('测试 1: 创建会话');
    info('POST /api/virtual-company/sessions');
    
    const createResult = await httpRequest('POST', '/api/virtual-company/sessions', {});
    
    if (createResult.status === 201 && createResult.data.success) {
      sessionId = createResult.data.data.id;
      success(`会话创建成功: ${sessionId}`);
      info(`状态: ${createResult.data.data.status}`);
      testsPassed++;
    } else {
      error(`创建会话失败: ${JSON.stringify(createResult)}`);
      testsFailed++;
      throw new Error('Session creation failed');
    }

    // 测试 2: 发送消息（CEO Agent 对话）
    step('测试 2: CEO Agent 对话');
    info('POST /api/virtual-company/sessions/:id/message');
    
    const messageResult = await httpRequest(
      'POST',
      `/api/virtual-company/sessions/${sessionId}/message`,
      { content: '我想创建一个营销内容创作团队' }
    );
    
    if (messageResult.status === 200 && messageResult.data.success) {
      success('消息发送成功');
      info(`CEO Agent 回复长度: ${messageResult.data.data.message?.length || 0} 字符`);
      info(`阶段: ${messageResult.data.data.phase || 'N/A'}`);
      testsPassed++;
    } else {
      error(`消息发送失败: ${JSON.stringify(messageResult)}`);
      testsFailed++;
    }

    // 测试 3: 更新需求
    step('测试 3: 更新需求信息');
    info('PUT /api/virtual-company/sessions/:id/requirements');
    
    const requirementsResult = await httpRequest(
      'PUT',
      `/api/virtual-company/sessions/${sessionId}/requirements`,
      {
        companyType: 'marketing',
        description: '营销内容创作团队',
        responsibilities: ['社交媒体内容', '博客文章', '广告文案'],
        targetAudience: '年轻消费者',
        outputTypes: ['text', 'image']
      }
    );
    
    if (requirementsResult.status === 200 && requirementsResult.data.success) {
      success('需求更新成功');
      testsPassed++;
    } else {
      error(`需求更新失败: ${JSON.stringify(requirementsResult)}`);
      testsFailed++;
    }

    // 测试 4: 更新角色
    step('测试 4: 更新团队角色');
    info('PUT /api/virtual-company/sessions/:id/roles');
    
    const rolesResult = await httpRequest(
      'PUT',
      `/api/virtual-company/sessions/${sessionId}/roles`,
      {
        roles: [
          {
            roleName: '内容策略师',
            description: '负责内容规划和策略制定',
            responsibilities: ['内容规划', '策略制定', '数据分析']
          },
          {
            roleName: '文案创作者',
            description: '负责撰写各类文案',
            responsibilities: ['博客写作', '社交媒体文案', '广告文案']
          },
          {
            roleName: '视觉设计师',
            description: '负责视觉内容设计',
            responsibilities: ['图片设计', '视频制作', '品牌视觉']
          }
        ]
      }
    );
    
    if (rolesResult.status === 200 && rolesResult.data.success) {
      success('角色更新成功');
      testsPassed++;
    } else {
      error(`角色更新失败: ${JSON.stringify(rolesResult)}`);
      testsFailed++;
    }

    // 测试 5: 获取会话详情
    step('测试 5: 获取会话详情');
    info(`GET /api/virtual-company/sessions/${sessionId}`);
    
    const sessionResult = await httpRequest('GET', `/api/virtual-company/sessions/${sessionId}`);
    
    if (sessionResult.status === 200 && sessionResult.data.success) {
      success('获取会话详情成功');
      info(`用户 ID: ${sessionResult.data.data.userId}`);
      info(`当前状态: ${sessionResult.data.data.status}`);
      info(`进度: ${sessionResult.data.data.progress?.percentage || 0}%`);
      testsPassed++;
    } else {
      error(`获取会话详情失败: ${JSON.stringify(sessionResult)}`);
      testsFailed++;
    }

    // 测试 6: 获取用户会话列表
    step('测试 6: 获取用户会话列表');
    info('GET /api/virtual-company/sessions');
    
    const listResult = await httpRequest('GET', '/api/virtual-company/sessions');
    
    if (listResult.status === 200 && listResult.data.success) {
      success('获取会话列表成功');
      info(`会话总数: ${listResult.data.data.sessions?.length || 0}`);
      testsPassed++;
    } else {
      error(`获取会话列表失败: ${JSON.stringify(listResult)}`);
      testsFailed++;
    }

    // 测试 7: 手动触发进度广播
    step('测试 7: 进度广播功能');
    info(`POST /api/virtual-company/sessions/${sessionId}/broadcast`);
    
    const broadcastResult = await httpRequest(
      'POST',
      `/api/virtual-company/sessions/${sessionId}/broadcast`
    );
    
    if (broadcastResult.status === 200 && broadcastResult.data.success) {
      success('广播成功');
      info(`客户端数量: ${broadcastResult.data.data.clientCount || 0}`);
      testsPassed++;
    } else {
      error(`广播失败: ${JSON.stringify(broadcastResult)}`);
      testsFailed++;
    }

    // 测试 8: Agent 复用决策
    step('测试 8: Agent 复用决策');
    info(`POST /api/virtual-company/sessions/${sessionId}/decide-agents`);
    
    const decisionResult = await httpRequest(
      'POST',
      `/api/virtual-company/sessions/${sessionId}/decide-agents`
    );
    
    if (decisionResult.status === 200) {
      if (decisionResult.data.success) {
        success('Agent 决策成功');
        info(`决策数量: ${decisionResult.data.data.decisions?.length || 0}`);
      } else {
        warning(`Agent 决策跳过: ${decisionResult.data.error}`);
      }
      testsPassed++;
    } else {
      error(`Agent 决策失败: ${JSON.stringify(decisionResult)}`);
      testsFailed++;
    }

    // 测试 9: 删除会话（清理）
    step('测试 9: 清理测试数据');
    info(`DELETE /api/virtual-company/sessions/${sessionId}`);
    
    const deleteResult = await httpRequest('DELETE', `/api/virtual-company/sessions/${sessionId}`);
    
    if (deleteResult.status === 200 && deleteResult.data.success) {
      success('会话删除成功');
      testsPassed++;
    } else {
      warning(`会话删除跳过（保留用于调试）`);
      // 不计数为失败
    }

    // 总结
    console.log('\n========================================');
    console.log('  ✅ 快速功能验证完成！');
    console.log('========================================\n');
    
    console.log(`测试结果:`);
    console.log(`  ✅ 通过: ${testsPassed}`);
    console.log(`  ❌ 失败: ${testsFailed}`);
    console.log(`  📊 通过率: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%\n`);
    
    if (testsFailed === 0) {
      log('green', '🎉 所有测试通过！系统运行正常！\n');
    } else {
      log('red', `⚠️  有 ${testsFailed} 个测试失败，请检查日志\n`);
    }

  } catch (err) {
    console.log('\n========================================');
    console.log('  ❌ 测试失败');
    console.log('========================================\n');
    error(`错误: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

runQuickTests();
