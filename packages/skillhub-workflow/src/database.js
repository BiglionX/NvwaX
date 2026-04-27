import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库路径
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '..', 'data', 'workflows.db');

// 确保数据目录存在
const dbDir = dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const db = new Database(DB_PATH);

// 启用 WAL 模式以提高性能
db.pragma('journal_mode = WAL');

// 创建工作流表
db.exec(`
  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    nodes TEXT NOT NULL,
    edges TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 准备工作流语句
const statements = {
  insert: db.prepare(`
    INSERT INTO workflows (id, name, description, nodes, edges)
    VALUES (@id, @name, @description, @nodes, @edges)
  `),
  selectAll: db.prepare('SELECT * FROM workflows ORDER BY created_at DESC'),
  selectById: db.prepare('SELECT * FROM workflows WHERE id = ?'),
  update: db.prepare(`
    UPDATE workflows 
    SET name = @name, description = @description, nodes = @nodes, edges = @edges, updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `),
  delete: db.prepare('DELETE FROM workflows WHERE id = ?')
};

/**
 * 创建工作流
 */
export function createWorkflow(workflow) {
  const { id, name, description, nodes, edges } = workflow;
  
  statements.insert.run({
    id,
    name,
    description: description || '',
    nodes: JSON.stringify(nodes),
    edges: JSON.stringify(edges)
  });
  
  return getWorkflowById(id);
}

/**
 * 获取所有工作流
 */
export function getAllWorkflows() {
  const rows = statements.selectAll.all();
  
  return rows.map(row => ({
    ...row,
    nodes: JSON.parse(row.nodes),
    edges: JSON.parse(row.edges)
  }));
}

/**
 * 根据 ID 获取工作流
 */
export function getWorkflowById(id) {
  const row = statements.selectById.get(id);
  
  if (!row) {
    return null;
  }
  
  return {
    ...row,
    nodes: JSON.parse(row.nodes),
    edges: JSON.parse(row.edges)
  };
}

/**
 * 更新工作流
 */
export function updateWorkflow(id, updates) {
  const workflow = getWorkflowById(id);
  
  if (!workflow) {
    return null;
  }
  
  const updated = {
    id,
    name: updates.name || workflow.name,
    description: updates.description !== undefined ? updates.description : workflow.description,
    nodes: updates.nodes || workflow.nodes,
    edges: updates.edges || workflow.edges
  };
  
  statements.update.run({
    ...updated,
    nodes: JSON.stringify(updated.nodes),
    edges: JSON.stringify(updated.edges)
  });
  
  return getWorkflowById(id);
}

/**
 * 删除工作流
 */
export function deleteWorkflow(id) {
  const result = statements.delete.run(id);
  return result.changes > 0;
}

// 导出数据库实例（用于高级操作）
export { db };

export default {
  createWorkflow,
  getAllWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  db
};
