import axios from 'axios';
import { agentCrawlerService } from './agent-crawler.service.js';

export interface Agent {
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
  [key: string]: any;
}

export class AgentSearchService {
  private githubToken = process.env.GITHUB_TOKEN;

  /**
   * 混合搜索：优先搜索本地数据库，无结果则全网搜索
   */
  async searchAgents(query: string, page: number = 1, limit: number = 20): Promise<{ 
    data: Agent[]; 
    total: number;
    fromLocal: boolean;
  }> {
    try {
      // 第一步：搜索本地数据库
      console.log(`Searching local database for: ${query}`);
      const localResult = await agentCrawlerService.searchLocalAgents(query, page, limit);
      
      // 如果本地有结果，直接返回
      if (localResult.total > 0) {
        console.log(`Found ${localResult.total} agents in local database`);
        return {
          data: localResult.data,
          total: localResult.total,
          fromLocal: true
        };
      }

      // 第二步：本地无结果，进行全网搜索
      console.log(`No local results, searching online for: ${query}`);
      const results = await Promise.allSettled([
        this.searchGitHub(query),
        this.searchHuggingFace(query)
      ]);

      const agents: Agent[] = [];
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          agents.push(...result.value);
        }
      });

      // 分页处理
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedData = agents.slice(start, end);

      console.log(`Found ${agents.length} agents from online search`);

      return {
        data: paginatedData,
        total: agents.length,
        fromLocal: false
      };
    } catch (error) {
      console.error('Error searching agents:', error);
      return { data: [], total: 0, fromLocal: false };
    }
  }

  private async searchGitHub(query: string): Promise<Agent[]> {
    try {
      const response = await axios.get('https://api.github.com/search/repositories', {
        params: {
          q: `${query} in:name,description agent ai`,
          sort: 'stars',
          order: 'desc',
          per_page: 10
        },
        headers: this.githubToken ? { Authorization: `token ${this.githubToken}` } : {}
      });

      return response.data.items.map((repo: any) => ({
        id: `github-${repo.id}`,
        name: repo.full_name,
        description: repo.description || 'No description available',
        source: 'github' as const,
        url: repo.html_url,
        stars: repo.stargazers_count,
        tags: repo.topics || []
      }));
    } catch (error) {
      console.error('Error searching GitHub:', error);
      return [];
    }
  }

  private async searchHuggingFace(query: string): Promise<Agent[]> {
    try {
      const response = await axios.get('https://huggingface.co/api/models', {
        params: {
          search: query,
          limit: 10,
          sort: 'downloads',
          direction: -1
        }
      });

      return response.data.map((model: any) => ({
        id: `hf-${model.id}`,
        name: model.modelId || model.id,
        description: model.description || 'No description available',
        source: 'huggingface' as const,
        url: `https://huggingface.co/${model.id}`,
        downloads: model.downloads,
        tags: model.tags || []
      }));
    } catch (error) {
      console.error('Error searching HuggingFace:', error);
      return [];
    }
  }

  private mergeAndDeduplicate(results: Agent[][]): Agent[] {
    const seen = new Set<string>();
    const unique: Agent[] = [];

    results.flat().forEach(agent => {
      if (!seen.has(agent.id)) {
        seen.add(agent.id);
        unique.push(agent);
      }
    });

    return unique;
  }
}

export const agentSearchService = new AgentSearchService();
