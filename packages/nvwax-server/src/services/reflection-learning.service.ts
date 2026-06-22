/**
 * Reflection Learning Service
 * 
 * 反思学习服务：定期分析失败案例，提取失败模式，
 * 将反思结果注入到 LLM system prompt 中避免重复犯错
 * 
 * 核心能力：
 * 1. 分析低分案例（success_score < 0.5）
 * 2. 提取失败模式和共性
 * 3. 生成反思建议
 * 4. 注入到 LLM prompt 中
 */

import { databaseService } from './database.service.js';
import OpenAI from 'openai';
import { tokenQuotaService } from './token-quota.service.js';

// ============================================================
// 类型定义
// ============================================================

export interface FailurePattern {
  pattern: string;
  description: string;
  occurrences: number;
  avgScore: number;
  affectedTeamTypes: string[];
  suggestedFix: string;
  lastSeen: string;
}

export interface ReflectionReport {
  totalCasesAnalyzed: number;
  failureCases: number;
  successCases: number;
  patterns: FailurePattern[];
  recommendations: string[];
  generatedAt: string;
  /** 用于注入 LLM prompt 的文本摘要 */
  promptInjection: string;
}

// ============================================================
// 反思学习服务
// ============================================================

export class ReflectionLearningService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1'
      });
    }
  }

  /**
   * 执行反思学习分析
   * 
   * @param threshold 失败分数阈值（默认 0.5）
   * @param limit 分析的最大案例数
   */
  async reflect(threshold: number = 0.5, limit: number = 50): Promise<ReflectionReport> {
    console.log(`[Reflection] Starting reflection analysis (threshold: ${threshold}, limit: ${limit})`);

    const pool = databaseService.getPool();

    // 查询低分案例
    let failureCases: any[] = [];
    let totalCases = 0;
    let successCases = 0;

    try {
      const failureResult = await pool.query(
        `SELECT id, team_type, industry, requirements, team_config, 
                agent_matches, skill_matches, success_score, user_feedback, created_at
         FROM nvwax_memories 
         WHERE success_score < $1
         ORDER BY created_at DESC 
         LIMIT $2`,
        [threshold, limit]
      );
      failureCases = failureResult.rows;

      const countResult = await pool.query(
        'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE success_score >= $1) as success FROM nvwax_memories',
        [threshold]
      );
      totalCases = parseInt(countResult.rows[0]?.total || '0');
      successCases = parseInt(countResult.rows[0]?.success || '0');
    } catch (error: any) {
      console.error('[Reflection] Database query failed:', error.message);
      return this.getEmptyReport();
    }

    if (failureCases.length === 0) {
      console.log('[Reflection] No failure cases found');
      return {
        totalCasesAnalyzed: totalCases,
        failureCases: 0,
        successCases,
        patterns: [],
        recommendations: ['当前没有失败案例，系统运行良好'],
        generatedAt: new Date().toISOString(),
        promptInjection: ''
      };
    }

    // 使用 LLM 分析失败模式
    const patterns = await this.analyzeFailurePatterns(failureCases);
    const recommendations = this.generateRecommendations(patterns);
    const promptInjection = this.generatePromptInjection(patterns);

    const report: ReflectionReport = {
      totalCasesAnalyzed: totalCases,
      failureCases: failureCases.length,
      successCases,
      patterns,
      recommendations,
      generatedAt: new Date().toISOString(),
      promptInjection
    };

    // 保存反思报告到数据库
    await this.saveReflectionReport(report, failureCases);

    console.log(`[Reflection] Analysis complete: ${patterns.length} patterns, ${recommendations.length} recommendations`);
    return report;
  }

  /**
   * 获取最新的反思建议（用于注入 LLM prompt）
   */
  async getLatestPromptInjection(): Promise<string> {
    const pool = databaseService.getPool();

    try {
      const result = await pool.query(
        `SELECT reflection_notes FROM nvwax_memories 
         WHERE reflection_notes IS NOT NULL AND reflection_notes != '[]'
         ORDER BY updated_at DESC LIMIT 1`
      );

      if (result.rows.length === 0) return '';

      const notes = result.rows[0].reflection_notes;
      const parsed = typeof notes === 'string' ? JSON.parse(notes) : notes;

      if (Array.isArray(parsed) && parsed.length > 0) {
        const latest = parsed[parsed.length - 1];
        return latest.promptInjection || '';
      }

      return '';
    } catch {
      return '';
    }
  }

  /**
   * 使用 LLM 分析失败模式
   */
  private async analyzeFailurePatterns(cases: any[]): Promise<FailurePattern[]> {
    if (!this.openai || cases.length === 0) {
      return this.analyzeWithHeuristics(cases);
    }

    // 构建案例摘要
    const caseSummaries = cases.map((c, i) => {
      const req = typeof c.requirements === 'string' ? JSON.parse(c.requirements) : c.requirements;
      const config = typeof c.team_config === 'string' ? JSON.parse(c.team_config) : c.team_config;
      
      return `案例${i + 1}:
- 团队类型: ${c.team_type}
- 行业: ${c.industry || '未指定'}
- 分数: ${c.success_score}
- 用户反馈: ${c.user_feedback || '无'}
- 角色数量: ${config?.roles?.length || 0}
- 职责: ${req?.responsibilities?.join(', ') || '未指定'}`;
    }).join('\n\n');

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `你是一个 AI 团队创建的失败分析专家。请分析以下失败案例，提取共性失败模式。

对于每个模式，输出：
1. pattern: 模式名称（简短）
2. description: 详细描述
3. suggestedFix: 建议修复方案

请以 JSON 数组格式输出。`
          },
          {
            role: 'user',
            content: `分析以下 ${cases.length} 个失败案例：\n\n${caseSummaries}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const content = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;

      if (tokensUsed > 0) {
        tokenQuotaService.checkAndDeductTokens('system-reflection', tokensUsed, {
          endpoint: '/reflection/analyze',
          sourceType: 'reflection_learning',
          model: 'deepseek-chat',
          metadata: { caseCount: cases.length }
        }).catch(err => console.error('[TokenQuota] Failed to deduct tokens:', err));
      }

      // 解析 JSON
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as any[];
        return parsed.map(p => ({
          pattern: p.pattern || '未知模式',
          description: p.description || '',
          occurrences: this.countPatternOccurrences(cases, p.pattern),
          avgScore: this.calculateAvgScore(cases, p.pattern),
          affectedTeamTypes: this.findAffectedTeamTypes(cases, p.pattern),
          suggestedFix: p.suggestedFix || '',
          lastSeen: new Date().toISOString()
        }));
      }
    } catch (error: any) {
      console.error('[Reflection] LLM analysis failed:', error.message);
    }

    // 降级使用启发式分析
    return this.analyzeWithHeuristics(cases);
  }

  /**
   * 启发式失败模式分析（LLM 不可用时的降级方案）
   */
  private analyzeWithHeuristics(cases: any[]): FailurePattern[] {
    const patterns: FailurePattern[] = [];

    // 模式 1: 角色过多
    const tooManyRoles = cases.filter(c => {
      const config = typeof c.team_config === 'string' ? JSON.parse(c.team_config) : c.team_config;
      return (config?.roles?.length || 0) > 5;
    });
    if (tooManyRoles.length > 0) {
      patterns.push({
        pattern: '角色过多',
        description: '团队角色数量超过 5 个，导致协作复杂度过高',
        occurrences: tooManyRoles.length,
        avgScore: tooManyRoles.reduce((sum, c) => sum + c.success_score, 0) / tooManyRoles.length,
        affectedTeamTypes: [...new Set(tooManyRoles.map(c => c.team_type))],
        suggestedFix: '建议将角色数量控制在 3-5 个，合并职责相近的角色',
        lastSeen: new Date().toISOString()
      });
    }

    // 模式 2: 职责重叠
    const feedbackWithOverlap = cases.filter(c =>
      c.user_feedback && (
        c.user_feedback.includes('重叠') ||
        c.user_feedback.includes('重复') ||
        c.user_feedback.includes('冗余')
      )
    );
    if (feedbackWithOverlap.length > 0) {
      patterns.push({
        pattern: '职责重叠',
        description: '多个角色的职责存在重叠，导致分工不明确',
        occurrences: feedbackWithOverlap.length,
        avgScore: feedbackWithOverlap.reduce((sum, c) => sum + c.success_score, 0) / feedbackWithOverlap.length,
        affectedTeamTypes: [...new Set(feedbackWithOverlap.map(c => c.team_type))],
        suggestedFix: '确保每个角色有独特的核心职责，减少交叉',
        lastSeen: new Date().toISOString()
      });
    }

    // 模式 3: 缺少关键角色
    const feedbackMissing = cases.filter(c =>
      c.user_feedback && (
        c.user_feedback.includes('缺少') ||
        c.user_feedback.includes('缺少') ||
        c.user_feedback.includes('需要')
      )
    );
    if (feedbackMissing.length > 0) {
      patterns.push({
        pattern: '缺少关键角色',
        description: '团队设计中缺少某些关键角色，无法覆盖所有需求',
        occurrences: feedbackMissing.length,
        avgScore: feedbackMissing.reduce((sum, c) => sum + c.success_score, 0) / feedbackMissing.length,
        affectedTeamTypes: [...new Set(feedbackMissing.map(c => c.team_type))],
        suggestedFix: '在需求分析阶段更仔细地识别所需能力，确保角色覆盖完整',
        lastSeen: new Date().toISOString()
      });
    }

    return patterns;
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  private countPatternOccurrences(cases: any[], pattern: string): number {
    // 简单的出现次数统计
    return Math.max(1, Math.floor(cases.length * 0.3));
  }

  private calculateAvgScore(cases: any[], pattern: string): number {
    return cases.reduce((sum, c) => sum + c.success_score, 0) / cases.length;
  }

  private findAffectedTeamTypes(cases: any[], pattern: string): string[] {
    return [...new Set(cases.map(c => c.team_type))];
  }

  private generateRecommendations(patterns: FailurePattern[]): string[] {
    const recommendations: string[] = [];

    for (const pattern of patterns) {
      recommendations.push(
        `[${pattern.pattern}] ${pattern.suggestedFix}（影响 ${pattern.occurrences} 个案例，平均分数 ${pattern.avgScore.toFixed(2)}）`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('系统运行良好，未发现明显的失败模式');
    }

    return recommendations;
  }

  /**
   * 生成用于注入 LLM prompt 的文本摘要
   */
  private generatePromptInjection(patterns: FailurePattern[]): string {
    if (patterns.length === 0) return '';

    const lines = patterns.map(p =>
      `- **${p.pattern}**: ${p.suggestedFix}`
    );

    return `## 历史经验教训（基于反思学习）
在创建团队时，请注意避免以下历史问题：
${lines.join('\n')}

请在设计中主动规避这些问题，并在 rationale 中说明如何避免。`;
  }

  /**
   * 保存反思报告到数据库
   */
  private async saveReflectionReport(report: ReflectionReport, cases: any[]): Promise<void> {
    const pool = databaseService.getPool();

    try {
      // 将报告附加到相关案例的 reflection_notes 中
      for (const caseItem of cases) {
        const note = {
          generatedAt: report.generatedAt,
          patterns: report.patterns.map(p => p.pattern),
          promptInjection: report.promptInjection
        };

        await pool.query(
          `UPDATE nvwax_memories 
           SET reflection_notes = COALESCE(reflection_notes, '[]'::jsonb) || $1::jsonb,
               updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(note), caseItem.id]
        );
      }
    } catch (error: any) {
      console.error('[Reflection] Failed to save report:', error.message);
    }
  }

  private getEmptyReport(): ReflectionReport {
    return {
      totalCasesAnalyzed: 0,
      failureCases: 0,
      successCases: 0,
      patterns: [],
      recommendations: ['无法访问数据库'],
      generatedAt: new Date().toISOString(),
      promptInjection: ''
    };
  }
}

// 导出单例
export const reflectionLearningService = new ReflectionLearningService();
