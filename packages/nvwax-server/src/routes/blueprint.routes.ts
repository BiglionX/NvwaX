/**
 * Blueprint Routes — 创建结果蓝图 API（agent_blueprints）
 * ------------------------------------------------------------
 * Draft → Deploy 门禁：创建/更新仅存 draft；deploy 时由 BlueprintValidator
 * 强校验（root 字段 / 无环 / 深度≤4 / 工具名冲突），失败返回 400 + issues 明细。
 *
 * 归属：蓝图挂在 agents 下，agent.user_id 必须等于当前用户。
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { universalAuthMiddleware } from '../middleware/universal-auth.middleware.js';
import { databaseService } from '../services/database.service.js';
import {
  validateBlueprint,
  type BlueprintConfig,
  type BlueprintValidationResult,
} from '../services/blueprint/blueprint-validator.service.js';

const router = Router();
router.use(universalAuthMiddleware);

interface BlueprintRow {
  id: string;
  agent_id: string;
  session_id: string | null;
  config: BlueprintConfig | string;
  status: 'draft' | 'deployed';
  deployed_at: string | null;
  created_at: string;
  updated_at: string;
}

function serializeRow(row: BlueprintRow) {
  return {
    id: row.id,
    agentId: row.agent_id,
    sessionId: row.session_id,
    config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
    status: row.status,
    deployedAt: row.deployed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function currentUserId(req: any): Promise<string | null> {
  return req.user?.id || req.sessionUser?.id || null;
}

/** 校验蓝图所属 agent 是否属于当前用户 */
async function assertBlueprintOwned(userId: string, blueprintId: string): Promise<BlueprintRow | null> {
  const pool = databaseService.getPool();
  const result = await pool.query(
    `SELECT b.* FROM agent_blueprints b
     JOIN agents a ON a.id = b.agent_id
     WHERE b.id = $1 AND a.user_id = $2`,
    [blueprintId, userId]
  );
  return result.rows[0] ?? null;
}

/**
 * GET /api/blueprints?agentId=xxx
 * 列出某 agent 的蓝图（最新在前）
 */
router.get('/', async (req, res) => {
  try {
    const userId = await currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const agentId = String(req.query.agentId || '');
    if (!agentId) return res.status(400).json({ success: false, error: 'Missing agentId' });

    const pool = databaseService.getPool();
    const result = await pool.query(
      `SELECT b.* FROM agent_blueprints b
       JOIN agents a ON a.id = b.agent_id
       WHERE b.agent_id = $1 AND a.user_id = $2
       ORDER BY b.created_at DESC`,
      [agentId, userId]
    );
    res.json({ success: true, data: result.rows.map(serializeRow) });
  } catch (error: any) {
    console.error('[Blueprint] List failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/blueprints/:id
 * 蓝图详情
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = await currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const row = await assertBlueprintOwned(userId, req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Blueprint not found' });

    res.json({ success: true, data: serializeRow(row) });
  } catch (error: any) {
    console.error('[Blueprint] Get failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/blueprints
 * 创建蓝图（draft）。创建时弱校验：仅返回校验提示，不阻塞保存。
 * Body: { agentId, sessionId?, config }
 */
router.post('/', async (req, res) => {
  try {
    const userId = await currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { agentId, sessionId, config } = req.body as {
      agentId?: string;
      sessionId?: string;
      config?: BlueprintConfig;
    };
    if (!agentId) return res.status(400).json({ success: false, error: 'Missing agentId' });
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ success: false, error: 'Missing config' });
    }

    // 归属：agent 必须属于当前用户
    const pool = databaseService.getPool();
    const agent = await pool.query('SELECT id FROM agents WHERE id = $1 AND user_id = $2', [agentId, userId]);
    if (agent.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const validation: BlueprintValidationResult = validateBlueprint(config);
    const id = uuidv4();
    await pool.query(
      `INSERT INTO agent_blueprints (id, agent_id, session_id, config, status)
       VALUES ($1, $2, $3, $4::jsonb, 'draft')`,
      [id, agentId, sessionId ?? null, JSON.stringify(config)]
    );

    res.status(201).json({
      success: true,
      data: { id, agentId, sessionId: sessionId ?? null, status: 'draft' },
      validation,
    });
  } catch (error: any) {
    console.error('[Blueprint] Create failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/blueprints/:id
 * 更新蓝图 config（保持 draft；若已 deployed，编辑后仍保持 deployed，部署时再校验）
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = await currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const row = await assertBlueprintOwned(userId, req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Blueprint not found' });

    const { config } = req.body as { config?: BlueprintConfig };
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ success: false, error: 'Missing config' });
    }

    const validation: BlueprintValidationResult = validateBlueprint(config);
    const pool = databaseService.getPool();
    await pool.query(
      `UPDATE agent_blueprints SET config = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(config), row.id]
    );

    res.json({ success: true, data: { id: row.id, status: row.status }, validation });
  } catch (error: any) {
    console.error('[Blueprint] Update failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/blueprints/:id/deploy
 * Deploy 门禁：强校验，通过则 status=deployed；失败返回 400 + issues 明细
 */
router.post('/:id/deploy', async (req, res) => {
  try {
    const userId = await currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const row = await assertBlueprintOwned(userId, req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Blueprint not found' });

    const config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
    const validation: BlueprintValidationResult = validateBlueprint(config);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Blueprint validation failed',
        validation,
      });
    }

    const pool = databaseService.getPool();
    await pool.query(
      `UPDATE agent_blueprints SET status = 'deployed', deployed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [row.id]
    );

    res.json({
      success: true,
      data: { id: row.id, status: 'deployed', deployedAt: new Date().toISOString() },
      validation,
    });
  } catch (error: any) {
    console.error('[Blueprint] Deploy failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/blueprints/:id
 * 删除蓝图
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = await currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const row = await assertBlueprintOwned(userId, req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'Blueprint not found' });

    const pool = databaseService.getPool();
    await pool.query('DELETE FROM agent_blueprints WHERE id = $1', [row.id]);

    res.json({ success: true, message: 'Blueprint deleted' });
  } catch (error: any) {
    console.error('[Blueprint] Delete failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
