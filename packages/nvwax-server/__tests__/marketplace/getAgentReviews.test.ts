/**
 * Marketplace Controller - getAgentReviews（v1.5.1）
 *
 * GET /api/v1/marketplace/agents/:id/reviews
 *
 * 覆盖：
 * 1. agent_reviews 表不存在 → 返回空 reviews
 * 2. 表存在 → 正常分页
 * 3. 自定义 page / limit
 * 4. limit 上限 50
 * 5. 异常 → 500
 * 6. table_check 失败 → 500
 *
 * Mock 策略：ESM 包必须用 jest.unstable_mockModule + await import
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

const mockPoolQuery = jest.fn() as jest.Mock<any>;
const mockGetPool = jest.fn(() => ({ query: mockPoolQuery })) as jest.Mock<any>;

jest.unstable_mockModule('../../src/services/database.service.js', () => ({
  databaseService: { getPool: mockGetPool },
}));

let getAgentReviews: typeof import('../../src/controllers/v1/marketplace.controller.js').getAgentReviews;

beforeAll(async () => {
  ({ getAgentReviews } = await import(
    '../../src/controllers/v1/marketplace.controller.js'
  ));
});

function makeReq(overrides: Partial<any> = {}): any {
  return {
    params: { id: 'agent-123' },
    query: {},
    apiKey: { user_id: 'user-1' },
    ...overrides,
  };
}

function makeRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('getAgentReviews (v1.5.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolQuery.mockReset();
    mockGetPool.mockImplementation(() => ({ query: mockPoolQuery }));
  });

  it('returns empty reviews when agent_reviews table does not exist', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });

    const req = makeReq();
    const res = makeRes();

    await getAgentReviews(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { reviews: [], total: 0, page: 1, limit: 10 },
    });
    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
  });

  it('returns reviews list when table exists', async () => {
    const createdAt = new Date();
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rev-1',
            agent_id: 'agent-123',
            user_id: 'u-1',
            rating: 5,
            content: 'Great',
            created_at: createdAt,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ cnt: 1 }] });

    const req = makeReq();
    const res = makeRes();

    await getAgentReviews(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.success).toBe(true);
    expect(jsonArg.data).toEqual(
      expect.objectContaining({
        reviews: expect.any(Array),
        page: 1,
        limit: 10,
      })
    );
    expect(jsonArg.data.reviews).toHaveLength(1);
    expect(jsonArg.data.reviews[0].id).toBe('rev-1');
    expect(jsonArg.data.total).toBe(1);
    expect(mockPoolQuery).toHaveBeenCalledTimes(3);
  });

  it('honors custom page and limit query params', async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({
        rows: [
          { id: 'rev-2', agent_id: 'agent-123', user_id: 'u-2', rating: 4, content: 'ok', created_at: new Date() },
          { id: 'rev-3', agent_id: 'agent-123', user_id: 'u-3', rating: 3, content: 'meh', created_at: new Date() },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ cnt: 25 }] });

    const req = makeReq({ query: { page: '2', limit: '5' } });
    const res = makeRes();

    await getAgentReviews(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.page).toBe(2);
    expect(jsonArg.data.limit).toBe(5);
    expect(jsonArg.data.total).toBe(25);

    // OFFSET = (page-1) * limit = 5
    const reviewsCall = mockPoolQuery.mock.calls[1];
    expect(reviewsCall[1]).toEqual(['agent-123', 5, 5]);
  });

  it('caps limit at 50 when larger value requested', async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: 0 }] });

    const req = makeReq({ query: { page: '1', limit: '999' } });
    const res = makeRes();

    await getAgentReviews(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.limit).toBe(50);
    const reviewsCall = mockPoolQuery.mock.calls[1];
    expect(reviewsCall[1]).toEqual(['agent-123', 50, 0]);
  });

  it('falls back to defaults for malformed page/limit', async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: 0 }] });

    const req = makeReq({ query: { page: 'abc', limit: '' } });
    const res = makeRes();

    await getAgentReviews(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.page).toBe(1);
    expect(jsonArg.data.limit).toBe(10);
  });

  it('returns total=0 when count query returns empty rows', async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({
        rows: [
          { id: 'rev-x', agent_id: 'agent-123', user_id: 'u', rating: 5, content: 'x', created_at: new Date() },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const req = makeReq();
    const res = makeRes();

    await getAgentReviews(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.reviews).toHaveLength(1);
    expect(jsonArg.data.total).toBe(0);
  });

  it('returns 500 when table existence check throws', async () => {
    mockPoolQuery.mockRejectedValueOnce(new Error('pool exhausted'));

    const req = makeReq();
    const res = makeRes();

    await getAgentReviews(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取 Agent 评论失败' },
    });
  });

  it('returns 500 when downstream reviews SELECT throws', async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockRejectedValueOnce(new Error('select failed'));

    const req = makeReq();
    const res = makeRes();

    await getAgentReviews(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns empty reviews when exists row is missing', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [{}] });

    const req = makeReq();
    const res = makeRes();

    await getAgentReviews(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.data.reviews).toEqual([]);
    expect(jsonArg.data.total).toBe(0);
  });

  it('handles array-form id param', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });

    const req = makeReq({ params: { id: ['agent-123'] } });
    const res = makeRes();

    await getAgentReviews(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { reviews: [], total: 0, page: 1, limit: 10 },
    });
  });
});