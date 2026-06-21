#!/usr/bin/env node

/**
 * 社交登录配置验证脚本
 * 
 * 检查 GitHub 和 Google OAuth 配置是否正确
 * 
 * 使用方法：
 *   node scripts/validate-social-login-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始验证社交登录配置...\n');

let hasError = false;
const errors = [];
const warnings = [];

// 检查后端 .env 文件
function checkBackendEnv() {
  console.log('📦 检查后端环境变量...');
  
  const envPath = path.join(__dirname, '..', 'packages', 'nvwax-server', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  if (!fs.existsSync(envPath)) {
    warnings.push('后端 .env 文件不存在，请基于 .env.example 创建');
    console.log('  ⚠️  .env 文件不存在');
    return;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = parseEnvFile(envContent);
  
  // 检查 GitHub OAuth 配置
  console.log('  🔧 检查 GitHub OAuth 配置...');
  if (!envVars.GITHUB_CLIENT_ID) {
    errors.push('GITHUB_CLIENT_ID 未配置');
    console.log('    ❌ GITHUB_CLIENT_ID 未配置');
    hasError = true;
  } else {
    console.log(`    ✅ GITHUB_CLIENT_ID 已配置 (${envVars.GITHUB_CLIENT_ID.length} 字符)`);
  }
  
  if (!envVars.GITHUB_CLIENT_SECRET) {
    errors.push('GITHUB_CLIENT_SECRET 未配置');
    console.log('    ❌ GITHUB_CLIENT_SECRET 未配置');
    hasError = true;
  } else {
    console.log(`    ✅ GITHUB_CLIENT_SECRET 已配置 (${envVars.GITHUB_CLIENT_SECRET.length} 字符)`);
  }
  
  // 检查 Google OAuth 配置
  console.log('  🔧 检查 Google OAuth 配置...');
  if (!envVars.GOOGLE_CLIENT_ID) {
    errors.push('GOOGLE_CLIENT_ID 未配置');
    console.log('    ❌ GOOGLE_CLIENT_ID 未配置');
    hasError = true;
  } else {
    console.log(`    ✅ GOOGLE_CLIENT_ID 已配置 (${envVars.GOOGLE_CLIENT_ID.length} 字符)`);
    if (!envVars.GOOGLE_CLIENT_ID.includes('googleusercontent.com')) {
      warnings.push('GOOGLE_CLIENT_ID 格式可能不正确，应为 xxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com');
      console.log('    ⚠️  GOOGLE_CLIENT_ID 格式可能不正确');
    }
  }
  
  console.log('');
}

// 检查前端环境变量
function checkFrontendEnv() {
  console.log('🎨 检查前端环境变量...');
  
  const envLocalPath = path.join(__dirname, '..', 'packages', 'nvwax-web', '.env.local');
  const envPath = path.join(__dirname, '..', 'packages', 'nvwax-web', '.env');
  
  let envContent = '';
  let envFile = '';
  
  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, 'utf-8');
    envFile = '.env.local';
  } else if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
    envFile = '.env';
  } else {
    warnings.push('前端 .env.local 或 .env 文件不存在');
    console.log('  ⚠️  前端环境变量文件不存在');
    return;
  }
  
  console.log(`  📄 读取文件: ${envFile}`);
  
  const envVars = parseEnvFile(envContent);
  
  // 检查 GitHub OAuth 配置
  console.log('  🔧 检查 GitHub OAuth 前端配置...');
  if (!envVars.NEXT_PUBLIC_GITHUB_CLIENT_ID) {
    errors.push('NEXT_PUBLIC_GITHUB_CLIENT_ID 未配置');
    console.log('    ❌ NEXT_PUBLIC_GITHUB_CLIENT_ID 未配置');
    hasError = true;
  } else {
    console.log(`    ✅ NEXT_PUBLIC_GITHUB_CLIENT_ID 已配置`);
  }
  
  // 检查 Google OAuth 配置
  console.log('  🔧 检查 Google OAuth 前端配置...');
  if (!envVars.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    errors.push('NEXT_PUBLIC_GOOGLE_CLIENT_ID 未配置');
    console.log('    ❌ NEXT_PUBLIC_GOOGLE_CLIENT_ID 未配置');
    hasError = true;
  } else {
    console.log(`    ✅ NEXT_PUBLIC_GOOGLE_CLIENT_ID 已配置`);
  }
  
  console.log('');
}

// 检查数据库迁移状态
function checkDatabaseMigration() {
  console.log('🗄️  检查数据库配置...');
  
  // 检查 Prisma schema
  const schemaPath = path.join(__dirname, '..', 'packages', 'nvwax-server', 'prisma', 'schema.prisma');
  
  if (!fs.existsSync(schemaPath)) {
    warnings.push('Prisma schema 文件不存在');
    console.log('  ⚠️  Prisma schema 文件不存在');
    return;
  }
  
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  // 检查 social_accounts 模型
  if (schemaContent.includes('social_accounts') || schemaContent.includes('SocialAccount')) {
    console.log('  ✅ social_accounts 模型已在 Prisma schema 中定义');
  } else {
    warnings.push('social_accounts 模型可能未在 Prisma schema 中定义');
    console.log('  ⚠️  social_accounts 模型可能未定义');
  }
  
  console.log('');
}

// 检查路由配置
function checkRoutes() {
  console.log('🛣️  检查路由配置...');
  
  const routesPath = path.join(__dirname, '..', 'packages', 'nvwax-server', 'src', 'routes', 'index.ts');
  
  if (!fs.existsSync(routesPath)) {
    errors.push('路由配置文件不存在');
    console.log('  ❌ 路由配置文件不存在');
    hasError = true;
    return;
  }
  
  const routesContent = fs.readFileSync(routesPath, 'utf-8');
  
  // 检查 GitHub 路由
  if (routesContent.includes('/auth/github/login')) {
    console.log('  ✅ GitHub 登录路由已配置');
  } else {
    errors.push('GitHub 登录路由未配置');
    console.log('  ❌ GitHub 登录路由未配置');
    hasError = true;
  }
  
  if (routesContent.includes('/auth/github/authorize')) {
    console.log('  ✅ GitHub 授权路由已配置');
  } else {
    errors.push('GitHub 授权路由未配置');
    console.log('  ❌ GitHub 授权路由未配置');
    hasError = true;
  }
  
  if (routesContent.includes('/auth/github/callback')) {
    console.log('  ✅ GitHub 回调路由已配置');
  } else {
    errors.push('GitHub 回调路由未配置');
    console.log('  ❌ GitHub 回调路由未配置');
    hasError = true;
  }
  
  // 检查 Google 路由
  if (routesContent.includes('/auth/google/login')) {
    console.log('  ✅ Google 登录路由已配置');
  } else {
    errors.push('Google 登录路由未配置');
    console.log('  ❌ Google 登录路由未配置');
    hasError = true;
  }
  
  console.log('');
}

// 检查控制器
function checkControllers() {
  console.log('🎮 检查控制器配置...');
  
  const controllerPath = path.join(__dirname, '..', 'packages', 'nvwax-server', 'src', 'controllers', 'social-auth.controller.ts');
  
  if (!fs.existsSync(controllerPath)) {
    errors.push('社交登录控制器不存在');
    console.log('  ❌ 社交登录控制器不存在');
    hasError = true;
    return;
  }
  
  const controllerContent = fs.readFileSync(controllerPath, 'utf-8');
  
  // 检查 GitHub 方法
  if (controllerContent.includes('githubLogin')) {
    console.log('  ✅ githubLogin 方法已实现');
  } else {
    errors.push('githubLogin 方法未实现');
    console.log('  ❌ githubLogin 方法未实现');
    hasError = true;
  }
  
  if (controllerContent.includes('githubAuthorize')) {
    console.log('  ✅ githubAuthorize 方法已实现');
  } else {
    errors.push('githubAuthorize 方法未实现');
    console.log('  ❌ githubAuthorize 方法未实现');
    hasError = true;
  }
  
  if (controllerContent.includes('githubCallback')) {
    console.log('  ✅ githubCallback 方法已实现');
  } else {
    errors.push('githubCallback 方法未实现');
    console.log('  ❌ githubCallback 方法未实现');
    hasError = true;
  }
  
  console.log('');
}

// 检查前端组件
function checkFrontendComponents() {
  console.log('🎨 检查前端组件...');
  
  const githubButtonPath = path.join(__dirname, '..', 'packages', 'nvwax-web', 'components', 'auth', 'GitHubLoginButton.tsx');
  const githubCallbackPath = path.join(__dirname, '..', 'packages', 'nvwax-web', 'pages', 'auth', 'github-callback.tsx');
  const authApiPath = path.join(__dirname, '..', 'packages', 'nvwax-web', 'lib', 'api', 'auth.ts');
  
  // 检查 GitHub 登录按钮
  if (fs.existsSync(githubButtonPath)) {
    console.log('  ✅ GitHubLoginButton 组件已创建');
  } else {
    warnings.push('GitHubLoginButton 组件不存在');
    console.log('  ⚠️  GitHubLoginButton 组件不存在');
  }
  
  // 检查 GitHub 回调页面
  if (fs.existsSync(githubCallbackPath)) {
    console.log('  ✅ GitHub 回调页面已创建');
  } else {
    warnings.push('GitHub 回调页面不存在');
    console.log('  ⚠️  GitHub 回调页面不存在');
  }
  
  // 检查 Auth API
  if (fs.existsSync(authApiPath)) {
    const authApiContent = fs.readFileSync(authApiPath, 'utf-8');
    
    if (authApiContent.includes('githubLogin')) {
      console.log('  ✅ githubLogin API 方法已实现');
    } else {
      errors.push('githubLogin API 方法未实现');
      console.log('  ❌ githubLogin API 方法未实现');
      hasError = true;
    }
    
    if (authApiContent.includes('githubAuthorize')) {
      console.log('  ✅ githubAuthorize API 方法已实现');
    } else {
      errors.push('githubAuthorize API 方法未实现');
      console.log('  ❌ githubAuthorize API 方法未实现');
      hasError = true;
    }
  } else {
    errors.push('Auth API 文件不存在');
    console.log('  ❌ Auth API 文件不存在');
    hasError = true;
  }
  
  console.log('');
}

// 解析 .env 文件
function parseEnvFile(content) {
  const vars = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;
    
    const key = trimmed.substring(0, equalIndex).trim();
    let value = trimmed.substring(equalIndex + 1).trim();
    
    // 移除引号
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    }
    
    vars[key] = value;
  }
  
  return vars;
}

// 打印结果
function printResults() {
  console.log('='.repeat(60));
  console.log('');
  
  if (errors.length > 0) {
    console.log('❌ 发现以下错误：');
    errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  发现以下警告：');
    warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
    });
    console.log('');
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ 所有配置检查通过！');
    console.log('');
    console.log('🎉 你可以开始测试社交登录功能了！');
    console.log('');
    console.log('测试步骤：');
    console.log('  1. 启动后端：cd packages/nvwax-server && pnpm run dev');
    console.log('  2. 启动前端：cd packages/nvwax-web && pnpm run dev');
    console.log('  3. 访问 http://localhost:3000/login');
    console.log('  4. 点击 GitHub 或 Google 登录按钮');
  } else if (errors.length === 0) {
    console.log('✅ 配置基本正确，但有一些警告需要关注');
    console.log('');
    console.log('你可以尝试启动应用并测试社交登录功能。');
  } else {
    console.log('❌ 配置存在问题，请修复上述错误后再测试。');
  }
  
  console.log('');
  console.log('='.repeat(60));
}

// 主函数
function main() {
  try {
    checkBackendEnv();
    checkFrontendEnv();
    checkDatabaseMigration();
    checkRoutes();
    checkControllers();
    checkFrontendComponents();
    printResults();
    
    process.exit(errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ 验证脚本执行失败：', error);
    process.exit(1);
  }
}

main();
