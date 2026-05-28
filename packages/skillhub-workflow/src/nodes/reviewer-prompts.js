/**
 * Reviewer Prompts - 审查器提示词生成
 * 
 * 为不同类型的审查生成专业的 LLM 提示词
 */

/**
 * 生成审查提示词
 * @param {string} reviewType - 审查类型
 * @param {Object} data - 待审查的数据
 * @param {Object} criteria - 质量标准配置
 * @returns {string} 生成的提示词
 */
export function generateReviewPrompt(reviewType, data, criteria) {
  const prompts = {
    team_design: `
作为团队架构审查专家，请评估以下团队设计方案：

团队设计:
${JSON.stringify(data, null, 2)}

质量标准:
- 角色数量应在 3-5 人之间
- 每个角色职责必须明确
- 工作流程步骤应清晰可执行
- 角色间应有明确的协作关系

请按照以下 JSON 格式返回审查结果（只返回 JSON）：
{
  "passed": true/false,
  "issues": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"],
  "confidence": 0.9,
  "scores": {
    "role_clarity": 85,
    "workflow_completeness": 90,
    "collaboration_design": 80
  }
}
`,
    agent_match: `
作为 Agent 匹配审查专家，请评估以下 Agent 匹配结果：

匹配数据:
${JSON.stringify(data, null, 2)}

审查要点:
- 功能匹配度是否 >= 70%
- 技能覆盖率是否充足
- 是否存在明显的兼容性问题
- 推荐的 Agent 是否有活跃的维护状态

返回 JSON 格式的审查结果，包含 passed、issues、suggestions、confidence 字段。
`,
    skill_match: `
作为 Skill 依赖审查专家，请检查以下 Skill 匹配结果：

匹配数据:
${JSON.stringify(data, null, 2)}

审查要点:
- 必需 Skill 是否全部找到
- 缺失的 Skill 是否有替代方案
- Skill 版本兼容性
- 依赖链是否完整

返回 JSON 格式的审查结果，包含 passed、issues、suggestions、confidence 字段。
`,
    final_config: `
作为最终配置审查专家，请全面检查 AiTeam 配置：

配置数据:
${JSON.stringify(data, null, 2)}

审查要点:
- CEO Agent 配置完整性
- 团队成员配置合理性
- 工作流程可执行性
- 文档包内容准确性

返回 JSON 格式的审查结果，包含 passed、issues、suggestions、confidence 字段。
`,
    nvwa_agent_config: `
作为 Nvwa Agent 配置审查专家，请评估以下智能体配置：

Agent 配置:
${JSON.stringify(data, null, 2)}

质量标准:
- 必填字段完整（名称、描述、数据源、输出、技能）
- 技能数量应在 2-10 个之间
- 技能与 Agent 用途匹配
- 数据源明确且可访问
- 输出结果清晰可衡量

审查维度:
1. **配置完整性**: 所有必填字段是否提供
2. **技能合理性**: 选择的技能是否与 Agent 用途相关
3. **数据源可行性**: 数据源描述是否具体
4. **输出明确性**: 输出结果是否可量化或可验证

返回 JSON 格式的审查结果：
{
  "passed": true/false,
  "issues": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"],
  "confidence": 0.9,
  "scores": {
    "completeness": 85,
    "skill_relevance": 90,
    "data_source_clarity": 80,
    "output_clarity": 85
  }
}
`,
    skill_dependency_check: `
作为 Skill 依赖审查专家，请检查以下技能列表的依赖关系：

技能列表:
${JSON.stringify(data, null, 2)}

审查要点:
- 技能之间是否存在循环依赖
- 是否有缺失的前置技能
- 技能组合是否合理（避免功能重叠）
- 是否需要额外的连接器或中间件

示例依赖关系:
- "自然语言处理" → 需要 "文本预处理"
- "知识库检索" → 需要 "向量嵌入"
- "对话管理" → 需要 "上下文跟踪"

返回 JSON 格式的审查结果：
{
  "passed": true/false,
  "issues": ["循环依赖 detected", "缺少前置技能 X"],
  "suggestions": ["添加技能 Y", "移除冗余技能 Z"],
  "confidence": 0.85,
  "dependency_graph": {
    "has_cycles": false,
    "missing_dependencies": ["skill_a", "skill_b"]
  }
}
`,
    template_compatibility: `
作为模板兼容性审查专家，请评估 Agent 配置与选定模板的兼容性：

配置数据:
${JSON.stringify(data, null, 2)}

审查要点:
- Agent 用途是否与模板定位匹配
- 所需技能是否在模板支持范围内
- 数据源格式是否与模板兼容
- 输出类型是否符合模板规范

返回 JSON 格式的审查结果：
{
  "passed": true/false,
  "issues": ["模板不匹配", "技能超出范围"],
  "suggestions": ["选择其他模板", "调整技能列表"],
  "confidence": 0.9,
  "compatibility_score": 85
}
`
  };
  
  return prompts[reviewType] || prompts.final_config;
}
