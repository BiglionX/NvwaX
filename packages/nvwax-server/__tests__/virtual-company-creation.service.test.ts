/**
 * 虚拟公司创建服务 - 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { VirtualCompanyCreationService } from '../src/services/virtual-company-creation.service.js';

// Mock database service
jest.mock('../src/services/database.service.js', () => ({
  databaseService: {
    getPool: jest.fn()
  }
}));

// Mock CEO Agent service
jest.mock('../src/services/ceo-agent.service.js', () => ({
  ceoAgentService: {
    processMessage: jest.fn()
  }
}));

// Mock SSE Progress service
jest.mock('../src/services/sse-progress.service.js', () => ({
  sseProgressService: {
    broadcastProgress: jest.fn()
  }
}));

describe('VirtualCompanyCreationService', () => {
  let service: VirtualCompanyCreationService;
  let mockPool: any;

  beforeEach(() => {
    // 重置所有 mocks
    jest.clearAllMocks();
    
    // 创建 mock pool
    mockPool = {
      query: jest.fn()
    };
    
    const { databaseService } = require('../src/services/database.service.js');
    databaseService.getPool.mockReturnValue(mockPool);
    
    // 重新导入服务以使用 mocks
    const { virtualCompanyCreationService } = require('../src/services/virtual-company-creation.service.js');
    service = virtualCompanyCreationService;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createSession', () => {
    it('应该成功创建新会话', async () => {
      const userId = 'test-user-123';
      const mockSessionId = 'session-test-id';
      
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: mockSessionId }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // SELECT
        
      const session = await service.createSession(userId);
      
      expect(session).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.status).toBe('initiated');
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('应该在数据库错误时抛出异常', async () => {
      const userId = 'test-user-123';
      
      mockPool.query.mockRejectedValue(new Error('Database error'));
      
      await expect(service.createSession(userId)).rejects.toThrow('Database error');
    });
  });

  describe('getSessionById', () => {
    it('应该返回存在的会话', async () => {
      const sessionId = 'test-session-id';
      const mockSession = {
        id: sessionId,
        user_id: 'test-user',
        status: 'initiated'
      };
      
      mockPool.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const session = await service.getSessionById(sessionId);
      
      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
    });

    it('应该在会话不存在时返回 null', async () => {
      const sessionId = 'non-existent-id';
      
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      const session = await service.getSessionById(sessionId);
      
      expect(session).toBeNull();
    });
  });

  describe('getUserSessions', () => {
    it('应该返回用户的会话列表', async () => {
      const userId = 'test-user-123';
      const limit = 10;
      const offset = 0;
      
      const mockSessions = [
        { id: 'session-1', user_id: userId },
        { id: 'session-2', user_id: userId }
      ];
      
      mockPool.query.mockResolvedValueOnce({ rows: mockSessions }); // SELECT sessions
      
      const result = await service.getUserSessions(userId, limit, offset);
      
      expect(result).toHaveLength(2);
    });

    it('应该处理空列表', async () => {
      const userId = 'test-user-empty';
      
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await service.getUserSessions(userId, 10, 0);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('updateRequirements', () => {
    it('应该成功更新需求', async () => {
      const sessionId = 'test-session-id';
      const requirements = {
        description: 'Test description',
        industry: 'Technology'
      };
      
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: sessionId }] }) // Check exists
        .mockResolvedValueOnce({ rows: [] }); // UPDATE
      
      const result = await service.updateRequirements(sessionId, requirements);
      
      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('应该在会话不存在时返回 false', async () => {
      const sessionId = 'non-existent';
      
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await service.updateRequirements(sessionId, {});
      
      expect(result).toBe(false);
    });
  });

  describe('deleteSession', () => {
    it('应该成功删除会话', async () => {
      const sessionId = 'test-session-id';
      const userId = 'test-user-123';
      
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: sessionId, user_id: userId }] }) // Check ownership
        .mockResolvedValueOnce({ rows: [] }); // DELETE
      
      const result = await service.deleteSession(sessionId, userId);
      
      expect(result).toBe(true);
    });

    it('应该在无权访问时返回 false', async () => {
      const sessionId = 'test-session-id';
      const userId = 'wrong-user';
      
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await service.deleteSession(sessionId, userId);
      
      expect(result).toBe(false);
    });
  });
});
