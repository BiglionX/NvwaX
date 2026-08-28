/**
 * SSEProgressService 单元测试（Sprint 2.17）
 *
 * 验证：
 * 1. connect() 设置正确的 SSE headers
 * 2. connect() 后立即发送初始进度（progress_update 事件）
 * 3. broadcastAgentMessage() 推送 agent_message 事件，含 message + phase + progress
 * 4. broadcastComplete() 推送 complete 事件 + 自动 res.end() + 清理客户端
 * 5. 客户端断开时通过 res.on('close') 清理
 * 6. sendEvent() 输出符合 SSE 规范的 `event: <name>\ndata: <json>\n\n` 格式
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Readable } from 'stream';

// mock database.service before importing the service
jest.mock('./database.service.js', () => ({
  databaseService: {
    getPool: jest.fn(() => ({
      query: jest.fn(async () => ({
        rows: [
          {
            id: 'sess-1',
            status: 'role_selection',
            progress: { currentStep: 1, totalSteps: 7, percentage: 14, steps: [] },
            requirements: {},
            selected_roles: [],
          },
        ],
      })),
    })),
  },
}));

// Build a fake Express Response that captures SSE writes
function makeFakeRes(): any {
  const res: any = {
    headers: {} as Record<string, string>,
    headersSent: false,
    written: [] as string[],
    closed: false,
    setHeader(k: string, v: string) {
      this.headers[k.toLowerCase()] = v;
    },
    flushHeaders() {
      this.headersSent = true;
    },
    write(chunk: string | Buffer) {
      this.written.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    },
    end() {
      this.closed = true;
    },
    on(_event: string, _cb: () => void) {
      return this;
    },
    once(_event: string, _cb: () => void) {
      return this;
    },
    emit(_event: string) {
      return true;
    },
  };
  return res;
}

describe('SSEProgressService（Sprint 2.17 真 SSE）', () => {
  let service: any;
  let SSEProgressService: any;

  beforeEach(async () => {
    const mod = await import('./sse-progress.service.js');
    SSEProgressService = mod.SSEProgressService;
    service = new SSEProgressService();
  });

  it('connect() 设置正确的 SSE headers', () => {
    const res = makeFakeRes();
    service.connect('sess-1', res);

    expect(res.headers['content-type']).toBe('text/event-stream');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['connection']).toBe('keep-alive');
    expect(res.headersSent).toBe(true);
  });

  it('connect() 立即发送初始 connection-ack 事件（同步）', () => {
    const res = makeFakeRes();
    service.connect('sess-1', res);
    // connect() 同步发送 connection-ack 事件（sendCurrentProgress 是异步，单独测）
    expect(res.written.length).toBeGreaterThanOrEqual(1);
    const joined = res.written.join('');
    expect(joined).toContain('"type":"progress_update"');
    expect(joined).toContain('Connected to progress stream');
  });

  it('sendEvent 输出符合 SSE 规范：event: <name>\\ndata: <json>\\n\\n', () => {
    const res = makeFakeRes();
    service.connect('sess-1', res);
    res.written.length = 0; // clear initial events

    service['sendEvent']({ id: 'c1', res, sessionId: 'sess-1', connectedAt: new Date() }, {
      type: 'agent_message',
      data: { message: 'Hi', phase: 'requirements_gathering' },
      timestamp: new Date('2026-01-01T00:00:00Z'),
    });

    const out = res.written.join('');
    // event: agent_message\ndata: {"type":"agent_message",...}\n\n
    expect(out).toMatch(/^event: agent_message\ndata: \{.*"type":"agent_message".*\}\n\n$/);
  });

  it('broadcastAgentMessage 推送给所有连接的客户端', () => {
    const res1 = makeFakeRes();
    const res2 = makeFakeRes();
    service.connect('sess-1', res1);
    service.connect('sess-1', res2);
    res1.written.length = 0;
    res2.written.length = 0;

    service.broadcastAgentMessage('sess-1', '测试消息', 'team_design', 28, 0.85, '下一步');

    expect(res1.written.join('')).toContain('"message":"测试消息"');
    expect(res2.written.join('')).toContain('"message":"测试消息"');
    expect(res1.written.join('')).toContain('"phase":"team_design"');
    expect(res1.written.join('')).toContain('"progress":28');
    expect(res1.written.join('')).toContain('"confidence":0.85');
  });

  it('broadcastComplete 推送 complete 事件 + 断开所有客户端', () => {
    const res1 = makeFakeRes();
    const res2 = makeFakeRes();
    service.connect('sess-1', res1);
    service.connect('sess-1', res2);
    res1.written.length = 0;
    res2.written.length = 0;

    service.broadcastComplete('sess-1', 'completed', 'team-skill-uuid');

    expect(res1.written.join('')).toContain('"status":"completed"');
    expect(res1.written.join('')).toContain('"finalTeamSkillId":"team-skill-uuid"');
    expect(res1.closed).toBe(true);
    // 第二个客户端 — forEach 在 mutate 数组时应仍访问（length cached at start）
    expect(res2.closed).toBe(true);

    // 客户端应已清理
    expect(service.getActiveClientCount('sess-1')).toBe(0);
  });

  it('客户端断开（res.on("close") 触发）应自动清理', () => {
    const res = makeFakeRes();
    let closeHandler: (() => void) | undefined;
    res.on = (event: string, cb: () => void) => {
      if (event === 'close') closeHandler = cb;
      return res;
    };

    service.connect('sess-1', res);
    expect(service.getActiveClientCount('sess-1')).toBe(1);

    closeHandler!();
    expect(service.getActiveClientCount('sess-1')).toBe(0);
  });

  it('不存在的 sessionId 调用 broadcastAgentMessage 不报错', () => {
    expect(() => service.broadcastAgentMessage('does-not-exist', 'x')).not.toThrow();
  });
});