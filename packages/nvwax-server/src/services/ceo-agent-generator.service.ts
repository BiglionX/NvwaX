import { Pool } from 'pg';
import { databaseService } from './database.service.js';
import { skillMatchingService } from './skill-matching.service.js';

/**
 * CEO Agent 模板
 */
export interface CEOTemplate {
  id: string;
  teamType: string;
  templateName: string;
  description: string;
  defaultSkills: string[];
  systemPromptTemplate: string;
  managementStyle: string;
  decisionRules: string[];
  isActive: boolean;
}

/**
 * CEO Agent 配置
 */
export interface CEOConfig {
  teamType: string;
  templateId: string;
  templateName: string;
  skills: string[];
  systemPrompt: string;
  managementStyle: string;
  decisionRules: string[];
}

/**
 * 团队上下文
 */
export interface TeamContext {
  teamName: string;
  teamType: string;
  roles: Array<{
    roleName: string;
    description: string;
    responsibilities: string[];
  }>;
  goals: string[];
  industry?: string;
}

/**
 * CEO Agent Generator Service
 * 
 * 负责：
 * - 获取 CEO 模板
 * - 配置 Skills
 * - 生成 System Prompt
 * - 创建 CEO 实例配置
 */
export class CEOAgentGenerator {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * 根据团队类型获取 CEO 模板
   */
  async getTemplate(teamType: string): Promise<CEOTemplate | null> {
    try {
      console.log(`🔍 Fetching CEO template for team type: ${teamType}`);
      
      const result = await this.pool.query(
        'SELECT * FROM ceo_templates WHERE team_type = $1 AND is_active = true',
        [teamType]
      );

      if (result.rows.length === 0) {
        console.log(`⚠️ No active template found for ${teamType}, using default`);
        // 返回通用模板
        return this.getDefaultTemplate();
      }

      const row = result.rows[0];
      
      return {
        id: row.id,
        teamType: row.team_type,
        templateName: row.template_name,
        description: row.description,
        defaultSkills: typeof row.default_skills === 'string' ? JSON.parse(row.default_skills) : row.default_skills,
        systemPromptTemplate: row.system_prompt_template,
        managementStyle: row.management_style,
        decisionRules: typeof row.decision_rules === 'string' ? JSON.parse(row.decision_rules) : row.decision_rules,
        isActive: row.is_active
      };
    } catch (error) {
      console.error('Error fetching CEO template:', error);
      return this.getDefaultTemplate();
    }
  }

  /**
   * 获取默认模板（通用 CEO）
   */
  private getDefaultTemplate(): CEOTemplate {
    return {
      id: 'default',
      teamType: '通用团队',
      templateName: '通用CEO模板',
      description: '适用于各种团队的通用CEO',
      defaultSkills: ['leadership', 'communication', 'decision_making'],
      systemPromptTemplate: '你是这个AI团队的CEO，负责协调团队成员并完成任务。',
      managementStyle: '灵活适应',
      decisionRules: ['以目标为导向', '注重团队协作'],
      isActive: true
    };
  }

  /**
   * 为 CEO 配置 Skills
   */
  async configureSkills(
    template: CEOTemplate,
    additionalSkills: string[] = []
  ): Promise<string[]> {
    const allSkills = new Set<string>(template.defaultSkills);
    
    // 添加额外的 skills
    additionalSkills.forEach(skill => allSkills.add(skill));
    
    console.log(`⚙️ Configuring ${allSkills.size} skills for CEO`);
    
    return Array.from(allSkills);
  }

  /**
   * 生成 System Prompt
   */
  async generatePrompt(
    template: CEOTemplate,
    config: CEOConfig,
    teamContext: TeamContext
  ): Promise<string> {
    const { templateName, managementStyle, decisionRules } = config;
    const systemPromptTemplate = template.systemPromptTemplate;
    
    // 构建角色列表
    const rolesList = teamContext.roles.map(role => 
      `- ${role.roleName}: ${role.description}`
    ).join('\n');

    // 构建目标列表
    const goalsList = teamContext.goals.map(goal => `- ${goal}`).join('\n');

    // 构建决策规则
    const rulesList = decisionRules.map(rule => `- ${rule}`).join('\n');

    // 替换模板中的变量
    let prompt = systemPromptTemplate
      .replace('{{teamName}}', teamContext.teamName)
      .replace('{{teamType}}', teamContext.teamType)
      .replace('{{managementStyle}}', managementStyle)
      .replace('{{rolesList}}', rolesList)
      .replace('{{goalsList}}', goalsList)
      .replace('{{rulesList}}', rulesList);

    // 如果没有变量替换，直接拼接
    if (prompt === systemPromptTemplate) {
      prompt = `${systemPromptTemplate}

## 团队信息
- **团队名称**: ${teamContext.teamName}
- **团队类型**: ${teamContext.teamType}
${teamContext.industry ? `- **行业**: ${teamContext.industry}` : ''}

## 团队成员
${rolesList}

## 团队目标
${goalsList}

## 管理风格
${managementStyle}

## 决策规则
${rulesList}

请根据以上信息，有效地管理和协调团队，确保团队目标的达成。`;
    }

    return prompt;
  }

  /**
   * 创建完整的 CEO 配置
   */
  async createCEOConfig(
    teamType: string,
    teamContext: TeamContext,
    additionalSkills: string[] = []
  ): Promise<CEOConfig> {
    console.log(`🎯 Creating CEO config for ${teamType} team`);
    
    // 1. 获取模板
    const template = await this.getTemplate(teamType);
    if (!template) {
      throw new Error(`Failed to get CEO template for ${teamType}`);
    }

    // 2. 配置 Skills
    const skills = await this.configureSkills(template, additionalSkills);

    // 3. 构建基础配置
    const config: CEOConfig = {
      teamType,
      templateId: template.id,
      templateName: template.templateName,
      skills,
      systemPrompt: '', // 稍后生成
      managementStyle: template.managementStyle,
      decisionRules: template.decisionRules
    };

    // 4. 生成 System Prompt
    config.systemPrompt = await this.generatePrompt(template, config, teamContext);

    console.log(`✅ CEO config created: ${config.templateName}`);
    console.log(`   Skills: ${config.skills.length}个`);
    console.log(`   Management Style: ${config.managementStyle}`);

    return config;
  }

  /**
   * 保存 CEO 配置到会话
   */
  async saveToSession(sessionId: string, ceoConfig: CEOConfig): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE virtual_company_sessions 
         SET ceo_config = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(ceoConfig), sessionId]
      );
      
      console.log(`💾 CEO config saved to session ${sessionId}`);
    } catch (error) {
      console.error('Error saving CEO config to session:', error);
      throw error;
    }
  }

  /**
   * 从会话中获取 CEO 配置
   */
  async getFromSession(sessionId: string): Promise<CEOConfig | null> {
    try {
      const result = await this.pool.query(
        'SELECT ceo_config FROM virtual_company_sessions WHERE id = $1',
        [sessionId]
      );

      if (result.rows.length === 0 || !result.rows[0].ceo_config) {
        return null;
      }

      return result.rows[0].ceo_config;
    } catch (error) {
      console.error('Error getting CEO config from session:', error);
      return null;
    }
  }
}

// 导出单例
export const ceoAgentGenerator = new CEOAgentGenerator();
