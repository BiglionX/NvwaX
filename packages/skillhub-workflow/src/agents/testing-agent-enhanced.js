/**
 * Testing Agent - Enhanced Version with Real Test Execution
 * 
 * 增强功能:
 * - 真实执行 Jest/Mocha 测试
 * - 生成 HTML 测试报告
 * - 集成 Cypress E2E 测试
 * - 自动修复建议
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const TestingAgent = require('./testing-agent');

const execAsync = promisify(exec);

class TestingAgentEnhanced extends TestingAgent {
  constructor() {
    super();
    this.testRunner = 'jest'; // jest, mocha, cypress
    this.reportFormat = 'html'; // html, json, junit
  }

  /**
   * 真实执行测试并生成报告
   * @param {string} projectPath - 项目路径
   * @param {Object} options - 测试选项
   * @returns {Promise<Object>} 测试结果
   */
  async executeRealTests(projectPath, options = {}) {
    console.log('🧪 Testing Agent executing real tests...');
    
    const {
      testRunner = this.testRunner,
      coverage = true,
      watch = false,
      reporters = ['default', 'html']
    } = options;

    try {
      // Step 1: 检查项目配置
      await this.validateProjectConfig(projectPath, testRunner);

      // Step 2: 执行测试
      const result = await this.runTests(projectPath, testRunner, {
        coverage,
        watch,
        reporters
      });

      // Step 3: 生成报告
      const report = await this.generateTestReport(result, projectPath);

      console.log(`✅ Real tests executed. Passed: ${result.passed}/${result.total}`);
      return report;

    } catch (error) {
      console.error('Real test execution failed:', error);
      throw error;
    }
  }

  /**
   * 验证项目配置
   */
  async validateProjectConfig(projectPath, testRunner) {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      // 检查测试依赖
      const requiredDeps = {
        jest: ['jest', '@types/jest'],
        mocha: ['mocha', 'chai'],
        cypress: ['cypress']
      };

      const deps = requiredDeps[testRunner] || [];
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      const missingDeps = deps.filter(dep => !allDeps[dep]);
      
      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
      }

      console.log('✅ Project configuration validated');
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('package.json not found');
      }
      throw error;
    }
  }

  /**
   * 运行测试
   */
  async runTests(projectPath, testRunner, options) {
    let command;
    
    switch (testRunner) {
      case 'jest':
        command = this.buildJestCommand(options);
        break;
      case 'mocha':
        command = this.buildMochaCommand(options);
        break;
      case 'cypress':
        command = this.buildCypressCommand(options);
        break;
      default:
        throw new Error(`Unsupported test runner: ${testRunner}`);
    }

    console.log(`Running: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectPath,
        timeout: 300000 // 5分钟超时
      });

      // 解析测试结果
      const result = await this.parseTestOutput(stdout, stderr, testRunner);
      
      return result;

    } catch (error) {
      // 测试失败时仍然解析输出
      if (error.stdout) {
        const result = await this.parseTestOutput(error.stdout, error.stderr, testRunner);
        result.success = false;
        result.error = error.message;
        return result;
      }
      throw error;
    }
  }

  /**
   * 构建 Jest 命令
   */
  buildJestCommand(options) {
    const flags = [];
    
    if (options.coverage) {
      flags.push('--coverage');
    }
    
    if (options.watch) {
      flags.push('--watch');
    }
    
    if (options.reporters.includes('json')) {
      flags.push('--json --outputFile=test-results.json');
    }

    return `npx jest ${flags.join(' ')}`;
  }

  /**
   * 构建 Mocha 命令
   */
  buildMochaCommand(options) {
    const flags = ['--reporter spec'];
    
    if (options.coverage) {
      flags.push('--require nyc');
    }

    return `npx mocha ${flags.join(' ')}`;
  }

  /**
   * 构建 Cypress 命令
   */
  buildCypressCommand(options) {
    const flags = ['run'];
    
    if (options.reporters.includes('junit')) {
      flags.push('--reporter junit');
    }

    return `npx cypress ${flags.join(' ')}`;
  }

  /**
   * 解析测试输出
   */
  async parseTestOutput(stdout, stderr, testRunner) {
    const result = {
      success: true,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      coverage: null,
      failures: []
    };

    // 根据测试框架解析输出
    switch (testRunner) {
      case 'jest':
        return await this.parseJestOutput(stdout, stderr);
      case 'mocha':
        return await this.parseMochaOutput(stdout, stderr);
      case 'cypress':
        return await this.parseCypressOutput(stdout, stderr);
      default:
        return result;
    }
  }

  /**
   * 解析 Jest 输出
   */
  async parseJestOutput(stdout, stderr) {
    const result = {
      success: !stderr.includes('FAIL'),
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      coverage: null,
      failures: []
    };

    // 解析测试统计
    const testMatch = stdout.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+failed/);
    if (testMatch) {
      result.passed = parseInt(testMatch[1]);
      result.failed = parseInt(testMatch[2]);
      result.total = result.passed + result.failed;
    }

    // 解析覆盖率
    const coverageMatch = stdout.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      result.coverage = {
        lines: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2])
      };
    }

    // 解析失败的测试
    const failMatches = stdout.matchAll(/●\s+(.+?)\s*\n/g);
    for (const match of failMatches) {
      result.failures.push({
        test: match[1],
        message: 'Test failed'
      });
    }

    return result;
  }

  /**
   * 解析 Mocha 输出
   */
  async parseMochaOutput(stdout, stderr) {
    const result = {
      success: !stderr,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      coverage: null,
      failures: []
    };

    const passingMatch = stdout.match(/(\d+)\s+passing/);
    const failingMatch = stdout.match(/(\d+)\s+failing/);

    if (passingMatch) {
      result.passed = parseInt(passingMatch[1]);
    }
    
    if (failingMatch) {
      result.failed = parseInt(failingMatch[1]);
    }

    result.total = result.passed + result.failed;

    return result;
  }

  /**
   * 解析 Cypress 输出
   */
  async parseCypressOutput(stdout, stderr) {
    const result = {
      success: !stderr,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      coverage: null,
      failures: []
    };

    const specsMatch = stdout.match(/All specs passed!\s+\((\d+)\)/);
    if (specsMatch) {
      result.passed = parseInt(specsMatch[1]);
      result.total = result.passed;
    }

    return result;
  }

  /**
   * 生成测试报告
   */
  async generateTestReport(result, projectPath) {
    const reportDir = path.join(projectPath, 'test-reports');
    await fs.mkdir(reportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `test-report-${timestamp}.html`);

    // 生成 HTML 报告
    const htmlReport = this.generateHTMLReport(result);
    await fs.writeFile(reportPath, htmlReport, 'utf-8');

    // 生成 JSON 报告
    const jsonReportPath = path.join(reportDir, `test-report-${timestamp}.json`);
    await fs.writeFile(jsonReportPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`📊 Reports generated:`);
    console.log(`   HTML: ${reportPath}`);
    console.log(`   JSON: ${jsonReportPath}`);

    return {
      ...result,
      reports: {
        html: reportPath,
        json: jsonReportPath
      }
    };
  }

  /**
   * 生成 HTML 报告
   */
  generateHTMLReport(result) {
    const passRate = result.total > 0 ? ((result.passed / result.total) * 100).toFixed(1) : 0;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .stat-label {
      color: #666;
      font-size: 14px;
    }
    .passed { color: #10b981; }
    .failed { color: #ef4444; }
    .total { color: #6366f1; }
    .coverage { color: #f59e0b; }
    .failures {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .failure-item {
      border-left: 4px solid #ef4444;
      padding: 15px;
      margin: 10px 0;
      background: #fef2f2;
    }
    h1 { margin: 0 0 10px 0; }
    h2 { margin: 0 0 15px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧪 Test Report</h1>
    <p>Generated at: ${new Date().toLocaleString()}</p>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-value total">${result.total}</div>
      <div class="stat-label">Total Tests</div>
    </div>
    <div class="stat-card">
      <div class="stat-value passed">${result.passed}</div>
      <div class="stat-label">Passed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value failed">${result.failed}</div>
      <div class="stat-label">Failed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: ${passRate >= 90 ? '#10b981' : passRate >= 70 ? '#f59e0b' : '#ef4444'}">
        ${passRate}%
      </div>
      <div class="stat-label">Pass Rate</div>
    </div>
    ${result.coverage ? `
    <div class="stat-card">
      <div class="stat-value coverage">${result.coverage.lines}%</div>
      <div class="stat-label">Code Coverage</div>
    </div>
    ` : ''}
  </div>

  ${result.failures.length > 0 ? `
  <div class="failures">
    <h2>❌ Failed Tests (${result.failures.length})</h2>
    ${result.failures.map(failure => `
      <div class="failure-item">
        <strong>${failure.test}</strong>
        <p>${failure.message}</p>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${result.success ? `
  <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #10b981;">✅ All Tests Passed!</h2>
  </div>
  ` : ''}
</body>
</html>
    `.trim();
  }

  /**
   * 基于 AI 的自动修复建议
   * @param {Object} testResult - 测试结果
   * @returns {Promise<Array>} 修复建议列表
   */
  async generateAutoFixSuggestions(testResult) {
    console.log('🔧 Generating auto-fix suggestions...');
    
    if (testResult.failures.length === 0) {
      return [];
    }

    const prompt = `
作为测试专家,请分析以下失败的测试并提供自动修复建议。

失败的测试:
${JSON.stringify(testResult.failures, null, 2)}

请为每个失败的测试提供:
1. 失败原因分析
2. 具体的修复代码
3. 预防措施

返回 JSON 数组格式:
[
  {
    "test": "测试名称",
    "rootCause": "根本原因",
    "fixCode": "修复代码",
    "prevention": "预防措施"
  }
]
`;

    try {
      const response = await this.llm.invoke([{ role: 'user', content: prompt }]);
      const content = response.content.trim();
      
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content];
      
      const suggestions = JSON.parse(jsonMatch[1]);
      
      console.log(`✅ Generated ${suggestions.length} fix suggestions`);
      return suggestions;
      
    } catch (error) {
      console.error('Failed to generate fix suggestions:', error);
      return [];
    }
  }
}

module.exports = TestingAgentEnhanced;
