/**
 * Example: Advanced Chat with Full Control
 * 
 * This example demonstrates advanced chat completion features including
 * system messages, temperature control, and token usage tracking.
 */

import { createClient, ChatMessage } from '../src/index.js';

const apiKey = process.env.NVWAX_API_KEY || 'nvwx_your_api_key_here';
const client = createClient(apiKey, {
  baseURL: 'http://localhost:3001'
});

async function main() {
  console.log('🤖 NvwaX SDK - Advanced Chat Example\n');
  
  try {
    // Multi-turn conversation with system message
    const messages: ChatMessage[] = [
      { 
        role: 'system', 
        content: 'You are an expert marketing consultant with 10 years of experience.' 
      },
      { 
        role: 'user', 
        content: 'I need help improving my SaaS product conversion rates. Current rate is 2%.' 
      }
    ];

    console.log('System: You are an expert marketing consultant...');
    console.log('User: I need help improving my SaaS product conversion rates...\n');

    const response = await client.createChatCompletion({
      model: 'marketing-team-v1',
      messages,
      temperature: 0.7,
      max_tokens: 500,
      top_p: 0.9
    });

    console.log('Assistant:', response.choices[0].message.content);
    console.log('\n--- Usage Statistics ---');
    console.log(`Prompt tokens: ${response.usage.prompt_tokens}`);
    console.log(`Completion tokens: ${response.usage.completion_tokens}`);
    console.log(`Total tokens: ${response.usage.total_tokens}`);
    console.log(`Estimated cost: $${(response.usage.total_tokens * 0.000002).toFixed(4)}`);

    // Continue conversation
    messages.push(response.choices[0].message);
    messages.push({ 
      role: 'user' as const, 
      content: 'Can you provide specific A/B testing strategies?' 
    });

    console.log('\n\nUser: Can you provide specific A/B testing strategies?\n');

    const response2 = await client.createChatCompletion({
      model: 'marketing-team-v1',
      messages,
      temperature: 0.8
    });

    console.log('Assistant:', response2.choices[0].message.content);
    console.log('\n✅ Conversation completed!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}

main();
