/**
 * 技能分析服务
 * 
 * 负责从用户需求中提取技能、分析技能缺口、推荐补充技能
 */

import { skillhubClient } from '../nodes/skillhub-client.js';

/**
 * 关键词到技能的映射表
 */
const KEYWORD_TO_SKILL_MAP = {
  // 客服相关
  '客服': ['customer-service', 'intent-recognition', 'response-generation'],
  '咨询': ['customer-service', 'knowledge-retrieval'],
  '回复': ['response-generation', 'text-generation'],
  
  // 数据相关
  '查询': ['database-query', 'data-retrieval'],
  '订单': ['order-management', 'database-connector'],
  '报表': ['data-analysis', 'report-generation', 'chart-creation'],
  '数据': ['data-processing', 'data-analysis'],
  '统计': ['data-analysis', 'statistical-calculation'],
  
  // AI/ML 相关
  '识别': ['image-recognition', 'text-recognition', 'intent-recognition'],
  '翻译': ['translation', 'language-detection'],
  '情感': ['sentiment-analysis', 'emotion-detection'],
  '预测': ['prediction', 'forecasting'],
  '推荐': ['recommendation-engine', 'personalization'],
  
  // 开发相关
  '代码': ['code-generation', 'code-review', 'debugging'],
  '编程': ['code-generation', 'algorithm-design'],
  '开发': ['software-development', 'api-development'],
  '测试': ['unit-testing', 'e2e-testing', 'test-automation'],
  
  // 集成相关
  '微信': ['wechat-integration', 'social-media-api'],
  '邮件': ['email-sending', 'email-template'],
  'API': ['api-integration', 'rest-client'],
  '集成': ['system-integration', 'third-party-api']
};

export class SkillAnalysisService {
  /**
   * 从用户需求中提取所需技能
   * @param {string} requirement - 用户需求描述
   * @returns {Promise<string[]>} 提取的技能列表
   */
  async extractSkillsFromRequirement(requirement) {
    console.log('🔍 Extracting skills from requirement:', requirement);
    
    const skills = new Set();
    
    // 方法 1: 关键词匹配
    for (const [keyword, skillList] of Object.entries(KEYWORD_TO_SKILL_MAP)) {
      if (requirement.includes(keyword)) {
        skillList.forEach(skill => skills.add(skill));
      }
    }
    
    // 方法 2: 如果关键词匹配结果太少，使用 LLM 提取（可选）
    if (skills.size < 2 && process.env.OPENAI_API_KEY) {
      try {
        const llmSkills = await this.extractSkillsWithLLM(requirement);
        llmSkills.forEach(skill => skills.add(skill));
      } catch (error) {
        console.warn('⚠️ LLM extraction failed, using keyword matching only');
      }
    }
    
    const result = Array.from(skills);
    console.log(`✅ Extracted ${result.length} skills:`, result);
    
    return result;
  }
  
  /**
   * 使用 LLM 提取技能（备选方案）
   * @param {string} requirement - 用户需求
   * @returns {Promise<string[]>} 技能列表
   */
  async extractSkillsWithLLM(requirement) {
    // TODO: 实现 LLM 调用
    // 这里可以调用 OpenAI API 来智能提取技能
    // 暂时返回空数组，使用关键词匹配作为主要方法
    return [];
  }
  
  /**
   * 获取模板的技能列表
   * @param {string} templateId - 模板 ID
   * @returns {Promise<string[]>} 技能列表
   */
  async getTemplateSkills(templateId) {
    // 从 agent-templates.js 中获取模板定义
    const { default: agentWorkflowTemplates } = await import('../workflows/agent-templates.js');
    
    const template = agentWorkflowTemplates[templateId];
    
    if (!template) {
      console.warn(`⚠️ Template not found: ${templateId}`);
      return [];
    }
    
    // 从模板节点中提取技能类型
    const skills = new Set();
    template.nodes.forEach(node => {
      if (node.type === 'llm') {
        skills.add('llm-processing');
      } else if (node.type === 'skillhub_search') {
        skills.add('skill-search');
      } else if (node.type === 'skillhub_detail') {
        skills.add('skill-detail');
      } else if (node.type === 'data_transform') {
        skills.add('data-transform');
      }
    });
    
    return Array.from(skills);
  }
  
  /**
   * 分析技能缺口
   * @param {string} userRequirement - 用户需求
   * @param {string} [templateId] - 模板 ID（可选）
   * @returns {Promise<Object>} 技能分析报告
   */
  async analyzeSkillGap(userRequirement, templateId) {
    console.log('\n📊 Analyzing skill gap...');
    console.log('Requirement:', userRequirement);
    console.log('Template:', templateId || 'None');
    
    // Step 1: 提取所需技能
    const requiredSkills = await this.extractSkillsFromRequirement(userRequirement);
    
    // Step 2: 获取模板技能
    let availableSkills = [];
    if (templateId) {
      availableSkills = await this.getTemplateSkills(templateId);
    }
    
    // Step 3: 计算技能缺口
    const availableSet = new Set(availableSkills);
    const missingSkills = requiredSkills.filter(
      skill => !availableSet.has(skill)
    );
    
    // Step 4: 计算覆盖率
    const coverageRate = requiredSkills.length > 0
      ? ((requiredSkills.length - missingSkills.length) / requiredSkills.length) * 100
      : 0;
    
    // Step 5: 推荐补充技能
    const recommendations = await this.recommendMissingSkills(missingSkills);
    
    const result = {
      requiredSkills,
      availableSkills,
      missingSkills,
      coverageRate: Math.round(coverageRate * 100) / 100, // 保留两位小数
      recommendations
    };
    
    console.log('\n📈 Analysis Result:');
    console.log('  Required:', requiredSkills.length, 'skills');
    console.log('  Available:', availableSkills.length, 'skills');
    console.log('  Missing:', missingSkills.length, 'skills');
    console.log('  Coverage:', coverageRate.toFixed(2) + '%');
    
    return result;
  }
  
  /**
   * 推荐缺失的技能
   * @param {string[]} missingSkills - 缺失的技能列表
   * @returns {Promise<Array>} 推荐的技能详情
   */
  async recommendMissingSkills(missingSkills) {
    if (missingSkills.length === 0) {
      return [];
    }
    
    console.log('\n💡 Recommending missing skills...');
    
    const recommendations = [];
    
    for (const skill of missingSkills) {
      try {
        // 在 SkillHub 中搜索相关技能
        const searchResult = await skillhubClient.searchSkills(skill, 1, 3);
        
        if (searchResult.data && searchResult.data.length > 0) {
          recommendations.push({
            skillName: skill,
            recommendations: searchResult.data.map(s => ({
              id: s.id,
              name: s.name,
              description: s.description,
              category: s.category,
              matchScore: this.calculateMatchScore(skill, s)
            }))
          });
        } else {
          // 如果没有找到，添加一个占位符
          recommendations.push({
            skillName: skill,
            recommendations: [],
            note: '未在 SkillHub 中找到相关技能，可能需要自定义开发'
          });
        }
      } catch (error) {
        console.error(`Error searching for skill "${skill}":`, error.message);
        recommendations.push({
          skillName: skill,
          recommendations: [],
          error: error.message
        });
      }
    }
    
    return recommendations;
  }
  
  /**
   * 计算技能匹配分数
   * @param {string} query - 查询关键词
   * @param {Object} skill - 技能对象
   * @returns {number} 匹配分数（0-100）
   */
  calculateMatchScore(query, skill) {
    let score = 50; // 基础分数
    
    // 名称匹配加分
    if (skill.name && skill.name.toLowerCase().includes(query.toLowerCase())) {
      score += 20;
    }
    
    // 描述匹配加分
    if (skill.description && skill.description.toLowerCase().includes(query.toLowerCase())) {
      score += 15;
    }
    
    // 分类匹配加分
    if (skill.category && skill.category.toLowerCase().includes(query.toLowerCase())) {
      score += 15;
    }
    
    return Math.min(score, 100);
  }
}

export const skillAnalysisService = new SkillAnalysisService();
