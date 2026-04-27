/**
 * Product Manager Agent - 产品经理智能体
 * 
 * 职责:
 * - 需求分析和产品规划
 * - 技术方案设计
 * - 项目进度管理
 * - 团队协调和沟通
 * - 文档编写
 */

const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { ChatOpenAI } = require('@langchain/openai');

class ProductManagerAgent {
  constructor() {
    this.llm = new ChatOpenAI({
      modelName: process.env.OPENAI_API_KEY ? 'gpt-4' : 'gpt-3.5-turbo',
      temperature: 0.5, // 中等温度以平衡创造性和准确性
      openAIApiKey: process.env.OPENAI_API_KEY || 'mock-key'
    });
  }

  /**
   * 分析用户需求并生成产品需求文档 (PRD)
   * @param {string} userRequirement - 用户需求描述
   * @returns {Promise<Object>} 产品需求文档
   */
  async analyzeRequirements(userRequirement) {
    console.log('📋 Product Manager analyzing requirements...');
    
    const prompt = `
作为资深产品经理,请分析以下用户需求并生成详细的产品需求文档。

用户需求:
${userRequirement}

请按照以下 JSON 格式返回 PRD(只返回 JSON,不要有其他文字):

{
  "productName": "产品名称",
  "version": "1.0.0",
  "executiveSummary": "执行摘要(2-3句话)",
  "problemStatement": "要解决的问题",
  "targetUsers": [
    {
      "persona": "用户画像名称",
      "description": "用户描述",
      "painPoints": ["痛点1", "痛点2"],
      "goals": ["目标1", "目标2"]
    }
  ],
  "features": [
    {
      "id": "F001",
      "name": "功能名称",
      "priority": "must-have|should-have|could-have|won't-have",
      "description": "功能描述",
      "userStories": [
        "作为[用户角色],我想要[功能],以便[价值]"
      ],
      "acceptanceCriteria": [
        "验收标准1",
        "验收标准2"
      ]
    }
  ],
  "technicalRequirements": {
    "platforms": ["Web", "Mobile", "Desktop"],
    "techStack": {
      "frontend": ["React", "TypeScript"],
      "backend": ["Node.js", "PostgreSQL"],
      "infrastructure": ["AWS", "Docker"]
    },
    "integrations": ["第三方服务1", "第三方服务2"],
    "securityRequirements": [
      "安全要求1",
      "安全要求2"
    ]
  },
  "successMetrics": [
    {
      "metric": "指标名称",
      "target": "目标值",
      "measurement": "测量方法"
    }
  ],
  "timeline": {
    "phases": [
      {
        "phase": "阶段名称",
        "duration": "持续时间(周)",
        "deliverables": ["交付物1", "交付物2"]
      }
    ],
    "estimatedTotalWeeks": 12
  },
  "risks": [
    {
      "risk": "风险描述",
      "probability": "high|medium|low",
      "impact": "high|medium|low",
      "mitigation": "缓解措施"
    }
  ],
  "recommendations": [
    "建议1",
    "建议2"
  ]
}

要求:
1. 需求分析要全面深入
2. 功能优先级使用 MoSCoW 方法
3. 用户故事遵循 INVEST 原则
4. 技术方案切实可行
5. 时间估算合理保守
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let prd;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        prd = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse PRD:', parseError);
        throw new Error('Invalid PRD format');
      }
      
      console.log(`✅ PRD generated with ${prd.features.length} features`);
      return prd;
      
    } catch (error) {
      console.error('Requirement analysis failed:', error);
      throw error;
    }
  }

  /**
   * 设计技术架构方案
   * @param {Object} prd - 产品需求文档
   * @returns {Promise<Object>} 技术架构设计
   */
  async designArchitecture(prd) {
    console.log('🏗️ Product Manager designing architecture...');
    
    const prompt = `
作为技术架构师,请基于以下产品需求设计技术架构方案。

产品需求:
${JSON.stringify(prd, null, 2)}

请按照以下 JSON 格式返回架构设计(只返回 JSON):

{
  "architectureName": "架构方案名称",
  "overview": "架构概述",
  "architecturePattern": "microservices|monolith|serverless|hybrid",
  "systemComponents": [
    {
      "name": "组件名称",
      "type": "frontend|backend|database|cache|queue|gateway",
      "technology": "使用的技术",
      "responsibilities": ["职责1", "职责2"],
      "dependencies": ["依赖组件1", "依赖组件2"]
    }
  ],
  "dataFlow": [
    {
      "step": 1,
      "from": "源组件",
      "to": "目标组件",
      "protocol": "HTTP|WebSocket|gRPC|Message Queue",
      "description": "数据流描述"
    }
  ],
  "databaseDesign": {
    "primaryDatabase": "PostgreSQL|MySQL|MongoDB",
    "schema": [
      {
        "table": "表名",
        "purpose": "用途",
        "keyFields": ["字段1", "字段2"]
      }
    ],
    "cachingStrategy": "Redis|Memcached",
    "backupStrategy": "备份策略"
  },
  "apiDesign": {
    "style": "REST|GraphQL|gRPC",
    "authentication": "JWT|OAuth2|API Key",
    "rateLimiting": true,
    "versioning": "URL|Header",
    "documentation": "Swagger|OpenAPI"
  },
  "scalability": {
    "horizontalScaling": true,
    "loadBalancing": "Nginx|AWS ALB",
    "autoScaling": true,
    "maxConcurrentUsers": 10000
  },
  "security": {
    "encryption": "TLS 1.3",
    "dataEncryption": "AES-256",
    "inputValidation": true,
    "sqlInjectionProtection": true,
    "xssProtection": true
  },
  "deployment": {
    "environment": ["development", "staging", "production"],
    "ciCd": "GitHub Actions|Jenkins|GitLab CI",
    "containerization": "Docker",
    "orchestration": "Kubernetes|Docker Swarm",
    "monitoring": "Prometheus + Grafana"
  },
  "estimatedCost": {
    "monthlyInfrastructure": "$500-$2000",
    "breakdown": {
      "compute": "$200",
      "database": "$100",
      "storage": "$50",
      "networking": "$50"
    }
  },
  "recommendations": [
    "架构建议1",
    "架构建议2"
  ]
}
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let architecture;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        architecture = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse architecture:', parseError);
        throw new Error('Invalid architecture format');
      }
      
      console.log(`✅ Architecture designed with ${architecture.systemComponents.length} components`);
      return architecture;
      
    } catch (error) {
      console.error('Architecture design failed:', error);
      throw error;
    }
  }

  /**
   * 制定项目计划和里程碑
   * @param {Object} prd - 产品需求文档
   * @param {Object} architecture - 技术架构
   * @param {number} teamSize - 团队规模
   * @returns {Promise<Object>} 项目计划
   */
  async createProjectPlan(prd, architecture, teamSize = 5) {
    console.log('📅 Product Manager creating project plan...');
    
    const prompt = `
作为项目管理专家,请制定详细的项目计划。

产品信息:
${JSON.stringify({prd, architecture}, null, 2)}

团队规模: ${teamSize} 人

请按照以下 JSON 格式返回项目计划(只返回 JSON):

{
  "projectName": "项目名称",
  "startDate": "开始日期 ISO 格式",
  "endDate": "预计结束日期 ISO 格式",
  "totalDuration": "总时长(周)",
  "phases": [
    {
      "phase": "阶段名称",
      "duration": "时长(周)",
      "startDate": "开始日期",
      "endDate": "结束日期",
      "objectives": ["目标1", "目标2"],
      "deliverables": ["交付物1", "交付物2"],
      "tasks": [
        {
          "id": "T001",
          "name": "任务名称",
          "assignee": "负责角色",
          "estimatedHours": 40,
          "priority": "high|medium|low",
          "dependencies": ["T000"]
        }
      ],
      "milestones": [
        {
          "name": "里程碑名称",
          "date": "日期",
          "criteria": ["完成标准1", "完成标准2"]
        }
      ]
    }
  ],
  "resourceAllocation": {
    "frontend": 2,
    "backend": 2,
    "database": 1,
    "testing": 1,
    "design": 1
  },
  "riskManagement": [
    {
      "risk": "风险描述",
      "probability": "high|medium|low",
      "impact": "high|medium|low",
      "mitigation": "缓解措施",
      "contingency": "应急计划"
    }
  ],
  "communicationPlan": {
    "dailyStandup": "每日站会 15分钟",
    "weeklyReview": "每周评审 1小时",
    "sprintPlanning": "迭代计划 2小时",
    "retrospective": "回顾会议 1小时"
  },
  "qualityGates": [
    "代码审查通过",
    "单元测试覆盖率 > 90%",
    "集成测试通过",
    "性能测试达标",
    "安全审计通过"
  ]
}
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let plan;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        plan = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse project plan:', parseError);
        throw new Error('Invalid project plan format');
      }
      
      console.log(`✅ Project plan created with ${plan.phases.length} phases`);
      return plan;
      
    } catch (error) {
      console.error('Project planning failed:', error);
      throw error;
    }
  }

  /**
   * 跟踪项目进度
   * @param {Object} projectPlan - 项目计划
   * @param {Array} completedTasks - 已完成任务列表
   * @returns {Promise<Object>} 进度报告
   */
  async trackProgress(projectPlan, completedTasks = []) {
    console.log('📊 Product Manager tracking progress...');
    
    const prompt = `
作为项目经理,请分析当前项目进度并生成进度报告。

项目计划:
${JSON.stringify(projectPlan, null, 2)}

已完成任务: ${JSON.stringify(completedTasks)}

请按照以下 JSON 格式返回进度报告(只返回 JSON):

{
  "reportDate": "报告日期 ISO 格式",
  "overallProgress": 45, // 百分比
  "phaseStatus": [
    {
      "phase": "阶段名称",
      "status": "not-started|in-progress|completed",
      "progress": 60, // 百分比
      "completedTasks": 10,
      "totalTasks": 20,
      "onTrack": true
    }
  ],
  "completedMilestones": ["里程碑1"],
  "upcomingMilestones": [
    {
      "name": "里程碑名称",
      "dueDate": "截止日期",
      "daysRemaining": 7
    }
  ],
  "blockers": [
    {
      "issue": "阻塞问题",
      "impact": "影响说明",
      "resolution": "解决方案",
      "owner": "负责人"
    }
  ],
  "teamPerformance": {
    "velocity": "每迭代完成的故事点数",
    "quality": "代码质量评分",
    "collaboration": "协作评分"
  },
  "recommendations": [
    "建议1",
    "建议2"
  ],
  "nextActions": [
    "下一步行动1",
    "下一步行动2"
  ]
}
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let report;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        report = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse progress report:', parseError);
        throw new Error('Invalid progress report format');
      }
      
      console.log(`✅ Progress report generated. Overall: ${report.overallProgress}%`);
      return report;
      
    } catch (error) {
      console.error('Progress tracking failed:', error);
      throw error;
    }
  }

  /**
   * 生成部署指南
   * @param {Object} architecture - 技术架构
   * @param {Object} projectPlan - 项目计划
   * @returns {Promise<Object>} 部署指南
   */
  async generateDeploymentGuide(architecture, projectPlan) {
    console.log('🚀 Product Manager generating deployment guide...');
    
    const prompt = `
作为 DevOps 专家,请生成详细的部署指南。

架构信息:
${JSON.stringify(architecture, null, 2)}

请按照以下 JSON 格式返回部署指南(只返回 JSON):

{
  "title": "部署指南标题",
  "prerequisites": [
    "前置条件1",
    "前置条件2"
  ],
  "environments": [
    {
      "name": "development|staging|production",
      "url": "环境 URL",
      "configuration": {
        "cpu": "CPU 配置",
        "memory": "内存配置",
        "storage": "存储配置"
      }
    }
  ],
  "deploymentSteps": [
    {
      "step": 1,
      "action": "操作步骤",
      "command": "执行的命令",
      "expectedResult": "预期结果",
      "verification": "验证方法"
    }
  ],
  "configurationFiles": [
    {
      "file": "配置文件路径",
      "purpose": "用途",
      "example": "配置示例"
    }
  ],
  "monitoring": {
    "metrics": ["指标1", "指标2"],
    "alerts": [
      {
        "condition": "告警条件",
        "threshold": "阈值",
        "action": "响应动作"
      }
    ],
    "dashboards": ["Dashboard 链接"]
  },
  "rollback": {
    "strategy": "回滚策略",
    "steps": ["步骤1", "步骤2"],
    "estimatedTime": "预计回滚时间"
  },
  "troubleshooting": [
    {
      "issue": "常见问题",
      "symptoms": "症状",
      "solution": "解决方案"
    }
  ]
}
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let guide;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        guide = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse deployment guide:', parseError);
        throw new Error('Invalid deployment guide format');
      }
      
      console.log(`✅ Deployment guide generated with ${guide.deploymentSteps.length} steps`);
      return guide;
      
    } catch (error) {
      console.error('Deployment guide generation failed:', error);
      throw error;
    }
  }

  /**
   * 竞品分析
   * @param {string} productDescription - 产品描述
   * @param {Array} competitors - 竞争对手列表
   * @returns {Promise<Object>} 竞品分析报告
   */
  async analyzeCompetitors(productDescription, competitors = []) {
    console.log('🔍 Product Manager analyzing competitors...');
    
    const prompt = `
作为市场分析师,请对以下产品进行竞品分析。

产品描述: ${productDescription}
竞争对手: ${competitors.join(', ')}

请按照以下 JSON 格式返回竞品分析报告(只返回 JSON):

{
  "marketOverview": "市场概况",
  "competitorAnalysis": [
    {
      "name": "竞争对手名称",
      "strengths": ["优势1", "优势2"],
      "weaknesses": ["劣势1", "劣势2"],
      "marketShare": "市场份额估计",
      "pricing": "定价策略",
      "uniqueFeatures": ["独特功能1", "独特功能2"]
    }
  ],
  "competitiveAdvantages": [
    "我们的竞争优势1",
    "我们的竞争优势2"
  ],
  "marketOpportunities": [
    "市场机会1",
    "市场机会2"
  ],
  "threats": [
    "威胁1",
    "威胁2"
  ],
  "recommendations": [
    "战略建议1",
    "战略建议2"
  ],
  "positioningStrategy": "市场定位策略"
}
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let analysis;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        analysis = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse competitor analysis:', parseError);
        throw new Error('Invalid competitor analysis format');
      }
      
      console.log(`✅ Competitor analysis completed for ${analysis.competitorAnalysis.length} competitors`);
      return analysis;
      
    } catch (error) {
      console.error('Competitor analysis failed:', error);
      throw error;
    }
  }

  /**
   * 成本优化建议
   * @param {Object} architecture - 技术架构
   * @param {string} cloudProvider - 云服务商 (AWS/Azure/GCP)
   * @returns {Promise<Object>} 成本优化方案
   */
  async optimizeCosts(architecture, cloudProvider = 'AWS') {
    console.log('💰 Product Manager optimizing costs...');
    
    const prompt = `
作为云成本优化专家,请为以下架构提供成本优化建议。

技术架构:
${JSON.stringify(architecture, null, 2)}

云服务商: ${cloudProvider}

请按照以下 JSON 格式返回成本优化方案(只返回 JSON):

{
  "currentEstimatedCost": {
    "monthly": 2000,
    "breakdown": {
      "compute": 800,
      "database": 400,
      "storage": 200,
      "networking": 300,
      "other": 300
    }
  },
  "optimizationStrategies": [
    {
      "category": "compute|database|storage|networking",
      "strategy": "优化策略名称",
      "description": "策略描述",
      "implementation": "实施步骤",
      "estimatedSavings": {
        "monthly": 200,
        "percentage": 10
      },
      "effort": "low|medium|high",
      "risk": "low|medium|high"
    }
  ],
  "recommendedServices": [
    {
      "service": "推荐的服务",
      "reason": "推荐理由",
      "costComparison": "成本对比"
    }
  ],
  "reservedInstances": {
    "recommended": true,
    "term": "1年|3年",
    "savings": "预计节省百分比"
  },
  "autoScaling": {
    "recommended": true,
    "configuration": "自动扩缩容配置建议"
  },
  "totalPotentialSavings": {
    "monthly": 600,
    "yearly": 7200,
    "percentage": 30
  },
  "actionPlan": [
    "立即行动1",
    "短期行动2",
    "长期行动3"
  ]
}
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let optimization;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        optimization = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse cost optimization:', parseError);
        throw new Error('Invalid cost optimization format');
      }
      
      console.log(`✅ Cost optimization completed. Potential savings: $${optimization.totalPotentialSavings.monthly}/month`);
      return optimization;
      
    } catch (error) {
      console.error('Cost optimization failed:', error);
      throw error;
    }
  }
}

module.exports = ProductManagerAgent;
