# @nvwax/sdk

Official NvwaX SDK for Node.js and browsers. Provides easy access to NvwaX AI services including chat completions, API key management, and usage tracking.

## Installation

```bash
npm install @nvwax/sdk
# or
yarn add @nvwax/sdk
# or
pnpm add @nvwax/sdk
```

## Quick Start

```typescript
import { createClient } from '@nvwax/sdk';

// Initialize the client with your API key
const client = createClient('nvwx_your_api_key_here');

// Send a chat message
async function main() {
  const response = await client.chat('How to improve email marketing?');
  console.log(response);
}

main();
```

## Features

- ✅ **OpenAI-compatible API** - Works with existing OpenAI code
- ✅ **TypeScript support** - Full type definitions included
- ✅ **Error handling** - Custom error classes with detailed information
- ✅ **API Key management** - Create, list, and delete API keys
- ✅ **Usage tracking** - Monitor your API usage and costs
- ✅ **Permission checking** - Verify user permissions
- ✅ **Browser & Node.js** - Works in both environments

## API Reference

### Chat Completions

#### `client.chat(message, model?)`

Simple method for sending chat messages.

```typescript
const answer = await client.chat('What is machine learning?');
console.log(answer);
```

#### `client.createChatCompletion(request)`

Full control over chat completion parameters.

```typescript
const response = await client.createChatCompletion({
  model: 'marketing-team-v1',
  messages: [
    { role: 'system', content: 'You are a marketing expert.' },
    { role: 'user', content: 'How to increase conversion rates?' }
  ],
  temperature: 0.7,
  max_tokens: 500
});

console.log(response.choices[0].message.content);
console.log(`Tokens used: ${response.usage.total_tokens}`);
```

### API Key Management

#### List API Keys

```typescript
const keys = await client.listApiKeys();
keys.forEach(key => {
  console.log(`${key.name}: ${key.prefix}...`);
});
```

#### Create API Key

```typescript
const result = await client.createApiKey({
  name: 'Production Key',
  tenantId: 'tenant-uuid-here',
  permissions: ['sdk:*'],
  rateLimit: 1000,
  expiresInDays: 90
});

// IMPORTANT: Store the secret key securely!
console.log('Secret key:', result.data.secret_key);
console.log('Warning:', result.warning);
```

#### Delete API Key

```typescript
await client.deleteApiKey('api-key-id-here');
```

### Usage Tracking

```typescript
// Get monthly usage statistics
const stats = await client.getUsage('month');
console.log(`Requests: ${stats.requests}`);
console.log(`Tokens used: ${stats.tokens_used}`);
console.log(`Cost: $${stats.cost.toFixed(2)}`);
```

### Permission Checking

```typescript
const hasPermission = await client.checkPermission('user-id', 'sdk:chat:create');
if (hasPermission) {
  console.log('User can create chat completions');
}
```

## Configuration

### Base URL

By default, the SDK connects to `http://localhost:3001`. You can change this:

```typescript
const client = createClient('your-api-key', {
  baseURL: 'https://api.nvwax.com'
});
```

Or update it later:

```typescript
client.setBaseURL('https://api.nvwax.com');
```

### Timeout

Set custom timeout (in milliseconds):

```typescript
const client = createClient('your-api-key', {
  timeout: 60000 // 60 seconds
});
```

### Custom Headers

Add custom headers to all requests:

```typescript
client.setHeaders({
  'X-Custom-Header': 'value',
  'X-Request-ID': 'unique-id'
});
```

## Error Handling

The SDK throws `NvwaXError` for all API errors:

```typescript
import { NvwaXError } from '@nvwax/sdk';

try {
  const response = await client.chat('Hello');
} catch (error) {
  if (error instanceof NvwaXError) {
    console.error(`Error code: ${error.code}`);
    console.error(`Status: ${error.statusCode}`);
    console.error(`Message: ${error.message}`);
    
    // Rate limit specific handling
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      console.log(`Retry after: ${error.details.retryAfter} seconds`);
    }
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTH_ERROR` | 401 | Invalid API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |
| `NETWORK_ERROR` | 0 | No response from server |
| `REQUEST_ERROR` | 0 | Request configuration error |

## Examples

### Multi-turn Conversation

```typescript
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is AI?' }
];

// First message
const response1 = await client.createChatCompletion({
  model: 'general-assistant-v1',
  messages
});

messages.push(response1.choices[0].message);
messages.push({ role: 'user', content: 'Can you give examples?' });

// Continue conversation
const response2 = await client.createChatCompletion({
  model: 'general-assistant-v1',
  messages
});

console.log(response2.choices[0].message.content);
```

### Batch Processing

```typescript
const questions = [
  'What is machine learning?',
  'How does neural network work?',
  'Explain deep learning'
];

const answers = await Promise.all(
  questions.map(q => client.chat(q))
);

answers.forEach((answer, index) => {
  console.log(`Q${index + 1}: ${questions[index]}`);
  console.log(`A${index + 1}: ${answer}\n`);
});
```

### Streaming (Future)

*Note: Streaming support will be added in future versions.*

```typescript
// Coming soon
const stream = await client.createChatCompletion({
  model: 'marketing-team-v1',
  messages: [{ role: 'user', content: 'Write a blog post' }],
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0].delta.content);
}
```

## Browser Support

The SDK works in modern browsers. Include it via CDN or bundle it with your build tool:

### Via CDN

```html
<script src="https://cdn.jsdelivr.net/npm/@nvwax/sdk/dist/index.min.js"></script>
<script>
  const client = NvwaX.createClient('your-api-key', {
    baseURL: 'https://api.nvwax.com'
  });
  
  client.chat('Hello').then(console.log);
</script>
```

### With Build Tools

Works with Webpack, Vite, Rollup, etc.

```typescript
import { createClient } from '@nvwax/sdk';

const client = createClient('your-api-key');
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## Migration from OpenAI SDK

If you're already using OpenAI SDK, migration is simple:

```typescript
// Before (OpenAI)
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: 'sk-...' });

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }]
});

// After (NvwaX)
import { createClient } from '@nvwax/sdk';
const nvwax = createClient('nvwx_...');

const response = await nvwax.createChatCompletion({
  model: 'marketing-team-v1',
  messages: [{ role: 'user', content: 'Hello' }]
});
```

## License

MIT

## Support

- 📖 Documentation: https://docs.nvwax.com
- 💬 Discord: https://discord.gg/nvwax
- 🐛 Issues: https://github.com/BigLionX/NvwaX/issues
- 📧 Email: support@nvwax.com

## Changelog

### v1.0.0 (2026-04-26)

- Initial release
- Chat completions API
- API key management
- Usage tracking
- Permission checking
- TypeScript support
- Browser compatibility
