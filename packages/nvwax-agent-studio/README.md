# @nvwax/agent-studio

Embeddable Agent Studio component for building AI agents with low-code visual editor.

## Installation

```bash
npm install @nvwax/agent-studio
```

## Usage

### HTML (Vanilla)

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@nvwax/agent-studio/dist/index.js"></script>
</head>
<body>
  <nvwax-agent-studio 
    api-key="your-api-key"
    base-url="https://studio.nvwax.com">
  </nvwax-agent-studio>

  <script>
    const studio = document.querySelector('nvwax-agent-studio');
    
    // Listen for events
    studio.addEventListener('agent-saved', (event) => {
      console.log('Agent saved:', event.detail);
    });
    
    studio.addEventListener('agent-published', (event) => {
      console.log('Agent published:', event.detail);
    });
  </script>
</body>
</html>
```

### React

```jsx
import { useRef, useEffect } from 'react';
import '@nvwax/agent-studio';

function App() {
  const studioRef = useRef(null);

  useEffect(() => {
    const studio = studioRef.current;
    
    const handleSaved = (event) => {
      console.log('Agent saved:', event.detail);
    };
    
    const handlePublished = (event) => {
      console.log('Agent published:', event.detail);
    };
    
    studio?.addEventListener('agent-saved', handleSaved);
    studio?.addEventListener('agent-published', handlePublished);
    
    return () => {
      studio?.removeEventListener('agent-saved', handleSaved);
      studio?.removeEventListener('agent-published', handlePublished);
    };
  }, []);

  const handleSave = () => {
    studioRef.current?.saveAgent();
  };

  const handlePublish = () => {
    studioRef.current?.publishAgent();
  };

  return (
    <div>
      <nvwax-agent-studio 
        ref={studioRef}
        api-key="your-api-key"
        base-url="https://studio.nvwax.com"
      />
      <button onClick={handleSave}>Save Agent</button>
      <button onClick={handlePublish}>Publish Agent</button>
    </div>
  );
}
```

### Vue

```vue
<template>
  <div>
    <nvwax-agent-studio 
      ref="studioRef"
      api-key="your-api-key"
      base-url="https://studio.nvwax.com"
      @agent-saved="handleSaved"
      @agent-published="handlePublished"
    />
    <button @click="saveAgent">Save Agent</button>
    <button @click="publishAgent">Publish Agent</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import '@nvwax/agent-studio';

const studioRef = ref(null);

const handleSaved = (event) => {
  console.log('Agent saved:', event.detail);
};

const handlePublished = (event) => {
  console.log('Agent published:', event.detail);
};

const saveAgent = () => {
  studioRef.value?.saveAgent();
};

const publishAgent = () => {
  studioRef.value?.publishAgent();
};
</script>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `api-key` | string | - | Your NvwaX API key (required) |
| `base-url` | string | `http://localhost:3001/studio` | Studio URL |
| `tenant-id` | string | - | Tenant ID (optional) |
| `initial-template` | string | - | Load specific template on start |
| `read-only` | boolean | `false` | Disable editing mode |
| `theme` | `'light' \| 'dark'` | `'light'` | UI theme |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `agent-saved` | `{ agentId, name, config }` | Fired when agent is saved |
| `agent-published` | `{ agentId, publicUrl }` | Fired when agent is published |

## Public Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `loadTemplate(templateId)` | `templateId: string` | `void` | Load a specific template |
| `saveAgent()` | - | `void` | Trigger save action |
| `publishAgent()` | - | `void` | Trigger publish action |
| `getAgentConfig()` | - | `Promise<any>` | Get current agent configuration |

## Features

✅ **iframe-based Embedding** - Secure isolation  
✅ **PostMessage Communication** - Seamless parent-child interaction  
✅ **Event System** - Listen to save/publish events  
✅ **Public API** - Control studio programmatically  
✅ **Responsive Design** - Adapts to container size  
✅ **Theme Support** - Light and dark modes  
✅ **Read-only Mode** - View-only access  

## Security

The iframe uses sandbox attributes:
- `allow-scripts` - Enable JavaScript
- `allow-same-origin` - Allow same-origin requests
- `allow-forms` - Enable form submission
- `allow-popups` - Allow popup windows

## PostMessage Protocol

### Parent → Iframe

```javascript
// Configure studio
{ type: 'CONFIGURE', data: { apiKey, tenantId, ... } }

// Load template
{ type: 'LOAD_TEMPLATE', data: { templateId } }

// Save agent
{ type: 'SAVE_AGENT' }

// Publish agent
{ type: 'PUBLISH_AGENT' }

// Get config
{ type: 'GET_AGENT_CONFIG' }
```

### Iframe → Parent

```javascript
// Studio ready
{ type: 'STUDIO_READY' }

// Agent saved
{ type: 'AGENT_SAVED', data: { agentId, name, config } }

// Agent published
{ type: 'AGENT_PUBLISHED', data: { agentId, publicUrl } }

// Error
{ type: 'ERROR', data: { message } }

// Agent config response
{ type: 'AGENT_CONFIG', data: { ... } }
```

## Development

```bash
npm install
npm run dev      # Development mode
npm run build    # Production build
```

## License

MIT
