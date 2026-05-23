import axios from 'axios';
import { agentCrawlerService } from './agent-crawler.service.js';

export interface Agent {
  id: string;
  name: string;
  description: string;
  source: 'github' | 'huggingface' | 'gitee' | 'modelscope' | 'custom';
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

      // 第二步：本地无结果，进行全网搜索（并行搜索多个源）
      console.log(`No local results, searching online for: ${query}`);
      
      // 并行搜索 GitHub、Gitee 和 ModelScope
      const [githubResult, giteeResult, modelscopeResult] = await Promise.allSettled([
        this.searchGitHub(query),
        this.searchGitee(query),
        this.searchModelScope(query)
      ]);
      
      const agents: Agent[] = [];
      
      if (githubResult.status === 'fulfilled') {
        agents.push(...githubResult.value);
        console.log(`✅ GitHub search: ${githubResult.value.length} results`);
      } else {
        console.warn('⚠️ GitHub search failed:', githubResult.reason);
      }
      
      if (giteeResult.status === 'fulfilled') {
        agents.push(...giteeResult.value);
        console.log(`✅ Gitee search: ${giteeResult.value.length} results`);
      } else {
        console.warn('⚠️ Gitee search failed:', giteeResult.reason);
      }
      
      if (modelscopeResult.status === 'fulfilled') {
        agents.push(...modelscopeResult.value);
        console.log(`✅ ModelScope search: ${modelscopeResult.value.length} results`);
      } else {
        console.warn('⚠️ ModelScope search failed:', modelscopeResult.reason);
      }

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

  /**
   * 搜索 Gitee（码云）- 国内代码托管平台
   */
  private async searchGitee(query: string): Promise<Agent[]> {
    try {
      // Gitee API 文档: https://gitee.com/api/v5/swagger#/getV5SearchRepositories
      const response = await axios.get('https://gitee.com/api/v5/search/repositories', {
        params: {
          q: `${query} agent ai`,
          page: 1,
          per_page: 10,
          sort: 'stars_count',
          order: 'desc'
        },
        timeout: 5000 // 5秒超时
      });

      return response.data.map((repo: any) => ({
        id: `gitee-${repo.id}`,
        name: repo.full_name || repo.path_with_namespace,
        description: repo.description || '暂无描述',
        source: 'gitee' as const,
        url: repo.html_url || `https://gitee.com/${repo.namespace}/${repo.path}`,
        stars: repo.stars_count || repo.watchers_count || 0,
        tags: repo.language ? [repo.language] : [],
        author: repo.namespace?.name || repo.owner?.login
      }));
    } catch (error) {
      console.error('Error searching Gitee:', error);
      return [];
    }
  }

  /**
   * 搜索 ModelScope（魔搭社区）- 阿里达摩院 AI 模型平台
   */
  private async searchModelScope(query: string): Promise<Agent[]> {
    try {
      // ModelScope API: 搜索模型
      const response = await axios.get('https://www.modelscope.cn/api/v1/models', {
        params: {
          search: query,
          pageSize: 10,
          pageNumber: 1,
          sort: 'downloadCount',
          direction: 'DESC'
        },
        timeout: 5000 // 5秒超时
      });

      // ModelScope API 返回格式可能不同，需要适配
      const models = response.data.Data?.models || response.data.models || [];
      
      return models.map((model: any) => ({
        id: `modelscope-${model.ModelId || model.id}`,
        name: model.Name || model.modelName || model.id,
        description: model.Summary || model.description || '暂无描述',
        source: 'modelscope' as const,
        url: `https://www.modelscope.cn/models/${model.ModelId || model.id}`,
        downloads: model.DownloadCount || model.downloads || 0,
        tags: model.Tags || model.tags || [],
        author: model.Nickname || model.author || model.username
      }));
    } catch (error) {
      console.error('Error searching ModelScope:', error);
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
