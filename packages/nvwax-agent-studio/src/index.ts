import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface AgentStudioConfig {
  apiKey: string;
  tenantId?: string;
  initialTemplate?: string;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
}

/**
 * NvwaX Agent Studio Embed Component
 * 
 * Provides an iframe-based embedding solution for the low-code agent builder.
 * Supports PostMessage communication for seamless integration.
 * 
 * Usage:
 * ```html
 * <nvwax-agent-studio 
 *   api-key="your-api-key"
 *   base-url="https://studio.nvwax.com">
 * </nvwax-agent-studio>
 * ```
 */
@customElement('nvwax-agent-studio')
export class NvwaXAgentStudio extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 600px;
    }

    .studio-container {
      width: 100%;
      height: 100%;
      position: relative;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 8px;
      overflow: hidden;
    }

    .studio-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f4f6;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-message {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #ef4444;
      padding: 20px;
    }
  `;

  @property({ type: String, attribute: 'api-key' })
  apiKey: string = '';

  @property({ type: String, attribute: 'base-url' })
  baseUrl: string = 'http://localhost:3001/studio';

  @property({ type: String, attribute: 'tenant-id' })
  tenantId?: string;

  @property({ type: String, attribute: 'initial-template' })
  initialTemplate?: string;

  @property({ type: Boolean, attribute: 'read-only' })
  readOnly: boolean = false;

  @property({ type: String, attribute: 'theme' })
  theme: 'light' | 'dark' = 'light';

  @property({ type: Boolean })
  loading: boolean = true;

  @property({ type: String })
  error: string | null = null;

  private iframeRef: HTMLIFrameElement | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.setupMessageListener();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeMessageListener();
  }

  private setupMessageListener() {
    this.messageHandler = (event: MessageEvent) => {
      // Verify message source
      if (!this.baseUrl || !event.origin.includes(new URL(this.baseUrl).hostname)) {
        return;
      }

      // Handle messages from iframe
      const { type, data } = event.data;

      switch (type) {
        case 'STUDIO_READY':
          this.handleStudioReady();
          break;
        case 'AGENT_SAVED':
          this.handleAgentSaved(data);
          break;
        case 'AGENT_PUBLISHED':
          this.handleAgentPublished(data);
          break;
        case 'ERROR':
          this.handleError(data);
          break;
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  private removeMessageListener() {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }

  private handleStudioReady() {
    this.loading = false;
    
    // Send configuration to iframe
    this.sendMessageToIframe({
      type: 'CONFIGURE',
      data: {
        apiKey: this.apiKey,
        tenantId: this.tenantId,
        template: this.initialTemplate,
        readOnly: this.readOnly,
        theme: this.theme
      }
    });
  }

  private handleAgentSaved(data: any) {
    console.log('Agent saved:', data);
    this.dispatchEvent(new CustomEvent('agent-saved', {
      detail: data,
      bubbles: true,
      composed: true
    }));
  }

  private handleAgentPublished(data: any) {
    console.log('Agent published:', data);
    this.dispatchEvent(new CustomEvent('agent-published', {
      detail: data,
      bubbles: true,
      composed: true
    }));
  }

  private handleError(data: any) {
    console.error('Studio error:', data);
    this.error = data.message || 'An error occurred';
    this.loading = false;
  }

  private sendMessageToIframe(message: any) {
    if (this.iframeRef && this.iframeRef.contentWindow) {
      this.iframeRef.contentWindow.postMessage(message, this.baseUrl);
    }
  }

  /**
   * Public API: Load a specific agent template
   */
  loadTemplate(templateId: string) {
    this.sendMessageToIframe({
      type: 'LOAD_TEMPLATE',
      data: { templateId }
    });
  }

  /**
   * Public API: Save current agent
   */
  saveAgent() {
    this.sendMessageToIframe({
      type: 'SAVE_AGENT'
    });
  }

  /**
   * Public API: Publish current agent
   */
  publishAgent() {
    this.sendMessageToIframe({
      type: 'PUBLISH_AGENT'
    });
  }

  /**
   * Public API: Get current agent configuration
   */
  getAgentConfig(): Promise<any> {
    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data.type === 'AGENT_CONFIG') {
          window.removeEventListener('message', handler);
          resolve(event.data.data);
        }
      };
      
      window.addEventListener('message', handler);
      this.sendMessageToIframe({ type: 'GET_AGENT_CONFIG' });
    });
  }

  render() {
    const iframeSrc = `${this.baseUrl}?embed=true&apiKey=${encodeURIComponent(this.apiKey)}`;

    return html`
      <div class="studio-container">
        ${this.loading ? html`
          <div class="loading-overlay">
            <div class="loading-spinner"></div>
          </div>
        ` : ''}
        
        ${this.error ? html`
          <div class="error-message">
            <p>❌ ${this.error}</p>
          </div>
        ` : ''}

        <iframe
          class="studio-iframe"
          src=${iframeSrc}
          @load=${() => { this.loading = false; }}
          allow="clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        ></iframe>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nvwax-agent-studio': NvwaXAgentStudio;
  }
}
