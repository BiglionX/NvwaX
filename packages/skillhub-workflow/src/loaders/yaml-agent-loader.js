/**
 * YAML Agent Loader
 * 
 * 从 YAML 文件加载 Agent 定义，支持热加载
 * 
 * YAML Schema:
 * ```yaml
 * agent:
 *   id: content-strategist
 *   name: 内容策略师
 *   version: 1.0.0
 *   description: 专业的内容策略规划与执行专家
 *   capabilities:
 *     - content_strategy
 *     - trend_analysis
 *   keywords:
 *     - 内容策略
 *     - 选题规划
 *   tools:
 *     - skillhub_search
 *     - web_scraper
 *   system_prompt: |
 *     你是一位资深内容策略师...
 *   constraints:
 *     max_concurrent_tasks: 3
 *     timeout_seconds: 300
 *     retry_on_failure: true
 * ```
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// ============================================================
// 类型定义
// ============================================================

export interface YamlAgentDefinition {
  agent: {
    id: string;
    name: string;
    version?: string;
    description: string;
    capabilities: string[];
    keywords?: string[];
    tools?: string[];
    system_prompt?: string;
    constraints?: {
      max_concurrent_tasks?: number;
      timeout_seconds?: number;
      retry_on_failure?: boolean;
    };
    metadata?: Record<string, unknown>;
  };
}

export interface YamlWorkflowDefinition {
  workflow: {
    id: string;
    name: string;
    description?: string;
    version?: string;
    nodes: YamlWorkflowNode[];
    edges?: Array<{ from: string; to: string; condition?: string }>;
  };
}

export interface YamlWorkflowNode {
  id: string;
  agent?: string;       // 引用 agent id
  type?: string;         // 或直接用 type（如 llm, skillhub_search 等）
  input?: string;        // 输入表达式，如 {{user_requirement}}
  depends_on?: string[]; // 依赖节点
  human_approval?: boolean;
  params?: Record<string, unknown>;
}

// ============================================================
// YAML Agent Loader
// ============================================================

export class YamlAgentLoader {
  private agentsDir: string;
  private loadedAgents: Map<string, YamlAgentDefinition> = new Map();
  private watchers: Map<string, fs.FSWatcher> = new Map();

  constructor(agentsDir?: string) {
    // 默认目录：packages/skillhub-workflow/agents/
    this.agentsDir = agentsDir || path.resolve(
      process.cwd(),
      'packages/skillhub-workflow/agents'
    );
  }

  /**
   * 加载所有 YAML Agent 定义
   */
  loadAll(): YamlAgentDefinition[] {
    this.loadedAgents.clear();

    if (!fs.existsSync(this.agentsDir)) {
      console.log(`[YamlLoader] Agents directory not found: ${this.agentsDir}, creating...`);
      fs.mkdirSync(this.agentsDir, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(this.agentsDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    console.log(`[YamlLoader] Found ${files.length} YAML agent files`);

    for (const file of files) {
      try {
        const filePath = path.join(this.agentsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const definition = yaml.load(content) as YamlAgentDefinition;

        if (this.validateAgent(definition)) {
          this.loadedAgents.set(definition.agent.id, definition);
          console.log(`[YamlLoader] Loaded agent: ${definition.agent.id} from ${file}`);
        } else {
          console.warn(`[YamlLoader] Invalid agent definition in ${file}, skipping`);
        }
      } catch (error: any) {
        console.error(`[YamlLoader] Failed to load ${file}:`, error.message);
      }
    }

    return Array.from(this.loadedAgents.values());
  }

  /**
   * 启动文件监听（热加载）
   */
  startWatching(onChange?: (agents: YamlAgentDefinition[]) => void): void {
    if (!fs.existsSync(this.agentsDir)) return;

    // 监听目录变更
    const watcher = fs.watch(this.agentsDir, { recursive: false }, (eventType, filename) => {
      if (filename && (filename.endsWith('.yaml') || filename.endsWith('.yml'))) {
        console.log(`[YamlLoader] File changed: ${filename} (${eventType})`);
        
        // 重新加载所有文件
        this.loadAll();
        
        if (onChange) {
          onChange(Array.from(this.loadedAgents.values()));
        }
      }
    });

    this.watchers.set(this.agentsDir, watcher);
    console.log(`[YamlLoader] Watching directory: ${this.agentsDir}`);
  }

  /**
   * 停止文件监听
   */
  stopWatching(): void {
    for (const [dir, watcher] of this.watchers) {
      watcher.close();
      console.log(`[YamlLoader] Stopped watching: ${dir}`);
    }
    this.watchers.clear();
  }

  /**
   * 获取已加载的 Agent 列表
   */
  getLoadedAgents(): YamlAgentDefinition[] {
    return Array.from(this.loadedAgents.values());
  }

  /**
   * 验证 Agent 定义
   */
  private validateAgent(definition: any): definition is YamlAgentDefinition {
    if (!definition?.agent) return false;
    if (!definition.agent.id || typeof definition.agent.id !== 'string') return false;
    if (!definition.agent.name || typeof definition.agent.name !== 'string') return false;
    if (!definition.agent.description || typeof definition.agent.description !== 'string') return false;
    if (!Array.isArray(definition.agent.capabilities) || definition.agent.capabilities.length === 0) return false;
    return true;
  }
}

// ============================================================
// YAML Workflow Loader
// ============================================================

export class YamlWorkflowLoader {
  private workflowsDir: string;
  private loadedWorkflows: Map<string, YamlWorkflowDefinition> = new Map();

  constructor(workflowsDir?: string) {
    this.workflowsDir = workflowsDir || path.resolve(
      process.cwd(),
      'packages/skillhub-workflow/workflows'
    );
  }

  /**
   * 加载所有 YAML 工作流定义
   */
  loadAll(): YamlWorkflowDefinition[] {
    this.loadedWorkflows.clear();

    if (!fs.existsSync(this.workflowsDir)) {
      console.log(`[YamlLoader] Workflows directory not found: ${this.workflowsDir}, creating...`);
      fs.mkdirSync(this.workflowsDir, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(this.workflowsDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    console.log(`[YamlLoader] Found ${files.length} YAML workflow files`);

    for (const file of files) {
      try {
        const filePath = path.join(this.workflowsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const definition = yaml.load(content) as YamlWorkflowDefinition;

        if (this.validateWorkflow(definition)) {
          this.loadedWorkflows.set(definition.workflow.id, definition);
          console.log(`[YamlLoader] Loaded workflow: ${definition.workflow.id} from ${file}`);
        } else {
          console.warn(`[YamlLoader] Invalid workflow definition in ${file}, skipping`);
        }
      } catch (error: any) {
        console.error(`[YamlLoader] Failed to load workflow ${file}:`, error.message);
      }
    }

    return Array.from(this.loadedWorkflows.values());
  }

  /**
   * 获取工作流定义
   */
  get(workflowId: string): YamlWorkflowDefinition | undefined {
    return this.loadedWorkflows.get(workflowId);
  }

  /**
   * 将 YAML 工作流转换为 skillhub-workflow 引擎兼容格式
   */
  toEngineFormat(definition: YamlWorkflowDefinition): {
    id: string;
    name: string;
    nodes: Array<{ id: string; type: string; params: Record<string, unknown> }>;
    edges: Array<{ from: string; to: string }>;
  } {
    const { workflow } = definition;

    const nodes = workflow.nodes.map(node => ({
      id: node.id,
      type: node.type || 'llm',
      params: {
        ...node.params,
        ...(node.agent ? { agent_id: node.agent } : {}),
        ...(node.input ? { input: node.input } : {}),
        ...(node.human_approval ? { human_approval: true } : {})
      }
    }));

    const edges = workflow.edges || workflow.nodes
      .filter(node => node.depends_on && node.depends_on.length > 0)
      .flatMap(node =>
        node.depends_on!.map(dep => ({ from: dep, to: node.id }))
      );

    return {
      id: workflow.id,
      name: workflow.name,
      nodes,
      edges
    };
  }

  /**
   * 验证工作流定义
   */
  private validateWorkflow(definition: any): definition is YamlWorkflowDefinition {
    if (!definition?.workflow) return false;
    if (!definition.workflow.id || typeof definition.workflow.id !== 'string') return false;
    if (!definition.workflow.name || typeof definition.workflow.name !== 'string') return false;
    if (!Array.isArray(definition.workflow.nodes) || definition.workflow.nodes.length === 0) return false;
    return true;
  }

  /**
   * 启动文件监听（热加载）
   */
  startWatching(onChange?: (workflows: YamlWorkflowDefinition[]) => void): void {
    if (!fs.existsSync(this.workflowsDir)) return;

    const watcher = fs.watch(this.workflowsDir, { recursive: false }, (eventType, filename) => {
      if (filename && (filename.endsWith('.yaml') || filename.endsWith('.yml'))) {
        console.log(`[YamlLoader] Workflow file changed: ${filename} (${eventType})`);
        this.loadAll();
        if (onChange) {
          onChange(Array.from(this.loadedWorkflows.values()));
        }
      }
    });

    console.log(`[YamlLoader] Watching workflow directory: ${this.workflowsDir}`);
  }
}

// ============================================================
// 统一加载器
// ============================================================

export class YamlDefinitionLoader {
  private agentLoader: YamlAgentLoader;
  private workflowLoader: YamlWorkflowLoader;

  constructor(agentsDir?: string, workflowsDir?: string) {
    this.agentLoader = new YamlAgentLoader(agentsDir);
    this.workflowLoader = new YamlWorkflowLoader(workflowsDir);
  }

  /**
   * 加载所有 YAML 定义（Agent + Workflow）
   */
  loadAll(): {
    agents: YamlAgentDefinition[];
    workflows: YamlWorkflowDefinition[];
  } {
    const agents = this.agentLoader.loadAll();
    const workflows = this.workflowLoader.loadAll();

    console.log(`[YamlLoader] Total loaded: ${agents.length} agents, ${workflows.length} workflows`);

    return { agents, workflows };
  }

  /**
   * 启动文件监听
   */
  startWatching(callbacks?: {
    onAgentChange?: (agents: YamlAgentDefinition[]) => void;
    onWorkflowChange?: (workflows: YamlWorkflowDefinition[]) => void;
  }): void {
    this.agentLoader.startWatching(callbacks?.onAgentChange);
    this.workflowLoader.startWatching(callbacks?.onWorkflowChange);
  }

  /**
   * 停止监听
   */
  stopWatching(): void {
    this.agentLoader.stopWatching();
  }

  /**
   * 获取 Agent 加载器
   */
  getAgentLoader(): YamlAgentLoader {
    return this.agentLoader;
  }

  /**
   * 获取工作流加载器
   */
  getWorkflowLoader(): YamlWorkflowLoader {
    return this.workflowLoader;
  }
}

// 导出单例
export const yamlDefinitionLoader = new YamlDefinitionLoader();
