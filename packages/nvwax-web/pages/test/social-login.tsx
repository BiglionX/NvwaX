import { useState, useEffect } from 'react';
import Head from 'next/head';
import { authApi } from '@/lib/api/auth';

/**
 * 社交登录测试页面
 * 
 * 用于测试 GitHub 和 Google 社交登录功能
 * 
 * 访问：http://localhost:3000/test/social-login
 */
function SocialLoginTestPage() {
  const [testResults, setTestResults] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  /**
   * 添加日志
   */
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  /**
   * 运行所有测试
   */
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults({});
    setLogs([]);

    addLog('🚀 开始测试社交登录功能...');

    // 测试 1: 检查环境变量
    await testEnvironmentVariables();

    // 测试 2: 测试 GitHub 授权 URL 生成
    await testGitHubAuthorize();

    // 测试 3: 检查路由配置
    await testRoutes();

    addLog('✅ 测试完成！');
    setIsRunning(false);
  };

  /**
   * 测试 1: 检查环境变量
   */
  const testEnvironmentVariables = async () => {
    addLog('\n📋 测试 1: 检查环境变量...');

    const results: any = {};

    // 检查 GitHub Client ID
    const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (githubClientId) {
      results.githubClientId = { status: 'success', message: `已配置 (${githubClientId.length} 字符)` };
      addLog('  ✅ NEXT_PUBLIC_GITHUB_CLIENT_ID 已配置');
    } else {
      results.githubClientId = { status: 'error', message: '未配置' };
      addLog('  ❌ NEXT_PUBLIC_GITHUB_CLIENT_ID 未配置');
    }

    // 检查 Google Client ID
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (googleClientId) {
      results.googleClientId = { status: 'success', message: `已配置 (${googleClientId.length} 字符)` };
      addLog('  ✅ NEXT_PUBLIC_GOOGLE_CLIENT_ID 已配置');
    } else {
      results.googleClientId = { status: 'error', message: '未配置' };
      addLog('  ❌ NEXT_PUBLIC_GOOGLE_CLIENT_ID 未配置');
    }

    setTestResults((prev: any) => ({ ...prev, envVars: results }));
  };

  /**
   * 测试 2: 测试 GitHub 授权 URL 生成
   */
  const testGitHubAuthorize = async () => {
    addLog('\n🐙 测试 2: 测试 GitHub 授权 URL 生成...');

    try {
      const redirectUri = `${window.location.origin}/api/auth/github/callback`;
      
      addLog(`  📡 调用 API: /api/auth/github/authorize`);
      addLog(`  📡 参数: redirectUri=${redirectUri}`);

      const result = await authApi.githubAuthorize(redirectUri);

      if (result.success && result.data) {
        addLog('  ✅ 授权 URL 生成成功');
        addLog(`  📎 Authorize URL: ${result.data.authorizeUrl}`);
        
        setTestResults((prev: any) => ({ 
          ...prev, 
          githubAuthorize: { 
            status: 'success', 
            message: '授权 URL 生成成功',
            authorizeUrl: result.data.authorizeUrl,
            state: result.data.state
          } 
        }));
      } else {
        addLog(`  ❌ 授权 URL 生成失败: ${JSON.stringify(result)}`);
        
        setTestResults((prev: any) => ({ 
          ...prev, 
          githubAuthorize: { 
            status: 'error', 
            message: '授权 URL 生成失败',
            error: result
          } 
        }));
      }
    } catch (error: any) {
      addLog(`  ❌ 请求失败: ${error.message}`);
      addLog(`  📋 错误详情: ${JSON.stringify(error.response?.data)}`);
      
      setTestResults((prev: any) => ({ 
        ...prev, 
        githubAuthorize: { 
          status: 'error', 
          message: error.message,
          error: error.response?.data
        } 
      }));
    }
  };

  /**
   * 测试 3: 检查路由配置
   */
  const testRoutes = async () => {
    addLog('\n🛣️  测试 3: 检查路由配置...');

    const routes = [
      { name: 'GitHub 授权', path: '/api/auth/github/authorize', method: 'GET' },
      { name: 'GitHub 登录', path: '/api/auth/github/login', method: 'POST' },
      { name: 'GitHub 回调', path: '/api/auth/github/callback', method: 'GET' },
      { name: 'Google 登录', path: '/api/auth/google/login', method: 'POST' },
    ];

    const results: any = {};

    for (const route of routes) {
      try {
        const url = route.path.includes('?') 
          ? route.path 
          : `${route.path}${route.method === 'GET' ? '?test=1' : ''}`;
        
        addLog(`  📡 检查路由: ${route.method} ${url}`);

        const response = await fetch(url, {
          method: route.method === 'POST' ? 'OPTIONS' : 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 200 || response.status === 204 || response.status === 400) {
          results[route.name] = { status: 'success', message: `路由可访问 (${response.status})` };
          addLog(`  ✅ ${route.name} 路由可访问 (${response.status})`);
        } else if (response.status === 404) {
          results[route.name] = { status: 'error', message: '路由不存在 (404)' };
          addLog(`  ❌ ${route.name} 路由不存在 (404)`);
        } else {
          results[route.name] = { status: 'warning', message: `状态码: ${response.status}` };
          addLog(`  ⚠️  ${route.name} 状态码: ${response.status}`);
        }
      } catch (error: any) {
        results[route.name] = { status: 'error', message: error.message };
        addLog(`  ❌ ${route.name} 请求失败: ${error.message}`);
      }
    }

    setTestResults((prev: any) => ({ ...prev, routes: results }));
  };

  /**
   * 手动测试 GitHub 登录
   */
  const testGitHubLogin = async () => {
    addLog('\n🐙 手动测试: GitHub 登录...');
    addLog('  📎 即将跳转到 GitHub 授权页面...');

    try {
      const redirectUri = `${window.location.origin}/api/auth/github/callback`;
      const result = await authApi.githubAuthorize(redirectUri);

      if (result.success && result.data) {
        addLog(`  🔗 授权 URL: ${result.data.authorizeUrl}`);
        addLog('  👆 请在浏览器中打开上述 URL 进行授权');
        
        // 在新窗口中打开
        window.open(result.data.authorizeUrl, '_blank');
      }
    } catch (error: any) {
      addLog(`  ❌ 生成授权 URL 失败: ${error.message}`);
    }
  };

  /**
   * 清除日志
   */
  const clearLogs = () => {
    setLogs([]);
    setTestResults({});
  };

  return (
    <>
      <Head>
        <title>社交登录测试 - NvwaX</title>
        <meta name="description" content="测试社交登录功能" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🧪 社交登录测试页面</h1>
          <p style={styles.subtitle}>
            用于测试 GitHub 和 Google 社交登录功能
          </p>
        </div>

        {/* 操作按钮 */}
        <div style={styles.actions}>
          <button
            onClick={runAllTests}
            disabled={isRunning}
            style={{
              ...styles.button,
              ...styles.buttonPrimary,
              ...(isRunning ? styles.buttonDisabled : {}),
            }}
          >
            {isRunning ? '⏳ 测试中...' : '🚀 运行所有测试'}
          </button>

          <button
            onClick={testGitHubLogin}
            style={{
              ...styles.button,
              ...styles.buttonGitHub,
            }}
          >
            🐙 测试 GitHub 登录
          </button>

          <button
            onClick={clearLogs}
            style={{
              ...styles.button,
              ...styles.buttonSecondary,
            }}
          >
            🗑️ 清除日志
          </button>
        </div>

        {/* 测试结果 */}
        {Object.keys(testResults).length > 0 && (
          <div style={styles.results}>
            <h2 style={styles.resultsTitle}>📊 测试结果</h2>

            {testResults.envVars && (
              <div style={styles.resultSection}>
                <h3>环境变量</h3>
                {Object.entries(testResults.envVars).map(([key, value]: [string, any]) => (
                  <div key={key} style={styles.resultItem}>
                    <span style={styles.resultKey}>{key}</span>
                    <span style={{
                      ...styles.resultStatus,
                      color: value.status === 'success' ? '#10b981' : '#ef4444',
                    }}>
                      {value.status === 'success' ? '✅' : '❌'} {value.message}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {testResults.githubAuthorize && (
              <div style={styles.resultSection}>
                <h3>GitHub 授权 URL 生成</h3>
                <div style={styles.resultItem}>
                  <span style={{
                    ...styles.resultStatus,
                    color: testResults.githubAuthorize.status === 'success' ? '#10b981' : '#ef4444',
                  }}>
                    {testResults.githubAuthorize.status === 'success' ? '✅' : '❌'}{' '}
                    {testResults.githubAuthorize.message}
                  </span>
                </div>
                {testResults.githubAuthorize.authorizeUrl && (
                  <div style={styles.resultDetails}>
                    <p><strong>Authorize URL:</strong></p>
                    <code style={styles.code}>{testResults.githubAuthorize.authorizeUrl}</code>
                    <p><strong>State:</strong> {testResults.githubAuthorize.state}</p>
                  </div>
                )}
                {testResults.githubAuthorize.error && (
                  <div style={styles.resultError}>
                    <pre>{JSON.stringify(testResults.githubAuthorize.error, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {testResults.routes && (
              <div style={styles.resultSection}>
                <h3>路由配置</h3>
                {Object.entries(testResults.routes).map(([key, value]: [string, any]) => (
                  <div key={key} style={styles.resultItem}>
                    <span style={styles.resultKey}>{key}</span>
                    <span style={{
                      ...styles.resultStatus,
                      color: value.status === 'success' ? '#10b981' : 
                             value.status === 'warning' ? '#f59e0b' : '#ef4444',
                    }}>
                      {value.status === 'success' ? '✅' : 
                       value.status === 'warning' ? '⚠️' : '❌'}{' '}
                      {value.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 日志 */}
        {logs.length > 0 && (
          <div style={styles.logs}>
            <h2 style={styles.logsTitle}>📋 测试日志</h2>
            <pre style={styles.logContent}>
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </pre>
          </div>
        )}

        {/* 使用说明 */}
        <div style={styles.instructions}>
          <h2 style={styles.instructionsTitle}>📚 使用说明</h2>
          
          <div style={styles.instructionSection}>
            <h3>1️⃣ 配置环境变量</h3>
            <p>确保以下环境变量已配置：</p>
            <ul>
              <li><code>packages/nvwax-server/.env</code>:
                <ul>
                  <li><code>GITHUB_CLIENT_ID</code></li>
                  <li><code>GITHUB_CLIENT_SECRET</code></li>
                  <li><code>GOOGLE_CLIENT_ID</code></li>
                </ul>
              </li>
              <li><code>packages/nvwax-web/.env.local</code>:
                <ul>
                  <li><code>NEXT_PUBLIC_GITHUB_CLIENT_ID</code></li>
                  <li><code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code></li>
                </ul>
              </li>
            </ul>
          </div>

          <div style={styles.instructionSection}>
            <h3>2️⃣ 创建 OAuth App</h3>
            <p><strong>GitHub:</strong></p>
            <ul>
              <li>访问 <a href="https://github.com/settings/developers" target="_blank">GitHub Developer Settings</a></li>
              <li>创建 OAuth App</li>
              <li>设置回调 URL: <code>http://localhost:3001/api/auth/github/callback</code></li>
            </ul>
            <p><strong>Google:</strong></p>
            <ul>
              <li>访问 <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></li>
              <li>创建 OAuth 2.0 客户端 ID</li>
              <li>添加授权的 JavaScript 来源: <code>http://localhost:3000</code></li>
            </ul>
          </div>

          <div style={styles.instructionSection}>
            <h3>3️⃣ 运行数据库迁移</h3>
            <pre style={styles.code}>pnpm run db:migrate</pre>
          </div>

          <div style={styles.instructionSection}>
            <h3>4️⃣ 测试登录</h3>
            <ul>
              <li>启动后端: <code>cd packages/nvwax-server && pnpm run dev</code></li>
              <li>启动前端: <code>cd packages/nvwax-web && pnpm run dev</code></li>
              <li>访问 <a href="http://localhost:3000/login" target="_blank">http://localhost:3000/login</a></li>
              <li>点击 GitHub 或 Google 登录按钮</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * 样式定义
 */
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    marginBottom: '32px',
    textAlign: 'center',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
  },
  buttonPrimary: {
    backgroundColor: '#4f46e5',
    color: 'white',
  },
  buttonGitHub: {
    backgroundColor: '#24292e',
    color: 'white',
  },
  buttonSecondary: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  results: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  resultsTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '16px',
  },
  resultSection: {
    marginBottom: '24px',
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  resultKey: {
    fontWeight: 500,
    color: '#374151',
  },
  resultStatus: {
    fontWeight: 500,
  },
  resultDetails: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    fontSize: '13px',
  },
  resultError: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderRadius: '6px',
    fontSize: '13px',
    overflow: 'auto',
  },
  code: {
    display: 'block',
    padding: '8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: 'monospace',
    overflow: 'auto',
    wordBreak: 'break-all',
  },
  logs: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  logsTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '16px',
  },
  logContent: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    padding: '16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '400px',
  },
  instructions: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  instructionsTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '16px',
  },
  instructionSection: {
    marginBottom: '24px',
  },
};

export default SocialLoginTestPage;
