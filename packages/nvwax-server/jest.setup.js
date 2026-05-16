// Jest 全局设置 - CommonJS format
const dotenv = require('dotenv');

// 加载环境变量（使用测试环境配置）
dotenv.config({ path: '.env.test' });

// 设置测试超时时间
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}
