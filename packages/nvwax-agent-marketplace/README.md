# @nvwax/agent-marketplace

Web Component for embedding the NvwaX Agent Marketplace in any web application.

## Installation

```bash
npm install @nvwax/agent-marketplace
```

## Usage

### HTML (Vanilla)

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@nvwax/agent-marketplace/dist/index.js"></script>
</head>
<body>
  <nvwax-agent-marketplace 
    api-key="your-api-key"
    base-url="https://api.nvwax.com">
  </nvwax-agent-marketplace>

  <script>
    const marketplace = document.querySelector('nvwax-agent-marketplace');
    
    marketplace.addEventListener('skill-selected', (event) => {
      console.log('Selected skill:', event.detail.skill);
    });
  </script>
</body>
</html>
```

### React

```jsx
import { useEffect } from 'react';
import '@nvwax/agent-marketplace';

function App() {
  useEffect(() => {
    const marketplace = document.querySelector('nvwax-agent-marketplace');
    
    const handler = (event) => {
      console.log('Selected skill:', event.detail.skill);
    };
    
    marketplace?.addEventListener('skill-selected', handler);
    
    return () => {
      marketplace?.removeEventListener('skill-selected', handler);
    };
  }, []);

  return (
    <nvwax-agent-marketplace 
      api-key="your-api-key"
      base-url="https://api.nvwax.com"
    />
  );
}
```

### Vue

```vue
<template>
  <nvwax-agent-marketplace 
    api-key="your-api-key"
    base-url="https://api.nvwax.com"
    @skill-selected="handleSkillSelected"
  />
</template>

<script setup>
import '@nvwax/agent-marketplace';

const handleSkillSelected = (event) => {
  console.log('Selected skill:', event.detail.skill);
};
</script>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `api-key` | string | - | Your NvwaX API key (required) |
| `base-url` | string | `http://localhost:3001` | API base URL |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `skill-selected` | `{ skill: AgentSkill }` | Fired when user selects an agent |

## Features

✅ **Responsive Design** - Works on desktop and mobile  
✅ **Search & Filter** - Search by name/description, filter by category  
✅ **Customizable** - Theme via CSS custom properties  
✅ **Framework Agnostic** - Works with React, Vue, Angular, or vanilla JS  
✅ **Shadow DOM** - Encapsulated styles, no conflicts  

## Customization

### CSS Custom Properties

```css
nvwax-agent-marketplace {
  --primary-color: #6366f1;
  --secondary-color: #8b5cf6;
  --background-color: #ffffff;
  --text-color: #1f2937;
  --border-color: #e5e7eb;
  --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

## Development

```bash
npm install
npm run dev      # Development mode
npm run build    # Production build
npm run serve    # Local development server
```

## License

MIT
