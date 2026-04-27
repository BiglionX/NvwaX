import dotenv from 'dotenv';

dotenv.config();

const SKILLHUB_API_URL = process.env.SKILLHUB_API_URL || 'http://localhost:8080';
const SKILLHUB_API_KEY = process.env.SKILLHUB_API_KEY || '';

/**
 * SkillHub API Client
 * 用于与 SkillHub 服务交互
 */
class SkillHubClient {
  constructor(baseUrl = SKILLHUB_API_URL, apiKey = SKILLHUB_API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * 搜索技能
   * @param {Object} params - 搜索参数
   * @param {string} params.query - 搜索关键词
   * @param {number} params.limit - 返回数量限制
   * @param {number} params.page - 页码
   * @returns {Promise<Object>} 搜索结果
   */
  async searchSkills({ query, limit = 10, page = 1 }) {
    try {
      const params = new URLSearchParams({
        q: query,
        pageSize: limit.toString(),
        page: page.toString()
      });
      
      const url = `${this.baseUrl}/api/search?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`SkillHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // SkillHub API 返回结构: { skills: [], total, page, pageSize, totalPages, query }
      return {
        success: true,
        skills: data.skills || [],
        total: data.total || 0,
        page: data.page || page,
        pageSize: data.pageSize || limit,
        totalPages: data.totalPages || 0,
        query: data.query || query
      };
    } catch (error) {
      console.error('SkillHub search error:', error.message);
      return {
        success: false,
        error: error.message,
        skills: []
      };
    }
  }

  /**
   * 获取技能详情
   * @param {string|number} skillId - 技能 ID 或 slug
   * @returns {Promise<Object>} 技能详情
   */
  async getSkillDetail(skillId) {
    try {
      const url = `${this.baseUrl}/api/skills/${skillId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`SkillHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // SkillHub API 返回结构可能是直接的 skill 对象或 { success, data }
      return {
        success: true,
        skill: data.skill || data.data || data
      };
    } catch (error) {
      console.error('SkillHub detail error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取技能分类列表
   * @returns {Promise<Object>} 分类列表
   */
  async getCategories() {
    try {
      const url = `${this.baseUrl}/api/categories`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`SkillHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        categories: data.data?.categories || data.categories || []
      };
    } catch (error) {
      console.error('SkillHub categories error:', error.message);
      return {
        success: false,
        error: error.message,
        categories: []
      };
    }
  }

  /**
   * 工具发现 - 获取所有可用的工具
   * @returns {Promise<Object>} 工具列表
   */
  async discoverTools() {
    try {
      const url = `${this.baseUrl}/api/tools/discovery`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`SkillHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        tools: data.tools || [],
        platform: data.platform,
        version: data.version
      };
    } catch (error) {
      console.error('SkillHub discovery error:', error.message);
      return {
        success: false,
        error: error.message,
        tools: []
      };
    }
  }

  /**
   * 语义搜索 - 使用自然语言搜索技能
   * @param {string} query - 自然语言查询
   * @returns {Promise<Object>} 搜索结果
   */
  async semanticSearch(query) {
    try {
      const url = `${this.baseUrl}/api/search/semantic?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      if (!response.ok) {
        // Semantic search 可能不支持或返回 500
        console.warn('⚠️ Semantic search API returned error, falling back to regular search');
        // 降级为普通搜索
        return await this.searchSkills({ query, limit: 10 });
      }

      const data = await response.json();
      
      return {
        success: true,
        skills: data.results || data.skills || data.data?.results || [],
        total: data.total || data.data?.total || 0,
        isSemanticSearch: true
      };
    } catch (error) {
      console.error('SkillHub semantic search error:', error.message);
      // 降级为普通搜索
      console.log('🔄 Falling back to regular search...');
      return await this.searchSkills({ query, limit: 10 });
    }
  }

  /**
   * 获取相关技能
   * @param {string} slug - 技能 slug
   * @param {number} limit - 返回数量限制
   * @returns {Promise<Object>} 相关技能列表
   */
  async getRelatedSkills(slug, limit = 5) {
    try {
      const url = `${this.baseUrl}/api/skills/${slug}/related?limit=${limit}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`SkillHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        skills: data.skills || data.data?.skills || [],
        total: data.total || data.data?.total || 0
      };
    } catch (error) {
      console.error('SkillHub related skills error:', error.message);
      return {
        success: false,
        error: error.message,
        skills: []
      };
    }
  }
}

// 创建单例实例
export const skillhubClient = new SkillHubClient();

export default SkillHubClient;
