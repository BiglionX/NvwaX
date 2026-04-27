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
    // Dispatch custom event when user clicks "Use" button
    this.dispatchEvent(new CustomEvent('skill-selected', {
      detail: { skill },
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

declare global {
  interface HTMLElementTagNameMap {
    'nvwax-agent-marketplace': NvwaXAgentMarketplace;
  }
}
