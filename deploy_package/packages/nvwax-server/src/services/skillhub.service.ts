import axios from 'axios';
import { config } from '../config/index.js';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category?: string;
  usageCount?: number;
  [key: string]: any;
}

export class SkillHubService {
  private client = axios.create({
    baseURL: config.skillhubApiUrl,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  async searchSkills(query: string, page: number = 1, limit: number = 20): Promise<{ data: Skill[]; total: number }> {
    try {
      const response = await this.client.get('/tools/discovery', {
        params: { q: query, page, limit }
      });
      
      // 根据实际 API 响应结构调整
      return {
        data: response.data.data || response.data.tools || [],
        total: response.data.total || 0
      };
    } catch (error) {
      console.error('Error searching skills:', error);
      return { data: [], total: 0 };
    }
  }

  async getSkillDetail(id: string): Promise<Skill | null> {
    try {
      const response = await this.client.get(`/tools/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching skill detail:', error);
      return null;
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const response = await this.client.get('/tools/categories');
      return response.data.categories || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }
}

export const skillHubService = new SkillHubService();
