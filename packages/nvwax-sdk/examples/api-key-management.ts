/**
 * Example: API Key Management
 * 
 * This example shows how to manage API keys programmatically.
 */

import { createClient } from '../src/index.js';

const adminApiKey = process.env.NVWAX_ADMIN_API_KEY || 'nvwx_admin_key_here';
const client = createClient(adminApiKey, {
  baseURL: 'http://localhost:3001'
});

async function main() {
  console.log('🔑 NvwaX SDK - API Key Management Example\n');
  
  try {
    // List existing API keys
    console.log('📋 Listing API keys...\n');
    const keys = await client.listApiKeys();
    
    if (keys.length === 0) {
      console.log('No API keys found.\n');
    } else {
      keys.forEach((key, index) => {
        console.log(`${index + 1}. ${key.name}`);
        console.log(`   Prefix: ${key.prefix}`);
        console.log(`   Active: ${key.is_active ? '✅' : '❌'}`);
        console.log(`   Rate limit: ${key.rate_limit}/hour`);
        if (key.expires_at) {
          console.log(`   Expires: ${new Date(key.expires_at).toLocaleDateString()}`);
        }
        console.log(`   Created: ${new Date(key.created_at).toLocaleDateString()}\n`);
      });
    }

    // Create new API key
    console.log('➕ Creating new API key...\n');
    const result = await client.createApiKey({
      name: 'Production Environment',
      tenantId: 'tenant-uuid-here', // Replace with actual tenant ID
      permissions: ['sdk:*', 'agents:*'],
      rateLimit: 1000,
      expiresInDays: 90
    });

    console.log('✅ API key created successfully!');
    console.log(`Name: ${result.data.name}`);
    console.log(`Prefix: ${result.data.prefix}`);
    console.log(`Secret: ${result.data.secret_key}`);
    console.log(`\n⚠️  WARNING: ${result.warning}`);
    console.log('Store this secret key securely. It will not be shown again!\n');

    // Get usage statistics
    console.log('📊 Fetching usage statistics...\n');
    const usage = await client.getUsage('month');
    
    console.log('Current Month Usage:');
    console.log(`  Requests: ${usage.requests}`);
    console.log(`  Tokens used: ${usage.tokens_used}`);
    console.log(`  Total cost: $${usage.cost.toFixed(2)}`);
    console.log(`  Avg response time: ${usage.avg_response_time_ms}ms\n`);

    console.log('✅ All operations completed!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
      console.error('Status:', error.statusCode);
    }
  }
}

main();
