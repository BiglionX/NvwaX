import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './database.service.js';

export interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  source: 'github' | 'huggingface' | 'custom';
  url: string;
  download_url?: string;
  stars?: number;
  downloads?: number;
  tags?: string[];
  category?: string;
  author?: string;
  license?: string;
  last_crawled_at?: Date;
}

export class AgentCrawlerService {
  private githubToken = process.env.GITHUB_TOKEN;

  /**
   * 从 GitHub 爬取 Agent 元数据
   */
  async crawlFromGitHub(query: string = 'ai agent', limit: number = 50): Promise<AgentMetadata[]> {
    try {
      console.log(`Crawling GitHub for: ${query} (limit: ${limit})`);
      
      const response = await axios.get('https://api.github.com/search/repositories', {
        params: {
          q: `${query} agent ai`,
          sort: 'stars',
          order: 'desc',
          per_page: limit
        },
        headers: this.githubToken ? { Authorization: `token ${this.githubToken}` } : {},
        timeout: 30000
      });

      console.log(`GitHub API response: ${response.data.total_count} total, ${response.data.items.length} items`);

      const agents: AgentMetadata[] = response.data.items.map((repo: any) => ({
        id: `github-${repo.id}`,
        name: repo.full_name,
        description: repo.description || 'No description available',
        source: 'github' as const,
        url: repo.html_url,
        download_url: repo.html_url,
        stars: repo.stargazers_count,
        downloads: 0,
        tags: repo.topics || [],
        author: repo.owner?.login,
        license: repo.license?.spdx_id || 'Unknown',
        last_crawled_at: new Date()
      }));

      // 保存到数据库
      await this.saveAgentsToDatabase(agents);
      
      console.log(`✓ Successfully crawled ${agents.length} agents from GitHub`);
      return agents;
    } catch (error: any) {
      console.error('✗ Error crawling GitHub:', error.message);
      if (error.response) {
        console.error('  Response status:', error.response.status);
        console.error('  Response data:', JSON.stringify(error.response.data).substring(0, 200));
      }
      return [];
    }
  }

  /**
   * 从 HuggingFace 爬取 Agent 元数据
   */
  async crawlFromHuggingFace(query: string = 'agent', limit: number = 50): Promise<AgentMetadata[]> {
    try {
      console.log(`Crawling HuggingFace for: ${query} (limit: ${limit})`);
      
      const response = await axios.get('https://huggingface.co/api/models', {
        params: {
          search: query,
          limit: limit,
          sort: 'downloads',
          direction: -1,
          filter: 'text-generation'
        },
        timeout: 30000
      });

      console.log(`HuggingFace API response: ${response.data.length} items`);

      const agents: AgentMetadata[] = response.data.map((model: any) => ({
        id: `hf-${model.id}`,
        name: model.modelId || model.id,
        description: model.description || 'No description available',
        source: 'huggingface' as const,
        url: `https://huggingface.co/${model.id}`,
        download_url: `https://huggingface.co/${model.id}`,
        stars: model.likes || 0,
        downloads: model.downloads || 0,
        tags: model.tags || [],
        author: model.author || 'Unknown',
        license: model.cardData?.license || 'Unknown',
        last_crawled_at: new Date()
      }));

      // 保存到数据库
      await this.saveAgentsToDatabase(agents);
      
      console.log(`✓ Successfully crawled ${agents.length} agents from HuggingFace`);
      return agents;
    } catch (error: any) {
      console.error('✗ Error crawling HuggingFace:', error.message);
      if (error.response) {
        console.error('  Response status:', error.response.status);
      }
      console.log('  ⚠️  HuggingFace 爬取失败，将继续使用 GitHub 数据');
      return [];
    }
  }

  /**
   * 保存 Agent 元数据到数据库
   */
  async saveAgentsToDatabase(agents: AgentMetadata[]): Promise<void> {
    const pool = databaseService.getPool();
    
    for (const agent of agents) {
      try {
        // 使用 UPSERT 操作
        await pool.query(
          `INSERT INTO agent_metadata (
            id, name, description, source, url, download_url, 
            stars, downloads, tags, category, author, license, last_crawled_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            stars = EXCLUDED.stars,
            downloads = EXCLUDED.downloads,
            tags = EXCLUDED.tags,
            author = EXCLUDED.author,
            license = EXCLUDED.license,
            last_crawled_at = EXCLUDED.last_crawled_at,
            updated_at = CURRENT_TIMESTAMP`,
          [
            agent.id,
            agent.name,
            agent.description,
            agent.source,
            agent.url,
            agent.download_url || null,
            agent.stars || 0,
            agent.downloads || 0,
            agent.tags ? JSON.stringify(agent.tags) : null,
            agent.category || null,
            agent.author || null,
            agent.license || null,
            agent.last_crawled_at || new Date()
          ]
        );
      } catch (error) {
        console.error(`Error saving agent ${agent.id}:`, error);
      }
    }
  }

  /**
   * 从数据库搜索 Agent
   */
  async searchLocalAgents(query: string, page: number = 1, limit: number = 20): Promise<{ data: AgentMetadata[]; total: number }> {
    try {
      const pool = databaseService.getPool();
      const offset = (page - 1) * limit;

      // 搜索查询
      const searchQuery = `%${query}%`;
      
      const result = await pool.query(
        `SELECT * FROM agent_metadata 
         WHERE name ILIKE $1 OR description ILIKE $1 OR tags::text ILIKE $1
         ORDER BY stars DESC, downloads DESC
         LIMIT $2 OFFSET $3`,
        [searchQuery, limit, offset]
      );

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM agent_metadata 
         WHERE name ILIKE $1 OR description ILIKE $1 OR tags::text ILIKE $1`,
        [searchQuery]
      );

      const agents: AgentMetadata[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        source: row.source,
        url: row.url,
        download_url: row.download_url,
        stars: row.stars,
        downloads: row.downloads,
        tags: row.tags || [],
        category: row.category,
        author: row.author,
        license: row.license,
        last_crawled_at: row.last_crawled_at
      }));

      return {
        data: agents,
        total: parseInt(countResult.rows[0].count)
      };
    } catch (error) {
      console.error('Error searching local agents:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * 执行完整的爬取任务（GitHub + HuggingFace）
   */
  async runFullCrawl(): Promise<{ github: number; huggingface: number }> {
    console.log('Starting full agent crawl...');
    
    // 冷启动：爬取 200+ 个 Agent，使用多个查询关键词
    let totalGitHub = 0;
    let totalHF = 0;
    
    // GitHub: 使用多个关键词爬取
    const githubQueries = [
      { query: 'ai agent', limit: 50 },
      { query: 'llm agent', limit: 50 },
      { query: 'chatbot', limit: 50 },
      { query: 'autonomous agent', limit: 50 }
    ];
    
    for (const { query, limit } of githubQueries) {
      try {
        const agents = await this.crawlFromGitHub(query, limit);
        totalGitHub += agents.length;
        console.log(`  Progress: ${totalGitHub} GitHub agents so far...`);
      } catch (error) {
        console.error(`Failed to crawl GitHub for "${query}":`, error);
      }
    }
    
    // HuggingFace: 已禁用（国内访问不稳定）
    // TODO: 未来可以添加国内源（如 Gitee、ModelScope 等）
    console.log('⚠️  Skipping HuggingFace crawl (network issues in China)');
    totalHF = 0;

    console.log(`Full crawl completed: ${totalGitHub} from GitHub, ${totalHF} from HuggingFace`);
    
    return {
      github: totalGitHub,
      huggingface: totalHF
    };
  }
}

export const agentCrawlerService = new AgentCrawlerService();
