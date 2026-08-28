/**
 * Marketplace Controller - getAgentById（v1.5.1 detail enrichment）
 *
 * 覆盖：
 * 1. 成功：返回 200 + 含 author / usageCount / relatedAgents
 * 2. 不存在：返回 404
 * 3. SQL 失败：返回 500
 * 4. 容错：agent.userId 的 author 查询失败时不影响主返回（author 字段为 null）
 *
 * Mock 策略：ESM 包必须用 jest.unstable_mockModule + await import（不能用
 * 顶层同步 jest.mock / import —— Jest 在 ESM 模式下不会提升 mock，
 * controller 顶层就会实例化真实的 databaseService / agentService，
 * 触发真的 PG 连接池初始化。）
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

const mockPoolQuery = jest.fn() as jest.Mock<any>;
const mockGetPool = jest.fn(() => ({ query: mockPoolQuery })) as jest.Mock<any>;
const mockAgentServiceGetById = jest.fn() as jest.Mock<any>;

jest.unstable_mockModule('../../src/services/database.service.js', () => ({
  databaseService: { getPool: mockGetPool },
}));

jest.unstable_mockModule('../../src/services/agent.service.js', () => ({
  AgentService: class {
    getAgentById = mockAgentServiceGetById;
  },
}));

let getAgentById: typeof import('../../src/controllers/v1/marketplace.controller.js').getAgentById;

beforeAll(async () => {
  ({ getAgentById } = await import(
    '../../src/controllers/v1/marketplace.controller.js'
  ));
});

function makeReq(overrides: Partial<any> = {}): any {
  return {
    params: { id: 'agent-123' },
    apiKey: { user_id: 'user-1' },
    query: {},
    ...overrides,
  };
}

function makeRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('getAgentById (v1.5.1 detail enrichment)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolQuery.mockReset();
    mockAgentServiceGetById.mockReset();
    // 默认 controller 调一次 getPool() 拿 pool 引用
    mockGetPool.mockImplementation(() => ({ query: mockPoolQuery }));
  });

  it('returns enriched agent with author, usageCount, relatedAgents', async () => {
    const mockAgent = {
      id: 'agent-123',
      name: 'Marketing Bot',
      description: 'Auto-marketing',
      userId: 'user-1',
      category: 'marketing',
      rating: 4.5,
      downloadCount: 100,
      tags: ['seo'],
    };
    mockAgentServiceGetById.mockResolvedValue(mockAgent);

    // author / usageCount / relatedAgents 三个补充查询
    mockPoolQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'user-1', name: 'Alice', email: 'alice@example.com' }],
      })
      .mockResolvedValueOnce({ rows: [{ cnt: 5 }] })
      .mockResolvedValueOnce({
        rows: [
          { id: 'rel-1', name: 'Related Bot', description: 'related desc', thumbnail_url: null },
        ],
      });

    const req = makeReq();
    const res = makeRes();

    await getAgentById(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.success).toBe(true);
    expect(jsonArg.data).toEqual(
      expect.objectContaining({
        id: 'agent-123',
        name: 'Marketing Bot',
        author: expect.objectContaining({ id: 'user-1', name: 'Alice' }),
        usageCount: 5,
        relatedAgents: expect.any(Array),
      })
    );
    expect(jsonArg.data.relatedAgents).toHaveLength(1);
    expect(jsonArg.data.relatedAgents[0].id).toBe('rel-1');

    // pool 三次补充查询都发生过
    expect(mockPoolQuery).toHaveBeenCalledTimes(3);
  });

  it('falls back to email local-part when name is missing', async () => {
    const mockAgent = {
      id: 'agent-123',
      name: 'Bot',
      userId: 'user-1',
      category: 'marketing',
    };
    mockAgentServiceGetById.mockResolvedValue(mockAgent);

    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', name: null, email: 'bob@x.com' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = makeReq();
    const res = makeRes();

    await getAgentById(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.author).toEqual({ id: 'user-1', name: 'bob' });
    expect(jsonArg.data.usageCount).toBe(0);
  });

  it('returns Anonymous when author row exists but name/email both empty', async () => {
    const mockAgent = {
      id: 'agent-123',
      name: 'Bot',
      userId: 'user-1',
      category: null,
    };
    mockAgentServiceGetById.mockResolvedValue(mockAgent);

    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', name: null, email: null }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = makeReq();
    const res = makeRes();

    await getAgentById(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.author).toEqual({ id: 'user-1', name: 'Anonymous' });
  });

  it('returns author=null when author query returns empty rows', async () => {
    const mockAgent = {
      id: 'agent-123',
      name: 'Bot',
      userId: 'ghost-user',
      category: 'x',
    };
    mockAgentServiceGetById.mockResolvedValue(mockAgent);

    mockPoolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: 2 }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = makeReq();
    const res = makeRes();

    await getAgentById(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.author).toBeNull();
    expect(jsonArg.data.usageCount).toBe(2);
  });

  it('returns 404 when agent not found', async () => {
    mockAgentServiceGetById.mockResolvedValue(null);

    const req = makeReq({ params: { id: 'nonexistent' } });
    const res = makeRes();

    await getAgentById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Agent 不存在' },
    });
    // 主查询返回 null 时不应触发补充查询
    expect(mockPoolQuery).not.toHaveBeenCalled();
  });

  it('returns 500 when AgentService throws', async () => {
    mockAgentServiceGetById.mockRejectedValue(new Error('db down'));

    const req = makeReq();
    const res = makeRes();

    await getAgentById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取 Agent 详情失败' },
    });
  });

  it('容错：author 查询失败时不影响主返回（author 字段为 null）', async () => {
    const mockAgent = {
      id: 'agent-123',
      name: 'Bot',
      userId: 'user-1',
      category: 'marketing',
      tags: [],
    };
    mockAgentServiceGetById.mockResolvedValue(mockAgent);

    mockPoolQuery
      .mockRejectedValueOnce(new Error('relation "users" does not exist'))
      .mockResolvedValueOnce({ rows: [{ cnt: 7 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 'r1', name: 'R', description: 'd', thumbnail_url: null }],
      });

    const req = makeReq();
    const res = makeRes();

    await getAgentById(req, res);

    expect(res.status).not.toHaveBeenCalled();
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.success).toBe(true);
    expect(jsonArg.data.author).toBeNull();
    expect(jsonArg.data.usageCount).toBe(7);
    expect(jsonArg.data.relatedAgents).toHaveLength(1);
  });

  it('容错：usageCount 查询失败不影响主返回（usageCount 回退 0）', async () => {
    const mockAgent = {
      id: 'agent-123',
      name: 'Bot',
      userId: 'user-1',
      category: 'x',
    };
    mockAgentServiceGetById.mockResolvedValue(mockAgent);

    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', name: 'Alice', email: 'a@x.com' }] })
      .mockRejectedValueOnce(new Error('industry_agents missing'))
      .mockResolvedValueOnce({ rows: [] });

    const req = makeReq();
    const res = makeRes();

    await getAgentById(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.author).toEqual({ id: 'user-1', name: 'Alice' });
    expect(jsonArg.data.usageCount).toBe(0);
    expect(jsonArg.data.relatedAgents).toEqual([]);
  });

  it('容错：relatedAgents 查询失败不影响主返回（数组保留为空）', async () => {
    const mockAgent = {
      id: 'agent-123',
      name: 'Bot',
      userId: 'user-1',
      category: 'marketing',
    };
    mockAgentServiceGetById.mockResolvedValue(mockAgent);

    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', name: 'Alice', email: null }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 1 }] })
      .mockRejectedValueOnce(new Error('related query failed'));

    const req = makeReq();
    const res = makeRes();

    await getAgentById(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.author).toEqual({ id: 'user-1', name: 'Alice' });
    expect(jsonArg.data.usageCount).toBe(1);
    expect(jsonArg.data.relatedAgents).toEqual([]);
  });

  it('handles array-form id param (express can produce string[] in some edge cases)', async () => {
    const mockAgent = {
      id: 'agent-123',
      name: 'Bot',
      userId: 'user-1',
      category: 'x',
    };
    mockAgentServiceGetById.mockResolvedValue(mockAgent);
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', name: 'A', email: 'a@x.com' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = makeReq({ params: { id: ['agent-123'] } });
    const res = makeRes();

    await getAgentById(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.success).toBe(true);
    expect(jsonArg.data.id).toBe('agent-123');
  });
});