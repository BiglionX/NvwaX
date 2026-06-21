#!/usr/bin/env node

/**
 * 社交登录配置向导
 * 
 * 交互式配置 GitHub 和 Google OAuth
 * 
 * 使用方法：
 *   node scripts/social-login-setup-wizard.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 NvwaX 社交登录配置向导\n');
console.log('此向导将帮助你配置 GitHub 和 Google 社交登录。\n');

// 配置数据存储
const config = {
  github: {
    clientId: '',
    clientSecret: '',
  },
  google: {
    clientId: '',
  },
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:3001',
};

// 主菜单
async function mainMenu() {
  console.log('\n📋 主菜单：');
  console.log('  1. 配置 GitHub OAuth');
  console.log('  2. 配置 Google OAuth');
  console.log('  3. 配置前端和后端 URL');
  console.log('  4. 生成环境变量文件');
  console.log('  5. 验证配置');
  console.log('  6. 查看完整配置指南');
  console.log('  0. 退出');
  
  const choice = await question('\n请选择 (0-6): ');
  
  switch (choice.trim()) {
    case '1':
      await configureGitHub();
      break;
    case '2':
      await configureGoogle();
      break;
    case '3':
      await configureUrls();
      break;
    case '4':
      await generateEnvFiles();
      break;
    case '5':
      await validateConfig();
      break;
    case '6':
      await showFullGuide();
      break;
    case '0':
      console.log('\n👋 再见！');
      rl.close();
      return;
    default:
      console.log('\n❌ 无效选择，请重试');
  }
  
  await mainMenu();
}

// 配置 GitHub OAuth
async function configureGitHub() {
  console.log('\n🔧 配置 GitHub OAuth\n');
  console.log('步骤：');
  console.log('  1. 访问 https://github.com/settings/developers');
  console.log('  2. 点击 "New OAuth App"');
  console.log('  3. 填写应用信息：');
  console.log(`     - Application name: NvwaX`);
  console.log(`     - Homepage URL: ${config.frontendUrl}`);
  console.log(`     - Authorization callback URL: ${config.backendUrl}/api/auth/github/callback`);
  console.log('  4. 复制 Client ID 和 Client Secret\n');
  
  const clientId = await question('请输入 GitHub Client ID: ');
  config.github.clientId = clientId.trim();
  
  const clientSecret = await question('请输入 GitHub Client Secret: ');
  config.github.clientSecret = clientSecret.trim();
  
  console.log('\n✅ GitHub OAuth 配置已保存\n');
  
  if (!fs.existsSync(path.join(__dirname, '..', 'packages', 'nvwax-server', '.env'))) {
    const createEnv = await question('是否基于 .env.example 创建 .env 文件？(y/n): ');
    if (createEnv.toLowerCase() === 'y') {
      await createBackendEnv();
    }
  }
}

// 配置 Google OAuth
async function configureGoogle() {
  console.log('\n🔧 配置 Google OAuth\n');
  console.log('步骤：');
  console.log('  1. 访问 https://console.cloud.google.com/');
  console.log('  2. 创建项目并配置 OAuth 同意屏幕');
  console.log('  3. 创建 OAuth 客户端 ID（Web 应用类型）');
  console.log('  4. 添加授权的 JavaScript 来源：');
  console.log(`     - ${config.frontendUrl}`);
  console.log('  5. 复制 Client ID\n');
  
  const clientId = await question('请输入 Google Client ID: ');
  config.google.clientId = clientId.trim();
  
  console.log('\n✅ Google OAuth 配置已保存\n');
}

// 配置 URL
async function configureUrls() {
  console.log('\n🔧 配置 URL\n');
  
  const frontendUrl = await question(`前端 URL (当前: ${config.frontendUrl}): `);
  if (frontendUrl.trim()) {
    config.frontendUrl = frontendUrl.trim();
  }
  
  const backendUrl = await question(`后端 URL (当前: ${config.backendUrl}): `);
  if (backendUrl.trim()) {
    config.backendUrl = backendUrl.trim();
  }
  
  console.log('\n✅ URL 配置已更新\n');
  console.log(`  前端 URL: ${config.frontendUrl}`);
  console.log(`  后端 URL: ${config.backendUrl}`);
  console.log(`  GitHub 回调 URL: ${config.backendUrl}/api/auth/github/callback\n`);
}

// 生成环境变量文件
async function generateEnvFiles() {
  console.log('\n📝 生成环境变量文件\n');
  
  // 后端 .env
  const backendEnvPath = path.join(__dirname, '..', 'packages', 'nvwax-server', '.env');
  let backendEnvContent = '';
  
  if (fs.existsSync(backendEnvPath)) {
    backendEnvContent = fs.readFileSync(backendEnvPath, 'utf-8');
    console.log('  ⚠️  后端 .env 文件已存在，将追加配置\n');
  } else {
    // 基于 .env.example 创建
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    if (fs.existsSync(envExamplePath)) {
      backendEnvContent = fs.readFileSync(envExamplePath, 'utf-8');
    }
  }
  
  // 追加 GitHub 配置
  if (config.github.clientId && config.github.clientSecret) {
    backendEnvContent += `\n# GitHub OAuth\n`;
    backendEnvContent += `GITHUB_CLIENT_ID=${config.github.clientId}\n`;
    backendEnvContent += `GITHUB_CLIENT_SECRET=${config.github.clientSecret}\n`;
    console.log('  ✅ 已添加 GitHub OAuth 配置到后端 .env');
  }
  
  // 追加 Google 配置
  if (config.google.clientId) {
    backendEnvContent += `\n# Google OAuth\n`;
    backendEnvContent += `GOOGLE_CLIENT_ID=${config.google.clientId}\n`;
    console.log('  ✅ 已添加 Google OAuth 配置到后端 .env');
  }
  
  // 保存后端 .env
  const saveBackend = await question('\n是否保存后端 .env 文件？(y/n): ');
  if (saveBackend.toLowerCase() === 'y') {
    fs.writeFileSync(backendEnvPath, backendEnvContent, 'utf-8');
    console.log(`  ✅ 后端 .env 文件已保存到: ${backendEnvPath}\n`);
  }
  
  // 前端 .env.local
  const frontendEnvPath = path.join(__dirname, '..', 'packages', 'nvwax-web', '.env.local');
  let frontendEnvContent = '';
  
  if (fs.existsSync(frontendEnvPath)) {
    frontendEnvContent = fs.readFileSync(frontendEnvPath, 'utf-8');
    console.log('  ⚠️  前端 .env.local 文件已存在，将追加配置\n');
  }
  
  // 追加前端配置
  if (config.github.clientId) {
    frontendEnvContent += `\n# GitHub OAuth\n`;
    frontendEnvContent += `NEXT_PUBLIC_GITHUB_CLIENT_ID=${config.github.clientId}\n`;
    console.log('  ✅ 已添加 GitHub OAuth 配置到前端 .env.local');
  }
  
  if (config.google.clientId) {
    frontendEnvContent += `\n# Google OAuth\n`;
    frontendEnvContent += `NEXT_PUBLIC_GOOGLE_CLIENT_ID=${config.google.clientId}\n`;
    console.log('  ✅ 已添加 Google OAuth 配置到前端 .env.local');
  }
  
  // 保存前端 .env.local
  const saveFrontend = await question('\n是否保存前端 .env.local 文件？(y/n): ');
  if (saveFrontend.toLowerCase() === 'y') {
    fs.writeFileSync(frontendEnvPath, frontendEnvContent, 'utf-8');
    console.log(`  ✅ 前端 .env.local 文件已保存到: ${frontendEnvPath}\n`);
  }
}

// 验证配置
async function validateConfig() {
  console.log('\n🔍 验证配置...\n');
  
  let hasError = false;
  
  // 检查 GitHub 配置
  console.log('🔧 检查 GitHub OAuth 配置...');
  if (!config.github.clientId) {
    console.log('  ❌ GitHub Client ID 未配置');
    hasError = true;
  } else {
    console.log(`  ✅ GitHub Client ID: ${config.github.clientId.substring(0, 10)}...`);
  }
  
  if (!config.github.clientSecret) {
    console.log('  ❌ GitHub Client Secret 未配置');
    hasError = true;
  } else {
    console.log(`  ✅ GitHub Client Secret: ${config.github.clientSecret.substring(0, 10)}...`);
  }
  
  // 检查 Google 配置
  console.log('\n🔧 检查 Google OAuth 配置...');
  if (!config.google.clientId) {
    console.log('  ❌ Google Client ID 未配置');
    hasError = true;
  } else {
    console.log(`  ✅ Google Client ID: ${config.google.clientId.substring(0, 10)}...`);
  }
  
  console.log('');
  
  if (hasError) {
    console.log('❌ 配置不完整，请继续配置\n');
  } else {
    console.log('✅ 配置完整！\n');
    console.log('下一步：');
    console.log('  1. 运行数据库迁移：pnpm run db:migrate');
    console.log('  2. 启动后端：cd packages/nvwax-server && pnpm run dev');
    console.log('  3. 启动前端：cd packages/nvwax-web && pnpm run dev');
    console.log('  4. 访问 http://localhost:3000/login 测试登录\n');
  }
}

// 显示完整配置指南
async function showFullGuide() {
  console.log('\n📚 完整配置指南\n');
  console.log('请查看以下文档：');
  console.log('  - 快速配置指南：SOCIAL_LOGIN_QUICK_START.md');
  console.log('  - 完整配置指南：SOCIAL_LOGIN_SETUP_GUIDE.md\n');
  console.log('也可以访问以下链接创建 OAuth App：');
  console.log('  - GitHub: https://github.com/settings/developers');
  console.log('  - Google: https://console.cloud.google.com/\n');
  
  const openDocs = await question('是否在浏览器中打开配置指南？(y/n): ');
  if (openDocs.toLowerCase() === 'y') {
    console.log('\n请手动打开以下文件查看完整指南：');
    console.log('  - d:\\BigLionX\\NvwaX\\SOCIAL_LOGIN_QUICK_START.md');
    console.log('  - d:\\BigLionX\\NvwaX\\SOCIAL_LOGIN_SETUP_GUIDE.md\n');
  }
}

// 创建后端 .env 文件
async function createBackendEnv() {
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  const envPath = path.join(__dirname, '..', 'packages', 'nvwax-server', '.env');
  
  if (fs.existsSync(envExamplePath)) {
    const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');
    fs.writeFileSync(envPath, envExampleContent, 'utf-8');
    console.log('  ✅ 已基于 .env.example 创建 .env 文件\n');
  } else {
    console.log('  ❌ .env.example 文件不存在\n');
  }
}

// 辅助函数：提问
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

// 启动向导
mainMenu().catch((error) => {
  console.error('❌ 向导执行失败：', error);
  rl.close();
  process.exit(1);
});
