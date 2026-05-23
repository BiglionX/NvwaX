import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './database.service.js';

export interface ChineseAgentMetadata {
  id: string;
  name: string;
  description: string;
  source: 'gitee' | 'github-org';
  company: 'baidu' | 'alibaba' | 'jd' | 'tencent' | 'huawei';
  url: string;
  download_url?: string;
  stars?: number;
  forks?: number;
  tags?: string[];
  author?: string;
  license?: string;
  last_crawled_at?: Date;
}

export class ChineseAgentCrawlerService {
  private giteeToken = process.env.GITEE_TOKEN;

  /**
   * 从 Gitee 爬取指定公司的 Agent
   */
  async crawlFromGitee(company: string, limit: number = 50): Promise<ChineseAgentMetadata[]> {
    try {
      console.log(`Crawling Gitee for ${company} agents...`);
      
      // 定义各公司在 Gitee 的组织名称
      const orgMap: Record<string, string> = {
        'baidu': 'baidu',
        'alibaba': 'alibaba',
        'aliyun': 'aliyun',
        'jd': 'jd-cloud',
        'tencent': 'tencent',
        'huawei': 'huawei-cloud'
      };
      
      const orgName = orgMap[company] || company;
      
      // 尝试获取组织的仓库列表
      const response = await axios.get(`https://gitee.com/api/v5/orgs/${orgName}/repos`, {
        params: {
          type: 'public',
          sort: 'updated',
          direction: 'desc',
          per_page: limit,
          page: 1
        },
        headers: this.giteeToken ? { Authorization: `token ${this.giteeToken}` } : {},
        timeout: 30000
      });

      // 过滤出与 AI/Agent 相关的仓库
      const aiRepos = response.data.filter((repo: any) => {
        const searchText = `${repo.name} ${repo.description || ''}`.toLowerCase();
        return searchText.includes('ai') || 
               searchText.includes('agent') || 
               searchText.includes('llm') || 
               searchText.includes('chat') ||
               searchText.includes('bot') ||
               searchText.includes('model') ||
               searchText.includes('智能') ||
               searchText.includes('机器人');
      }).slice(0, limit);

      const agents: ChineseAgentMetadata[] = aiRepos.map((repo: any) => ({
        id: `gitee-${repo.id}`,
        name: repo.full_name,
        description: repo.description || 'No description available',
        source: 'gitee' as const,
        company: this.mapCompany(repo.namespace?.path || ''),
        url: repo.html_url,
        download_url: repo.html_url,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        tags: [],
        author: repo.namespace?.name || repo.owner?.name,
        license: repo.license?.key || 'Unknown',
        last_crawled_at: new Date()
      }));

      // 保存到数据库
      if (agents.length > 0) {
        await this.saveAgentsToDatabase(agents);
      }
      
      console.log(`✓ Successfully crawled ${agents.length} agents from Gitee for ${company}`);
      return agents;
    } catch (error: any) {
      console.error(`✗ Error crawling Gitee for ${company}:`, error.message);
      if (error.response) {
        console.error('  Response status:', error.response.status);
        console.error('  Note: Gitee API may require authentication or the org may not exist');
      }
      return [];
    }
  }

  /**
   * 从 GitHub 组织爬取指定公司的 Agent
   */
  async crawlFromGitHubOrg(orgName: string, company: string, limit: number = 50): Promise<ChineseAgentMetadata[]> {
    try {
      console.log(`Crawling GitHub org ${orgName} for ${company} agents...`);
      
      const response = await axios.get(`https://api.github.com/orgs/${orgName}/repos`, {
        params: {
          type: 'public',
          sort: 'updated',
          direction: 'desc',
          per_page: limit
        },
        timeout: 30000
      });

      // 过滤出与 AI/Agent 相关的仓库
      const aiRepos = response.data.filter((repo: any) => {
        const name = (repo.name + ' ' + repo.description).toLowerCase();
        return name.includes('ai') || 
               name.includes('agent') || 
               name.includes('llm') || 
               name.includes('chat') ||
               name.includes('bot') ||
               name.includes('model');
      }).slice(0, limit);

      const agents: ChineseAgentMetadata[] = aiRepos.map((repo: any) => ({
        id: `github-org-${repo.id}`,
        name: repo.full_name,
        description: repo.description || 'No description available',
        source: 'github-org' as const,
        company: company as any,
        url: repo.html_url,
        download_url: repo.html_url,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        tags: repo.topics || [],
        author: orgName,
        license: repo.license?.spdx_id || 'Unknown',
        last_crawled_at: new Date()
      }));

      // 保存到数据库
      await this.saveAgentsToDatabase(agents);
      
      console.log(`✓ Successfully crawled ${agents.length} agents from GitHub org ${orgName}`);
      return agents;
    } catch (error: any) {
      console.error(`✗ Error crawling GitHub org ${orgName}:`, error.message);
      if (error.response) {
        console.error('  Response status:', error.response.status);
      }
      return [];
    }
  }

  /**
   * 保存 Agent 到数据库
   */
  async saveAgentsToDatabase(agents: ChineseAgentMetadata[]): Promise<void> {
    const pool = databaseService.getPool();
    
    for (const agent of agents) {
      try {
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
            agent.forks || 0,
            agent.tags ? JSON.stringify(agent.tags) : null,
            agent.company,
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
   * 映射公司名称
   */
  private mapCompany(namespace: string): ChineseAgentMetadata['company'] {
    const lower = namespace.toLowerCase();
    if (lower.includes('baidu')) return 'baidu';
    if (lower.includes('alibaba') || lower.includes('aliyun')) return 'alibaba';
    if (lower.includes('jd') || lower.includes('jingdong')) return 'jd';
    if (lower.includes('tencent') || lower.includes('qq')) return 'tencent';
    if (lower.includes('huawei')) return 'huawei';
    return 'baidu'; // 默认
  }

  /**
   * 执行完整的中国公司 Agent 爬取
   */
  async runFullCrawl(): Promise<{
    baidu: number;
    alibaba: number;
    jd: number;
    tencent: number;
    huawei: number;
  }> {
    console.log('Starting Chinese tech companies agent crawl...\n');
    
    const results = {
      baidu: 0,
      alibaba: 0,
      jd: 0,
      tencent: 0,
      huawei: 0
    };

    // 1. 百度
    console.log('=== 百度 Baidu ===');
    const baiduGitee = await this.crawlFromGitee('baidu', 30);
    const baiduGithub = await this.crawlFromGitHubOrg('baidu', 'baidu', 20);
    results.baidu = baiduGitee.length + baiduGithub.length;
    console.log(`Baidu total: ${results.baidu}\n`);

    // 2. 阿里巴巴
    console.log('=== 阿里巴巴 Alibaba ===');
    const alibabaGitee = await this.crawlFromGitee('alibaba', 30);
    const alibabaGithub = await this.crawlFromGitHubOrg('alibaba', 'alibaba', 20);
    results.alibaba = alibabaGitee.length + alibabaGithub.length;
    console.log(`Alibaba total: ${results.alibaba}\n`);

    // 3. 京东 - 尝试不同的组织名称
    console.log('=== 京东 JD ===');
    const jdGitee = await this.crawlFromGitee('jd', 20);
    // 尝试多个可能的 GitHub 组织
    const jdOrgs = ['jd-platform-opensource', 'jd-opensource', 'jingdong'];
    let jdGithub: ChineseAgentMetadata[] = [];
    for (const org of jdOrgs) {
      try {
        const repos = await this.crawlFromGitHubOrg(org, 'jd', 15);
        jdGithub = jdGithub.concat(repos);
        if (repos.length > 0) break;
      } catch (error) {
        continue;
      }
    }
    results.jd = jdGitee.length + jdGithub.length;
    console.log(`JD total: ${results.jd}\n`);

    // 4. 腾讯
    console.log('=== 腾讯 Tencent ===');
    const tencentGitee = await this.crawlFromGitee('tencent', 30);
    const tencentGithub = await this.crawlFromGitHubOrg('tencent', 'tencent', 20);
    results.tencent = tencentGitee.length + tencentGithub.length;
    console.log(`Tencent total: ${results.tencent}\n`);

    // 5. 华为
    console.log('=== 华为 Huawei ===');
    const huaweiGitee = await this.crawlFromGitee('huawei', 30);
    const huaweiGithub = await this.crawlFromGitHubOrg('huawei', 'huawei', 20);
    results.huawei = huaweiGitee.length + huaweiGithub.length;
    console.log(`Huawei total: ${results.huawei}\n`);

    const total = Object.values(results).reduce((a, b) => a + b, 0);
    console.log(`\n✅ Chinese companies crawl completed!`);
    console.log(`Total: ${total} agents\n`);

    return results;
  }
}

export const chineseAgentCrawlerService = new ChineseAgentCrawlerService();
