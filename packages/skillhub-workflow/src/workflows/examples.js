// Example workflow: Search SkillHub and process results
export const skillhubSearchWorkflow = {
  name: 'SkillHub Search Workflow',
  description: 'Search for skills in SkillHub and format results',
  nodes: [
    {
      id: 'node_1',
      type: 'skillhub_search',
      params: {
        query: '{{input.query}}',
        limit: 5
      }
    },
    {
      id: 'node_2',
      type: 'text_process',
      params: {
        text: '{{node_1.skills}}',
        operation: 'uppercase'
      }
    }
  ],
  edges: [
    { from: 'node_1', to: 'node_2' }
  ]
};

// Example workflow: LLM-powered skill recommendation
export const llmRecommendationWorkflow = {
  name: 'LLM Skill Recommendation',
  description: 'Use LLM to recommend skills based on user needs',
  nodes: [
    {
      id: 'node_1',
      type: 'skillhub_search',
      params: {
        query: '{{input.user_need}}',
        limit: 10
      }
    },
    {
      id: 'node_2',
      type: 'llm',
      params: {
        prompt: 'Based on these skills: {{node_1.skills}}, recommend the top 3 for: {{input.user_need}}'
      }
    }
  ],
  edges: [
    { from: 'node_1', to: 'node_2' }
  ]
};
