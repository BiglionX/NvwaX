import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import * as db from './database.js';
import { orchestrator } from './agents/orchestrator.js';
import { AGENT_TYPES } from './agents/agent-definitions.js';
// Phase 2 鈥?鑺傜偣瀹炵幇鎶藉彇鍒?engine/nodes.js锛坈ondition 鑺傜偣宸叉敼瀹夊叏姹傚€硷級
import { nodeRegistry } from './engine/nodes.js';
// Phase 2 鈥?缂栨帓鍐呮牳锛堥暅鍍?dsh-workflow锛? YAML 缈昏瘧
import { runWorkflowScript } from './engine/workflow-engine.js';
import { yamlWorkflowToScript } from './engine/yaml-to-script.js';
import { YamlLoader } from './engine/yaml-loader.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// Phase 2 鈥?榛樿绔彛瀵归綈 nvwax-server 鐨?WORKFLOW_API_URL锛堥粯璁?3002锛夛紝
// 閬垮厤涓?nvwax-server 鑷韩榛樿绔彛 3001 鍚屾満鍐茬獊銆?
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
const dataDir = join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || join(dataDir, 'workflows.db');
console.log('鉁?Database initialized at:', dbPath);

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

// ==================== Phase 2: 编排内核路由 ====================
// 注意：必须注册在 /api/workflows/:id 之前，避免 'yaml' 被 :id 通配捕获。

// 运行一段编排脚本（镜像 dsh-workflow 的 JS 编排入口）
// POST /api/workflows/run-script  { script: string, args?: object }
app.post('/api/workflows/run-script', async (req, res) => {
  try {
    const { script, args = {} } = req.body || {};
    if (!script || typeof script !== 'string') {
      return res.status(400).json({ success: false, error: 'script (string) is required' });
    }
    console.log('\n⚙️ Running workflow script (worker-thread isolated)...');
    const result = await runWorkflowScript(script, args);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Workflow script execution failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 列出 YAML 定义的工作流
// GET /api/workflows/yaml
const yamlLoader = new YamlLoader(
  join(__dirname, '..', 'agents'),
  join(__dirname, '..', 'workflows')
);
app.get('/api/workflows/yaml', (req, res) => {
  try {
    const { workflows } = yamlLoader.loadAll();
    res.json({
      success: true,
      data: workflows.map((w) => ({
        id: w.workflow.id,
        name: w.workflow.name,
        description: w.workflow.description,
        nodeCount: w.workflow.nodes.length,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 执行 YAML 定义的工作流（翻译为编排脚本后在 worker 中运行）
// POST /api/workflows/yaml/:id/execute  { args?: object }
app.post('/api/workflows/yaml/:id/execute', async (req, res) => {
  try {
    const { workflows, agents } = yamlLoader.loadAll();
    const definition = workflows.find((w) => w.workflow.id === req.params.id);
    if (!definition) {
      return res.status(404).json({ success: false, error: `YAML workflow not found: ${req.params.id}` });
    }

    const agentDefs = new Map(agents.map((a) => [a.agent.id, a]));
    const script = yamlWorkflowToScript(definition, agentDefs);
    console.log(`\n⚙️ Executing YAML workflow ${definition.workflow.id} via orchestration engine...`);

    const result = await runWorkflowScript(script, req.body?.args || {});
    res.json({ success: true, workflowId: definition.workflow.id, result });
  } catch (error) {
    console.error('YAML workflow execution failed:', error.message);
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
    
    console.log('\n馃幆 Received orchestration request:', task);
    
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
    
    console.log('\n馃憫 Received Leader Agent orchestration request:', requirement);
    
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
    
    console.log('\n馃搳 Received skill analysis request');
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
  console.log(`馃殌 SkillHub Workflow Engine running on http://localhost:${PORT}`);
  console.log(`馃搳 Health check: http://localhost:${PORT}/health`);
  console.log(`馃摑 API docs: http://localhost:${PORT}/api/workflows`);
});

// Export for use in orchestrator
export { executeWorkflow };
export default app;
