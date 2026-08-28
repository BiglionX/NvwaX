import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  rating?: number;
  usage_count?: number;
}

export interface AgentDetail {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: string[];
  thumbnailUrl?: string;
  rating?: number;
  downloadCount?: number;
  usageCount?: number;
  author?: { id: string; name: string };
  relatedAgents?: AgentSkill[];
  skills?: string[];
}

/**
 * NvwaX Agent Marketplace Web Component
 * 
 * Usage:
 * ```html
 * <nvwax-agent-marketplace api-key="your-api-key"></nvwax-agent-marketplace>
 * ```
 */
@customElement('nvwax-agent-marketplace')
export class NvwaXAgentMarketplace extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --primary-color: #6366f1;
      --secondary-color: #8b5cf6;
      --background-color: #ffffff;
      --text-color: #1f2937;
      --border-color: #e5e7eb;
      --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .marketplace-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--border-color);
    }

    .header h1 {
      margin: 0;
      color: var(--primary-color);
      font-size: 28px;
    }

    .search-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    .search-bar input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-bar input:focus {
      border-color: var(--primary-color);
    }

    .category-filters {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .category-btn {
      padding: 8px 16px;
      border: 1px solid var(--border-color);
      background: var(--background-color);
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
    }

    .category-btn:hover {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }

    .category-btn.active {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }

    .skills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .skill-card {
      background: var(--background-color);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      box-shadow: var(--card-shadow);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }

    .skill-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .skill-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .skill-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
    }

    .skill-title {
      flex: 1;
    }

    .skill-title h3 {
      margin: 0 0 4px 0;
      font-size: 18px;
      color: var(--text-color);
    }

    .skill-category {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .skill-description {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .skill-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
    }

    .rating {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #f59e0b;
    }

    .usage-count {
      font-size: 12px;
      color: #6b7280;
    }

    .use-btn {
      padding: 8px 16px;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }

    .use-btn:hover {
      background: var(--secondary-color);
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #6b7280;
    }

    .error {
      text-align: center;
      padding: 40px;
      color: #ef4444;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #6b7280;
    }

    .empty-state svg {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
  `;

  @property({ type: String, attribute: 'api-key' })
  apiKey: string = '';

  @property({ type: String, attribute: 'base-url' })
  baseUrl: string = 'http://localhost:3001';

  @property({ type: Boolean })
  loading: boolean = false;

  @state()
  skills: AgentSkill[] = [];

  @state()
  filteredSkills: AgentSkill[] = [];

  @state()
  searchQuery: string = '';

  @state()
  selectedCategory: string = 'all';

  @state()
  error: string | null = null;

  private categories: string[] = ['all', 'marketing', 'customer-service', 'development', 'analysis'];

  connectedCallback() {
    super.connectedCallback();
    this.loadSkills();
  }

  async loadSkills() {
    if (!this.apiKey) {
      this.error = 'API key is required';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const response = await fetch(`${this.baseUrl}/api/team-skills`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.skills = data.data || [];
      this.filteredSkills = this.skills;
    } catch (err: any) {
      console.error('Failed to load skills:', err);
      this.error = err.message || 'Failed to load skills';
    } finally {
      this.loading = false;
    }
  }

  handleSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value.toLowerCase();
    this.filterSkills();
  }

  handleCategorySelect(category: string) {
    this.selectedCategory = category;
    this.filterSkills();
  }

  filterSkills() {
    let filtered = this.skills;

    // Filter by category
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(skill => 
        skill.category.toLowerCase() === this.selectedCategory.toLowerCase()
      );
    }

    // Filter by search query
    if (this.searchQuery) {
      filtered = filtered.filter(skill =>
        skill.name.toLowerCase().includes(this.searchQuery) ||
        skill.description.toLowerCase().includes(this.searchQuery)
      );
    }

    this.filteredSkills = filtered;
  }

  handleUseSkill(skill: AgentSkill) {
    // 向后兼容旧 event
    this.dispatchEvent(new CustomEvent('skill-selected', {
      detail: { skill },
      bubbles: true,
      composed: true
    }));
    // v1.5.1：触发详情事件，让宿主应用决定跳转
    this.dispatchEvent(new CustomEvent('agent-detail', {
      detail: { skillId: skill.id, skill },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <div class="marketplace-container">
        <div class="header">
          <h1>🤖 Agent Marketplace</h1>
        </div>

        <div class="search-bar">
          <input
            type="text"
            placeholder="Search agents..."
            @input=${this.handleSearch}
            value=${this.searchQuery}
          />
        </div>

        <div class="category-filters">
          ${this.categories.map(category => html`
            <button
              class="category-btn ${this.selectedCategory === category ? 'active' : ''}"
              @click=${() => this.handleCategorySelect(category)}
            >
              ${category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          `)}
        </div>

        ${this.loading ? html`
          <div class="loading">Loading agents...</div>
        ` : this.error ? html`
          <div class="error">❌ ${this.error}</div>
        ` : this.filteredSkills.length === 0 ? html`
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <p>No agents found</p>
          </div>
        ` : html`
          <div class="skills-grid">
            ${this.filteredSkills.map(skill => html`
              <div class="skill-card" @click=${() => this.handleUseSkill(skill)}>
                <div class="skill-header">
                  <div class="skill-icon">
                    ${skill.icon || '🤖'}
                  </div>
                  <div class="skill-title">
                    <h3>${skill.name}</h3>
                    <span class="skill-category">${skill.category}</span>
                  </div>
                </div>
                <p class="skill-description">${skill.description}</p>
                <div class="skill-stats">
                  ${skill.rating ? html`
                    <div class="rating">
                      ⭐ ${skill.rating.toFixed(1)}
                    </div>
                  ` : ''}
                  ${skill.usage_count ? html`
                    <div class="usage-count">
                      ${skill.usage_count.toLocaleString()} uses
                    </div>
                  ` : ''}
                  <button class="use-btn" @click=${(e: Event) => {
                    e.stopPropagation();
                    this.handleUseSkill(skill);
                  }}>
                    Use Agent
                  </button>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>
    `;
  }
}

/**
 * NvwaX Agent Marketplace Detail Web Component (v1.5.1)
 *
 * Usage:
 * ```html
 * <nvwax-agent-marketplace-detail
 *   agent-id="agent-uuid"
 *   api-key="your-api-key"
 *   base-url="https://api.nvwax.com">
 * </nvwax-agent-marketplace-detail>
 * ```
 */
@customElement('nvwax-agent-marketplace-detail')
export class NvwaXAgentMarketplaceDetail extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --primary-color: #6366f1;
      --secondary-color: #8b5cf6;
      --background-color: #ffffff;
      --text-color: #1f2937;
      --border-color: #e5e7eb;
      --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .detail-container {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px;
    }

    .detail-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--border-color);
      margin-bottom: 20px;
    }

    .detail-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 32px;
      flex-shrink: 0;
    }

    .detail-title {
      flex: 1;
    }

    .detail-title h1 {
      margin: 0 0 4px 0;
      font-size: 24px;
      color: var(--text-color);
    }

    .detail-category {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-stats {
      display: flex;
      gap: 16px;
      font-size: 14px;
      color: #6b7280;
    }

    .detail-section {
      margin-bottom: 24px;
    }

    .detail-section h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: var(--text-color);
    }

    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tag {
      padding: 4px 12px;
      background: #f3f4f6;
      border-radius: 16px;
      font-size: 12px;
      color: #4b5563;
    }

    .review {
      padding: 12px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .review-rating {
      font-size: 14px;
      color: #f59e0b;
      margin-bottom: 4px;
    }

    .review-content {
      color: #4b5563;
      font-size: 14px;
      line-height: 1.5;
    }

    .related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }

    .related-card {
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--background-color);
    }

    .related-card h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: var(--text-color);
    }

    .related-card p {
      margin: 0;
      font-size: 12px;
      color: #6b7280;
      line-height: 1.4;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #6b7280;
    }

    .error {
      text-align: center;
      padding: 40px;
      color: #ef4444;
    }

    .empty {
      text-align: center;
      padding: 40px;
      color: #6b7280;
    }

    .install-btn {
      display: block;
      width: 100%;
      padding: 14px;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 500;
      transition: background 0.2s;
      margin-top: 24px;
    }

    .install-btn:hover {
      background: var(--secondary-color);
    }
  `;

  @property({ type: String, attribute: 'agent-id' })
  agentId: string = '';

  @property({ type: String, attribute: 'api-key' })
  apiKey: string = '';

  @property({ type: String, attribute: 'base-url' })
  baseUrl: string = 'http://localhost:3001';

  @state()
  private agent: AgentDetail | null = null;

  @state()
  private reviews: Array<{ rating?: number; content?: string; comment?: string }> = [];

  @state()
  private loading = false;

  @state()
  private error: string | null = null;

  connectedCallback() {
    super.connectedCallback();
    if (this.agentId) {
      this.loadAgent();
      this.loadReviews();
    }
  }

  async loadAgent() {
    if (!this.apiKey || !this.agentId) {
      this.error = 'API key and agent ID are required';
      return;
    }
    this.loading = true;
    this.error = null;
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/marketplace/agents/${this.agentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      this.agent = data.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load agent';
      this.error = message;
    } finally {
      this.loading = false;
    }
  }

  async loadReviews() {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/marketplace/agents/${this.agentId}/reviews?limit=10`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      if (response.ok) {
        const data = await response.json();
        this.reviews = data.data?.reviews || [];
      }
    } catch (err) {
      // reviews 缺失不影响主视图
      console.warn('Failed to load reviews:', err);
    }
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Loading agent details...</div>`;
    }
    if (this.error) {
      return html`<div class="error">❌ ${this.error}</div>`;
    }
    if (!this.agent) {
      return html`<div class="empty">No agent data</div>`;
    }

    return html`
      <div class="detail-container">
        <div class="detail-header">
          <div class="detail-icon">${this.agent.icon || '🤖'}</div>
          <div class="detail-title">
            <h1>${this.agent.name}</h1>
            <span class="detail-category">${this.agent.category || 'uncategorized'}</span>
          </div>
          <div class="detail-stats">
            ${this.agent.rating ? html`<span>⭐ ${this.agent.rating.toFixed(1)}</span>` : ''}
            ${this.agent.downloadCount ? html`<span>⬇ ${this.agent.downloadCount}</span>` : ''}
            ${this.agent.usageCount ? html`<span>📊 ${this.agent.usageCount} uses</span>` : ''}
          </div>
        </div>

        <section class="detail-section">
          <h3>Description</h3>
          <p>${this.agent.description || 'No description'}</p>
        </section>

        ${this.agent.tags?.length ? html`
          <section class="detail-section">
            <h3>Tags</h3>
            <div class="tag-list">
              ${this.agent.tags.map((tag: string) => html`<span class="tag">${tag}</span>`)}
            </div>
          </section>
        ` : ''}

        ${this.agent.author?.name ? html`
          <section class="detail-section">
            <h3>Author</h3>
            <p>${this.agent.author.name}</p>
          </section>
        ` : ''}

        ${this.reviews.length > 0 ? html`
          <section class="detail-section">
            <h3>Reviews (${this.reviews.length})</h3>
            ${this.reviews.map(r => html`
              <div class="review">
                <div class="review-rating">⭐ ${r.rating ?? 'N/A'}</div>
                <div class="review-content">${r.content || r.comment || ''}</div>
              </div>
            `)}
          </section>
        ` : ''}

        ${this.agent.relatedAgents?.length ? html`
          <section class="detail-section">
            <h3>Related Agents</h3>
            <div class="related-grid">
              ${this.agent.relatedAgents.map((r: AgentSkill) => html`
                <div class="related-card">
                  <h4>${r.name}</h4>
                  <p>${r.description || ''}</p>
                </div>
              `)}
            </div>
          </section>
        ` : ''}

        <button class="install-btn" @click=${() => this.handleInstall()}>
          Install to My Team
        </button>
      </div>
    `;
  }

  handleInstall() {
    this.dispatchEvent(new CustomEvent('agent-install', {
      detail: { agentId: this.agentId, agent: this.agent },
      bubbles: true,
      composed: true
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nvwax-agent-marketplace': NvwaXAgentMarketplace;
    'nvwax-agent-marketplace-detail': NvwaXAgentMarketplaceDetail;
  }
}


