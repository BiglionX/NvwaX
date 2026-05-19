import { CEOConfig } from './ceo-agent-generator.service.js';
import { TeamDesign } from './nvwax-agent.service.js';
import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

/**
 * 文档类型
 */
export type DocumentType = 
  | 'ceo_system_prompt'
  | 'team_collaboration_guide'
  | 'operation_manual'
  | 'skill_documentation';

/**
 * 文档内容
 */
export interface DocumentContent {
  title: string;
  type: DocumentType;
  content: string;
  metadata: {
    generatedAt: string;
    version: string;
    teamType: string;
    [key: string]: any;
  };
}

/**
 * 文档包
 */
export interface DocumentPackage {
  documents: DocumentContent[];
  packageInfo: {
    teamName: string;
    teamType: string;
    generatedAt: string;
    totalDocuments: number;
  };
  downloadUrl?: string;
}

/**
 * Document Generator Service
 * 
 * 负责生成团队经营配置文档，包括：
 * - CEO System Prompt 文档
 * - 团队协作规范文档
 * - 运营指南文档
 * - Skill 使用文档
 */
export class DocumentGeneratorService {
  
  /**
   * 生成完整的文档包
   */
  async generateDocumentPackage(
    ceoConfig: CEOConfig,
    teamDesign: TeamDesign,
    teamName: string
  ): Promise<DocumentPackage> {
    console.log(`📄 Generating document package for ${teamName}...`);
    
    const documents: DocumentContent[] = [];
    
    // 1. 生成 CEO System Prompt 文档
    const ceoDoc = await this.generateCEODocument(ceoConfig, teamDesign);
    documents.push(ceoDoc);
    
    // 2. 生成团队协作规范文档
    const collaborationDoc = await this.generateCollaborationDocument(ceoConfig, teamDesign);
    documents.push(collaborationDoc);
    
    // 3. 生成运营指南文档
    const operationDoc = await this.generateOperationDocument(ceoConfig, teamDesign);
    documents.push(operationDoc);
    
    // 4. 生成 Skill 使用文档
    const skillDoc = await this.generateSkillDocumentation(ceoConfig);
    documents.push(skillDoc);
    
    const packageInfo = {
      teamName,
      teamType: ceoConfig.teamType,
      generatedAt: new Date().toISOString(),
      totalDocuments: documents.length
    };
    
    console.log(`✅ Document package generated: ${documents.length} documents`);
    
    return {
      documents,
      packageInfo
    };
  }
  
  /**
   * 生成 CEO System Prompt 文档
   */
  async generateCEODocument(
    ceoConfig: CEOConfig,
    teamDesign: TeamDesign
  ): Promise<DocumentContent> {
    const rolesList = teamDesign.roles.map((role, index) => 
      `${index + 1}. **${role.roleName}**
   - 职责：${role.responsibilities.join('、')}
   - 所需技能：${role.requiredSkills.join('、')}`
    ).join('\n\n');
    
    const content = `# CEO Agent System Prompt

## 基本信息

- **CEO 类型**: ${ceoConfig.templateName}
- **团队类型**: ${ceoConfig.teamType}
- **管理风格**: ${ceoConfig.managementStyle}

## System Prompt

\`\`\`
${ceoConfig.systemPrompt}
\`\`\`

## 配置的 Skills

${ceoConfig.skills.map(skill => `- ${skill}`).join('\n')}

## 决策规则

${ceoConfig.decisionRules && ceoConfig.decisionRules.length > 0 
  ? ceoConfig.decisionRules.map(rule => `- ${rule}`).join('\n')
  : '- 基于数据和事实做出决策\n- 优先考虑团队整体利益\n- 保持透明和公平的沟通'}

## 团队成员

${rolesList}

## 协作流程

${teamDesign.collaborationFlow}

---

*生成时间: ${new Date().toLocaleString('zh-CN')}*
`;
    
    return {
      title: 'CEO Agent System Prompt',
      type: 'ceo_system_prompt',
      content,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        teamType: ceoConfig.teamType,
        templateName: ceoConfig.templateName
      }
    };
  }
  
  /**
   * 生成团队协作规范文档
   */
  async generateCollaborationDocument(
    ceoConfig: CEOConfig,
    teamDesign: TeamDesign
  ): Promise<DocumentContent> {
    const rolesList = teamDesign.roles.map(role => 
      `### ${role.roleName}
- **职责**: ${role.description}
- **主要任务**: ${role.responsibilities.join('、')}
- **所需技能**: ${role.requiredSkills.join('、')}`
    ).join('\n\n');
    
    const content = `# 团队协作规范

## 团队概述

- **团队名称**: ${ceoConfig.teamType}
- **团队规模**: ${teamDesign.estimatedSize} 人
- **管理风格**: ${ceoConfig.managementStyle}

## 角色定义

${rolesList}

## 协作流程

${teamDesign.collaborationFlow}

## 沟通规范

### 日常沟通
- 使用清晰、简洁的语言
- 及时反馈和确认
- 保持开放和尊重的态度

### 会议规范
- 定期召开团队会议（建议每周一次）
- 会前准备议程
- 会后输出会议纪要和行动项

### 冲突解决
- 优先通过对话解决分歧
- 必要时由 CEO 做出最终决策
- 记录重要决策和理由

## 工作流

1. **任务分配**: CEO 根据团队目标和成员能力分配任务
2. **执行阶段**: 各角色独立完成 assigned 任务
3. **协作阶段**: 需要跨角色协作时，主动沟通协调
4. **review 阶段**: 完成任务后进行自我检查和同伴 review
5. **交付阶段**: 按时交付成果，记录经验教训

## 绩效评估

- **评估周期**: 每月一次
- **评估维度**: 
  - 任务完成质量
  - 团队协作表现
  - 学习和成长
  - 创新和贡献

---

*生成时间: ${new Date().toLocaleString('zh-CN')}*
`;
    
    return {
      title: '团队协作规范',
      type: 'team_collaboration_guide',
      content,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        teamType: ceoConfig.teamType,
        estimatedSize: teamDesign.estimatedSize
      }
    };
  }
  
  /**
   * 生成运营指南文档
   */
  async generateOperationDocument(
    ceoConfig: CEOConfig,
    teamDesign: TeamDesign
  ): Promise<DocumentContent> {
    const content = `# 团队运营指南

## 团队定位

**${ceoConfig.teamType}** 专注于${this.getTeamPurpose(ceoConfig.teamType)}。

## 核心目标

1. **短期目标** (1-3个月)
   - 建立团队工作流程
   - 完成初始项目交付
   - 培养团队协作默契

2. **中期目标** (3-6个月)
   - 优化工作流程
   - 提升交付质量
   - 扩展团队能力

3. **长期目标** (6-12个月)
   - 成为领域专家团队
   - 建立最佳实践
   - 持续创新和改进

## 关键成功因素

### 1. 明确的目标和期望
- CEO 制定清晰的团队目标
- 每个成员理解自己的职责
- 定期回顾和调整目标

### 2. 高效的沟通
- 建立畅通的沟通渠道
- 鼓励开放和诚实的反馈
- 及时解决沟通问题

### 3. 持续学习
- 鼓励成员学习新技能
- 分享知识和经验
- 关注行业趋势和最佳实践

### 4. 数据驱动决策
- 收集和分析关键指标
- 基于数据做出决策
- 持续优化和改进

## 常用工具和资源

### 项目管理
- 任务追踪系统
- 进度看板
- 里程碑规划

### 沟通协作
- 即时通讯工具
- 视频会议平台
- 文档协作工具

### 知识管理
- 知识库系统
- 文档管理系统
- 经验教训记录

## 风险管理

### 常见风险
1. **人员流失**: 建立备份机制，交叉培训
2. **需求变更**: 灵活调整，及时沟通
3. **技术挑战**: 提前调研，寻求专家支持
4. **时间压力**: 合理排期，优先级管理

### 应对策略
- 定期风险评估
- 制定应急预案
- 保持灵活性和适应性

## 最佳实践

1. **每日站会**: 简短同步进展和问题
2. **周度回顾**: 总结本周工作，规划下周任务
3. **月度总结**: 评估目标达成情况，调整策略
4. **季度规划**: 制定下季度目标和计划

---

*生成时间: ${new Date().toLocaleString('zh-CN')}*
`;
    
    return {
      title: '团队运营指南',
      type: 'operation_manual',
      content,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        teamType: ceoConfig.teamType
      }
    };
  }
  
  /**
   * 生成 Skill 使用文档
   */
  async generateSkillDocumentation(ceoConfig: CEOConfig): Promise<DocumentContent> {
    const skillsList = ceoConfig.skills.map((skill, index) => 
      `### ${index + 1}. ${skill}
- **用途**: 用于${this.getSkillPurpose(skill)}
- **使用时机**: 当需要${this.getSkillUsageTiming(skill)}
- **注意事项**: 确保正确配置和使用`
    ).join('\n\n');
    
    const content = `# Skill 使用文档

## 概述

本团队配置了 **${ceoConfig.skills.length}** 个 Skills，用于支持团队的各项任务。

## Skills 列表

${skillsList}

## Skill 集成指南

### 安装和配置
1. 确保所有依赖已正确安装
2. 按照每个 Skill 的文档进行配置
3. 测试 Skill 功能是否正常

### 使用规范
- 仅在需要时使用相应的 Skill
- 遵循 Skill 的最佳实践
- 记录使用经验和技巧

### 维护和更新
- 定期检查 Skill 版本更新
- 及时修复已知问题
- 根据需求添加新的 Skills

## 常见问题

**Q: 如何选择合适的 Skill？**
A: 根据任务类型和需求选择最匹配的 Skill。如果不确定，可以咨询 CEO 或团队成员。

**Q: Skill 冲突怎么办？**
A: 检查 Skills 之间的依赖关系，确保兼容性。必要时调整配置或寻找替代方案。

**Q: 如何添加新的 Skill？**
A: 在 SkillHub 中搜索所需的 Skill，如果没有则创建新的 Skill，然后添加到团队配置中。

---

*生成时间: ${new Date().toLocaleString('zh-CN')}*
`;
    
    return {
      title: 'Skill 使用文档',
      type: 'skill_documentation',
      content,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        teamType: ceoConfig.teamType,
        skillCount: ceoConfig.skills.length
      }
    };
  }
  
  /**
   * 获取团队目的描述
   */
  private getTeamPurpose(teamType: string): string {
    const purposes: Record<string, string> = {
      '营销团队': '内容创作、社交媒体运营和品牌推广',
      '客服团队': '客户服务、问题解决和用户满意度提升',
      '开发团队': '软件开发、技术架构和产品质量保障',
      '数据分析团队': '数据挖掘、统计分析和商业洞察发现'
    };
    return purposes[teamType] || '提供专业服务和支持';
  }
  
  /**
   * 获取 Skill 用途描述
   */
  private getSkillPurpose(skillName: string): string {
    const purposes: Record<string, string> = {
      'content_strategy': '制定内容策略和规划',
      'social_media_analytics': '分析社交媒体数据和趋势',
      'campaign_management': '管理和优化营销活动',
      'customer_communication': '与客户进行有效沟通',
      'problem_solving': '分析和解决复杂问题',
      'sentiment_analysis': '分析用户情感和态度',
      'technical_architecture': '设计和优化技术架构',
      'code_review': '审查和改进代码质量',
      'project_management': '规划和管理项目进度',
      'data_mining': '从数据中发现有价值的信息',
      'statistical_analysis': '进行统计分析和建模',
      'business_intelligence': '提供商业智能和洞察'
    };
    return purposes[skillName] || '支持团队特定任务';
  }
  
  /**
   * 获取 Skill 使用时机
   */
  private getSkillUsageTiming(skillName: string): string {
    const timings: Record<string, string> = {
      'content_strategy': '制定内容计划时',
      'social_media_analytics': '分析运营效果时',
      'campaign_management': '执行营销活动时',
      'customer_communication': '与客户互动时',
      'problem_solving': '遇到复杂问题时',
      'sentiment_analysis': '了解用户反馈时',
      'technical_architecture': '设计系统架构时',
      'code_review': '提交代码前',
      'project_management': '管理项目进度时',
      'data_mining': '需要数据洞察时',
      'statistical_analysis': '进行数据分析时',
      'business_intelligence': '制定业务决策时'
    };
    return timings[skillName] || '执行相关任务时';
  }
  
  /**
   * 将文档包保存为文件（JSON 格式）
   */
  async saveAsJSON(
    docPackage: DocumentPackage,
    outputDir: string = './downloads'
  ): Promise<string> {
    console.log(`💾 Saving document package as JSON...`);
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTeamName = docPackage.packageInfo.teamName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const filename = `${safeTeamName}_${timestamp}.json`;
    const filepath = path.join(outputDir, filename);
    
    // 写入文件
    const content = JSON.stringify(docPackage, null, 2);
    fs.writeFileSync(filepath, content, 'utf-8');
    
    console.log(`✅ Document package saved: ${filepath}`);
    
    return filepath;
  }
  
  /**
   * 将文档包保存为多个 Markdown 文件
   */
  async saveAsMarkdownFiles(
    docPackage: DocumentPackage,
    outputDir: string = './downloads'
  ): Promise<string[]> {
    console.log(`💾 Saving documents as Markdown files...`);
    
    // 确保输出目录存在
    const teamDir = path.join(
      outputDir,
      docPackage.packageInfo.teamName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    );
    
    if (!fs.existsSync(teamDir)) {
      fs.mkdirSync(teamDir, { recursive: true });
    }
    
    const savedFiles: string[] = [];
    
    // 保存每个文档
    for (const doc of docPackage.documents) {
      const safeTitle = doc.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
      const filename = `${safeTitle}.md`;
      const filepath = path.join(teamDir, filename);
      
      fs.writeFileSync(filepath, doc.content, 'utf-8');
      savedFiles.push(filepath);
      
      console.log(`   ✅ Saved: ${filename}`);
    }
    
    // 保存元数据
    const metadataPath = path.join(teamDir, 'package-info.json');
    fs.writeFileSync(metadataPath, JSON.stringify(docPackage.packageInfo, null, 2), 'utf-8');
    savedFiles.push(metadataPath);
    
    console.log(`✅ Documents saved to: ${teamDir}`);
    
    return savedFiles;
  }
}

// 导出单例
export const documentGeneratorService = new DocumentGeneratorService();
