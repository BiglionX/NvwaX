import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { skillhubClient } from './nodes/skillhub-client.js';
import * as db from './database.js';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { orchestrator } from './agents/orchestrator.js';
import { AGENT_TYPES } from './agents/agent-definitions.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
const dataDir = join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('✅ Database initialized at:', process.env.DATABASE_PATH || join(dataDir, 'workflows.db'));

// ==================== Routes ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'SkillHub Workflow Engine',
    timestamp: new Date().toISOString() 
  });
});

// List all workflows
app.get('/api/workflows', (req, res) => {
  try {
    const workflowList = db.getAllWorkflows().map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      createdAt: w.created_at
    }));
    res.json(workflowList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Workflow Templates ====================

import agentWorkflowTemplates from './workflows/agent-templates.js';

// Get all workflow templates (must be before /:id route)
app.get('/api/workflows/templates', (req, res) => {
  try {
    const { q } = req.query;
    
    let templates = Object.entries(agentWorkflowTemplates).map(([key, template]) => ({
      id: key,
      name: template.name,
      description: template.description,
      nodes: template.nodes.length,
      edges: template.edges.length
    }));
    
    // Filter by query if provided
    if (q) {
      const query = q.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    }
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific template by ID (must be before /:id route)
app.get('/api/workflows/templates/:id', (req, res) => {
  try {
    const template = agentWorkflowTemplates[req.params.id];
    
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    res.json({ success: true, data: { id: req.params.id, ...template } });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflow by ID
app.get('/api/workflows/:id', (req, res) => {
  try {
    const workflow = db.getWorkflowById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create workflow
app.post('/api/workflows', (req, res) => {
  try {
    const { name, description, nodes = [], edges = [] } = req.body;
    
    const workflow = {
      id: uuidv4(),
      name,
      description,
      nodes,
      edges
    };
    
    const saved = db.createWorkflow(workflow);
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update workflow
app.put('/api/workflows/:id', (req, res) => {
  try {
    const updated = db.updateWorkflow(req.params.id, req.body);
    
    if (!updated) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete workflow
app.delete('/api/workflows/:id', (req, res) => {
  try {
    const deleted = db.deleteWorkflow(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json({ message: 'Workflow deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute workflow
app.post('/api/workflows/:id/execute', async (req, res) => {
  try {
    const workflow = db.getWorkflowById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const input = req.body.input || {};
    const result = await executeWorkflow(workflow, input);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Multi-Agent Orchestration
app.post('/api/orchestrate', async (req, res) => {
  try {
    const { task } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Task description is required' });
    }
    
    console.log('\n🎯 Received orchestration request:', task);
    
    const result = await orchestrator.orchestrate(task);
    res.json(result);
  } catch (error) {
    console.error('Orchestration endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Leader Agent Orchestration (New)
app.post('/api/orchestrate/leader', async (req, res) => {
  try {
    const { requirement, workspace } = req.body;
    
    if (!requirement) {
      return res.status(400).json({ 
        success: false,
        error: 'Requirement description is required' 
      });
    }
    
    console.log('\n👑 Received Leader Agent orchestration request:', requirement);
    
    const result = await orchestrator.orchestrateWithLeader(requirement, {
      workspace
    });
    
    res.json(result);
  } catch (error) {
    console.error('Leader Agent orchestration endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get available agents
app.get('/api/agents', (req, res) => {
  const agents = Object.values(AGENT_TYPES).map(agent => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    keywords: agent.keywords
  }));
  
  res.json(agents);
});

// ==================== Skill Analysis ====================

import { skillAnalysisService } from './services/skill-analysis.service.js';

// Analyze skill gap
app.post('/api/skills/analyze', async (req, res) => {
  try {
    const { userRequirement, templateId } = req.body;
    
    if (!userRequirement) {
      return res.status(400).json({ 
        success: false,
        error: 'userRequirement is required' 
      });
    }
    
    console.log('\n📊 Received skill analysis request');
    console.log('Requirement:', userRequirement);
    console.log('Template:', templateId || 'None');
    
    const analysis = await skillAnalysisService.analyzeSkillGap(
      userRequirement,
      templateId
    );
    
    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Skill analysis failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ==================== Node Types ====================

// SkillHub Search Node (集成真实 API)
async function skillhubSearchNode(params) {
  const { query, limit = 10, page = 1 } = params;
  
  console.log('🔍 Searching SkillHub for:', query);
  
  try {
    const result = await skillhubClient.searchSkills({ query, limit, page });
    return result;
  } catch (error) {
    console.error('SkillHub search failed:', error.message);
    return {
      success: false,
      error: error.message,
      skills: []
    };
  }
}

// SkillHub Detail Node
async function skillhubDetailNode(params) {
  const { skillId } = params;
  
  console.log('📋 Getting skill detail:', skillId);
  
  try {
    const result = await skillhubClient.getSkillDetail(skillId);
    return result;
  } catch (error) {
    console.error('SkillHub detail failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Text Processing Node
async function textProcessNode(params) {
  const { text, operation } = params;
  
  switch (operation) {
    case 'uppercase':
      return { result: text.toUpperCase() };
    case 'lowercase':
      return { result: text.toLowerCase() };
    case 'trim':
      return { result: text.trim() };
    default:
      return { result: text };
  }
}

// Condition Node
async function conditionNode(params) {
  const { condition, value } = params;
  
  // Simple condition evaluation
  return {
    passed: eval(condition) // Note: Use safer evaluation in production
  };
}

// Semantic Search Node
async function semanticSearchNode(params) {
  const { query } = params;
  
  console.log('🔍 Semantic searching for:', query);
  
  try {
    const result = await skillhubClient.semanticSearch(query);
    return result;
  } catch (error) {
    console.error('Semantic search failed:', error.message);
    return {
      success: false,
      error: error.message,
      skills: []
    };
  }
}

// Tool Discovery Node
async function toolDiscoveryNode(params) {
  console.log('🛠️ Discovering available tools...');
  
  try {
    const result = await skillhubClient.discoverTools();
    return result;
  } catch (error) {
    console.error('Tool discovery failed:', error.message);
    return {
      success: false,
      error: error.message,
      tools: []
    };
  }
}

// Related Skills Node
async function relatedSkillsNode(params) {
  const { skillSlug, limit = 5 } = params;
  
  console.log('🔗 Getting related skills for:', skillSlug);
  
  try {
    const result = await skillhubClient.getRelatedSkills(skillSlug, limit);
    return result;
  } catch (error) {
    console.error('Related skills failed:', error.message);
    return {
      success: false,
      error: error.message,
      skills: []
    };
  }
}

// LLM Node - Real OpenAI Integration
async function llmNode(params) {
  const { prompt, model = 'gpt-3.5-turbo', temperature = 0.7 } = params;
  
  console.log('🤖 Calling LLM with model:', model);
  
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.warn('⚠️ OpenAI API key not configured, returning mock response');
    return {
      response: 'This is a mock LLM response. Please configure OPENAI_API_KEY in .env file.',
      model: model
    };
  }
  
  try {
    const chatModel = new ChatOpenAI({
      modelName: model,
      temperature: temperature,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    
    const response = await chatModel.invoke([new HumanMessage(prompt)]);
    
    return {
      response: response.content,
      model: model
    };
  } catch (error) {
    console.error('LLM call failed:', error.message);
    return {
      response: `Error: ${error.message}`,
      model: model,
      error: error.message
    };
  }
}

// Agent Router Node
async function agentRouterNode(params) {
  const { input, agents = ['frontend', 'backend', 'database'] } = params;
  
  console.log('🎯 Routing task to appropriate agent...');
  
  // Use LLM to determine which agent should handle this
  const routerPrompt = `
    Analyze the following task and determine which specialized agent should handle it:
    Task: ${input}
    
    Available agents: ${agents.join(', ')}
    
    Return only the most suitable agent name (one of: ${agents.join(', ')}).
  `;
  
  try {
    const llmResult = await llmNode({ prompt: routerPrompt, model: 'gpt-3.5-turbo' });
    const selectedAgent = llmResult.response.trim().toLowerCase();
    
    return {
      selectedAgent,
      originalInput: input
    };
  } catch (error) {
    console.error('Agent routing failed:', error.message);
    return {
      selectedAgent: agents[0], // Default to first agent
      originalInput: input,
      error: error.message
    };
  }
}

// Data Transform Node
async function dataTransformNode(params) {
  const { data, operation } = params;
  
  console.log('🔄 Transforming data with operation:', operation);
  
  try {
    switch (operation) {
      case 'json_parse':
        return { result: typeof data === 'string' ? JSON.parse(data) : data };
      case 'json_stringify':
        return { result: typeof data === 'object' ? JSON.stringify(data, null, 2) : data };
      case 'extract_field':
        const { field } = params;
        return { result: data && data[field] !== undefined ? data[field] : null };
      case 'uppercase':
        return { result: typeof data === 'string' ? data.toUpperCase() : data };
      case 'lowercase':
        return { result: typeof data === 'string' ? data.toLowerCase() : data };
      case 'trim':
        return { result: typeof data === 'string' ? data.trim() : data };
      default:
        return { result: data };
    }
  } catch (error) {
    console.error('Data transform failed:', error.message);
    return {
      result: null,
      error: error.message
    };
  }
}

// Node registry
const nodeRegistry = {
  'skillhub_search': skillhubSearchNode,
  'skillhub_detail': skillhubDetailNode,
  'semantic_search': semanticSearchNode,
  'tool_discovery': toolDiscoveryNode,
  'related_skills': relatedSkillsNode,
  'llm': llmNode,
  'text_process': textProcessNode,
  'condition': conditionNode,
  'agent_router': agentRouterNode,
  'data_transform': dataTransformNode
};

// ==================== Workflow Execution ====================

async function executeWorkflow(workflow, input) {
  console.log('Executing workflow:', workflow.name);
  
  const context = { ...input };
  const results = {};
  
  // Execute nodes in order (simplified - no graph traversal yet)
  for (const node of workflow.nodes) {
    console.log(`Executing node: ${node.type} (${node.id})`);
    
    const nodeFn = nodeRegistry[node.type];
    if (!nodeFn) {
      throw new Error(`Unknown node type: ${node.type}`);
    }
    
    try {
      const result = await nodeFn({ ...node.params, ...context });
      results[node.id] = result;
      
      // Merge result into context for next nodes
      Object.assign(context, result);
    } catch (error) {
      throw new Error(`Node ${node.id} failed: ${error.message}`);
    }
  }
  
  return {
    workflowId: workflow.id,
    results,
    executedAt: new Date().toISOString()
  };
}

// ==================== Start Server ====================

app.listen(PORT, () => {
  console.log(`🚀 SkillHub Workflow Engine running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 API docs: http://localhost:${PORT}/api/workflows`);
});

// Export for use in orchestrator
export { executeWorkflow };
export default app;
