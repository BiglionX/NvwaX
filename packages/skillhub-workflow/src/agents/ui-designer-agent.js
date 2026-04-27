/**
 * UI/UX Designer Agent - 界面设计和用户体验专家
 * 
 * 职责:
 * - 界面原型设计
 * - 用户体验优化
 * - 设计规范制定
 * - 可访问性检查
 * - 用户研究和分析
 * - A/B 测试设计
 */

const { HumanMessage } = require('@langchain/core/messages');
const { ChatOpenAI } = require('@langchain/openai');

class UIDesignerAgent {
  constructor() {
    this.llm = new ChatOpenAI({
      modelName: process.env.OPENAI_API_KEY ? 'gpt-4' : 'gpt-3.5-turbo',
      temperature: 0.7, // 较高温度以激发创造力
      openAIApiKey: process.env.OPENAI_API_KEY || 'mock-key'
    });
    
    this.designSystems = ['Material Design', 'Ant Design', 'Bootstrap', 'Tailwind UI'];
    this.colorTheory = ['互补色', '三角色', '类似色', '单色系'];
  }

  /**
   * 生成界面原型设计
   * @param {Object} requirements - 设计需求
   * @param {string} platform - 平台 (web/mobile/desktop)
   * @returns {Promise<Object>} 原型设计方案
   */
  async generatePrototype(requirements, platform = 'web') {
    console.log('🎨 UI/UX Designer generating prototype...');
    
    const prompt = `
作为资深 UI/UX 设计师,请为以下需求生成界面原型设计方案。

设计需求:
${JSON.stringify(requirements, null, 2)}

目标平台: ${platform}

请按照以下 JSON 格式返回原型设计(只返回 JSON):

{
  "projectName": "项目名称",
  "platform": "${platform}",
  "designSystem": "使用的设计系统",
  "screens": [
    {
      "name": "页面名称",
      "purpose": "页面用途",
      "layout": {
        "type": "grid|flex|custom",
        "columns": 列数,
        "spacing": "间距"
      },
      "components": [
        {
          "type": "组件类型",
          "name": "组件名称",
          "position": "位置描述",
          "properties": {},
          "interactions": ["交互1", "交互2"]
        }
      ],
      "navigation": {
        "header": "导航栏设计",
        "sidebar": "侧边栏设计",
        "footer": "页脚设计"
      },
      "wireframe": "线框图描述"
    }
  ],
  "userFlow": [
    {
      "step": 1,
      "action": "用户动作",
      "screen": "对应页面",
      "outcome": "结果"
    }
  ],
  "responsiveDesign": {
    "breakpoints": [
      {
        "name": "mobile|tablet|desktop",
        "width": "宽度范围",
        "adjustments": "调整说明"
      }
    ]
  },
  "accessibility": {
    "wcagLevel": "AA|AAA",
    "considerations": [
      "无障碍考虑1",
      "无障碍考虑2"
    ]
  },
  "recommendations": [
    "设计建议1",
    "设计建议2"
  ]
}

要求:
1. 遵循 Material Design 或 Ant Design 规范
2. 考虑移动端响应式设计
3. 包含完整的用户流程
4. 符合 WCAG 2.1 AA 无障碍标准
5. 提供清晰的交互说明
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let prototype;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        prototype = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse prototype:', parseError);
        throw new Error('Invalid prototype format');
      }
      
      console.log(`✅ Prototype generated with ${prototype.screens.length} screens`);
      return prototype;
      
    } catch (error) {
      console.error('Prototype generation failed:', error);
      throw error;
    }
  }

  /**
   * 生成配色方案和视觉设计
   * @param {Object} brandInfo - 品牌信息
   * @param {string} style - 设计风格
   * @returns {Promise<Object>} 视觉设计方案
   */
  async generateVisualDesign(brandInfo, style = 'modern') {
    console.log('🌈 UI/UX Designer generating visual design...');
    
    const prompt = `
作为视觉设计专家,请基于以下品牌信息生成完整的视觉设计方案。

品牌信息:
${JSON.stringify(brandInfo, null, 2)}

设计风格: ${style}

请按照以下 JSON 格式返回视觉设计(只返回 JSON):

{
  "colorPalette": {
    "primary": {
      "main": "#主色",
      "light": "#浅色",
      "dark": "#深色",
      "contrast": "#对比色"
    },
    "secondary": {
      "main": "#次色",
      "light": "#浅色",
      "dark": "#深色"
    },
    "neutral": {
      "white": "#FFFFFF",
      "gray100": "#F5F5F5",
      "gray500": "#9E9E9E",
      "gray900": "#212121",
      "black": "#000000"
    },
    "semantic": {
      "success": "#成功色",
      "warning": "#警告色",
      "error": "#错误色",
      "info": "#信息色"
    },
    "gradients": [
      "渐变1",
      "渐变2"
    ]
  },
  "typography": {
    "fontFamily": {
      "heading": "标题字体",
      "body": "正文字体",
      "code": "代码字体"
    },
    "fontSizes": {
      "xs": "12px",
      "sm": "14px",
      "base": "16px",
      "lg": "18px",
      "xl": "20px",
      "2xl": "24px",
      "3xl": "30px",
      "4xl": "36px"
    },
    "fontWeights": {
      "light": 300,
      "regular": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    },
    "lineHeights": {
      "tight": 1.2,
      "normal": 1.5,
      "relaxed": 1.75
    }
  },
  "spacing": {
    "scale": [4, 8, 12, 16, 24, 32, 48, 64],
    "unit": "px"
  },
  "borderRadius": {
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "full": "9999px"
  },
  "shadows": [
    {
      "name": "shadow-sm",
      "value": "阴影值"
    },
    {
      "name": "shadow-md",
      "value": "阴影值"
    },
    {
      "name": "shadow-lg",
      "value": "阴影值"
    }
  ],
  "icons": {
    "style": "图标风格",
    "library": "推荐图标库",
    "size": "默认尺寸"
  },
  "animations": {
    "duration": {
      "fast": "150ms",
      "normal": "300ms",
      "slow": "500ms"
    },
    "easing": {
      "ease-in": "cubic-bezier()",
      "ease-out": "cubic-bezier()",
      "ease-in-out": "cubic-bezier()"
    }
  },
  "designTokens": "CSS/Tailwind 配置代码字符串",
  "examples": [
    {
      "component": "组件名称",
      "description": "使用示例",
      "code": "代码片段"
    }
  ]
}

要求:
1. 配色符合色彩理论
2. 字体层次清晰易读
3. 间距系统一致
4. 提供完整的设计 Token
5. 包含实际使用示例
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let design;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        design = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse visual design:', parseError);
        throw new Error('Invalid visual design format');
      }
      
      console.log(`✅ Visual design generated with complete color palette and typography`);
      return design;
      
    } catch (error) {
      console.error('Visual design generation failed:', error);
      throw error;
    }
  }

  /**
   * 用户体验分析和优化建议
   * @param {Object} currentDesign - 当前设计
   * @param {Array} userFeedback - 用户反馈
   * @returns {Promise<Object>} UX 分析报告
   */
  async analyzeUX(currentDesign, userFeedback = []) {
    console.log('🔍 UI/UX Designer analyzing user experience...');
    
    const prompt = `
作为 UX 研究专家,请分析以下设计并提供优化建议。

当前设计:
${JSON.stringify(currentDesign, null, 2)}

用户反馈:
${JSON.stringify(userFeedback)}

请按照以下 JSON 格式返回 UX 分析报告(只返回 JSON):

{
  "overallScore": 85,
  "strengths": [
    "优势1",
    "优势2"
  ],
  "weaknesses": [
    "不足1",
    "不足2"
  ],
  "usabilityIssues": [
    {
      "severity": "critical|high|medium|low",
      "issue": "问题描述",
      "location": "位置",
      "impact": "影响说明",
      "usersAffected": "受影响用户百分比",
      "recommendation": "改进建议",
      "priority": "immediate|short-term|long-term"
    }
  ],
  "heuristicEvaluation": {
    "visibilityOfSystemStatus": "评分(1-10)",
    "matchBetweenSystemAndRealWorld": "评分(1-10)",
    "userControlAndFreedom": "评分(1-10)",
    "consistencyAndStandards": "评分(1-10)",
    "errorPrevention": "评分(1-10)",
    "recognitionRatherThanRecall": "评分(1-10)",
    "flexibilityAndEfficiency": "评分(1-10)",
    "aestheticAndMinimalistDesign": "评分(1-10)",
    "helpUsersRecognizeRecoverErrors": "评分(1-10)",
    "helpAndDocumentation": "评分(1-10)"
  },
  "conversionOptimization": [
    {
      "element": "元素名称",
      "currentPerformance": "当前表现",
      "suggestedChange": "建议改动",
      "expectedImprovement": "预期提升"
    }
  ],
  "accessibilityAudit": {
    "wcagCompliance": "AA|AAA",
    "issues": [
      {
        "criterion": "WCAG 标准",
        "level": "A|AA|AAA",
        "status": "pass|fail",
        "fix": "修复方案"
      }
    ]
  },
  "abTestSuggestions": [
    {
      "element": "测试元素",
      "variantA": "版本A描述",
      "variantB": "版本B描述",
      "hypothesis": "假设",
      "metric": "衡量指标"
    }
  ],
  "recommendations": [
    "优化建议1",
    "优化建议2"
  ],
  "nextSteps": [
    "下一步行动1",
    "下一步行动2"
  ]
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
        console.error('Failed to parse UX analysis:', parseError);
        throw new Error('Invalid UX analysis format');
      }
      
      console.log(`✅ UX analysis completed. Score: ${analysis.overallScore}/100`);
      return analysis;
      
    } catch (error) {
      console.error('UX analysis failed:', error);
      throw error;
    }
  }

  /**
   * 创建设计规范和组件库文档
   * @param {Object} visualDesign - 视觉设计
   * @param {Object} prototype - 原型设计
   * @returns {Promise<Object>} 设计规范文档
   */
  async createDesignSystem(visualDesign, prototype) {
    console.log('📐 UI/UX Designer creating design system...');
    
    const prompt = `
作为设计系统专家,请基于以下内容创建设计规范文档。

视觉设计:
${JSON.stringify(visualDesign, null, 2)}

原型设计:
${JSON.stringify(prototype, null, 2)}

请按照以下 JSON 格式返回设计规范(只返回 JSON):

{
  "designSystemName": "设计系统名称",
  "version": "1.0.0",
  "principles": [
    "设计原则1",
    "设计原则2"
  ],
  "foundations": {
    "colors": "颜色规范",
    "typography": "字体规范",
    "spacing": "间距规范",
    "grid": "网格系统",
    "icons": "图标规范",
    "imagery": "图片使用规范"
  },
  "components": [
    {
      "name": "组件名称",
      "category": "分类",
      "description": "组件描述",
      "variants": ["变体1", "变体2"],
      "states": ["default", "hover", "active", "disabled"],
      "props": [
        {
          "name": "属性名",
          "type": "类型",
          "default": "默认值",
          "description": "描述"
        }
      ],
      "usage": "使用指南",
      "doDont": {
        "do": ["正确用法1"],
        "dont": ["错误用法1"]
      },
      "codeExample": "代码示例",
      "figmaLink": "Figma 链接"
    }
  ],
  "patterns": [
    {
      "name": "模式名称",
      "description": "模式描述",
      "whenToUse": "使用场景",
      "implementation": "实现方式"
    }
  ],
  "templates": [
    {
      "name": "模板名称",
      "purpose": "用途",
      "layout": "布局说明",
      "components": ["使用的组件"]
    }
  ],
  "guidelines": {
    "writingStyle": "文案风格指南",
    "accessibility": "无障碍指南",
    "internationalization": "国际化指南",
    "performance": "性能优化指南"
  },
  "resources": {
    "figmaFile": "Figma 文件链接",
    "storybook": "Storybook 链接",
    "github": "GitHub 仓库",
    "changelog": "更新日志"
  }
}
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let designSystem;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        designSystem = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse design system:', parseError);
        throw new Error('Invalid design system format');
      }
      
      console.log(`✅ Design system created with ${designSystem.components.length} components`);
      return designSystem;
      
    } catch (error) {
      console.error('Design system creation failed:', error);
      throw error;
    }
  }

  /**
   * 生成 A/B 测试方案
   * @param {Object} page - 页面信息
   * @param {string} goal - 测试目标
   * @returns {Promise<Object>} A/B 测试方案
   */
  async generateABTest(page, goal = 'conversion') {
    console.log('🧪 UI/UX Designer generating A/B test...');
    
    const prompt = `
作为 A/B 测试专家,请为以下页面设计测试方案。

页面信息:
${JSON.stringify(page, null, 2)}

测试目标: ${goal}

请按照以下 JSON 格式返回 A/B 测试方案(只返回 JSON):

{
  "testName": "测试名称",
  "hypothesis": "测试假设",
  "goal": "测试目标",
  "primaryMetric": "主要指标",
  "secondaryMetrics": ["次要指标1", "次要指标2"],
  "variants": [
    {
      "name": "Variant A (Control)",
      "description": "对照组描述",
      "changes": [],
      "rationale": "设计理由"
    },
    {
      "name": "Variant B",
      "description": "实验组描述",
      "changes": [
        {
          "element": "改动元素",
          "from": "原设计",
          "to": "新设计",
          "reason": "改动原因"
        }
      ],
      "rationale": "设计理由"
    }
  ],
  "sampleSize": {
    "required": "所需样本量",
    "duration": "预计测试时长(天)",
    "confidenceLevel": 95,
    "statisticalPower": 80
  },
  "segments": [
    {
      "name": "用户分群",
      "criteria": "分群条件",
      "percentage": "流量分配百分比"
    }
  ],
  "successCriteria": {
    "minimumLift": "最小提升幅度",
    "statisticalSignificance": "统计显著性水平"
  },
  "risks": [
    "风险1",
    "风险2"
  ],
  "implementation": {
    "tool": "测试工具",
    "tracking": "追踪方案",
    "rollback": "回滚计划"
  }
}
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let abTest;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        abTest = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse A/B test:', parseError);
        throw new Error('Invalid A/B test format');
      }
      
      console.log(`✅ A/B test designed with ${abTest.variants.length} variants`);
      return abTest;
      
    } catch (error) {
      console.error('A/B test generation failed:', error);
      throw error;
    }
  }
}

module.exports = UIDesignerAgent;
