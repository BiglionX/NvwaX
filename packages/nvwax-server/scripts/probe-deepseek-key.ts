/**
 * 一次性 DeepSeek API 探测：验证当前 .env 里的 DEEPSEEK_API_KEY 是否有效
 * ------------------------------------------------------------
 * 运行：pnpm --filter nvwax-server exec tsx scripts/probe-deepseek-key.ts
 * 退出码：0=有效，1=无效
 */

import dotenv from 'dotenv';
import path from 'node:path';
dotenv.config({ path: path.join(process.cwd(), '../../.env') });

import { LlmService } from '../src/services/llm/llm.service.js';

async function main() {
  const key = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('❌ DEEPSEEK_API_KEY / OPENAI_API_KEY 未设置');
    process.exit(1);
  }
  console.log(`🔍 已加载 key (length=${key.length}) — 为避免日志泄露，不打印 key 任何片段`);
  console.log(`🌐 baseURL = ${process.env.OPENAI_BASE_URL || '(默认 https://api.deepseek.com)'}`);

  const llm = new LlmService();
  if (!llm.isConfigured) {
    console.error('❌ LlmService 未配置（key 缺失或客户端初始化失败）');
    process.exit(1);
  }

  try {
    const t0 = Date.now();
    const result = await llm.createCompletion({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: '回复 OK' }],
      maxTokens: 5,
    });
    console.log(`✅ 调用成功（${Date.now() - t0}ms）`);
    console.log(`   content: ${JSON.stringify(result.content)}`);
    console.log(`   model: ${result.model}`);
    console.log(`   usage: ${JSON.stringify(result.usage)}`);
    process.exit(0);
  } catch (e: any) {
    console.error(`❌ 调用失败：${e?.message ?? e}`);
    if (e?.status) console.error(`   status: ${e.status}`);
    if (e?.error) console.error(`   error: ${JSON.stringify(e.error)}`);
    if (e?.cause) console.error(`   cause: ${e.cause?.message ?? e.cause}`);
    process.exit(1);
  }
}

main();
