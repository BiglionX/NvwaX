/**
 * Example: Basic Chat Completion
 * 
 * This example shows how to send a simple chat message using the NvwaX SDK.
 */

import { createClient } from '../src/index.js';

// Initialize client with your API key
const apiKey = process.env.NVWAX_API_KEY || 'nvwx_your_api_key_here';
const client = createClient(apiKey, {
  baseURL: 'http://localhost:3001'
});

async function main() {
  console.log('🤖 NvwaX SDK - Basic Chat Example\n');
  
  try {
    // Simple chat
    console.log('User: How to improve email marketing?');
    const response = await client.chat('How to improve email marketing?');
    
    console.log('\nAssistant:', response);
    console.log('\n✅ Done!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

main();
