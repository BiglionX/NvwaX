/**
 * Marketplace Controller - getAiTeamById（v1.5.1 detail enrichment）
 *
 * 覆盖：
 * 1. 成功：返回 200 + 含 author / agents / memberCount / skillCount / relatedTeams
 * 2. 不存在：返回 404
 * 3. AiTeamService 抛错：返回 500
 * 4. 容错：members 为空时跳过 agents 查询
 * 5. 容错：author 查询失败不影响主返回
 * 6. 容错：agents 查询失败不影响主返回
 * 7. 容错：relatedTeams 查询失败不影响主返回
 *
 * Mock 策略：ESM 包必须用 jest.unstable_mockModule + await import
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

const mockPoolQuery = jest.fn() as jest.Mock<any>;
const mockGetPool = jest.fn(() => ({ query: mockPoolQuery })) as jest.Mock<any>;
const mockAiTeamServiceGetById = jest.fn() as jest.Mock<any>;

jest.unstable_mockModule('../../src/services/database.service.js', () => ({
  databaseService: { getPool: mockGetPool },
}));

jest.unstable_mockModule('../../src/services/aiteam.service.js', () => ({
  AiTeamService: class {
    getAiTeamById = mockAiTeamServiceGetById;
  },
}));

let getAiTeamById: typeof import('../../src/controllers/v1/marketplace.controller.js').getAiTeamById;

beforeAll(async () => {
  ({ getAiTeamById } = await import(
    '../../src/controllers/v1/marketplace.controller.js'
  ));
});

function makeReq(overrides: Partial<any> = {}): any {
  return {
    params: { id: 'team-1' },
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

describe('getAiTeamById (v1.5.1 detail enrichment)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolQuery.mockReset();
    mockAiTeamServiceGetById.mockReset();
    mockGetPool.mockImplementation(() => ({ query: mockPoolQuery }));
  });

  it('returns enriched aiteam with author, agents, memberCount, skillCount, relatedTeams', async () => {
    const mockTeam = {
      id: 'team-1',
      name: 'Growth Team',
      description: 'A growth team',
      userId: 'user-1',
      category: 'marketing',
      rating: 4.7,
      downloadCount: 50,
      members: [
        { agentId: 'agent-a' },
        { agentId: 'agent-b' },
        { agentId: 'agent-a' }, // duplicate，应被去重
      ],
      skills: ['seo', 'content'],
    };
    mockAiTeamServiceGetById.mockResolvedValue(mockTeam);

    mockPoolQuery
      // author
      .mockResolvedValueOnce({
        rows: [{ id: 'user-1', name: 'Alice', email: 'alice@example.com' }],
      })
      // agents
      .mockResolvedValueOnce({
        rows: [
          { id: 'agent-a', name: 'A', description: 'da', category: 'marketing', thumbnail_url: null, rating: 4.5 },
          { id: 'agent-b', name: 'B', description: 'db', category: 'marketing', thumbnail_url: null, rating: 4.0 },
        ],
      })
      // relatedTeams
      .mockResolvedValueOnce({
        rows: [{ id: 'rel-team-1', name: 'Related T', description: 'td', thumbnail_url: null }],
      });

    const req = makeReq();
    const res = makeRes();

    await getAiTeamById(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.success).toBe(true);
    expect(jsonArg.data).toEqual(
      expect.objectContaining({
        id: 'team-1',
        name: 'Growth Team',
        author: expect.objectContaining({ id: 'user-1', name: 'Alice' }),
        memberCount: 3,
        skillCount: 2,
        agents: expect.any(Array),
        relatedTeams: expect.any(Array),
      })
    );
    expect(jsonArg.data.agents).toHaveLength(2);
    expect(jsonArg.data.relatedTeams).toHaveLength(1);

    // agents 查询参数应包含去重后的 memberIds
    const agentsCall = mockPoolQuery.mock.calls[1];
    expect(agentsCall[1][0]).toEqual(['agent-a', 'agent-b']);
  });

  it('returns memberCount=0 and skillCount=0 when members/skills are missing', async () => {
    const mockTeam = {
      id: 'team-1',
      name: 'T',
      userId: 'user-1',
      category: 'x',
      // members / skills undefined
    };
    mockAiTeamServiceGetById.mockResolvedValue(mockTeam);

    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', name: 'A', email: 'a@x.com' }] })
      .mockResolvedValueOnce({ rows: [] }); // relatedTeams

    const req = makeReq();
    const res = makeRes();

    await getAiTeamById(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.agents).toEqual([]);
    expect(jsonArg.data.memberCount).toBe(0);
    expect(jsonArg.data.skillCount).toBe(0);
    // 没有 memberIds → 不应查 agents
    expect(mockPoolQuery).toHaveBeenCalledTimes(2);
  });

  it('returns 404 when aiteam not found', async () => {
    mockAiTeamServiceGetById.mockResolvedValue(null);

    const req = makeReq({ params: { id: 'nope' } });
    const res = makeRes();

    await getAiTeamById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'NOT_FOUND', message: 'AiTeam 不存在' },
    });
    expect(mockPoolQuery).not.toHaveBeenCalled();
  });

  it('returns 500 when AiTeamService throws', async () => {
    mockAiTeamServiceGetById.mockRejectedValue(new Error('db down'));

    const req = makeReq();
    const res = makeRes();

    await getAiTeamById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取 AiTeam 详情失败' },
    });
  });

  it('容错：author 查询失败时不影响主返回（author=null）', async () => {
    const mockTeam = {
      id: 'team-1',
      name: 'T',
      userId: 'user-1',
      category: 'marketing',
      members: [{ agentId: 'a1' }],
      skills: ['s1'],
    };
    mockAiTeamServiceGetById.mockResolvedValue(mockTeam);

    mockPoolQuery
      .mockRejectedValueOnce(new Error('users missing'))
      .mockResolvedValueOnce({
        rows: [{ id: 'a1', name: 'A1', description: 'd', category: 'x', thumbnail_url: null, rating: 5 }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const req = makeReq();
    const res = makeRes();

    await getAiTeamById(req, res);

    expect(res.status).not.toHaveBeenCalled();
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.author).toBeNull();
    expect(jsonArg.data.agents).toHaveLength(1);
    expect(jsonArg.data.memberCount).toBe(1);
  });

  it('容错：agents 查询失败不影响主返回（agents=[]）', async () => {
    const mockTeam = {
      id: 'team-1',
      name: 'T',
      userId: 'user-1',
      category: 'x',
      members: [{ agentId: 'a1' }],
      skills: [],
    };
    mockAiTeamServiceGetById.mockResolvedValue(mockTeam);

    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', name: 'U', email: 'u@x.com' }] })
      .mockRejectedValueOnce(new Error('agents query failed'))
      .mockResolvedValueOnce({ rows: [] });

    const req = makeReq();
    const res = makeRes();

    await getAiTeamById(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.author).toEqual({ id: 'user-1', name: 'U' });
    expect(jsonArg.data.agents).toEqual([]);
    expect(jsonArg.data.memberCount).toBe(1);
  });

  it('容错：relatedTeams 查询失败不影响主返回（relatedTeams=[]）', async () => {
    const mockTeam = {
      id: 'team-1',
      name: 'T',
      userId: 'user-1',
      category: 'x',
    };
    mockAiTeamServiceGetById.mockResolvedValue(mockTeam);

    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', name: 'U', email: 'u@x.com' }] })
      .mockRejectedValueOnce(new Error('related failed'));

    const req = makeReq();
    const res = makeRes();

    await getAiTeamById(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.author).toEqual({ id: 'user-1', name: 'U' });
    expect(jsonArg.data.relatedTeams).toEqual([]);
  });

  it('falls back to email local-part when author name missing', async () => {
    const mockTeam = {
      id: 'team-1',
      name: 'T',
      userId: 'user-1',
      category: 'x',
    };
    mockAiTeamServiceGetById.mockResolvedValue(mockTeam);

    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', name: null, email: 'carol@y.com' }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = makeReq();
    const res = makeRes();

    await getAiTeamById(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.author).toEqual({ id: 'user-1', name: 'carol' });
  });

  it('ignores member rows lacking agentId/agent_id when building memberIds', async () => {
    const mockTeam = {
      id: 'team-1',
      name: 'T',
      userId: 'user-1',
      category: 'x',
      members: [
        { agentId: 'a1' },
        { role: 'no-id' }, // no agentId / agent_id
        { agentId: 'a2' },
        { agent_id: 'a3' }, // snake_case form
        { agentId: 123 }, // non-string → filtered
        null,
        undefined,
      ],
    };
    mockAiTeamServiceGetById.mockResolvedValue(mockTeam);

    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', name: 'U', email: 'u@x.com' }] })
      .mockResolvedValueOnce({
        rows: [{ id: 'a1', name: 'A1', description: '', category: '', thumbnail_url: null, rating: 0 }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const req = makeReq();
    const res = makeRes();

    await getAiTeamById(req, res);

    const agentsCall = mockPoolQuery.mock.calls[1];
    expect(agentsCall[1][0]).toEqual(['a1', 'a2', 'a3']);
  });

  it('handles array-form id param', async () => {
    const mockTeam = {
      id: 'team-1',
      name: 'T',
      userId: 'user-1',
      category: 'x',
    };
    mockAiTeamServiceGetById.mockResolvedValue(mockTeam);
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', name: 'U', email: 'u@x.com' }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = makeReq({ params: { id: ['team-1'] } });
    const res = makeRes();

    await getAiTeamById(req, res);

    expect(mockAiTeamServiceGetById).toHaveBeenCalledWith('team-1', '');
  });
});