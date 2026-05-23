/**
 * 验证生产环境配置文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 验证生产环境配置...\n');

// 检查 .env.production 文件是否存在
const projectRoot = path.join(__dirname, '../../..');
const envProductionPath = path.join(projectRoot, '.env.production');
const passwordRecordPath = path.join(projectRoot, 'PASSWORD_RECORD.md');

let hasErrors = false;

// 1. 检查 .env.production 文件
console.log('1️⃣  检查 .env.production 文件...');
if (fs.existsSync(envProductionPath)) {
  console.log('   ✅ 文件存在');
  
  const content = fs.readFileSync(envProductionPath, 'utf-8');
  
  // 检查是否包含占位符
  if (content.includes('your_secure_password_here')) {
    console.log('   ❌ 警告: 仍包含占位符 "your_secure_password_here"');
    hasErrors = true;
  } else {
    console.log('   ✅ 数据库密码已设置');
  }
  
  if (content.includes('your_production_jwt_secret_here')) {
    console.log('   ❌ 警告: 仍包含占位符 "your_production_jwt_secret_here"');
    hasErrors = true;
  } else {
    console.log('   ✅ JWT密钥已设置');
  }
  
  if (content.includes('your_deepseek_api_key_here') || content.includes('your_openai_api_key_here')) {
    console.log('   ⚠️  提示: AI API密钥仍为占位符（如不使用可忽略）');
  }
  
  // 提取并显示关键配置（隐藏敏感信息）
  const lines = content.split('\n');
  const dbPasswordLine = lines.find(line => line.startsWith('DB_PASSWORD='));
  const jwtSecretLine = lines.find(line => line.startsWith('JWT_SECRET='));
  
  if (dbPasswordLine) {
    const password = dbPasswordLine.split('=')[1];
    console.log(`   📊 数据库密码长度: ${password.length} 字符`);
    console.log(`   🔒 密码强度: ${password.length >= 32 ? '强' : '弱'}`);
  }
  
  if (jwtSecretLine) {
    const secret = jwtSecretLine.split('=')[1];
    console.log(`   📊 JWT密钥长度: ${secret.length} 字符`);
    console.log(`   🔒 密钥强度: ${secret.length >= 48 ? '强' : '弱'}`);
  }
  
} else {
  console.log('   ❌ 文件不存在');
  hasErrors = true;
}

console.log();

// 2. 检查 PASSWORD_RECORD.md 文件
console.log('2️⃣  检查 PASSWORD_RECORD.md 文件...');
if (fs.existsSync(passwordRecordPath)) {
  console.log('   ✅ 密码记录文件存在');
  console.log('   ⚠️  提醒: 请妥善保存此文件，不要上传到公开仓库');
} else {
  console.log('   ⚠️  密码记录文件不存在（建议创建以备份密码）');
}

console.log();

// 3. 检查 .gitignore
console.log('3️⃣  检查 .gitignore 配置...');
const gitignorePath = path.join(projectRoot, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  
  if (gitignoreContent.includes('.env.production')) {
    console.log('   ✅ .env.production 已在 .gitignore 中');
  } else {
    console.log('   ❌ 警告: .env.production 未加入 .gitignore');
    hasErrors = true;
  }
  
  if (gitignoreContent.includes('PASSWORD_RECORD.md')) {
    console.log('   ✅ PASSWORD_RECORD.md 已在 .gitignore 中');
  } else {
    console.log('   ⚠️  提示: PASSWORD_RECORD.md 未加入 .gitignore');
  }
} else {
  console.log('   ❌ .gitignore 文件不存在');
  hasErrors = true;
}

console.log();

// 4. 总结
console.log('═══════════════════════════════════════');
if (hasErrors) {
  console.log('❌ 验证失败: 发现需要修复的问题');
  console.log('');
  console.log('📝 建议操作:');
  console.log('   1. 编辑 .env.production 文件');
  console.log('   2. 替换所有占位符为实际值');
  console.log('   3. 重新运行验证');
} else {
  console.log('✅ 验证通过: 生产环境配置就绪');
  console.log('');
  console.log('🚀 下一步:');
  console.log('   1. 使用 Docker Compose 启动服务');
  console.log('   2. 导入冷启动数据');
  console.log('   3. 测试应用功能');
}
console.log('═══════════════════════════════════════');

process.exit(hasErrors ? 1 : 0);
