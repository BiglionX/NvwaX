/**
 * AiTeamService.createAiTeamFromSession - "创建即入仓库" 单元测试
 *
 * 验证：
 * - session → aiteams 主表落库（members 全量进 JSONB）
 * - 幂等：同一 session 第二次调用返回已有 aiteam
 * - 关联表只写能匹配到 agents.id 的成员
 * - getAiTeamWithMembers 在关联表为空时回退到 JSONB
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// mock database.service（避免真实 DB 连接）
jest.mock('./database.service.js', () => ({
  databaseService: {
    getPool: jest.fn()
  }
}), { virtual: true });

import { AiTeamService } from './aiteam.service.js';

/** 构建一个可控的 fake pool（链式 client） */
function makeFakePool() {
  const rows: any = {};
  const fakeClient = {
    query: jest.fn(async (sql: string, params?: any[]) => {
      const q = String(sql).toLowerCase();
      // session 幂等查询
      if (q.includes('from aiteam_creation_sessions') && q.includes('final_aiteam_id')) {
        return { rows: [{ final_aiteam_id: rows.finalAiteamId || null }] };
      }
      // agents 名称匹配
      if (q.includes('from agents where name')) {
        const name = params?.[0];
        return { rows: name === '真实Agent' ? [{ id: 'agent-real-1' }] : [] };
      }
      // aiteams INSERT ... RETURNING
      if (q.includes('insert into aiteams') && q.includes('returning')) {
        rows.inserted = {
          id: rows.nextId || 'aiteam-1',
          user_id: params?.[1],
          name: params?.[2],
          description: params?.[3],
          members: params?.[4],
          workflow: params?.[5],
          triggers: params?.[6],
          version: params?.[7],
          publish_status: params?.[8],
          category: params?.[9],
          tags: params?.[10],
          created_at: new Date(),
          updated_at: new Date(),
          download_count: 0,
          execution_count: 0,
          success_rate: 100,
          rating: 0,
          review_count: 0
        };
        return { rows: [rows.inserted] };
      }
      // session UPDATE
      if (q.includes('update aiteam_creation_sessions')) {
        rows.finalAiteamId = params?.[0];
        return { rows: [] };
      }
      // aiteam_members INSERT
      if (q.includes('insert into aiteam_members')) {
        rows.membersInserted = rows.membersInserted || [];
        rows.membersInserted.push(params);
        return { rows: [] };
      }
      // aiteams SELECT（getAiTeamById 幂等回查）
      if (q.includes('from aiteams where id')) {
        return { rows: rows.inserted ? [rows.inserted] : [] };
      }
      // aiteam_members SELECT
      if (q.includes('from aiteam_members')) {
        return { rows: [] };
      }
      return { rows: [] };
    }),
    release: jest.fn()
  };

  const pool = {
    query: jest.fn(async (sql: string, params?: any[]) => {
      const q = String(sql).toLowerCase();
      // aiteams SELECT（getAiTeamById 幂等回查走 this.pool.query）
      if (q.includes('from aiteams where id')) {
        return { rows: rows.inserted ? [rows.inserted] : [] };
      }
      // aiteam_members SELECT（getAiTeamWithMembers 走 this.pool.query）
      if (q.includes('from aiteam_members')) {
        return { rows: [] };
      }
      return { rows: [] };
    }),
    connect: jest.fn(async () => fakeClient)
  };

  return { pool, fakeClient, rows };
}

describe('AiTeamService.createAiTeamFromSession', () => {
  let service: AiTeamService;
  let ctx: ReturnType<typeof makeFakePool>;

  beforeEach(() => {
    ctx = makeFakePool();
    service = new AiTeamService(ctx.pool as any);
    jest.clearAllMocks();
  });

  it('session 团队落库到 aiteams 主表，members 全量进 JSONB', async () => {
    const team = await service.createAiTeamFromSession({
      userId: 'user-1',
      sessionId: 'sess-1',
      name: '营销增长团队',
      description: '负责内容生产',
      members: [
        { role: '内容策略师', responsibilities: ['选题', '审核'] },
        { role: '数据分析师', responsibilities: ['报表'] }
      ],
      workflow: { steps: [] },
      triggers: {},
      category: 'marketing'
    });

    expect(team.id).toBe('aiteam-1');
    expect(team.userId).toBe('user-1');
    expect(team.name).toBe('营销增长团队');
    // members 从 JSONB 解析
    expect(team.members).toHaveLength(2);
    expect(team.members[0]).toMatchObject({
      role: '内容策略师',
      responsibilities: ['选题', '审核']
    });
    // 写入 session 幂等标记（真实 UUID，由方法内部生成）
    expect(ctx.rows.finalAiteamId).toBeTruthy();
    expect(typeof ctx.rows.finalAiteamId).toBe('string');
  });

  it('幂等：同一 session 再次调用返回已有 aiteam，不重复插入', async () => {
    ctx.rows.nextId = 'aiteam-1';
    const first = await service.createAiTeamFromSession({
      userId: 'user-1', sessionId: 'sess-1', name: 'T', members: []
    });
    expect(first.id).toBe('aiteam-1');
    const insertCallsAfterFirst = (ctx.fakeClient.query as any).mock.calls.filter(
      (c: any[]) => String(c[0]).toLowerCase().includes('insert into aiteams')
    ).length;
    expect(insertCallsAfterFirst).toBe(1);

    // 第二次调用：fake 幂等查询返回已存在的 final_aiteam_id
    // → 走 getAiTeamById 直接返回，不再 INSERT
    const again = await service.createAiTeamFromSession({
      userId: 'user-1', sessionId: 'sess-1', name: 'T', members: []
    });
    expect(again.id).toBe('aiteam-1');
    const insertCallsAfterSecond = (ctx.fakeClient.query as any).mock.calls.filter(
      (c: any[]) => String(c[0]).toLowerCase().includes('insert into aiteams')
    ).length;
    expect(insertCallsAfterSecond).toBe(1);
  });

  it('关联表只写能匹配到 agents.id 的成员', async () => {
    await service.createAiTeamFromSession({
      userId: 'user-1',
      sessionId: 'sess-1',
      name: 'T',
      members: [
        { role: 'R1', agentName: '真实Agent' },   // 匹配 → 写关联表
        { role: 'R2', agentName: '不存在的Agent' } // 不匹配 → 跳过
      ]
    });
    const inserts = ctx.rows.membersInserted || [];
    expect(inserts).toHaveLength(1);
    expect(inserts[0][1]).toBe('agent-real-1'); // agent_id
  });

  it('getAiTeamWithMembers：关联表空时回退到 JSONB members', async () => {
    // 先创建（rows.inserted 被 fake 记录）
    await service.createAiTeamFromSession({
      userId: 'user-1', sessionId: 'sess-1', name: 'T',
      members: [{ role: 'A', responsibilities: ['x'] }]
    });
    // getAiTeamById → aiteams SELECT + aiteam_members SELECT（返回空）
    const detail = await service.getAiTeamById('aiteam-1', 'user-1');
    expect(detail?.members).toHaveLength(1);
    expect(detail?.members[0].role).toBe('A');
  });
});