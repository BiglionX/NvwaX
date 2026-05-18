import OpenAI from 'openai';
import { VirtualCompanyCreationService } from './virtual-company-creation.service.js';
import { agentCompatibilityService, RoleRequirement } from './agent-compatibility.service.js';
import { 
  CEO_AGENT_SYSTEM_PROMPT,
  CEO_AGENT_INITIAL_MESSAGE,
  ROLE_RECOMMENDATION_PROMPT,
  REQUIREMENT_CONFIRMATION_PROMPT
} from '../prompts/ceo-agent-prompt.js';

export interface CEOResponse {
  message: string;
  phase: string;
  extractedRequirements?: any;
  recommendedRoles?: any[];
  needsClarification: boolean;
  clarificationQuestions?: string[];
}

export class CEOAgentService {
  private openai: OpenAI | null = null;
  private creationService: VirtualCompanyCreationService;

  constructor() {
    this.creationService = new VirtualCompanyCreationService();
    
    // 初始化 OpenAI 客户端
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      console.warn('⚠️ OPENAI_API_KEY not configured. Using mock responses.');
    }
  }

  /**
   * 处理用户消息并生成 CEO Agent 回复
   */
  async processMessage(sessionId: string, userMessage: string): Promise<CEOResponse> {
    try {
      // 获取会话信息
      const session = await this.creationService.getSessionById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // 构建对话历史
      const conversationHistory = session.conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // 调用 LLM 生成回复
      let response: CEOResponse;
      
      if (this.openai) {
        response = await this.callLLM(conversationHistory, userMessage, session.status);
      } else {
        // 使用模拟响应（开发测试用）
        response = await this.getMockResponse(userMessage, session.status);
      }

      // 提取结构化数据
      const structuredData = this.extractStructuredData(response.message);

      // 根据阶段更新会话状态
      await this.updateSessionBasedOnPhase(sessionId, response.phase, structuredData);

      return response;
    } catch (error) {
      console.error('CEO Agent error:', error);
      throw error;
    }
  }

  /**
   * 调用 LLM API
   */
  private async callLLM(
    history: Array<{role: string, content: string}>,
    userMessage: string,
    currentStatus: string
  ): Promise<CEOResponse> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // 构建消息数组
    const messages: any[] = [
      { role: 'system', content: CEO_AGENT_SYSTEM_PROMPT }
    ];

    // 添加历史对话（最多保留最近 10 条）
    const recentHistory = history.slice(-10);
    messages.push(...recentHistory);

    // 添加当前用户消息
    messages.push({ role: 'user', content: userMessage });

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      const assistantMessage = completion.choices[0]?.message?.content || '';
      
      // 解析回复
      return this.parseLLMResponse(assistantMessage);
    } catch (error) {
      console.error('LLM API call failed:', error);
      // 降级到模拟响应
      return this.getMockResponse(userMessage, currentStatus);
    }
  }

  /**
   * 解析 LLM 响应
   */
  private parseLLMResponse(response: string): CEOResponse {
    // 尝试提取 JSON 部分
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    
    let structuredData: any = {};
    let naturalMessage = response;

    if (jsonMatch) {
      try {
        structuredData = JSON.parse(jsonMatch[1]);
        // 移除 JSON 部分，只保留自然语言消息
        naturalMessage = response.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
      } catch (e) {
        console.warn('Failed to parse JSON from LLM response');
      }
    }

    return {
      message: naturalMessage || '我理解了您的需求，让我们继续。',
      phase: structuredData.phase || 'requirements_gathering',
      extractedRequirements: structuredData.extractedRequirements,
      recommendedRoles: structuredData.recommendedRoles,
      needsClarification: structuredData.needsClarification || false,
      clarificationQuestions: structuredData.clarificationQuestions || []
    };
  }

  /**
   * 模拟响应（用于开发和测试）
   */
  private async getMockResponse(userMessage: string, currentStatus: string): Promise<CEOResponse> {
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    const lowerMessage = userMessage.toLowerCase();

    // 初始消息
    if (currentStatus === 'initiated') {
      return {
        message: CEO_AGENT_INITIAL_MESSAGE,
        phase: 'requirements_gathering',
        needsClarification: true,
        clarificationQuestions: ['您想创建什么类型的团队？']
      };
    }

    // 需求收集阶段
    if (lowerMessage.includes('营销') || lowerMessage.includes('marketing')) {
      return {
        message: `我理解您需要一个**营销内容创作团队**。

让我确认一下具体需求：

1. **主要职责**是什么？（例如：社交媒体运营、文案撰写、广告设计）
2. **目标平台**有哪些？（微信、微博、抖音、小红书等）
3. **内容类型**偏好？（图文、视频、直播等）

请告诉我更多信息，我会为您推荐合适的角色配置。`,
        phase: 'requirements_gathering',
        extractedRequirements: {
          companyType: '营销内容创作团队',
          responsibilities: ['内容创作', '社交媒体运营'],
          outputTypes: ['text', 'image'],
          targetAudience: '品牌客户',
          specialRequirements: ''
        },
        needsClarification: true,
        clarificationQuestions: ['主要职责是什么？', '目标平台有哪些？']
      };
    }

    if (lowerMessage.includes('客服') || lowerMessage.includes('客户服务')) {
      return {
        message: `明白了！您需要一个**客户服务团队**。

为了给您最合适的建议，请告诉我：

1. **服务范围**：售前咨询、售后支持、还是两者都有？
2. **渠道**：在线聊天、电话、邮件？
3. **语言**：需要支持哪些语言？

我会根据您的回答推荐最佳的角色组合。`,
        phase: 'requirements_gathering',
        extractedRequirements: {
          companyType: '客户服务团队',
          responsibilities: ['客户咨询', '问题解答'],
          outputTypes: ['text'],
          targetAudience: '终端用户',
          specialRequirements: ''
        },
        needsClarification: true,
        clarificationQuestions: ['服务范围是什么？', '支持哪些渠道？']
      };
    }

    // 如果用户提供了足够信息，进入角色推荐阶段
    if (lowerMessage.length > 20 && !lowerMessage.includes('?')) {
      return {
        message: `基于您的需求，我为您推荐以下 AI 团队角色：

**🎯 推荐角色配置：**

1. **内容策划师** 📝
   - 负责整体内容策略规划
   - 分析目标受众和市场需求
   - 制定内容日历

2. **文案创作者** ✍️
   - 撰写吸引人的文案
   - 优化SEO关键词
   - 保持品牌语调一致

3. **视觉设计师** 🎨
   - 设计图片和图形素材
   - 制作信息图表
   - 确保视觉风格统一

4. **社交媒体经理** 📱
   - 管理各平台账号
   - 安排发布时间
   - 与粉丝互动

5. **数据分析师** 📊
   - 跟踪内容表现
   - 提供优化建议
   - 生成月度报告

这个配置是否符合您的预期？您可以：
- ✅ 回复"确认"开始构建团队
- ✏️ 告诉我需要调整哪些角色
- ➕ 添加其他角色`,
        phase: 'role_recommendation',
        extractedRequirements: {
          companyType: '营销内容创作团队',
          responsibilities: ['内容创作', '社交媒体运营', '数据分析'],
          outputTypes: ['text', 'image'],
          targetAudience: '品牌客户',
          specialRequirements: '多平台支持'
        },
        recommendedRoles: [
          {
            roleName: '内容策划师',
            description: '负责整体内容策略规划',
            responsibilities: ['策略规划', '受众分析', '内容日历'],
            requiredSkills: ['strategy', 'analytics', 'planning']
          },
          {
            roleName: '文案创作者',
            description: '撰写吸引人的文案',
            responsibilities: ['文案撰写', 'SEO优化', '品牌语调'],
            requiredSkills: ['writing', 'seo', 'branding']
          },
          {
            roleName: '视觉设计师',
            description: '设计图片和图形素材',
            responsibilities: ['图片设计', '信息图表', '视觉风格'],
            requiredSkills: ['design', 'illustration', 'branding']
          }
        ],
        needsClarification: false,
        clarificationQuestions: []
      };
    }

    // 检查用户是否确认角色配置
    if (currentStatus === 'role_recommendation' && 
        (lowerMessage.includes('确认') || lowerMessage.includes('confirm') || 
         lowerMessage.includes('开始') || lowerMessage.includes('start') ||
         lowerMessage.includes('构建') || lowerMessage.includes('build'))) {
      return {
        message: `✅ 好的！我现在开始为您构建 AI 团队...

**正在执行以下步骤：**
1. 🔍 搜索合适的 Agent
2. 🎯 匹配 Skills
3. 🔧 配置团队协作
4. 📦 打包团队配置

请稍候，这可能需要几分钟时间...`,
        phase: 'building',
        needsClarification: false,
        clarificationQuestions: []
      };
    }

    // 默认响应
    return {
      message: `感谢您的反馈！

为了更好地为您服务，能否请您更详细地描述一下：
- 您希望这个团队完成什么任务？
- 有什么特别的要求或期望？

这样我可以为您推荐最合适的角色配置。`,
      phase: 'requirements_gathering',
      needsClarification: true,
      clarificationQuestions: ['请详细描述您的需求']
    };
  }

  /**
   * 从消息中提取结构化数据
   */
  private extractStructuredData(message: string): any {
    const jsonMatch = message.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * 根据阶段更新会话状态
   */
  private async updateSessionBasedOnPhase(
    sessionId: string,
    phase: string,
    structuredData: any
  ): Promise<void> {
    // 更新需求信息
    if (structuredData?.extractedRequirements) {
      await this.creationService.updateRequirements(
        sessionId,
        structuredData.extractedRequirements
      );
    }

    // 更新角色列表
    if (structuredData?.recommendedRoles) {
      await this.creationService.updateSelectedRoles(
        sessionId,
        structuredData.recommendedRoles
      );
      
      // Phase 3.1: 在角色推荐后自动搜索匹配的 Agent
      if (phase === 'role_recommendation') {
        await this.searchAgentsForRoles(sessionId, structuredData.recommendedRoles);
      }
    }

    // 根据阶段更新会话状态
    const statusMap: Record<string, string> = {
      'requirements_gathering': 'requirements_gathering',
      'role_recommendation': 'role_selection',
      'confirmation': 'confirming'
    };

    const newStatus = statusMap[phase];
    if (newStatus) {
      await this.creationService.updateStatus(sessionId, newStatus as any);
    }

    // 更新进度步骤
    const stepMap: Record<string, number> = {
      'requirements_gathering': 1,
      'role_recommendation': 2,
      'confirmation': 5
    };

    const stepNumber = stepMap[phase];
    if (stepNumber) {
      await this.creationService.updateStepStatus(
        sessionId,
        stepNumber,
        'completed',
        '已完成'
      );
    }
  }

  /**
   * 为推荐的角色搜索匹配的 Agent
   */
  private async searchAgentsForRoles(
    sessionId: string,
    roles: Array<{roleName: string; description: string; responsibilities?: string[]; requiredSkills?: string[]}>
  ): Promise<void> {
    try {
      console.log(`🔍 Starting agent search for ${roles.length} roles`);
      
      // 更新状态为 agent_searching
      await this.creationService.updateStatus(sessionId, 'agent_searching');
      await this.creationService.updateStepStatus(sessionId, 3, 'in_progress', '正在 SkillHub 搜索匹配的 Agent...');

      const agentSearchResults: Record<string, any[]> = {};

      // 为每个角色搜索 Agent
      for (const role of roles) {
        const roleRequirement: RoleRequirement = {
          roleName: role.roleName,
          description: role.description,
          responsibilities: role.responsibilities || [],
          requiredSkills: role.requiredSkills
        };

        // 搜索并评分 Agent
        const scoredAgents = await agentCompatibilityService.searchAndScoreAgents(
          roleRequirement,
          3 // 每个角色返回前 3 个匹配
        );

        agentSearchResults[role.roleName] = scoredAgents;
        console.log(`✅ Found ${scoredAgents.length} agents for role: ${role.roleName}`);
      }

      // 保存搜索结果到会话
      await this.creationService.updateProgress(sessionId, {
        currentStep: 3,
        percentage: 42,
        steps: [
          { stepNumber: 1, name: '需求分析', status: 'completed', message: '已完成' },
          { stepNumber: 2, name: '角色推荐', status: 'completed', message: '已完成' },
          { stepNumber: 3, name: 'Agent 搜索', status: 'completed', message: `找到 ${Object.values(agentSearchResults).flat().length} 个匹配 Agent` },
          { stepNumber: 4, name: 'Skill 匹配', status: 'pending', message: '等待开始' },
          { stepNumber: 5, name: '需求确认', status: 'pending', message: '等待开始' },
          { stepNumber: 6, name: '团队构建', status: 'pending', message: '等待开始' },
          { stepNumber: 7, name: '保存配置', status: 'pending', message: '等待开始' }
        ]
      });

      // 将搜索结果附加到会话数据中（用于后续展示）
      const session = await this.creationService.getSessionById(sessionId);
      if (session) {
        const updatedRequirements = {
          ...session.requirements,
          agentSearchResults
        };
        await this.creationService.updateRequirements(sessionId, updatedRequirements);
      }

      console.log('✅ Agent search completed');
    } catch (error) {
      console.error('Error in searchAgentsForRoles:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 生成初始欢迎消息
   */
  async generateWelcomeMessage(): Promise<string> {
    return CEO_AGENT_INITIAL_MESSAGE;
  }
}

// 导出单例
export const ceoAgentService = new CEOAgentService();
