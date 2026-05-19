import OpenAI from 'openai';
import { 
  NVWAX_SYSTEM_PROMPT,
  REQUIREMENT_ANALYSIS_PROMPT,
  TEAM_DESIGN_PROMPT,
  AGENT_MATCHING_PROMPT
} from '../prompts/nvwax-agent-prompt.js';
import { agentCompatibilityService } from './agent-compatibility.service.js';
import { skillMatchingService } from './skill-matching.service.js';
import { ceoAgentGenerator, CEOConfig, TeamContext } from './ceo-agent-generator.service.js';
import { documentGeneratorService, DocumentPackage } from './document-generator.service.js';

/**
 * NvwaX 需求分析结果
 */
export interface RequirementAnalysis {
  companyType: string;
  industry?: string;
  responsibilities: string[];
  expectedOutputs: string[];
  targetUsers?: string;
  specialRequirements?: string;
  scale?: 'small' | 'medium' | 'large';
  confidence: number; // 0-1，表示分析的置信度
}

/**
 * 团队角色设计
 */
export interface TeamRole {
  roleName: string;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  priority: 'required' | 'recommended' | 'optional';
}

/**
 * 团队设计方案
 */
export interface TeamDesign {
  roles: TeamRole[];
  collaborationFlow: string;
  estimatedSize: number;
  rationale: string; // 设计理由
}

/**
 * Agent 匹配结果
 */
export interface AgentMatch {
  agentName: string;
  source: 'github' | 'huggingface' | 'local';
  matchScore: number; // 0-1
  url?: string;
  description?: string;
  reason: string; // 匹配理由
}

export interface AgentMatchResult {
  roleName: string;
  candidates: AgentMatch[];
  bestMatch?: AgentMatch;
}

/**
 * Skill 匹配状态
 */
export type SkillMatchStatus = 'found' | 'missing_pending' | 'ignored';

export interface SkillMatch {
  skillName: string;
  status: SkillMatchStatus;
  url?: string;
  dependencies?: string[];
  version?: string;
}

export interface SkillMatchResult {
  [skillName: string]: SkillMatch;
}

/**
 * NvwaX 处理阶段
 */
export type NvwaXPhase = 
  | 'requirements_gathering'
  | 'team_design'
  | 'agent_matching'
  | 'skill_matching'
  | 'ceo_generation'
  | 'document_generation'
  | 'confirming';

/**
 * NvwaX 响应
 */
export interface NvwaXResponse {
  message: string; // 自然语言回复
  phase: NvwaXPhase;
  analysisResult?: RequirementAnalysis;
  teamDesign?: TeamDesign;
  agentMatches?: Record<string, AgentMatch[]>;
  skillMatches?: SkillMatchResult;
  ceoConfig?: CEOConfig; // CEO Agent 配置
  documentPackage?: DocumentPackage; // 文档包
  needsClarification: boolean;
  clarificationQuestions?: string[];
  nextStep: string;
  confidence: number;
}

/**
 * NvwaX Agent Service
 * 
 * Aiteam 创建专家，负责：
 * - 需求分析和澄清
 * - 团队结构设计
 * - Agent/Skill 匹配
 * - CEO Agent 定制
 * - 配置文档生成
 */
export class NvwaXAgentService {
  private openai: OpenAI | null = null;

  constructor() {
    // 初始化 DeepSeek 客户端
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ 
        apiKey,
        baseURL: 'https://api.deepseek.com/v1'
      });
      console.log('✅ NvwaX: DeepSeek API configured');
    } else {
      console.warn('⚠️ NvwaX: DEEPSEEK_API_KEY not configured. Using mock responses.');
    }
  }

  /**
   * 分析用户需求
   */
  async analyzeRequirements(userInput: string): Promise<RequirementAnalysis> {
    try {
      if (this.openai) {
        return await this.analyzeWithLLM(userInput);
      } else {
        return this.getMockAnalysis(userInput);
      }
    } catch (error) {
      console.error('NvwaX requirement analysis error:', error);
      throw error;
    }
  }

  /**
   * 使用 LLM 进行需求分析
   */
  private async analyzeWithLLM(userInput: string): Promise<RequirementAnalysis> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const prompt = REQUIREMENT_ANALYSIS_PROMPT.replace('{{userInput}}', userInput);

    const completion = await this.openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个专业的需求分析师，擅长从用户描述中提取关键信息。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const response = completion.choices[0]?.message?.content || '';
    
    // 尝试解析 JSON
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          companyType: parsed.companyType || '未知团队',
          industry: parsed.industry,
          responsibilities: parsed.responsibilities || [],
          expectedOutputs: parsed.expectedOutputs || [],
          targetUsers: parsed.targetUsers,
          specialRequirements: parsed.specialRequirements,
          scale: parsed.scale || 'medium',
          confidence: parsed.confidence || 0.8
        };
      } catch (e) {
        console.warn('Failed to parse LLM response, using fallback');
      }
    }

    // 降级处理
    return this.extractRequirementsFromText(response);
  }

  /**
   * 从文本中提取需求（降级方案）
   */
  private extractRequirementsFromText(text: string): RequirementAnalysis {
    // 简单的关键词提取
    const lowerText = text.toLowerCase();
    
    let companyType = '通用团队';
    if (lowerText.includes('营销') || lowerText.includes('marketing')) {
      companyType = '营销团队';
    } else if (lowerText.includes('客服') || lowerText.includes('customer service')) {
      companyType = '客服团队';
    } else if (lowerText.includes('开发') || lowerText.includes('development')) {
      companyType = '开发团队';
    } else if (lowerText.includes('数据分析') || lowerText.includes('data analysis')) {
      companyType = '数据分析团队';
    } else if (lowerText.includes('小红书')) {
      companyType = '小红书运营团队';
    }

    return {
      companyType,
      responsibilities: ['内容创作', '运营管理'],
      expectedOutputs: ['text', 'image'],
      scale: 'medium',
      confidence: 0.6
    };
  }

  /**
   * 模拟需求分析（用于测试）
   */
  private getMockAnalysis(userInput: string): RequirementAnalysis {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('小红书')) {
      return {
        companyType: '小红书运营团队',
        industry: '社交媒体营销',
        responsibilities: ['内容创作', '数据分析', '用户互动', '社群运营'],
        expectedOutputs: ['图文笔记', '视频内容', '数据报告'],
        targetUsers: '小红书平台用户',
        specialRequirements: '需要熟悉小红书平台规则和内容风格',
        scale: 'small',
        confidence: 0.9
      };
    }

    if (lowerInput.includes('营销') || lowerInput.includes('marketing')) {
      return {
        companyType: '营销内容创作团队',
        industry: '数字营销',
        responsibilities: ['内容策划', '文案撰写', '视觉设计', '数据分析'],
        expectedOutputs: ['营销文案', '设计素材', '分析报告'],
        targetUsers: '品牌客户',
        scale: 'medium',
        confidence: 0.85
      };
    }

    return {
      companyType: '通用AI团队',
      responsibilities: ['任务执行', '协作沟通'],
      expectedOutputs: ['text'],
      scale: 'small',
      confidence: 0.7
    };
  }

  /**
   * 设计团队结构
   */
  async designTeam(requirements: RequirementAnalysis): Promise<TeamDesign> {
    try {
      if (this.openai) {
        return await this.designWithLLM(requirements);
      } else {
        return this.getMockTeamDesign(requirements);
      }
    } catch (error) {
      console.error('NvwaX team design error:', error);
      throw error;
    }
  }

  /**
   * 使用 LLM 设计团队
   */
  private async designWithLLM(requirements: RequirementAnalysis): Promise<TeamDesign> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const prompt = TEAM_DESIGN_PROMPT
      .replace('{{companyType}}', requirements.companyType)
      .replace('{{industry}}', requirements.industry || '未指定')
      .replace('{{responsibilities}}', requirements.responsibilities.join(', '))
      .replace('{{expectedOutputs}}', requirements.expectedOutputs.join(', '))
      .replace('{{targetUsers}}', requirements.targetUsers || '未指定')
      .replace('{{specialRequirements}}', requirements.specialRequirements || '无');

    const completion = await this.openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个专业的团队架构师，擅长设计高效的AI团队结构。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content || '';
    
    // 尝试解析 JSON
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.warn('Failed to parse team design JSON');
      }
    }

    // 降级方案
    return this.getMockTeamDesign(requirements);
  }

  /**
   * 模拟团队设计
   */
  private getMockTeamDesign(requirements: RequirementAnalysis): TeamDesign {
    const roles: TeamRole[] = [];

    if (requirements.companyType.includes('小红书') || requirements.companyType.includes('营销')) {
      roles.push(
        {
          roleName: '内容策划师',
          description: '负责整体内容策略规划和选题',
          responsibilities: ['制定内容日历', '分析热门话题', '规划内容方向'],
          requiredSkills: ['content_strategy', 'trend_analysis', 'planning'],
          priority: 'required'
        },
        {
          roleName: '文案创作者',
          description: '撰写吸引人的文案和笔记',
          responsibilities: ['创作文案', '优化标题', 'SEO优化'],
          requiredSkills: ['copywriting', 'seo', 'creative_writing'],
          priority: 'required'
        },
        {
          roleName: '视觉设计师',
          description: '设计精美的封面和图片',
          responsibilities: ['图片设计', '视觉风格统一', '信息图表制作'],
          requiredSkills: ['graphic_design', 'visual_communication', 'branding'],
          priority: 'required'
        },
        {
          roleName: '数据分析师',
          description: '跟踪内容和用户数据',
          responsibilities: ['数据分析', '效果评估', '优化建议'],
          requiredSkills: ['data_analysis', 'statistics', 'visualization'],
          priority: 'recommended'
        },
        {
          roleName: '社群运营经理',
          description: '管理用户互动和社群',
          responsibilities: ['用户互动', '社群维护', '活动策划'],
          requiredSkills: ['community_management', 'engagement', 'event_planning'],
          priority: 'recommended'
        }
      );
    } else {
      // 默认团队结构
      roles.push(
        {
          roleName: '项目经理',
          description: '负责项目管理和协调',
          responsibilities: ['任务分配', '进度跟踪', '沟通协调'],
          requiredSkills: ['project_management', 'communication', 'planning'],
          priority: 'required'
        },
        {
          roleName: '执行专员',
          description: '负责具体任务执行',
          responsibilities: ['任务执行', '质量控制', '反馈汇报'],
          requiredSkills: ['execution', 'quality_control', 'reporting'],
          priority: 'required'
        }
      );
    }

    return {
      roles,
      collaborationFlow: '内容策划师制定计划 → 文案创作者和视觉设计师并行创作 → 数据分析师跟踪效果 → 社群运营经理负责发布和互动',
      estimatedSize: roles.length,
      rationale: `基于${requirements.companyType}的需求，设计了${roles.length}个核心角色，覆盖从策划到执行再到优化的完整流程。`
    };
  }

  /**
   * 为团队角色匹配 Agent
   */
  async matchAgentsForTeam(teamDesign: TeamDesign): Promise<Record<string, AgentMatch[]>> {
    const results: Record<string, AgentMatch[]> = {};

    for (const role of teamDesign.roles) {
      try {
        console.log(`🔍 Searching agents for role: ${role.roleName}`);
        
        // 使用现有的 agentCompatibilityService
        const scoredAgents = await agentCompatibilityService.searchAndScoreAgents(
          {
            roleName: role.roleName,
            description: role.description,
            responsibilities: role.responsibilities,
            requiredSkills: role.requiredSkills
          },
          3 // Top 3
        );

        results[role.roleName] = scoredAgents.map(agent => ({
          agentName: agent.agentName,
          source: 'local',
          matchScore: agent.overallScore / 100,
          url: undefined,
          description: undefined,
          reason: `匹配度 ${agent.overallScore.toFixed(0)}%，功能匹配${agent.dimensionScores.functionalMatch.toFixed(0)}分，技能覆盖${agent.dimensionScores.skillCoverage.toFixed(0)}分`
        }));

        console.log(`✅ Found ${scoredAgents.length} agents for ${role.roleName}`);
      } catch (error) {
        console.error(`Error matching agents for ${role.roleName}:`, error);
        results[role.roleName] = [];
      }
    }

    return results;
  }

  /**
   * 为团队匹配 Skills
   */
  async matchSkillsForTeam(teamDesign: TeamDesign): Promise<SkillMatchResult> {
    const allSkills = new Set<string>();
    
    // 收集所有角色需要的 skills
    for (const role of teamDesign.roles) {
      role.requiredSkills.forEach(skill => allSkills.add(skill));
    }

    const results: SkillMatchResult = {};

    for (const skillName of Array.from(allSkills)) {
      try {
        console.log(`🔍 Searching skill: ${skillName}`);
        
        const match = await skillMatchingService.searchSkill(skillName);
        
        results[skillName] = {
          skillName,
          status: match.found ? 'found' : 'missing_pending',
          url: match.url,
          dependencies: match.dependencies,
          version: match.version
        };

        console.log(`✅ Skill ${skillName}: ${match.found ? 'found' : 'missing'}`);
      } catch (error) {
        console.error(`Error matching skill ${skillName}:`, error);
        results[skillName] = {
          skillName,
          status: 'missing_pending'
        };
      }
    }

    return results;
  }

  /**
   * 处理用户消息并生成 NvwaX 回复
   */
  async processMessage(
    userInput: string,
    currentPhase?: NvwaXPhase,
    context?: any
  ): Promise<NvwaXResponse> {
    try {
      let response: NvwaXResponse;

      switch (currentPhase) {
        case 'requirements_gathering':
          // 检查用户是否在确认之前的分析
          const lowerInput = userInput.toLowerCase();
          const isConfirmation = lowerInput.includes('确认') || 
                                lowerInput.includes('confirm') || 
                                lowerInput.includes('是的') || 
                                lowerInput.includes('准确') ||
                                lowerInput.includes('继续') ||
                                lowerInput === 'ok' ||
                                lowerInput === 'yes';
          
          if (isConfirmation && context?.analysisResult) {
            // 用户确认了需求分析，直接进入团队设计阶段
            console.log('✅ User confirmed requirements, proceeding to team design');
            const design = await this.designTeam(context.analysisResult);
            response = {
              message: this.generateTeamDesignResponse(design),
              phase: 'ceo_generation',
              teamDesign: design,
              needsClarification: false,
              nextStep: '正在生成定制化 CEO Agent...',
              confidence: 0.9
            };
          } else {
            // 首次分析需求
            const analysis = await this.analyzeRequirements(userInput);
            response = {
              message: this.generateRequirementsResponse(analysis),
              phase: 'team_design',
              analysisResult: analysis,
              needsClarification: analysis.confidence < 0.8,
              clarificationQuestions: analysis.confidence < 0.8 ? ['请确认以上分析是否准确？'] : [],
              nextStep: '正在设计团队结构...',
              confidence: analysis.confidence
            };
          }
          break;

        case 'team_design':
          // 设计团队
          const design = context?.analysisResult 
            ? await this.designTeam(context.analysisResult)
            : await this.designTeam(await this.analyzeRequirements(userInput));
          
          response = {
            message: this.generateTeamDesignResponse(design),
            phase: 'ceo_generation',
            teamDesign: design,
            needsClarification: false,
            nextStep: '正在生成定制化 CEO Agent...',
            confidence: 0.9
          };
          break;

        case 'ceo_generation':
          // 生成 CEO Agent 配置
          const teamDesign = context?.teamDesign;
          if (!teamDesign) {
            throw new Error('Team design is required for CEO generation');
          }
          
          const ceoConfig = await this.generateCEOForTeam(teamDesign);
          
          response = {
            message: this.generateCEOResponse(ceoConfig),
            phase: 'agent_matching',
            teamDesign: teamDesign,
            ceoConfig: ceoConfig,
            needsClarification: false,
            nextStep: '正在搜索匹配的 Agent...',
            confidence: 0.95
          };
          break;

        case 'document_generation':
          // 生成文档包
          const docTeamDesign = context?.teamDesign;
          const docCeoConfig = context?.ceoConfig;
          
          if (!docTeamDesign || !docCeoConfig) {
            throw new Error('Team design and CEO config are required for document generation');
          }
          
          const teamName = context?.teamName || `${docCeoConfig.teamType}团队`;
          const docPackage = await this.generateDocumentPackage(docCeoConfig, docTeamDesign, teamName);
          
          response = {
            message: this.generateDocumentResponse(docPackage),
            phase: 'confirming',
            teamDesign: docTeamDesign,
            ceoConfig: docCeoConfig,
            documentPackage: docPackage,
            needsClarification: false,
            nextStep: '请确认并下载文档包',
            confidence: 1.0
          };
          break;

        default:
          // 默认从需求分析开始
          const defaultAnalysis = await this.analyzeRequirements(userInput);
          response = {
            message: this.generateRequirementsResponse(defaultAnalysis),
            phase: 'team_design',
            analysisResult: defaultAnalysis,
            needsClarification: defaultAnalysis.confidence < 0.8,
            clarificationQuestions: defaultAnalysis.confidence < 0.8 ? ['请补充更多细节'] : [],
            nextStep: '分析需求中...',
            confidence: defaultAnalysis.confidence
          };
      }

      return response;
    } catch (error) {
      console.error('NvwaX processMessage error:', error);
      throw error;
    }
  }

  /**
   * 生成需求分析回复
   */
  private generateRequirementsResponse(analysis: RequirementAnalysis): string {
    return `我分析了您的需求：

**团队类型**: ${analysis.companyType}
**主要职责**: ${analysis.responsibilities.join('、')}
**期望产出**: ${analysis.expectedOutputs.join('、')}
${analysis.targetUsers ? `**目标用户**: ${analysis.targetUsers}` : ''}
${analysis.specialRequirements ? `**特殊要求**: ${analysis.specialRequirements}` : ''}

这个理解准确吗？如果没问题，我将为您设计团队结构。`;
  }

  /**
   * 生成团队设计回复
   */
  private generateTeamDesignResponse(design: TeamDesign): string {
    const rolesList = design.roles.map((role, index) => 
      `${index + 1}. **${role.roleName}** (${role.priority === 'required' ? '必需' : '推荐'})
   - ${role.description}
   - 职责：${role.responsibilities.slice(0, 2).join('、')}`
    ).join('\n\n');

    return `基于您的需求，我设计了以下团队结构：

**团队规模**: ${design.estimatedSize} 人

**核心角色**:

${rolesList}

**协作流程**: ${design.collaborationFlow}

**设计理由**: ${design.rationale}

接下来我将为您生成定制化的 CEO Agent...`;
  }

  /**
   * 为团队生成 CEO Agent 配置
   */
  private async generateCEOForTeam(teamDesign: TeamDesign): Promise<CEOConfig> {
    // 确定团队类型（根据角色推断）
    const teamType = this.inferTeamType(teamDesign);
    
    // 构建团队上下文
    const teamContext: TeamContext = {
      teamName: `${teamType}团队`,
      teamType,
      roles: teamDesign.roles.map(role => ({
        roleName: role.roleName,
        description: role.description,
        responsibilities: role.responsibilities
      })),
      goals: ['高效完成团队任务', '保持团队协作流畅'],
    };
    
    // 调用 CEO Generator 创建配置
    console.log(`🎯 Generating CEO for team type: ${teamType}`);
    const ceoConfig = await ceoAgentGenerator.createCEOConfig(teamType, teamContext);
    
    return ceoConfig;
  }

  /**
   * 根据团队设计推断团队类型
   */
  private inferTeamType(teamDesign: TeamDesign): string {
    const roleNames = teamDesign.roles.map(r => r.roleName.toLowerCase());
    const responsibilities = teamDesign.roles.flatMap(r => r.responsibilities.map(s => s.toLowerCase()));
    
    // 检查是否包含营销相关关键词
    if (roleNames.some(r => r.includes('营销') || r.includes('内容') || r.includes('运营')) ||
        responsibilities.some(r => r.includes('内容创作') || r.includes('社交媒体') || r.includes('营销'))) {
      return '营销团队';
    }
    
    // 检查是否包含客服相关关键词
    if (roleNames.some(r => r.includes('客服') || r.includes('客户')) ||
        responsibilities.some(r => r.includes('客户服务') || r.includes('问题解答'))) {
      return '客服团队';
    }
    
    // 检查是否包含开发相关关键词
    if (roleNames.some(r => r.includes('开发') || r.includes('工程师') || r.includes('技术')) ||
        responsibilities.some(r => r.includes('代码') || r.includes('开发') || r.includes('技术架构'))) {
      return '开发团队';
    }
    
    // 检查是否包含数据分析相关关键词
    if (roleNames.some(r => r.includes('数据') || r.includes('分析')) ||
        responsibilities.some(r => r.includes('数据分析') || r.includes('数据挖掘'))) {
      return '数据分析团队';
    }
    
    // 默认返回营销团队
    return '营销团队';
  }

  /**
   * 生成 CEO 配置回复
   */
  private generateCEOResponse(ceoConfig: CEOConfig): string {
    return `✅ 已为您的团队生成定制化 CEO Agent！

**CEO 类型**: ${ceoConfig.templateName}
**管理风格**: ${ceoConfig.managementStyle}
**配置 Skills**: ${ceoConfig.skills.length} 个

**CEO 职责**:
- 协调团队成员工作
- 制定团队目标和策略
- 监控团队绩效
- 解决团队冲突

接下来我将搜索匹配的团队成员 Agent...`;
  }

  /**
   * 生成文档包
   */
  private async generateDocumentPackage(
    ceoConfig: CEOConfig,
    teamDesign: TeamDesign,
    teamName: string
  ): Promise<DocumentPackage> {
    console.log(`📄 Generating document package for ${teamName}...`);
    return await documentGeneratorService.generateDocumentPackage(
      ceoConfig,
      teamDesign,
      teamName
    );
  }

  /**
   * 生成文档包回复
   */
  private generateDocumentResponse(docPackage: DocumentPackage): string {
    return `✅ 团队经营配置文档包已生成！

**团队名称**: ${docPackage.packageInfo.teamName}
**团队类型**: ${docPackage.packageInfo.teamType}
**文档数量**: ${docPackage.packageInfo.totalDocuments} 个

**包含文档**:
${docPackage.documents.map(doc => `- ${doc.title}`).join('\n')}

您可以下载 JSON 或 Markdown 格式的文档包，用于团队经营参考。`;
  }
}

// 导出单例
export const nvwaxAgentService = new NvwaXAgentService();
