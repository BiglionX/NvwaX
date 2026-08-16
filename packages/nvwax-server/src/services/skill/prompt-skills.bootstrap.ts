/**
 * prompt-skills.bootstrap — 把 prompts/* 的 system prompt 常量注册为具名技能
 * ------------------------------------------------------------
 * 在应用启动时调用（见 app.ts），把散落的提示词统一收进 SkillRegistry。
 * 幂等：重复调用仅覆盖同名项。
 */

import {
  NVWAX_SYSTEM_PROMPT,
  REQUIREMENT_ANALYSIS_PROMPT,
  TEAM_DESIGN_PROMPT,
  AGENT_MATCHING_PROMPT,
  PLUGIN_ACTION_CONSTRAINT_PROMPT,
} from '../../prompts/nvwax-agent-prompt.js';
import {
  CEO_AGENT_SYSTEM_PROMPT,
  CEO_AGENT_INITIAL_MESSAGE,
  ROLE_RECOMMENDATION_PROMPT,
  REQUIREMENT_CONFIRMATION_PROMPT,
} from '../../prompts/ceo-agent-prompt.js';
import { skillRegistry } from './skill-registry.service.js';

let initialized = false;

export function initBuiltinSkills(): void {
  if (initialized) return;
  initialized = true;

  skillRegistry.register({
    name: 'nvwax.system-prompt',
    description: 'NvwaX 主系统提示词（AI 团队架构师）',
    content: NVWAX_SYSTEM_PROMPT,
  });
  skillRegistry.register({
    name: 'nvwax.requirement-analysis',
    description: '需求分析提示词（提取团队类型/职责/产出）',
    content: REQUIREMENT_ANALYSIS_PROMPT,
  });
  skillRegistry.register({
    name: 'nvwax.team-design',
    description: '团队设计提示词（生成 AI 团队结构）',
    content: TEAM_DESIGN_PROMPT,
  });
  skillRegistry.register({
    name: 'nvwax.agent-matching',
    description: 'Agent 匹配提示词（评估 Agent 与角色契合度）',
    content: AGENT_MATCHING_PROMPT,
  });
  skillRegistry.register({
    name: 'nvwax.plugin-action-constraint',
    description: '插件 Action 约束提示词',
    content: PLUGIN_ACTION_CONSTRAINT_PROMPT,
  });

  skillRegistry.register({
    name: 'ceo.system-prompt',
    description: 'CEO Agent 系统提示词（AiTeam 创建引导）',
    content: CEO_AGENT_SYSTEM_PROMPT,
  });
  skillRegistry.register({
    name: 'ceo.initial-message',
    description: 'CEO Agent 开场白',
    content: CEO_AGENT_INITIAL_MESSAGE,
  });
  skillRegistry.register({
    name: 'ceo.role-recommendation',
    description: 'CEO 角色推荐提示词',
    content: ROLE_RECOMMENDATION_PROMPT,
  });
  skillRegistry.register({
    name: 'ceo.requirement-confirmation',
    description: 'CEO 需求确认提示词',
    content: REQUIREMENT_CONFIRMATION_PROMPT,
  });
}
